# Plan-B 提瓦特管理台 Docker 镜像
# Phase 1: 基础框架 — 一键部署

FROM node:22-alpine

# 安装 Java 17 (Grasscutter 依赖)
RUN apk add --no-cache openjdk17-jre-headless curl bash

# 设置工作目录
WORKDIR /app

# 复制 Node.js 依赖
COPY package.json package-lock.json ./
RUN npm ci --production

# 复制应用代码
COPY server.js ./
COPY services/ ./services/
COPY routes/ ./routes/
COPY public/ ./public/
COPY data/ ./data/

# 创建 Grasscutter 目录结构
RUN mkdir -p /app/grasscutter/data /app/grasscutter/plugins /app/grasscutter/scripts /app/grasscutter/logs

# 暴露端口
EXPOSE 8080 8081 443 22102

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}' || exit 1

# 启动
CMD ["node", "server.js"]
