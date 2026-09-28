package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.PageResponse;
import com.training.backend.dto.UserBalanceView;
import com.training.backend.entity.*;
import com.training.backend.repository.*;
import com.training.backend.service.CardKeyService;
import com.training.backend.service.TokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 后台管理平台计费接口（/admin-api/billing/**，SecurityConfig 限制 ADMIN）
 */
@Slf4j
@RestController
@RequestMapping("/admin-api/billing")
@RequiredArgsConstructor
public class BillingAdminController {

    private final TokenService tokenService;
    private final CardKeyService cardKeyService;
    private final TokenPackageRepository packageRepository;
    private final TokenSceneConfigRepository sceneConfigRepository;
    private final TokenTransactionRepository transactionRepository;
    private final RechargeOrderRepository orderRepository;
    private final TokenAccountRepository accountRepository;
    private final CardKeyRepository cardKeyRepository;
    private final UserRepository userRepository;

    /* ==================== 总览 ==================== */

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> overview() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        LocalDateTime epoch = LocalDateTime.of(2020, 1, 1, 0, 0);
        List<TokenTransaction.TxType> creditTypes =
                List.of(TokenTransaction.TxType.RECHARGE, TokenTransaction.TxType.CARD);

        Map<String, Object> today = new LinkedHashMap<>();
        today.put("rechargeAmount", orderRepository.sumPaidSince(RechargeOrder.OrderStatus.PAID, startOfToday));
        today.put("rechargeCount", orderRepository.countPaidSince(RechargeOrder.OrderStatus.PAID, startOfToday));
        today.put("rechargedTokens", transactionRepository.sumRechargedSince(creditTypes, startOfToday));
        today.put("consumedTokens", transactionRepository.sumConsumedSince(TokenTransaction.TxType.CONSUME, startOfToday));
        today.put("activeUsers", transactionRepository.countActiveUsersSince(TokenTransaction.TxType.CONSUME, startOfToday));
        today.put("pendingOrders", orderRepository.countPending(RechargeOrder.OrderStatus.PENDING));

