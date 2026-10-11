package com.saidao.backend.controller;

import com.saidao.backend.dto.ApiResponse;
import com.saidao.backend.dto.BillingSettingPatch;
import com.saidao.backend.dto.PageResponse;
import com.saidao.backend.dto.UserBalanceView;
import com.saidao.backend.entity.*;
import com.saidao.backend.repository.*;
import com.saidao.backend.service.AiCallLogService;
import com.saidao.backend.service.AuditService;
import com.saidao.backend.service.BillingMaintenanceService;
import com.saidao.backend.service.CardKeyService;
import com.saidao.backend.service.TokenService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 后台管理平台计费接口（/admin-api/billing/**，SecurityConfig 限制 ADMIN）
 *
 * <p>资金类操作（加币/改价/确认收款/退款/生成与导出卡密/改平台设置）全部写审计日志，
 * 并提供流水、订单、AI 用量的 CSV 导出与审计日志查询。
 */
@Slf4j
@RestController
@RequestMapping("/admin-api/billing")
@RequiredArgsConstructor
public class BillingAdminController {

    private final TokenService tokenService;
    private final CardKeyService cardKeyService;
    private final AiCallLogService aiCallLogService;
    private final AuditService auditService;
    private final BillingMaintenanceService billingMaintenanceService;
    private final TokenPackageRepository packageRepository;
    private final TokenSceneConfigRepository sceneConfigRepository;
    private final TokenTransactionRepository transactionRepository;
    private final RechargeOrderRepository orderRepository;
    private final TokenAccountRepository accountRepository;
    private final CardKeyRepository cardKeyRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    /* ==================== 总览 ==================== */

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<Map<String, Object>>> overview() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        LocalDateTime epoch = LocalDateTime.of(2020, 1, 1, 0, 0);
        List<TokenTransaction.TxType> creditTypes =
                List.of(TokenTransaction.TxType.RECHARGE, TokenTransaction.TxType.CARD);
        List<AiCallLog.CallStatus> terminal = List.of(AiCallLog.CallStatus.SUCCESS);

        Map<String, Object> today = new LinkedHashMap<>();
        today.put("rechargeAmount", orderRepository.sumPaidSince(RechargeOrder.OrderStatus.PAID, startOfToday));
        today.put("rechargeCount", orderRepository.countPaidSince(RechargeOrder.OrderStatus.PAID, startOfToday));
        today.put("rechargedTokens", transactionRepository.sumRechargedSince(creditTypes, startOfToday));
        // 净消耗取自「已结算的 AI 预留」，退款不会造成统计漂移
        today.put("consumedTokens", tokenService.settledConsumedSince(startOfToday));
        today.put("refundedTokens", tokenService.releasedSince(startOfToday));
        today.put("activeUsers", transactionRepository.countActiveUsersSince(TokenTransaction.TxType.CONSUME, startOfToday));
        today.put("pendingOrders", orderRepository.countPending(RechargeOrder.OrderStatus.PENDING));
        today.put("aiCalls", aiCallLogService.search(null, null, null, startOfToday, null, 0, 1).getTotalElements());
        today.put("aiCostYuan", todayAiCost(startOfToday));

