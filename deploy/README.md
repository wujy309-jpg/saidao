# 阿里云 ECS 部署说明（deploy/）

> 本次部署：2026-09-05，实例 8.133.220.133（华东2 上海，2C2G，Alibaba Cloud Linux 3）

## 架构

```
浏览器 → http://8.133.220.133:8080/api/         ← 主站入口（后端 context-path=/api）
        http://8.133.220.133:8080/api/admin/    ← 运营管理后台（独立 SPA，同域名）
            │
            ▼
docker: saidao-backend（Spring Boot jar + 主站/后台两个 React 静态产物，单容器）
docker: saidao-mysql（MySQL 8.0，数据卷 mysql-data 持久化）
```

- 主站静态产物打进运行镜像的 `/app/static`，后台管理平台在 `/app/admin-static`（`/api/admin/`），由 Spring 直接服务；
- 上传文件在卷 `deploy_backend-uploads`，日志在 `deploy_backend-logs`，数据库在 `deploy_mysql-data`。

## 服务器目录（/opt/app/deploy/）

| 文件 | 说明 |
|------|------|
| `docker-compose.server.yml` | 服务器部署 compose（MySQL + backend） |
| `.env` | JWT_SECRET / MYSQL_ROOT_PASSWORD / DEEPSEEK_API_KEY（600 权限，勿外传） |
| `stage/Dockerfile` | 运行镜像组装（只 COPY jar + dist，不在服务器编译） |
| `stage/app.jar` | 本地编译的后端 jar |
| `stage/static/` | 本地编译的主站产物 |
| `stage/admin-static/` | 本地编译的后台管理平台产物（挂在 /api/admin/） |

## 日常运维命令

```bash
cd /opt/app/deploy
docker compose -f docker-compose.server.yml ps                      # 状态
docker compose -f docker-compose.server.yml logs -f backend         # 后端日志
docker compose -f docker-compose.server.yml restart backend         # 重启后端
docker logs saidao-mysql                                         # MySQL 日志
```

备份（数据都在卷里）：

```bash
cd /opt/app
docker exec saidao-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" training_system' > backup-$(date +%Y%m%d).sql
docker run --rm -v deploy_backend-uploads:/uploads -v $(pwd):/backup alpine tar czf /backup/uploads-$(date +%Y%m%d).tar.gz /uploads
```

## 更新版本（本地改代码后）

```bash
# 1. 本地（Mac，项目根目录）：用 JDK 17 编译 + 构建前端（主站 + 后台管理平台）
bash deploy/scripts/prepare-stage.sh

# 2. 上传新 jar（静态资源变了就把 static/、admin-static/ 一起传）
scp deploy/stage/app.jar root@8.133.220.133:/opt/app/deploy/stage/app.jar
scp -r deploy/stage/static deploy/stage/admin-static root@8.133.220.133:/opt/app/deploy/stage/

# 3. 服务器重建并重启
cd /opt/app/deploy && docker compose -f docker-compose.server.yml up -d --build backend
```

## 运营后台（商业化）

- 访问 `http://8.133.220.133:8080/api/admin/`，用 admin 账号登录；
- 功能：营收总览 / 用户余额（手动加扣币）/ Token 流水 / 充值套餐 / 卡密生成与导出 / 订单确认收款 / AI 场景定价 / 平台设置（免费额度、收款码）；
- 商业化方案详见 `docs/商业化与Token收费方案.md`。

## 注意事项

- **站点入口是 `/api/`**：根路径 `/` 会 404（后端 context-path=/api，Tomcat 不做跳转）。
  后续加 nginx + 域名时，在 nginx 里加 `location = / { return 302 /api/; }` 即可。
- **前端构建必须带 `VITE_BASE=/api/ VITE_ROUTER_BASE=/api`**（`prepare-stage.sh` 已内置），
  否则静态资源 404。
- **安全组**：ECS 控制台放行 TCP 8080（来源 0.0.0.0/0）才能从外网访问；正式期建议收口。
- 演示账号（admin/admin123、student01/student123 等）上线后请立即改密。
- AI 功能依赖 `.env` 里的 `DEEPSEEK_API_KEY`，从上海访问 api.deepseek.com 正常。
