FROM eclipse-temurin:17-jdk-alpine as builder

WORKDIR /app

COPY backend/pom.xml .
COPY backend/src ./src

RUN apk add --no-cache maven && \
    mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=builder /app/target/*.jar app.jar

# 复制前端静态文件到 Spring Boot 静态资源目录
COPY index.html /app/static/
COPY css/ /app/static/css/
COPY js/ /app/static/js/
COPY sw.js /app/static/
COPY manifest.json /app/static/

RUN mkdir -p /app/uploads /app/logs && \
    chown -R spring:spring /app

USER spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
