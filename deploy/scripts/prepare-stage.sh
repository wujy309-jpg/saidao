#!/bin/bash
# ============================================
# 本地准备部署产物：编译后端 jar + 前端 dist → deploy/stage/
# 用法（在项目根目录）：
#   bash deploy/scripts/prepare-stage.sh
# ============================================
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STAGE="$ROOT/deploy/stage"

echo "==> 清理 stage 目录"
rm -rf "$STAGE/app.jar" "$STAGE/static" "$STAGE/admin-static"

echo "==> 构建后端（JDK 17）"
JAVA_HOME_CANDIDATES=(
  "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  "/usr/lib/jvm/java-17-openjdk"
)
export JAVA_HOME="${JAVA_HOME:-}"
if [ -z "$JAVA_HOME" ]; then
  for c in "${JAVA_HOME_CANDIDATES[@]}"; do
    if [ -d "$c" ]; then export JAVA_HOME="$c"; break; fi
  done
fi
if [ -z "$JAVA_HOME" ] || [ ! -d "$JAVA_HOME" ]; then
  echo "未找到 JDK 17，请设置 JAVA_HOME 指向 JDK 17（Lombok 与 JDK 26 不兼容）"
  exit 1
fi
echo "    使用 JAVA_HOME=$JAVA_HOME"
cd "$ROOT/backend"
mvn clean package -DskipTests -q

JAR=$(ls target/*.jar | head -1)
[ -n "$JAR" ] || { echo "未找到 jar 产物"; exit 1; }
cp "$JAR" "$STAGE/app.jar"
echo "    jar: $JAR -> $STAGE/app.jar"

echo "==> 构建前端（base=/api/，匹配后端 context-path）"
cd "$ROOT/frontend"
VITE_BASE=/api/ VITE_ROUTER_BASE=/api npm run build

cp -R "$ROOT/frontend/dist" "$STAGE/static"
echo "    dist -> $STAGE/static"

echo "==> 构建后台管理平台（base=/api/admin/）"
cd "$ROOT/admin-console"
VITE_BASE=/api/admin/ npm run build

cp -R "$ROOT/admin-console/dist" "$STAGE/admin-static"
echo "    dist -> $STAGE/admin-static"

echo "==> 完成。上传 deploy/ 到服务器后执行："
echo "    docker compose -f deploy/docker-compose.server.yml up -d --build"
