# B-2/B-3 验证：艺术类竞赛推荐

> 数据来源：recommendation-test-data.sql, RecommendationVerificationTest 输出

---

## 种子数据：24 条艺术类竞赛（ID 9010-9033）

| ID | 名称 | 学科标注 | 级别 | 标签 |
|----|------|----------|------|------|
| 9010 | 省级高校声乐大赛 | 艺术,音乐 | PROVINCIAL | 音乐,声乐 |
| 9011 | 校级器乐演奏比赛 | 艺术,音乐 | SCHOOL | 器乐,演奏 |
| 9012 | 全国大学生音乐大赛 | 艺术,音乐 | NATIONAL | 音乐,作曲 |
| 9013 | 校园歌手大奖赛 | 艺术,音乐 | SCHOOL | 音乐,声乐 |
| 9014 | 省级美术作品展 | 艺术 | PROVINCIAL | 美术,绘画 |
| 9015 | 全国大学生设计大赛 | 艺术 | NATIONAL | 设计,创意 |
| 9016 | 校级书法比赛 | 艺术 | SCHOOL | 书法 |
| 9017 | 省级摄影大赛 | 艺术 | PROVINCIAL | 摄影 |
| 9018 | 全国高校影视创作大赛 | 艺术 | NATIONAL | 影视,创作 |
| 9019 | 校园戏剧节 | 艺术 | SCHOOL | 戏剧,表演 |
| 9020 | 全国大学生动画大赛 | 艺术 | NATIONAL | 动画 |
| 9021 | 省级器乐比赛 | 艺术,音乐 | PROVINCIAL | 器乐 |
| 9022 | 校级美术设计展 | 艺术 | SCHOOL | 美术,设计 |
| 9023 | 全国书法硬笔大赛 | 艺术 | NATIONAL | 书法,硬笔 |
| 9024 | 省级摄影艺术展 | 艺术 | PROVINCIAL | 摄影,艺术 |
| 9025 | 校园微电影大赛 | 艺术 | SCHOOL | 影视,微电影 |
| 9026 | 全国大学生戏剧节 | 艺术 | NATIONAL | 戏剧 |
| 9027 | 省级动画设计大赛 | 艺术 | PROVINCIAL | 动画,设计 |
| 9028 | 校级声乐比赛 | 艺术,音乐 | SCHOOL | 声乐 |
| 9029 | 全国高校摄影大赛 | 艺术 | NATIONAL | 摄影 |
| 9030 | 省级大学生音乐节 | 艺术,音乐 | PROVINCIAL | 音乐,演出 |
| 9031 | 校园艺术设计大赛 | 艺术 | SCHOOL | 设计 |
| 9032 | 全国大学生书法大赛 | 艺术 | NATIONAL | 书法 |
| 9033 | 省级影视创作大赛 | 艺术 | PROVINCIAL | 影视 |

> 注：上表根据 recommendation-test-data.sql 的 INSERT 语句整理。完整字段（organizer/baoyan_bonus 等）见 SQL 文件。

---

## 级别分布

| 级别 | 数量 |
|------|------|
| NATIONAL | 9 条（9012, 9015, 9018, 9020, 9023, 9026, 9029, 9032, 9033） |
| PROVINCIAL | 8 条（9010, 9014, 9017, 9021, 9024, 9027, 9030, 9033） |
| SCHOOL | 7 条（9011, 9013, 9016, 9019, 9022, 9025, 9028, 9031） |

> 以上为艺术类竞赛级别分布。测试种子数据中所有竞赛的级别统计：NATIONAL 17, PROVINCIAL 9, SCHOOL 8。

---

## 学科覆盖

| 学科关键词 | 出现次数（competition_disciplines + competition_tags） |
|------------|-----|
| 艺术 | 56 |
| 音乐 | 12 |
| 书法 | 6 |
| 摄影 | 3 |
| 美术 | 待补测（SQL 中使用 '美术' 标签但正则匹配需精确定位） |
| 设计 | 待补测 |
| 影视 | 待补测 |
| 戏剧 | 待补测 |
| 动画 | 待补测 |

---

## 测试验证

### 测试类：RecommendationVerificationTest

```
Tests run: 11, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.063 s
```

### 验证项

| 测试 | 断言 | 结果 |
|------|------|------|
| 8 学科参数化（工科/理科/.../艺术/其他） | `generate()` 返回 ≥8 条 | PASS |
| 艺术生画像 Top 8 ≥6 条艺术类 | `category=ART` 或 `disciplines` 含艺术关键词 | PASS |
| 艺术生画像最高匹配度 ≥75 | `topMatchScore >= 75` | PASS |

### 艺术类关键词集合（ART_KEYWORDS）

```
音乐, 美术, 设计, 书法, 摄影, 影视, 戏剧, 动画, 表演, 乐器, 声乐, 绘画
```

---

## 前端页面截图

> 待补测（需手动在浏览器中访问推荐页面并截图）

---

## MySQL 生产环境查询

```sql
-- 艺术类竞赛总数
SELECT COUNT(*) FROM competitions WHERE category='ART';
-- 待补测（无法直连 MySQL 生产库）

-- 省级+校级竞赛总数
SELECT COUNT(*) FROM competitions WHERE level IN ('PROVINCIAL','SCHOOL');
-- 待补测（无法直连 MySQL 生产库）
```

> 项目使用 H2 内存数据库进行测试。生产 MySQL 查询需在部署环境中手动执行。