        Map<String, Object> total = new LinkedHashMap<>();
        total.put("rechargeAmount", orderRepository.sumPaidTotal(RechargeOrder.OrderStatus.PAID));
        total.put("rechargedTokens", transactionRepository.sumRechargedTotal(creditTypes));
        total.put("consumedTokens", transactionRepository.sumConsumedTotal(TokenTransaction.TxType.CONSUME));
        total.put("grantedTokens", transactionRepository.sumGrantedTotal(TokenTransaction.TxType.GRANT));
        total.put("paidUsers", orderRepository.countPaidUsersTotal(RechargeOrder.OrderStatus.PAID));
        total.put("registeredUsers", userRepository.count());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("today", today);
        result.put("total", total);
        result.put("sceneStatsToday", sceneStats(TokenTransaction.TxType.CONSUME, startOfToday));
        result.put("sceneStatsTotal", sceneStats(TokenTransaction.TxType.CONSUME, epoch));
        result.put("recentOrders", orderRepository.findTop8ByOrderByIdDesc());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private List<Map<String, Object>> sceneStats(TokenTransaction.TxType type, LocalDateTime since) {
        return transactionRepository.countBySceneSince(type, since).stream()
                .map(row -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("scene", row[0]);
                    m.put("count", row[1]);
                    m.put("tokens", row[2]);
                    return m;
                })
                .collect(Collectors.toList());
    }

    /* ==================== 用户与余额 ==================== */

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PageResponse<UserBalanceView>>> users(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(1, size), 100);
        Page<User> userPage = (keyword == null || keyword.isBlank())
                ? userRepository.findAll(PageRequest.of(p, s))
                : userRepository.findByNameContainingOrUsernameContaining(keyword.trim(), keyword.trim(), PageRequest.of(p, s));

        List<Long> ids = userPage.getContent().stream().map(User::getId).toList();
        Map<Long, TokenAccount> accounts = accountRepository.findByUserIdIn(ids).stream()
                .collect(Collectors.toMap(TokenAccount::getUserId, Function.identity()));

        List<UserBalanceView> views = userPage.getContent().stream()
                .map(u -> UserBalanceView.of(u, accounts.get(u.getId())))
                .toList();
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(views, p, s, userPage.getTotalElements())));
    }

    /** 手动调整余额（amount 带符号，ADJUST 流水留痕） */
    @PostMapping("/users/{userId}/adjust")
    public ResponseEntity<ApiResponse<TokenAccount>> adjust(
            @PathVariable Long userId, @RequestBody Map<String, Object> body) {
        long amount = toLong(body.get("amount"));
        if (amount == 0) throw new IllegalArgumentException("调整数量不能为 0");
        String remark = body.get("remark") == null ? "" : String.valueOf(body.get("remark"));
        tokenService.adjust(userId, amount, remark, currentUsername());
        return ResponseEntity.ok(ApiResponse.success("已调整", tokenService.getOrCreateAccount(userId)));
    }

    /** 某用户全部流水 */
    @GetMapping("/users/{userId}/transactions")
    public ResponseEntity<ApiResponse<PageResponse<TokenTransaction>>> userTransactions(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TokenTransaction> result = tokenService.myTransactions(userId, page, size);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(result.getContent(), page, size, result.getTotalElements())));
    }

    /* ==================== 全量流水 ==================== */

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<PageResponse<TokenTransaction>>> transactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String scene,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        TokenTransaction.TxType txType = parseEnum(type, TokenTransaction.TxType.class);
        LocalDateTime startTime = parseDate(start, true);
        LocalDateTime endTime = parseDate(end, false);
        Page<TokenTransaction> result = transactionRepository.search(
                userId, txType, blankToNull(scene), startTime, endTime,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(result.getContent(), page, size, result.getTotalElements())));
    }

    /* ==================== 套餐管理 ==================== */

    @GetMapping("/packages")
    public ResponseEntity<ApiResponse<List<TokenPackage>>> packages() {
        return ResponseEntity.ok(ApiResponse.success(packageRepository.findAllByOrderBySortOrderAscIdAsc()));
    }

    @PostMapping("/packages")
    public ResponseEntity<ApiResponse<TokenPackage>> createPackage(@RequestBody Map<String, Object> body) {
        TokenPackage pkg = new TokenPackage();
        applyPackage(pkg, body);
        return ResponseEntity.ok(ApiResponse.success("套餐已创建", packageRepository.save(pkg)));
    }

    @PutMapping("/packages/{id}")
    public ResponseEntity<ApiResponse<TokenPackage>> updatePackage(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        TokenPackage pkg = packageRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("套餐不存在"));
        applyPackage(pkg, body);
        return ResponseEntity.ok(ApiResponse.success("套餐已更新", packageRepository.save(pkg)));
    }

    @DeleteMapping("/packages/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePackage(@PathVariable Long id) {
        packageRepository.deleteById(id);
        return ResponseEntity.ok(ApiResponse.success("套餐已删除", null));
    }

    private void applyPackage(TokenPackage pkg, Map<String, Object> body) {
        String name = str(body, "name");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("请填写套餐名称");
        pkg.setName(name.trim());
        pkg.setDescription(str(body, "description"));
        pkg.setPriceYuan(new java.math.BigDecimal(String.valueOf(body.getOrDefault("priceYuan", "0"))));
        pkg.setTokens(toLong(body.get("tokens")));
        pkg.setBonusTokens(toLong(body.get("bonusTokens")));
        if (pkg.getTokens() + pkg.getBonusTokens() <= 0) throw new IllegalArgumentException("Token 数量必须大于 0");
        pkg.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
        pkg.setSortOrder((int) toLong(body.get("sortOrder")));
    }

    /* ==================== 卡密管理 ==================== */

    @PostMapping("/cards/generate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateCards(@RequestBody Map<String, Object> body) {
        Long packageId = toLong(body.get("packageId"));
        int count = (int) toLong(body.get("count"));
        if (packageId == null) throw new IllegalArgumentException("请选择套餐");
        String batchNo = cardKeyService.generate(packageId, count, str(body, "remark"));
        return ResponseEntity.ok(ApiResponse.success("已生成 " + count + " 张卡密", Map.of("batchNo", batchNo)));
    }

    @GetMapping("/cards")
    public ResponseEntity<ApiResponse<PageResponse<CardKey>>> cards(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String batchNo,
            @RequestParam(required = false) String status) {
        CardKey.CardStatus s = parseEnum(status, CardKey.CardStatus.class);
        Page<CardKey> result = cardKeyService.search(batchNo, s, page, size);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(result.getContent(), page, size, result.getTotalElements())));
    }

    @GetMapping("/cards/export")
    public ResponseEntity<String> exportCards(@RequestParam String batchNo) {
        String text = cardKeyService.export(batchNo);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=cards-" + batchNo + ".txt")
                .contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
                .body(text);
    }

    /* ==================== 订单管理 ==================== */

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<PageResponse<RechargeOrder>>> orders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        RechargeOrder.OrderStatus s = parseEnum(status, RechargeOrder.OrderStatus.class);
        Page<RechargeOrder> result = orderRepository.searchByStatus(s,
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(result.getContent(), page, size, result.getTotalElements())));
    }

    @PostMapping("/orders/{id}/confirm")
    public ResponseEntity<ApiResponse<RechargeOrder>> confirmOrder(@PathVariable Long id) {
        RechargeOrder order = tokenService.confirmOrder(id, currentUsername());
        return ResponseEntity.ok(ApiResponse.success("已确认收款并到账", order));
    }

    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<ApiResponse<RechargeOrder>> cancelOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("订单已取消", tokenService.cancelOrder(id)));
    }

    /* ==================== 场景定价 ==================== */

    @GetMapping("/scenes")
    public ResponseEntity<ApiResponse<List<TokenSceneConfig>>> scenes() {
        List<TokenSceneConfig> configs = sceneConfigRepository.findAllByOrderBySortOrderAscIdAsc();
        // 补全枚举中新增但未落库的场景（展示默认价）
        Set<String> existing = configs.stream().map(TokenSceneConfig::getScene).collect(Collectors.toSet());
        for (TokenScene scene : TokenScene.values()) {
            if (!existing.contains(scene.name())) {
                TokenSceneConfig c = new TokenSceneConfig();
                c.setScene(scene.name());
                c.setLabel(scene.getLabel());
                c.setPrice(scene.getDefaultPrice());
                c.setEnabled(true);
                c.setSortOrder(scene.ordinal());
                configs.add(c);
            }
        }
        configs.sort(Comparator.comparingInt(TokenSceneConfig::getSortOrder));
        return ResponseEntity.ok(ApiResponse.success(configs));
    }

    @PutMapping("/scenes/{scene}")
    public ResponseEntity<ApiResponse<TokenSceneConfig>> updateScene(
            @PathVariable String scene, @RequestBody Map<String, Object> body) {
        TokenScene tokenScene;
        try {
            tokenScene = TokenScene.valueOf(scene);
        } catch (Exception e) {
            throw new IllegalArgumentException("未知场景: " + scene);
        }
        TokenSceneConfig cfg = sceneConfigRepository.findByScene(scene).orElseGet(() -> {
            TokenSceneConfig c = new TokenSceneConfig();
            c.setScene(scene);
            c.setLabel(tokenScene.getLabel());
            c.setPrice(tokenScene.getDefaultPrice());
            c.setEnabled(true);
            c.setSortOrder(tokenScene.ordinal());
            return c;
        });
        cfg.setPrice(Math.max(0, toLong(body.get("price"))));
        cfg.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
        String label = str(body, "label");
        if (label != null && !label.isBlank()) cfg.setLabel(label.trim());
        return ResponseEntity.ok(ApiResponse.success("场景定价已更新", sceneConfigRepository.save(cfg)));
    }

    /* ==================== 平台设置 ==================== */

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<BillingSetting>> settings() {
        return ResponseEntity.ok(ApiResponse.success(tokenService.getSettings()));
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<BillingSetting>> updateSettings(@RequestBody Map<String, Object> body) {
        BillingSetting patch = new BillingSetting();
        patch.setId(1L);
        if (body.containsKey("dailyFreeTokens")) patch.setDailyFreeTokens(Math.max(0, toLong(body.get("dailyFreeTokens"))));
        else patch.setDailyFreeTokens(-1);
        if (body.containsKey("registerBonusTokens")) patch.setRegisterBonusTokens(Math.max(0, toLong(body.get("registerBonusTokens"))));
        else patch.setRegisterBonusTokens(-1);
        patch.setFreeQuotaEnabled(Boolean.TRUE.equals(body.getOrDefault("freeQuotaEnabled", true)));
        patch.setPaymentNote(str(body, "paymentNote"));
        patch.setWechatQrUrl(str(body, "wechatQrUrl"));
        patch.setAlipayQrUrl(str(body, "alipayQrUrl"));
        return ResponseEntity.ok(ApiResponse.success("设置已保存", tokenService.updateSettings(patch)));
    }

    /* ==================== 工具 ==================== */

    private String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return userRepository.findById(id).map(User::getUsername).orElse("admin");
        }
        return "admin";
    }

    private long toLong(Object o) {
        if (o == null) return 0L;
        try {
            return Long.parseLong(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private String str(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v == null ? null : String.valueOf(v);
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private <E extends Enum<E>> E parseEnum(String value, Class<E> type) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(type, value.trim().toUpperCase());
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDateTime parseDate(String value, boolean startOfDay) {
        if (value == null || value.isBlank()) return null;
        try {
            LocalDate d = LocalDate.parse(value.trim());
            return startOfDay ? d.atStartOfDay() : d.plusDays(1).atStartOfDay();
        } catch (Exception e) {
            return null;
        }
    }
}
