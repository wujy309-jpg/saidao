# 赛道 · 找到你的赛道

大学生竞赛一站式平台：完成一份画像问卷，AI 根据你的学科、年级、兴趣、技能和目标，从内置竞赛库中推荐最适合你的比赛（覆盖工科 / 理科 / 文科 / 综合），附匹配度与推荐理由。平台还提供竞赛收藏跟踪、团队组队、项目空间（团队文件共享）与论坛社区。

## 核心流程

```
注册/登录 → 画像问卷（6步引导式，支持自定义输入） → 大模型生成推荐（匹配度+理由）
        → 竞赛库浏览/搜索/筛选 → 竞赛详情/收藏跟踪
        → 团队广场（创建团队/申请加入/队长审批） → 项目空间（代码/PPT/文档共享协作）
        → 论坛（找队友/竞赛问答/经验分享/综合交流）
```

**游客免注册体验**：无需登录即可浏览竞赛库/详情，并可先完成画像问卷（暂存本地），注册或登录后自动保存画像并生成推荐。

## AI 竞赛助手

学生选定比赛后,助手自动加载该竞赛的**官网规则与评审标准**(种子库整理)、**历年优秀作品**、**学生画像与参赛状态**、**团队与项目空间文件**、**备赛计划进度**作为上下文,通过流式对话(SSE 打字机输出)帮学生:

- 解读赛制规则、报名流程与评审标准;
- 制定参赛方案与备赛策略;
- 直接产出比赛文书:商业计划书、论文框架、答辩 PPT 大纲、申报书、策划案等。

会话持久化,历史可回看;支持**暂停/继续生成**(中断后保留已写内容,可从断点续写);DeepSeek API 未配置时自动降级为通用建议。竞赛详情页「找 AI 助手帮忙」与侧边栏「AI 助手」均可进入。

**我的资料(用户上传)**:右栏「已加载的比赛资料」中可上传自己的规则/要求/笔记文件(txt/md/pdf,单个 ≤5MB,最多 10 个),PDF 自动提取文本,上传后自动注入助手上下文,AI 回答时以用户上传的要求为最高优先级依据。

**作品生成与落库**:让助手"生成小程序/网站作品"时按文件块输出(每个文件以 `FILE: 路径` + 代码块),每个文件可一键**存入项目空间**(选仓库/分支批量提交),也可全部存入;项目空间对 .html 文件支持**在线预览运行**(iframe),小程序文件可下载后导入微信开发者工具。

## 赛程日历与截止提醒

- 竞赛卡片/详情页展示**报名状态徽章**（未开始/报名中/已截止）与**截止倒计时**，7 天内截止红色高亮；
- 「赛程日历」页以月视图标注报名截止与比赛时间，支持「我的关注 / 全部竞赛」切换，附未来 60 天截止清单；
- 首页对收藏竞赛展示**「即将截止」提醒条**。

## 竞赛富标签

竞赛库支持按**竞赛目录**（教育部目录 / 高教学会榜单 / 行业大赛 / 国际赛事）与**保研加分**筛选，竞赛卡片与详情页展示目录徽章、保研加分、报名费说明。

## 团队

围绕参赛项目的一等公民概念：
- **创建团队**：队名、口号、介绍、人数上限、目标竞赛，创建者自动成为队长
- **招募与审批**：团队开启招募后，学生提交申请（附自我介绍），队长审批通过/拒绝
- **成员管理**：队长可移除成员、解散团队；队员可自行退出
- **团队项目空间**：团队可挂靠多个项目空间，团队主页聚合成员与项目

## 论坛

四大板块：**找队友**（可挂靠团队招募）/ **竞赛问答** / **经验分享** / **综合交流**；支持发帖、回帖、浏览数统计，作者或管理员可删除。

社区互动体系：
- **总论坛 / 校区双空间**：默认看全国同学帖子;切换到「校区」只展示**本校同学**的帖子(基于画像里的学校,未填写的引导补全),更适合找本校队友线下组队;
- **点赞/收藏/关注**：帖子与回复可点赞、帖子可收藏、可关注作者；
- **通知中心**：侧边栏铃铛实时显示未读数，被回复/被点赞/被关注/加精都会收到站内通知；
- **内容发现**：板块内「最新/热门」双排序（互动加权+时间衰减）、全局搜索（标题/正文/作者/竞赛名）；
- **竞赛标签**：发帖可关联竞赛，竞赛详情页聚合展示「社区相关帖子」并可直接"分享参赛经验"；
- **找队友闭环**：找队友帖挂团队卡，帖内一键申请，实时显示招募进度（已招 X/上限 Y）；
- 管理员可设置**精华帖**与**置顶帖**（列表与详情有徽章，作者收到通知并获声望）;
- **声望与等级**：发帖+2 / 回帖+1 / 被赞+1 / 被采纳+15 / 加精+20；等级徽章（新手→活跃→达人→竞赛之星）展示在作者处；画像可填**学校与获奖履历**，管理员可**认证身份**（蓝色"已认证"标识）;
- **问答采纳**：楼主或管理员可采纳最佳回复（绿色高亮 + 回复者 +15 声望 + 通知）;
- **AI 内容助手**：发帖框支持 AI 润色 / AI 扩写 / AI 智能建议板块与竞赛标签（复用 DeepSeek）。

