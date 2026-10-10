# B-7 验证：通知系统与 30s 轮询

> 数据来源：NotificationIntegrationTest 输出, NotificationPolling.test.tsx 输出

---

## 后端测试：NotificationIntegrationTest

```
Tests run: 10, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.268 s
```

### 10 项测试明细

| # | 测试名 | 场景 | 结果 |
|---|--------|------|------|
| 1 | reply_createsNotification | 回复帖子 → 通知作者 | PASS |
| 2 | like_createsNotification | 点赞帖子 → 通知作者 | PASS |
| 3 | follow_createsNotification | 关注用户 → 通知被关注者 | PASS |
| 4 | selfReply_noNotification | 自己回复自己 → 不发通知 | PASS |
| 5 | unreadCount_correct | 未读计数正确 | PASS |
| 6 | markAllRead_batch | 全部已读 → 单条 SQL | PASS |
| 7 | markAllRead_sqlCount | 全部已读 SQL 条数=1 | PASS |
| 8 | markRead_single | 单条已读 | PASS |
| 9 | markRead_otherUser_false | 跨用户已读返回 false | PASS |
| 10 | delete_byOwner | 删除自己的通知 | PASS |

### markAllRead SQL 条数验证

| 指标 | 值 |
|------|-----|
| 验证方式 | `SessionFactory.getStatistics().getPrepareStatementCount()` 调用前后差值 |
| 预期 SQL 条数 | 1（单条 UPDATE） |
| 实测 SQL 条数 | 1 |
| 断言 | PASS |

### markAllRead 实现

```java
@Modifying
@Query("UPDATE Notification n SET n.read = true WHERE n.userId = :userId AND n.read = false")
int markAllRead(@Param("userId") Long userId);
```

---

## 前端测试：NotificationPolling.test.tsx

```
Tests: 5 passed (5)
```

### 5 项测试明细

| # | 测试名 | 场景 | 结果 |
|---|--------|------|------|
| 1 | 初始加载时拉取未读数并显示角标 | 未读数=3 → 显示红色角标"3" | PASS |
| 2 | 30 秒后轮询再次请求未读数 | `vi.advanceTimersByTime(30_000)` → handler 被调用 2 次 | PASS |
| 3 | 未读数为 0 时不显示角标 | 未读数=0 → 无红色角标 | PASS |
| 4 | 未登录时不轮询 | 无 token → 不发请求 | PASS |
| 5 | notifications-changed 事件触发即时刷新 | dispatchEvent → handler 额外调用 1 次 | PASS |

### 定时器处理

```typescript
// 使用 fake timers 避免真实等待
vi.useFakeTimers({ shouldAdvanceTime: true })

// 快进 30 秒
vi.advanceTimersByTime(30_000)

// 用 vi.fn() 包裹 handler 统计请求数
const fn = vi.fn(() => HttpResponse.json({ success: true, data: count }))
```

---

## 通知类型覆盖

| NotificationType | 描述 | 测试覆盖 |
|------------------|------|----------|
| REPLY | 回复了你的帖子 | ✓ |
| LIKE_POST | 赞了你的帖子 | ✓ |
| FOLLOW | 关注了你 | ✓ |
| ESSENCE | 你的帖子被设为精华 | 待补测 |
| ACCEPTED | 采纳了你的回复 | 待补测 |
| MENTION | @提及了你 | 待补测 |
| REPORT_RESULT | 举报处理结果 | 待补测 |
| TEAM_* | 团队系列通知 | 待补测 |
| TOKEN_LOW | Token 余额不足 | 待补测 |
| RECHARGE_PAID | 充值已到账 | 待补测 |
| SYSTEM | 系统通知 | 待补测 |

---

## 30s 轮询录屏

> 待补测（需手动在浏览器中录屏通知角标随轮询变化的过程。测试已用 `vi.useFakeTimers` 验证轮询逻辑正确。）

---

## 结论

| 验证项 | 状态 |
|--------|------|
| 回复通知 | **PASS** |
| 点赞通知 | **PASS** |
| 关注通知 | **PASS** |
| 自身操作不发通知 | **PASS** |
| 未读计数 | **PASS** |
| markAllRead 单 SQL | **PASS** |
| 单条已读 | **PASS** |
| 跨用户权限 | **PASS** |
| 删除通知 | **PASS** |
| 30s 轮询（前端） | **PASS** |
| 未读角标显示/隐藏 | **PASS** |
| 未登录不轮询 | **PASS** |
| 事件驱动即时刷新 | **PASS** |
| 录屏 | 待补测 |
