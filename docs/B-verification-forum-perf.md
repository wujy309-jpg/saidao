# B-10 验证：论坛性能与 N+1 消除

> 数据来源：ForumPerformanceTest stdout, surefire report

---

## 测试类：ForumPerformanceTest

```
Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 7.839 s
```

---

## 测试环境

| 项 | 值 |
|----|-----|
| 数据库 | H2 内存数据库 |
| Hibernate 统计 | `generate_statistics: true` |
| 统计方式 | `SessionFactory.getStatistics().getPrepareStatementCount()` |
| DataInitializer 演示帖 | 2 条（p1, p2） |

---

## 测试 1：listPosts 20 条 — SQL 条数

| 指标 | 值 |
|------|-----|
| 测试名 | listPosts_20Posts_sqlCountUnderThreshold |
| 插入帖子数 | 20 条（+ DataInitializer 2 条 = 22 条总量） |
| SQL count | **5** |
| 阈值 | ≤ 10 |
| elapsed | 9 ms |
| 断言 | `sqlCount <= 10` → PASS |
| 状态 | **PASS** |

### 优化前（N+1 问题）

> 优化前未直接测量。根据代码分析，重构前 `listPosts()` 逐条查询作者信息和团队信息，N 条帖子会产生 1（分页）+ N（作者）+ N（团队）= 1+2N 条 SQL。20 条帖子约为 41 条 SQL。

### 优化后

| 指标 | 优化前（估算） | 优化后（实测） | 改善 |
|------|--------------|--------------|------|
| SQL 条数（20 帖） | ~41 | **5** | 降低 87.8% |

---

## 测试 2：listPosts 分页 50 条

| 指标 | 值 |
|------|-----|
| 测试名 | listPosts_50Posts_paginationWorks |
| 插入帖子数 | 50 条（+ DataInitializer 2 条 = 52 条总量） |
| SQL count | **5** |
| 阈值 | ≤ 10 |
| elapsed | 34 ms |
| 断言 | `page1.getContent().size() == 20`, `page1.getTotalElements() >= 50`, `sqlCount <= 10` → PASS |
| 状态 | **PASS** |

### 优化前 vs 优化后

| 指标 | 优化前（估算） | 优化后（实测） |
|------|--------------|--------------|
| SQL 条数（50 帖） | ~101 | **5** |
| 改善 | — | 降低 95.0% |

---

## 测试 3：getPost 单帖详情

| 指标 | 值 |
|------|-----|
| 测试名 | getPost_singleQuery |
| SQL count | **2** |
| 阈值 | ≤ 3 |
| elapsed | 8 ms |
| 断言 | `sqlCount <= 3` → PASS |
| 状态 | **PASS** |

### 优化说明

单帖详情查询 2 条 SQL：
1. 查询帖子本身（含分页）
2. 查询关联数据（作者信息/团队信息批量预加载）

---

## N+1 消除方案

### 重构前

```
listPosts() → 1 条分页 SQL + N 条作者查询 + N 条团队查询 = 1 + 2N
```

### 重构后

```
listPosts() → 1 条分页 SQL + 1 条作者批量查询 + 1 条团队批量查询 + 1 条统计 = 5（固定）
```

### 关键技术

| 技术 | 说明 |
|------|------|
| Specification 动态查询 | JPA Criteria API 构建动态 WHERE 条件 |
| DTO 投影 | `ForumPostDTO` record 避免懒加载触发 N+1 |
| 批量预加载 | `userRepository.findAllById(authorIds)` 一次查回所有作者 |
| TeamBrief 批量 | `TeamQueryService.getBriefs()` 批量获取团队信息 |

---

## 2000 帖性能测试

> 待补测（当前测试最大数据量为 50 条帖子。2000 帖性能测试可使用 `TestDataGenerator.createPosts(users, 2000)` 生成数据后扩展 ForumPerformanceTest。SQL 条数应保持 5 条不变，因 N+1 已消除。）

---

## 结论

| 验证项 | 阈值 | 实测 | 状态 |
|--------|------|------|------|
| listPosts 20 帖 SQL | ≤10 | 5 | **PASS** |
| listPosts 50 帖 SQL | ≤10 | 5 | **PASS** |
| getPost 单帖 SQL | ≤3 | 2 | **PASS** |
| 2000 帖性能 | — | — | 待补测 |
| 绝对时间 | 仅记录 | 9/34/8 ms | 记录（H2 内存库，不代表生产 MySQL 性能） |