## 项目空间

为团队参赛项目提供文件共享与协作：
- **任意文件上传/下载**：代码、PPT、Word、PDF、图片、压缩包等（二进制存磁盘，大文件友好）
- 在线新建代码文件、分支管理、提交历史
- **成员管理**：按用户名搜索邀请队友，角色分 管理员/开发者/访客，可移除或调整
- 项目空间删除（仅所有者/管理员），删除时自动清理磁盘文件

## Token 计费与商业化

平台所有 AI 能力（AI 助手、备赛计划、竞赛推荐、论坛 AI 润色/建议）统一接入 **Token 计费体系**：

- **免费额度获客**：注册送 50 Token，每日登录送 5 Token（后台可调、可一键关闭）；
- **按量付费**：每个 AI 场景按次扣 Token（默认 5-30 Token/次，场景单价后台实时可调），余额不足返回 402 并引导充值；
- **先扣后用、失败自动退**：`@CostTokens` AOP 统一扣费，接口异常自动退款留痕；余额扣减走数据库悲观锁，并发下不为负；
- **充值方式**：充值中心（`/recharge`）购买套餐（转账 + 管理员后台确认收款，幂等入账）/ 卡密兑换（16 位兑换码，一次核销）；
- **充值套餐**：¥6/¥12/¥30/¥68/¥128 五档（基础 + 赠送梯度折扣），后台可增删改/上下架；
- **流水可对账**：充值/卡密/扣费/退款/赠送/手动调整全部写入 `TokenTransaction`，用户端与后台均可检索。

详细商业模式、定价测算（综合毛利 ≥75%）与实施规划见 `docs/商业化与Token收费方案.md`。

## 运营管理后台（挂在 /api/admin/）

独立 SPA（`admin-console/`，同主站技术栈，独立构建独立登录），生产地址 `http://<域名>/api/admin/`（本地开发 `cd admin-console && npm run dev` → 5175），仅 ADMIN 角色可进入：

- **总览**：今日/累计营收、到账与消耗 Token、按场景 AI 调用统计、待确认订单、最近订单；
- **用户与余额**：用户列表（带余额/累计充值/消耗）、手动加币/扣币（留痕）、用户流水；沿用认证/重置密码/删除；
- **Token 流水**：全量检索（用户/类型/场景/日期）+ 分页；
- **充值套餐 / 卡密管理**：套餐 CRUD 与上下架；按套餐批量生成卡密（1-500 张/批）、批次查询、导出 TXT；
- **订单管理**：待确认订单【确认收款】即自动到账（防重复入账）、取消订单；
- **场景定价**：9 个 AI 场景单价与收费开关实时调整；
- **平台设置**：注册赠送/每日免费额度/免费开关、收款说明、微信/支付宝收款码；
- **竞赛管理**：原主站后台竞赛 CRUD 迁入（主站 `/admin` 路由已移除）。

## 技术栈

### 后端（backend/）
- Spring Boot 3.2.0 + Spring Data JPA + Spring Security + JWT
- H2 文件数据库（开发，数据落盘于 `backend/data/`，重启不丢）/ MySQL 8（生产，`application-mysql.yml`）
- DeepSeek 大模型（`DEEPSEEK_API_KEY` 环境变量注入；未配置时自动降级为规则推荐）

### 前端（frontend/）
- React 19 + Vite + TypeScript + Tailwind CSS v4 + React Router
- Phosphor Icons；开发端口 5174

## 快速开始

### 环境要求
- JDK 17+、Maven 3.6+（后端）
- Node.js 20+（前端）

### 1. 启动后端（默认 H2 + 内置 59 个竞赛种子数据）

```bash
cd backend
mvn spring-boot:run
```

后端 API：http://localhost:8080/api ，Swagger：http://localhost:8080/api/swagger-ui.html

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

浏览器打开 http://localhost:5174 。Vite 已配置 `/api` 代理到后端 8080。

### 演示账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 学生 | student01 / student02 / student03 | student123 |

演示学生自带画像，登录后首页可直接点击「重新生成推荐」。

## 主要接口

