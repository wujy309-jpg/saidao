package com.training.backend.controller;

import com.training.backend.dto.ApiResponse;
import com.training.backend.dto.PageResponse;
import com.training.backend.entity.BillingSetting;
import com.training.backend.entity.RechargeOrder;
import com.training.backend.entity.TokenAccount;
import com.training.backend.entity.TokenPackage;
import com.training.backend.entity.TokenSceneConfig;
import com.training.backend.entity.TokenTransaction;
import com.training.backend.repository.RechargeOrderRepository;
import com.training.backend.repository.TokenPackageRepository;
import com.training.backend.repository.TokenSceneConfigRepository;
import com.training.backend.service.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 用户端 Token 接口（余额/套餐/订单/卡密/流水）
 */
@RestController
@RequestMapping("/token")
@RequiredArgsConstructor
public class TokenController {

    private final TokenService tokenService;
    private final TokenPackageRepository packageRepository;
    private final TokenSceneConfigRepository sceneConfigRepository;
    private final RechargeOrderRepository orderRepository;

    /** 我的余额账户 */
    @GetMapping("/balance")
    public ResponseEntity<ApiResponse<TokenAccount>> balance() {
        return ResponseEntity.ok(ApiResponse.success(tokenService.getOrCreateAccount(currentUserId())));
    }

    /** 场景单价列表（前端展示「本次约消耗 X Token」） */
    @GetMapping("/scenes")
    public ResponseEntity<ApiResponse<List<TokenSceneConfig>>> scenes() {
        return ResponseEntity.ok(ApiResponse.success(sceneConfigRepository.findAllByOrderBySortOrderAscIdAsc()));
    }

    /** 上架套餐 */
    @GetMapping("/packages")
    public ResponseEntity<ApiResponse<List<TokenPackage>>> packages() {
        return ResponseEntity.ok(ApiResponse.success(packageRepository.findByEnabledTrueOrderBySortOrderAscIdAsc()));
    }

    /** 收款说明/收款码（充值页展示） */
    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<Map<String, String>>> settings() {
        BillingSetting s = tokenService.getSettings();
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "paymentNote", s.getPaymentNote() == null ? "" : s.getPaymentNote(),
                "wechatQrUrl", s.getWechatQrUrl() == null ? "" : s.getWechatQrUrl(),
                "alipayQrUrl", s.getAlipayQrUrl() == null ? "" : s.getAlipayQrUrl()
        )));
    }

    /** 创建充值订单（人工确认收款模式） */
    @PostMapping("/orders")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createOrder(@RequestBody Map<String, Object> body) {
        Long userId = currentUserId();
        Long packageId = toLong(body.get("packageId"));
        TokenPackage pkg = packageId == null ? null
                : packageRepository.findById(packageId).orElseThrow(() -> new IllegalArgumentException("套餐不存在"));
        if (pkg == null) throw new IllegalArgumentException("请选择套餐");
        if (!pkg.isEnabled()) throw new IllegalArgumentException("该套餐已下架");

        RechargeOrder order = new RechargeOrder();
        order.setOrderNo(generateOrderNo());
        order.setUserId(userId);
        order.setPackageId(pkg.getId());
        order.setPackageName(pkg.getName());
        order.setPriceYuan(pkg.getPriceYuan());
        order.setTokens(pkg.totalTokens());
        order.setChannel(parseChannel(body.get("channel")));
        order.setStatus(RechargeOrder.OrderStatus.PENDING);
        orderRepository.save(order);

        BillingSetting s = tokenService.getSettings();
        return ResponseEntity.ok(ApiResponse.success("订单已创建，请转账后联系管理员确认", Map.of(
                "order", order,
                "payment", Map.of(
                        "paymentNote", s.getPaymentNote() == null ? "" : s.getPaymentNote(),
                        "wechatQrUrl", s.getWechatQrUrl() == null ? "" : s.getWechatQrUrl(),
                        "alipayQrUrl", s.getAlipayQrUrl() == null ? "" : s.getAlipayQrUrl()
                )
        )));
    }

    /** 我的订单 */
    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<PageResponse<RechargeOrder>>> myOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<RechargeOrder> result = orderRepository.findByUserIdOrderByIdDesc(
                currentUserId(), PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 50)));
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                result.getContent(), page, size, result.getTotalElements())));
    }

    /** 卡密兑换 */
    @PostMapping("/redeem")
    public ResponseEntity<ApiResponse<Map<String, Object>>> redeem(@RequestBody Map<String, String> body) {
        TokenTransaction tx = tokenService.redeemCard(currentUserId(), body.getOrDefault("code", ""));
        return ResponseEntity.ok(ApiResponse.success("兑换成功，到账 " + tx.getAmount() + " Token",
                Map.of("transaction", tx, "balance", tx.getBalanceAfter())));
    }

    /** 我的流水 */
    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<PageResponse<TokenTransaction>>> transactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<TokenTransaction> result = tokenService.myTransactions(currentUserId(), page, size);
        return ResponseEntity.ok(ApiResponse.success(PageResponse.of(
                result.getContent(), page, size, result.getTotalElements())));
    }

    /* ==================== 工具 ==================== */

    private RechargeOrder.PayChannel parseChannel(Object o) {
        try {
            return RechargeOrder.PayChannel.valueOf(String.valueOf(o));
        } catch (Exception e) {
            return RechargeOrder.PayChannel.OTHER;
        }
    }

    private String generateOrderNo() {
        return "O" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmssSSS"))
                + String.format("%04d", ThreadLocalRandom.current().nextInt(10000));
    }

    private Long toLong(Object o) {
        if (o == null) return null;
        try {
            return Long.valueOf(String.valueOf(o));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long id) {
            return id;
        }
        throw new IllegalStateException("未登录");
    }
}
