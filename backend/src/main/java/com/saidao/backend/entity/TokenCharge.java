package com.saidao.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 计费预留单：每次 AI 调用先「预留」一笔 Token，产出有效后结算（SETTLED），
 * 失败/降级/进程中断则释放（RELEASED，原路退回）。
 *
 * <p>存在这张表的意义：
 * <ol>
 *   <li><b>释放幂等</b>：ref_id 唯一 + 状态机，重复释放不会重复退款；</li>
 *   <li><b>可对账</b>：长期停留在 CHARGED 的记录就是「扣了没退」，由补偿任务兜底释放；</li>
 *   <li><b>可归因</b>：ref_id 串起流水、AI 调用日志与具体那次请求。</li>
 * </ol>
 */
@Data
@NoArgsConstructor
@Entity
@Table(name = "token_charge", indexes = {
    @Index(name = "idx_charge_ref", columnList = "ref_id", unique = true),
    @Index(name = "idx_charge_user", columnList = "user_id"),
    @Index(name = "idx_charge_status", columnList = "status"),
    @Index(name = "idx_charge_scene", columnList = "scene")
})
public class TokenCharge {

    public enum ChargeStatus {
        /** 已扣费，等待业务产出（未终结） */
        CHARGED,
        /** 产出有效，正常计费 */
        SETTLED,
        /** 失败/降级/超时，已原路退回 */
        RELEASED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 计费请求唯一标识（全链路归因用，重试幂等键） */
    @Column(name = "ref_id", nullable = false, unique = true, length = 64)
    private String refId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** 场景 key（TokenScene.name()） */
    @Column(nullable = false, length = 40)
    private String scene;

    /** 预留金额（Token 数） */
    @Column(nullable = false)
    private long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private ChargeStatus status = ChargeStatus.CHARGED;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /** 终结时间（结算或释放） */
    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    /** 终结原因（如「AI 降级，本次免扣」「生成失败」） */
    @Column(length = 200)
    private String remark;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public boolean isOpen() {
        return status == ChargeStatus.CHARGED;
    }
}