| 模块 | 接口 |
|------|------|
| 认证 | `POST /api/auth/register`（学生自助注册）、`POST /api/auth/login`、`POST /api/auth/refresh`、`PUT /api/auth/change-password` |
| 画像 | `GET/PUT /api/profile` |
| 竞赛库 | `GET /api/competitions`（category/level/format/keyword/catalogList/baoyanBonus 筛选）、`GET /api/competitions/{id}`、`GET /api/competitions/{id}/similar`（相似推荐）、`GET /api/competitions/{id}/works`（历年优秀作品）、`POST /api/competitions/{id}/favorite`、`PUT /api/competitions/{id}/status`（参赛状态）、`GET /api/competitions/mine`（我的竞赛）、`POST/DELETE /api/competitions/{id}/feedback`（行为反馈） |
| AI 助手 | `GET /api/assistant/sessions`、`GET /api/assistant/sessions/{id}/messages`、`DELETE /api/assistant/sessions/{id}`、`GET /api/assistant/context/{competitionId}`（上下文）、`POST /api/assistant/chat`（SSE 流式对话）、`POST /api/assistant/chat/continue`（断点续写）、`PUT /api/assistant/messages/{id}`（暂停回写）、`GET/POST/DELETE /api/assistant/documents*`（我的资料上传） |
| 备赛计划 | `POST /api/preparation-plans/generate`（goal/weeklyHours/completed 条件化）、`POST /api/preparation-plans/generate-stream`（SSE 流式叙事）、`GET /api/preparation-plans/mine`、`GET /api/preparation-plans/{id}`、`PUT /api/preparation-plans/{id}/tasks/{taskId}/toggle`（打卡）、`POST /api/preparation-plans/{id}/tasks/{taskId}/swap`（换一个任务）、`PUT/DELETE /api/preparation-plans/{id}/tasks/{taskId}`（编辑/删除任务）、`POST /api/preparation-plans/{id}/adjust`（一句话重排,已打卡保留）、`DELETE /api/preparation-plans/{id}` |
| 推荐 | `POST /api/recommendations/generate`、`GET /api/recommendations`（历史）、`POST /api/recommendations/{id}/feedback` |
| 项目空间 | `POST /api/code-repos`（可选 teamId）、`GET /api/code-repos/user/{userId}`、`GET /api/code-repos/{id}/files`、`POST /api/code-repos/{id}/files/upload`（multipart 任意类型）、`GET /api/code-repos/{id}/files/download`、`POST /api/code-repos/{id}/commits`、`DELETE /api/code-repos/{id}`、成员/分支管理、`GET /api/users/search`（成员搜索） |
| 团队 | `GET/POST /api/teams`、`GET /api/teams/mine`、`GET/PUT/DELETE /api/teams/{id}`、`POST /api/teams/{id}/apply`、`GET /api/teams/{id}/applications`、`POST /api/teams/{id}/applications/{id}/review`、`POST /api/teams/{id}/leave`、`DELETE /api/teams/{id}/members/{userId}` |
| 论坛 | `GET /api/forum/boards`、`GET/POST /api/forum/posts`（board/sort/keyword/competitionId/essence 筛选）、`GET/DELETE /api/forum/posts/{id}`、`POST /api/forum/posts/{id}/like|favorite|essence|pin`、`GET/POST /api/forum/posts/{id}/replies`、`POST /api/forum/replies/{id}/like|accept`、`DELETE /api/forum/replies/{id}`、`POST /api/forum/users/{id}/follow`、`POST /api/forum/ai/polish|suggest`、`GET/POST/DELETE /api/forum/notifications*`、`GET /api/profile/batch`（作者身份）、`PUT /api/users/{id}/verify`（管理员认证） |
| 管理端（ADMIN） | 竞赛 CRUD（`POST/PUT/DELETE /api/competitions`）、`GET /api/competitions/admin/all`、用户管理 `GET/POST/PUT/DELETE /api/users` |
| Token 计费（用户） | `GET /api/token/balance`、`GET /api/token/scenes`（场景单价）、`GET /api/token/packages`（上架套餐）、`GET /api/token/settings`（收款说明/收款码）、`POST /api/token/orders`（下单）、`GET /api/token/orders`、`POST /api/token/redeem`（卡密兑换）、`GET /api/token/transactions`（我的流水） |
| 计费后台（ADMIN） | `/api/admin-api/billing/**`：`GET /overview`（营收/消耗总览）、`GET /users` + `POST /users/{id}/adjust`（加扣币）+ `GET /users/{id}/transactions`、`GET /transactions`（全量流水检索）、`GET/POST/PUT/DELETE /packages`、`POST /cards/generate` + `GET /cards` + `GET /cards/export`（卡密）、`GET /orders` + `POST /orders/{id}/confirm|cancel`、`GET /scenes` + `PUT /scenes/{scene}`（场景定价）、`GET/PUT /settings`（平台设置） |

