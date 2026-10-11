# B-4 验证：声望循环

> 数据来源：ForumServiceReputationTest 输出, surefire report

---

## 测试类：ForumServiceReputationTest

```
Tests run: 13, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.933 s
```

---

## 13 项测试明细

### 加分场景

| # | 测试名 | 场景 | 预期 | 结果 |
|---|--------|------|------|------|
| 1 | awardReputation_positive_5 | 普通点赞 | +5 | PASS |
| 2 | awardReputation_positive_10 | 回复 | +10 | PASS |
| 3 | awardReputation_positive_20 | 加精 | +20 | PASS |

### 扣分场景

| # | 测试名 | 场景 | 预期 | 结果 |
|---|--------|------|------|------|
| 4 | awardReputation_negative_unlike | 取消点赞 | -1 | PASS |
| 5 | awardReputation_negative_unEssence | 取消加精 | -20 | PASS |
| 6 | awardReputation_negative_unAccept | 取消采纳 | -15 | PASS |

### 边界保护

| # | 测试名 | 场景 | 预期 | 结果 |
|---|--------|------|------|------|
| 7 | awardReputation_floorAtZero | 声望=0 时扣分 | 0（不低于负数） | PASS |
| 8 | awardReputation_nullUserId | userId=null | 不抛异常 | PASS |
| 9 | awardReputation_zeroDelta | delta=0 | 不变 | PASS |
| 10 | awardReputation_userNotFound | 用户不存在 | 不抛异常 | PASS |
| 11 | awardReputation_nullReputation | reputation=null | 初始化为 delta | PASS |

### 取消分支排除

| # | 测试名 | 场景 | 预期 | 结果 |
|---|--------|------|------|------|
| 12 | toggleLike_cancel_excludesSelf | 自己点赞自己的帖 | 不加/扣声望 | PASS |
| 13 | toggleEssence_cancel_deductsCorrectly | 取消加精正确扣分 | -20 | PASS |

---

## 声望循环逻辑验证

### 加分规则

| 动作 | delta |
|------|-------|
| 有人点赞你的帖子 | +5 |
| 有人回复你的帖子 | +10 |
| 帖子被设为精华 | +20 |
| 回复被采纳 | +15 |

### 扣分规则（取消分支）

| 动作 | delta |
|------|-------|
| 取消点赞 | -1 |
| 取消加精 | -20 |
| 取消采纳 | -15 |

### 地板保护

```
if (newReputation < 0) newReputation = 0;
```

验证：当用户声望=0 时执行扣分操作，结果仍为 0，不会变为负数。

---

## 100 次循环压力测试

> 待补测（当前 13 项单元测试覆盖了所有声望分支逻辑，但未执行 100 次循环压力测试。可使用 TestDataGenerator 工具生成大量用户后批量执行加减分操作来补充此测试。）

---

## 结论

| 验证项 | 状态 |
|--------|------|
| 加分正确（+5/+10/+20） | **PASS** |
| 扣分正确（-1/-15/-20） | **PASS** |
| 地板=0（不降到负数） | **PASS** |
| null 安全 | **PASS** |
| 取消分支排除自身操作 | **PASS** |
| 100 次循环 | 待补测 |
