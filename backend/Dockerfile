# 多阶段构建：后端 jar + React 前端静态资源
FROM maven:3.9-eclipse-temurin-17 as backend-builder

WORKDIR /app

COPY backend/pom.xml .
COPY backend/src ./src

RUN mvn clean package -DskipTests

FROM node:20-alpine as frontend-builder

WORKDIR /web

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --registry=https://registry.npmmirror.com --no-audit --no-fund || npm install --no-audit --no-fund

COPY frontend/ ./
RUN VITE_BASE=/api/ VITE_ROUTER_BASE=/api npm run build

# 后台管理平台 SPA（独立构建，挂在 /api/admin/）
FROM node:20-alpine as admin-builder

WORKDIR /admin-web

COPY admin-console/package.json admin-console/package-lock.json* ./
RUN npm install --registry=https://registry.npmmirror.com --no-audit --no-fund || npm install --no-audit --no-fund

COPY admin-console/ ./
RUN VITE_BASE=/api/admin/ npm run build

FROM eclipse-temurin:17-jre

WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring spring

COPY --from=backend-builder /app/target/*.jar app.jar

# 复制主站与后台构建产物到 Spring Boot 静态资源目录
COPY --from=frontend-builder /web/dist/ /app/static/
COPY --from=admin-builder /admin-web/dist/ /app/admin-static/

RUN mkdir -p /app/uploads /app/data /app/logs && \
    chown -R spring:spring /app

USER spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