## 推荐机制

1. **五维规则评分**：按学科 / 年级 / 难度 / 时间投入 / 目标契合五个维度分别打分（0-100，加权合成总分），推荐卡片可展开查看每维度的条形拆解，让"为什么推荐"一目了然。
2. **行为反馈闭环**：对推荐点"不感兴趣"或"喜欢"，反馈落库——不感兴趣的竞赛直接过滤，喜欢的加权，重新生成推荐立即生效。
3. **大模型精排**：将画像与候选列表交给 DeepSeek，输出 Top 6-8 个竞赛及匹配度（0-100）和个性化理由。
4. **降级兜底**：DeepSeek 未配置或调用失败时，自动使用规则评分结果 + 模板理由，保证推荐永远可用。

## 备赛计划

竞赛详情页一键生成备赛计划,生成前先说出你的条件,**参与制定**:

- **生成条件(30 秒一屏)**:参赛目标(冲奖/稳完赛/体验)+ 每周可投入时间滑杆(实时预估周数)+ 已完成盘点(组队/选题/基础复习,AI 跳过已做项);
- **流式生成**:AI 边做边说("距比赛 X 天,按阶段倒排…"),可见计划成形;
- **倒排日期**:按比赛/截止日期倒推,阶段有起止日期、任务有建议截止日与预估小时数,每阶段附一行"为什么这么安排";
- **拿回主导权**:任务「换一个 / 编辑 / 删除」、一句话重排("周四满课"、"侧重算法题",AI 只重排未完成任务,**已打卡保留**)、一键重新生成;
- 打卡保持简单开关 + 进度条追踪;LLM 不可用时自动用按目标区分的模板兜底。

## 相似比赛推荐

竞赛详情页底部按 类别 / 标签 / 难度 / 级别 规则评分，推荐 6 个相似比赛，帮助横向对比与发现。

## 历年优秀作品

竞赛详情页的「历年优秀作品」板块展示标杆竞赛的往届获奖作品与官方资料（论文/项目/视频，含年份、奖项、团队与「查看 / 下载」链接），覆盖数学建模国赛（2021–2025 赛题包直链 + 论文规范/参赛规则 PDF）、MCM/ICM、互联网+（官方项目库）、电赛（历年赛题 rar 直链）、RoboMaster（官方视频库/B站）、信息安全竞赛（官方优秀作品专栏）、计算机设计大赛、蓝桥杯（官方题库）、统计建模大赛等 9 个竞赛共 26 条。所有链接均指向官方直链下载或作品/资料详情页，逐一验证可访问。种子数据位于 `backend/src/main/resources/excellent-works.json`，每次启动全量同步（删旧插新），修改 JSON 后重启后端即可生效。

## 我的竞赛（参赛履历）

收藏的比赛自动进入「我的竞赛」，支持参赛状态流转：**关注 → 已报名 → 备赛中 → 已完赛 → 获奖**，顶部统计卡呈现你的竞赛履历，支持按状态筛选。

## 竞赛种子数据

`backend/src/main/resources/competitions.json` 内置 88 个竞赛（工科 / 理科 / 文科 / 综合，含竞赛目录、保研加分、报名费标签），首次启动自动导入，已有数据按名称增量同步（更新富标签与新增条目）；管理员可在后台增删改。

## 部署

`backend/Dockerfile` 为多阶段构建：Maven 打包后端 jar + Node 构建 `frontend/` 产物，最终镜像同时提供 API 与静态页面（`StaticResourceConfig` 已配置 SPA 路由回退）。构建上下文为项目根目录：

```bash
docker build -f backend/Dockerfile -t competition-hub .
```

## 项目结构

```
P20/
├── frontend/          # React 前端（Vite + Tailwind 4）
│   └── src/
│       ├── pages/     # 登录/注册/画像问卷/首页推荐/竞赛库/详情/收藏/项目空间/画像/管理后台
│       ├── components/# Layout 与通用 UI
│       └── lib/       # API 封装、认证上下文、类型
├── backend/           # Spring Boot 后端
│   └── src/main/java/com/saidao/backend/
│       ├── entity/    # User/UserProfile/Competition/RecommendationRecord/Favorite/项目空间实体
│       ├── service/   # 推荐/竞赛库/画像/项目空间/认证服务
│       ├── controller/# REST 接口
│       └── config/    # 安全/CORS/数据初始化
└── prisma-landing/    # 产品落地页（独立 Vite 项目）
└── admin-console/    # 运营管理后台（独立 Vite SPA，挂在 /api/admin/，Token 商业化运营）
```

## 许可证

本项目仅供学习交流使用。
