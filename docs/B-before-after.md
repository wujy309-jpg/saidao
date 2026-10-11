# B 阶段验收报告 — 前后对比与测试证据

> 生成时间：2026-10-10  
> 数据来源：backend/target/surefire-reports/*.txt, frontend vitest 输出, ForumPerformanceTest stdout  
> 约束：禁止编造数字，缺少数据处标注"待补测"

---

## B-1：8 学科推荐覆盖（工科/理科/文科/经管/医学/农学/艺术/其他）

| 项目 | 值 |
|------|-----|
| 测试类 | RecommendationVerificationTest |
| 验证命令 | `mvn test -Dtest=RecommendationVerificationTest` |
| 结果 | **11/11 通过** |
| 关键数字 | 8 学科各构造画像 → `generate()` 返回结果 ≥8 条/学科 |
| 耗时 | 2.063 s |
| 状态 | **PASS** |

证据来源：`backend/target/surefire-reports/com.saidao.backend.service.RecommendationVerificationTest.txt`

---

## B-2：艺术类竞赛筛选（Top 8 中 ≥6 条艺术类）

| 项目 | 值 |
|------|-----|
| 测试类 | RecommendationVerificationTest（`@ParameterizedTest` 艺术分支） |
| 验证命令 | `mvn test -Dtest=RecommendationVerificationTest#artStudent_*` |
| 结果 | **通过** |
| 关键数字 | 画像=艺术+兴趣=音乐,绘画 → Top 8 中 ≥6 条 `category` 为 ART 或 `disciplines` 含艺术类关键词 |
| 种子数据 | recommendation-test-data.sql 中 24 条艺术类竞赛（ID 9010-9033） |
| 艺术学科覆盖 | 音乐(12)、书法(6)、摄影(3)、影视、戏剧、动画 |
| 状态 | **PASS** |

---

## B-3：艺术生画像最高匹配度 ≥75

| 项目 | 值 |
|------|-----|
| 测试类 | RecommendationVerificationTest |
| 验证命令 | `mvn test -Dtest=RecommendationVerificationTest#artStudent_topMatchScore` |
| 结果 | **通过** |
| 关键数字 | 艺术生画像最高匹配度 ≥ 75 |
| 状态 | **PASS** |

---

## B-4：声望循环（加扣分、地板为零、取消分支）

| 项目 | 值 |
|------|-----|
| 测试类 | ForumServiceReputationTest |
| 验证命令 | `mvn test -Dtest=ForumServiceReputationTest` |
| 结果 | **13/13 通过** |
| 关键数字 | 加分（+5/+10/+20）、扣分（-1/-15/-20）、地板=0、null 安全、取消分支（unlike -1, un-essence -20, un-accept -15）、自身操作排除 |
| 耗时 | 0.933 s |
| 状态 | **PASS** |

证据来源：`backend/target/surefire-reports/com.saidao.backend.service.ForumServiceReputationTest.txt`

详见：[B-verification-reputation.md](B-verification-reputation.md)

---

## B-5：论坛公开访问（GET permitAll，写操作需认证）

| 项目 | 值 |
|------|-----|
| 测试类 | ForumPublicAccessTest |
| 验证命令 | `mvn test -Dtest=ForumPublicAccessTest` |
| 结果 | **9/9 通过** |
| 关键数字 | 5 个 GET 端点免认证可访问（/posts, /posts/{id}, /posts/{id}/replies, /boards, /favorites），4 个 POST/DELETE 返回 403 |
| 耗时 | 0.153 s |
| 状态 | **PASS** |

证据来源：`backend/target/surefire-reports/com.saidao.backend.controller.ForumPublicAccessTest.txt`

---

## B-6：论坛 CRUD 集成（发帖/回帖/点赞/收藏/删除）

| 项目 | 值 |
|------|-----|
| 测试类 | ForumControllerIntegrationTest |
| 验证命令 | `mvn test -Dtest=ForumControllerIntegrationTest` |
| 结果 | **11/11 通过** |
| 关键数字 | 发帖（认证/未认证）、帖子详情、DTO 列表、回帖、点赞切换、收藏切换、板块列表、删除（作者/非作者） |
| 耗时 | 15.94 s |
| 状态 | **PASS** |

证据来源：`backend/target/surefire-reports/com.saidao.backend.controller.ForumControllerIntegrationTest.txt`

---

## B-7：通知系统（回复/点赞/关注/已读/删除）

| 项目 | 值 |
|------|-----|
| 测试类 | NotificationIntegrationTest |
| 验证命令 | `mvn test -Dtest=NotificationIntegrationTest` |
| 结果 | **10/10 通过** |
| 关键数字 | 回复通知、点赞通知、关注通知、自身回复不发通知、未读计数、markAllRead 单 SQL、单条已读、跨用户已读=false、删除 |
| 耗时 | 0.268 s |
| 状态 | **PASS** |

证据来源：`backend/target/surefire-reports/com.saidao.backend.service.NotificationIntegrationTest.txt`

详见：[B-verification-notification.md](B-verification-notification.md)

---

## B-8：举报与审核（提交/去重/阈值自动隐藏/审核处理）

| 项目 | 值 |
|------|-----|
| 测试类 | ForumReportIntegrationTest |
| 验证命令 | `mvn test -Dtest=ForumReportIntegrationTest` |
| 结果 | **8/8 通过** |
| 关键数字 | 提交举报、重复举报阻止、null 目标拒绝、3 条举报触发自动隐藏、审核通过→隐藏、审核驳回→不隐藏、按状态列表、回复举报 |
| 耗时 | 0.268 s |
| 状态 | **PASS** |

证据来源：`backend/target/surefire-reports/com.saidao.backend.service.ForumReportIntegrationTest.txt`

---

## B-9：安全防护（SQL 注入/XSS/权限边界/隐藏帖）

| 项目 | 值 |
|------|-----|
| 测试类 | ForumSecurityTest |
| 验证命令 | `mvn test -Dtest=ForumSecurityTest` |
| 结果 | **8/8 通过** |
| 关键数字 | SQL 注入 keyword 不返回全表、SQL 注入 board 枚举无效、XSS 标题、XSS 正文、非管理员不可加精、非管理员不可置顶、管理员可加精、隐藏帖不可见 |
| 耗时 | 0.141 s |
| 状态 | **PASS** |

证据来源：`backend/target/surefire-reports/com.saidao.backend.controller.ForumSecurityTest.txt`

详见：[B-security-attack.md](B-security-attack.md)

---

## B-10：性能与 N+1 消除（SQL 条数断言）

| 项目 | 值 |
|------|-----|
| 测试类 | ForumPerformanceTest |
| 验证命令 | `mvn test -Dtest=ForumPerformanceTest` |
| 结果 | **3/3 通过** |
| 关键数字 | listPosts 20条: SQL count=5, elapsed=9ms; listPosts 分页50条: SQL count=5, elapsed=34ms; getPost 单帖: SQL count=2, elapsed=8ms |
| 阈值 | 分页查询 SQL ≤10（实际 5），单帖查询 SQL ≤3（实际 2） |
| 耗时 | 7.839 s |
| 状态 | **PASS** |

证据来源：`backend/target/surefire-reports/com.saidao.backend.service.ForumPerformanceTest.txt`

详见：[B-verification-forum-perf.md](B-verification-forum-perf.md)

---

## B-11：前端页面测试（用户主页/帖子详情/通知轮询/举报）

| 项目 | 值 |
|------|-----|
| 测试文件 | UserProfilePage.test.tsx, ForumPostPage.test.tsx, NotificationPolling.test.tsx, ReportButton.test.tsx |
| 验证命令 | `npm run test:run` |
| 结果 | **22/22 通过**（4 文件） |
| 关键数字 | 用户主页 5/5、帖子详情 8/8、通知轮询 5/5、举报入口 4/4 |
| 状态 | **PASS** |

证据来源：vitest stdout 输出

---

## 前端测试结果明细

| 测试文件 | 测试数 | 状态 |
|----------|--------|------|
| UserProfilePage.test.tsx | 5 | PASS |
| ForumPostPage.test.tsx | 8 | PASS |
| NotificationPolling.test.tsx | 5 | PASS |
| ReportButton.test.tsx | 4 | PASS |
| **合计** | **22** | **4 文件全通过** |

---

## 后端测试结果明细

| 测试类 | Tests | Failures | Errors | Skipped | Time |
|--------|-------|----------|--------|---------|------|
| ForumControllerIntegrationTest | 11 | 0 | 0 | 0 | 15.94s |
| ForumPublicAccessTest | 9 | 0 | 0 | 0 | 0.153s |
| ForumSecurityTest | 8 | 0 | 0 | 0 | 0.141s |
| AuthServiceTest | 6 | 0 | 0 | 0 | 1.271s |
| ForumPerformanceTest | 3 | 0 | 0 | 0 | 7.839s |
| ForumReportIntegrationTest | 8 | 0 | 0 | 0 | 0.268s |
| ForumServiceReputationTest | 13 | 0 | 0 | 0 | 0.933s |
| NotificationIntegrationTest | 10 | 0 | 0 | 0 | 0.268s |
| RecommendationVerificationTest | 11 | 0 | 0 | 0 | 2.063s |
| **合计** | **79** | **0** | **0** | **0** | ~29s |

---

## 测试种子数据统计

| 数据项 | 数量 | 来源 |
|--------|------|------|
| 艺术类竞赛种子数据 | 24 条（ID 9010-9033） | recommendation-test-data.sql |
| 竞赛 INSERT 总数 | 34 条 | recommendation-test-data.sql |
| 艺术学科标注（competition_disciplines） | 56 处 '艺术' | recommendation-test-data.sql |
| 音乐标注 | 12 处 | recommendation-test-data.sql |
| 书法标注 | 6 处 | recommendation-test-data.sql |
| 摄影标注 | 3 处 | recommendation-test-data.sql |
| NATIONAL 级别 | 17 条 | recommendation-test-data.sql |
| PROVINCIAL 级别 | 9 条 | recommendation-test-data.sql |
| SCHOOL 级别 | 8 条 | recommendation-test-data.sql |

> 注：MySQL 生产环境查询 `SELECT COUNT(*) FROM competitions WHERE category='ART'` 和省级/校级统计 → **待补测**（项目使用 H2 测试数据库，无法直连 MySQL 生产库）

---

## 结论

| 验收标准 | 描述 | 状态 |
|----------|------|------|
| B-1 | 8 学科推荐覆盖 | **PASS** |
| B-2 | 艺术类竞赛筛选 Top 8 ≥6 | **PASS** |
| B-3 | 艺术生匹配度 ≥75 | **PASS** |
| B-4 | 声望循环（加扣分/地板/取消） | **PASS** |
| B-5 | 论坛公开访问 permitAll | **PASS** |
| B-6 | 论坛 CRUD 集成 | **PASS** |
| B-7 | 通知系统 | **PASS** |
| B-8 | 举报与审核 | **PASS** |
| B-9 | 安全防护 | **PASS** |
| B-10 | 性能/N+1 消除 | **PASS** |
| B-11 | 前端页面测试 | **PASS** |

**总计：后端 79/79 通过 + 前端 22/22 通过 = 101/101 全部 PASS**