        Map<String, Object> total = new LinkedHashMap<>();
        total.put("rechargeAmount", orderRepository.sumPaidTotal(RechargeOrder.OrderStatus.PAID));
        total.put("rechargedTokens", transactionRepository.sumRechargedTotal(creditTypes));
        total.put("consumedTokens", tokenService.settledConsumedTotal());
        total.put("grantedTokens", transactionRepository.sumGrantedTotal(TokenTransaction.TxType.GRANT));
        total.put("refundedAmount", orderRepository.sumRefundedTotal(RechargeOrder.OrderStatus.REFUNDED));
        // ORDER_REFUND 流水金额为负，展示口径取正值（「已冲正 N Token」）
        total.put("refundedTokens", -transactionRepository.sumSignedTotal(TokenTransaction.TxType.ORDER_REFUND));
        total.put("paidUsers", orderRepository.countPaidUsersTotal(RechargeOrder.OrderStatus.PAID));
        total.put("registeredUsers", userRepository.count());
        total.put("openCharges", tokenService.findStaleCharges(0, 1).size() > 0 ? "有未终结预留" : "无");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("today", today);
        result.put("total", total);
        result.put("sceneStatsToday", chargeSceneStats(startOfToday));
        result.put("sceneStatsTotal", chargeSceneStats(epoch));
        result.put("recentOrders", orderRepository.findTop8ByOrderByIdDesc());
        result.put("aiStatsToday", aiCallLogService.stats(startOfToday, LocalDateTime.now().plusDays(1)).get("summary"));
        result.put("pendingAlert", pendingAlert());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    /** 按场景统计「调用次数 / 已结算 / 已退回」，来源于预留单而不是流水，天然不含已退款部分 */
    private List<Map<String, Object>> chargeSceneStats(LocalDateTime since) {
        Map<String, long[]> byScene = new LinkedHashMap<>();
        for (Object[] row : tokenService.chargeStatsByScene(since)) {
            byScene.put(String.valueOf(row[0]), new long[]{toLong(row[1]), toLong(row[2]), toLong(row[3])});
        }
        List<Map<String, Object>> list = new ArrayList<>();
        byScene.forEach((scene, v) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("scene", scene);
            m.put("count", v[0]);
            m.put("settledCount", v[1]);
            m.put("releasedCount", v[2]);
            list.add(m);
        });
        return list;
    }

    private BigDecimal todayAiCost(LocalDateTime startOfToday) {
        Object cost = aiCallLogService.stats(startOfToday, LocalDateTime.now().plusDays(1))
                .get("summary");
        if (cost instanceof Map<?, ?> m && m.get("estimatedCostYuan") instanceof BigDecimal b) {
            return b;
        }
        return BigDecimal.ZERO;
    }

    /** 待确认订单超时提醒：后端总览直接给出红条数据 */
    private Map<String, Object> pendingAlert() {
        int hours = tokenService.getSettings().getPendingOrderAlertHours();
        List<RechargeOrder> overdue = billingMaintenanceService.overduePendingOrders(20);
        Map<String, Object> alert = new LinkedHashMap<>();
        alert.put("thresholdHours", hours);
        alert.put("overdueCount", overdue.size());
        alert.put("orders", overdue.stream().map(o -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", o.getId());
            m.put("orderNo", o.getOrderNo());
            m.put("userId", o.getUserId());
            m.put("packageName", o.getPackageName());
            m.put("priceYuan", o.getPriceYuan());
            m.put("createdAt", o.getCreatedAt());
            m.put("ageMinutes", billingMaintenanceService.oldestPendingAgeMinutes(o));
            return m;
        }).toList());
        return alert;
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

    /** 手动调整余额（amount 带符号，ADJUST 流水留痕 + 审计） */
    @PostMapping("/users/{userId}/adjust")
    public ResponseEntity<ApiResponse<TokenAccount>> adjust(
            @PathVariable Long userId, @RequestBody Map<String, Object> body) {
        long amount = toLong(body.get("amount"));
        if (amount == 0) throw new IllegalArgumentException("调整数量不能为 0");
        String remark = body.get("remark") == null ? "" : String.valueOf(body.get("remark"));
        String operator = currentUsername();
        try {
            tokenService.adjust(userId, amount, remark, operator);
        } catch (RuntimeException e) {
            auditService.logMoneyFailure(currentUserId(), operator, "BILLING_ADJUST", "TOKEN_ACCOUNT",
                    userId, "调整 " + amount + " 积分失败：" + e.getMessage());
            throw e;
        }
        TokenAccount account = tokenService.getOrCreateAccount(userId);
        auditService.logMoney(currentUserId(), operator, "BILLING_ADJUST", "TOKEN_ACCOUNT", userId,
                String.format("调整 %+d 积分，调整后余额 %d，备注：%s", amount, account.getBalance(),
                        remark.isBlank() ? "无" : remark));
        return ResponseEntity.ok(ApiResponse.success("已调整", account));
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
        Page<TokenTransaction> result = transactionRepository.search(
                userId, parseEnum(type, TokenTransaction.TxType.class), blankToNull(scene),
                parseDate(start, true), parseDate(end, false),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(result.getContent(), page, size, result.getTotalElements())));
    }

    /** 流水导出 CSV（对齐商业化文档承诺的「全量流水检索…分页导出」） */
    @GetMapping("/export/transactions.csv")
    public ResponseEntity<byte[]> exportTransactions(
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String scene,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        List<TokenTransaction> rows = transactionRepository.findForExport(
                userId, parseEnum(type, TokenTransaction.TxType.class), blankToNull(scene),
                parseDate(start, true), parseDate(end, false), PageRequest.of(0, 50000));
        StringBuilder sb = new StringBuilder();
        sb.append("流水ID,时间,用户ID,类型,场景,金额,交易后余额,关联ID,备注\n");
        for (TokenTransaction t : rows) {
            sb.append(t.getId()).append(',')
              .append(csv(t.getCreatedAt() == null ? "" : t.getCreatedAt().toString())).append(',')
              .append(t.getUserId()).append(',')
              .append(t.getType()).append(',')
              .append(csv(t.getScene())).append(',')
              .append(t.getAmount()).append(',')
              .append(t.getBalanceAfter()).append(',')
              .append(csv(t.getRefId())).append(',')
              .append(csv(t.getRemark())).append('\n');
        }
        return csvResponse("token-transactions-" + LocalDate.now() + ".csv", sb.toString());
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
        TokenPackage saved = packageRepository.save(pkg);
        auditService.logMoney(currentUserId(), currentUsername(), "BILLING_PACKAGE_CREATE", "TOKEN_PACKAGE",
                saved.getId(), String.format("新建套餐 %s：¥%s = %d 积分", saved.getName(),
                        saved.getPriceYuan(), saved.totalTokens()));
        return ResponseEntity.ok(ApiResponse.success("套餐已创建", saved));
    }

    @PutMapping("/packages/{id}")
    public ResponseEntity<ApiResponse<TokenPackage>> updatePackage(
            @PathVariable Long id, @RequestBody Map<String, Object> body) {
        TokenPackage pkg = packageRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("套餐不存在"));
        String before = String.format("¥%s = %d 积分", pkg.getPriceYuan(), pkg.totalTokens());
        applyPackage(pkg, body);
        TokenPackage saved = packageRepository.save(pkg);
        auditService.logMoney(currentUserId(), currentUsername(), "BILLING_PACKAGE_UPDATE", "TOKEN_PACKAGE",
                saved.getId(), String.format("改套餐 %s：%s → ¥%s = %d 积分", saved.getName(), before,
                        saved.getPriceYuan(), saved.totalTokens()));
        return ResponseEntity.ok(ApiResponse.success("套餐已更新", saved));
    }

    @DeleteMapping("/packages/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePackage(@PathVariable Long id) {
        String name = packageRepository.findById(id).map(TokenPackage::getName).orElse("#" + id);
        packageRepository.deleteById(id);
        auditService.logMoney(currentUserId(), currentUsername(), "BILLING_PACKAGE_DELETE", "TOKEN_PACKAGE",
                id, "删除套餐 " + name);
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
        if (pkg.getTokens() + pkg.getBonusTokens() <= 0) throw new IllegalArgumentException("积分数量必须大于 0");
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
        auditService.logMoney(currentUserId(), currentUsername(), "BILLING_CARD_GENERATE", "CARD_KEY",
                null, String.format("生成卡密批次 %s，套餐 #%d，数量 %d", batchNo, packageId, count));
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
    public ResponseEntity<byte[]> exportCards(@RequestParam String batchNo) {
        String text = cardKeyService.export(batchNo);
        auditService.logMoney(currentUserId(), currentUsername(), "BILLING_CARD_EXPORT", "CARD_KEY",
                null, "导出卡密批次 " + batchNo);
        return csvResponse("cards-" + batchNo + ".txt", text, MediaType.TEXT_PLAIN);
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
        String operator = currentUsername();
        boolean wasPending = orderRepository.findById(id)
                .map(o -> o.getStatus() == RechargeOrder.OrderStatus.PENDING).orElse(false);
        RechargeOrder order = tokenService.confirmOrder(id, operator);
        auditService.logMoney(currentUserId(), operator, "BILLING_ORDER_CONFIRM", "RECHARGE_ORDER", id,
                wasPending
                        ? String.format("确认收款 %s：¥%s → %d 积分（用户 #%d）", order.getOrderNo(),
                                order.getPriceYuan(), order.getTokens(), order.getUserId())
                        : String.format("重复点击确认（订单 %s 已是 %s，未重复入账）",
                                order.getOrderNo(), order.getStatus()));
        return ResponseEntity.ok(ApiResponse.success("已确认收款并到账", order));
    }

    @PostMapping("/orders/{id}/cancel")
    public ResponseEntity<ApiResponse<RechargeOrder>> cancelOrder(@PathVariable Long id) {
        RechargeOrder order = tokenService.cancelOrder(id);
        auditService.logMoney(currentUserId(), currentUsername(), "BILLING_ORDER_CANCEL", "RECHARGE_ORDER", id,
                "取消订单 " + order.getOrderNo());
        return ResponseEntity.ok(ApiResponse.success("订单已取消", order));
    }

    /** 订单退款：冲正已到账 Token（幂等），资金类审计留痕 */
    @PostMapping("/orders/{id}/refund")
    public ResponseEntity<ApiResponse<RechargeOrder>> refundOrder(
            @PathVariable Long id, @RequestBody(required = false) Map<String, Object> body) {
        String operator = currentUsername();
        String reason = body == null ? null : str(body, "reason");
        boolean wasPaid = orderRepository.findById(id)
                .map(o -> o.getStatus() == RechargeOrder.OrderStatus.PAID).orElse(false);
        try {
            RechargeOrder order = tokenService.refundOrder(id, operator, reason);
            auditService.logMoney(currentUserId(), operator, "BILLING_ORDER_REFUND", "RECHARGE_ORDER", id,
                    wasPaid
                            ? String.format("订单退款 %s：冲正 %d 积分（用户 #%d），原因：%s", order.getOrderNo(),
                                    order.getTokens(), order.getUserId(),
                                    order.getRefundReason() == null ? "无" : order.getRefundReason())
                            : String.format("重复点击退款（订单 %s 已是 %s，未重复冲正）",
                                    order.getOrderNo(), order.getStatus()));
            return ResponseEntity.ok(ApiResponse.success("已退款并冲正积分", order));
        } catch (RuntimeException e) {
            auditService.logMoneyFailure(currentUserId(), operator, "BILLING_ORDER_REFUND", "RECHARGE_ORDER",
                    id, "退款失败：" + e.getMessage());
            throw e;
        }
    }

    /** 订单导出 CSV（含收款人、退款信息） */
    @GetMapping("/export/orders.csv")
    public ResponseEntity<byte[]> exportOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        List<RechargeOrder> rows = orderRepository.findForExport(
                parseEnum(status, RechargeOrder.OrderStatus.class),
                parseDate(start, true), parseDate(end, false), PageRequest.of(0, 50000));
        StringBuilder sb = new StringBuilder();
        sb.append("订单ID,订单号,用户ID,套餐,金额元,积分数,渠道,状态,创建时间,到账时间,确认人,退款时间,退款人,退款原因\n");
        for (RechargeOrder o : rows) {
            sb.append(o.getId()).append(',')
              .append(csv(o.getOrderNo())).append(',')
              .append(o.getUserId()).append(',')
              .append(csv(o.getPackageName())).append(',')
              .append(o.getPriceYuan()).append(',')
              .append(o.getTokens()).append(',')
              .append(o.getChannel()).append(',')
              .append(o.getStatus()).append(',')
              .append(csv(o.getCreatedAt() == null ? "" : o.getCreatedAt().toString())).append(',')
              .append(csv(o.getPaidAt() == null ? "" : o.getPaidAt().toString())).append(',')
              .append(csv(o.getPaidBy())).append(',')
              .append(csv(o.getRefundedAt() == null ? "" : o.getRefundedAt().toString())).append(',')
              .append(csv(o.getRefundedBy())).append(',')
              .append(csv(o.getRefundReason())).append('\n');
        }
        return csvResponse("recharge-orders-" + LocalDate.now() + ".csv", sb.toString());
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
        long beforePrice = cfg.getPrice();
        boolean beforeEnabled = cfg.isEnabled();
        cfg.setPrice(Math.max(0, toLong(body.get("price"))));
        cfg.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
        String label = str(body, "label");
        if (label != null && !label.isBlank()) cfg.setLabel(label.trim());
        TokenSceneConfig saved = sceneConfigRepository.save(cfg);
        auditService.logMoney(currentUserId(), currentUsername(), "BILLING_SCENE_UPDATE", "TOKEN_SCENE",
                saved.getId(), String.format("%s 单价 %d → %d 积分，启停 %s → %s", saved.getLabel(),
                        beforePrice, saved.getPrice(), beforeEnabled, saved.isEnabled()));
        return ResponseEntity.ok(ApiResponse.success("场景定价已更新", saved));
    }

    /* ==================== 平台设置 ==================== */

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<BillingSetting>> settings() {
        return ResponseEntity.ok(ApiResponse.success(tokenService.getSettings()));
    }

    /**
     * 平台设置：真·部分更新。只传 paymentNote 不会再清空收款码，也不会改动免费额度总开关。
     */
    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<BillingSetting>> updateSettings(@RequestBody Map<String, Object> body) {
        BillingSetting before = tokenService.getSettings();
        String beforeSnapshot = String.format(
                "免费额度:开关=%s/每日=%d/注册=%d，收款码:微信=%s/支付宝=%s，成本单价:输入=%s/输出=%s",
                before.isFreeQuotaEnabled(), before.getDailyFreeTokens(), before.getRegisterBonusTokens(),
                present(before.getWechatQrUrl()), present(before.getAlipayQrUrl()),
                before.getLlmInputPricePerMTok(), before.getLlmOutputPricePerMTok());

        BillingSettingPatch patch = new BillingSettingPatch(
                body.containsKey("dailyFreeTokens") ? toLong(body.get("dailyFreeTokens")) : null,
                body.containsKey("registerBonusTokens") ? toLong(body.get("registerBonusTokens")) : null,
                body.containsKey("freeQuotaEnabled")
                        ? Boolean.TRUE.equals(body.get("freeQuotaEnabled")) : null,
                body.containsKey("rechargeEnabled")
                        ? Boolean.TRUE.equals(body.get("rechargeEnabled")) : null,
                body.containsKey("paymentNote") ? str(body, "paymentNote") : null,
                body.containsKey("wechatQrUrl") ? str(body, "wechatQrUrl") : null,
                body.containsKey("alipayQrUrl") ? str(body, "alipayQrUrl") : null,
                body.containsKey("llmInputPricePerMTok") ? decimal(body.get("llmInputPricePerMTok")) : null,
                body.containsKey("llmOutputPricePerMTok") ? decimal(body.get("llmOutputPricePerMTok")) : null,
                body.containsKey("pendingOrderAlertHours") ? (int) toLong(body.get("pendingOrderAlertHours")) : null);

        BillingSetting saved = tokenService.updateSettings(patch);
        auditService.logMoney(currentUserId(), currentUsername(), "BILLING_SETTINGS_UPDATE", "BILLING_SETTING",
                1L, "平台设置变更｜修改前：" + beforeSnapshot
                        + "｜本次提交字段：" + String.join(",", body.keySet()));
        return ResponseEntity.ok(ApiResponse.success("设置已保存", saved));
    }

    /* ==================== AI 成本与可观测 ==================== */

    /** 成本面板：场景 × 次数 × token × 成本 + 成功率/降级率/P95 延迟 + 日趋势 */
    @GetMapping("/ai-stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> aiStats(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(defaultValue = "30") int days) {
        LocalDateTime from = parseDate(start, true);
        if (from == null) from = LocalDate.now().minusDays(Math.max(1, Math.min(days, 365))).atStartOfDay();
        LocalDateTime to = parseDate(end, false);
        if (to == null) to = LocalDateTime.now().plusDays(1);
        return ResponseEntity.ok(ApiResponse.success(aiCallLogService.stats(from, to)));
    }

    /** AI 调用明细（含 refId，可与流水对齐） */
    @GetMapping("/ai-logs")
    public ResponseEntity<ApiResponse<PageResponse<AiCallLog>>> aiLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String scene,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        Page<AiCallLog> result = aiCallLogService.search(userId, scene,
                parseEnum(status, AiCallLog.CallStatus.class),
                parseDate(start, true), parseDate(end, false), page, size);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(result.getContent(), page, size, result.getTotalElements())));
    }

    @GetMapping("/export/ai-usage.csv")
    public ResponseEntity<byte[]> exportAiUsage(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        LocalDateTime from = parseDate(start, true);
        LocalDateTime to = parseDate(end, false);
        String csv = aiCallLogService.toCsv(from, to, 20000);
        return csvResponse("ai-usage-" + LocalDate.now() + ".csv", csv);
    }

    /* ==================== 审计日志（资金类操作） ==================== */

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<PageResponse<AuditLog>>> auditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end) {
        Page<AuditLog> result = auditService.search(blankToNull(action), blankToNull(username),
                parseDate(start, true), parseDate(end, false),
                PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100)));
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(result.getContent(), page, size, result.getTotalElements())));
    }

    /* ==================== 工具 ==================== */

    private String present(String url) {
        return (url == null || url.isBlank()) ? "未设置" : "已设置";
    }

    private BigDecimal decimal(Object o) {
        if (o == null) return null;
        try {
            return new BigDecimal(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** CSV 统一出口：UTF-8 BOM（Excel 直接打开不乱码）+ RFC 5987 文件名 */
    private ResponseEntity<byte[]> csvResponse(String filename, String content) {
        return csvResponse(filename, content, new MediaType("text", "csv", StandardCharsets.UTF_8));
    }

    private ResponseEntity<byte[]> csvResponse(String filename, String content, MediaType type) {
        byte[] bom = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] body = content.getBytes(StandardCharsets.UTF_8);
        byte[] payload = new byte[bom.length + body.length];
        System.arraycopy(bom, 0, payload, 0, bom.length);
        System.arraycopy(body, 0, payload, bom.length, body.length);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
                .contentType(type)
                .body(payload);
    }

    private String csv(String v) {
        if (v == null) return "";
        if (v.contains(",") || v.contains("\"") || v.contains("\n")) {
            return '"' + v.replace("\"", "\"\"") + '"';
        }
        return v;
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        return 0L;
    }

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
