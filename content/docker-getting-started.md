---
title: Docker 入门：从零开始容器化你的应用
summary: 从安装到部署，手把手带你掌握 Docker 核心概念，学会编写 Dockerfile 和 docker-compose，快速容器化任意项目。
publishedAt: 2026-01-08T10:00:00.000Z
tags:
  - DevOps
  - Docker
  - 后端
  - 教程
author:
  name: 墨迹
---

# Docker 入门：从零开始容器化你的应用

Docker 让"在我机器上能跑"成为历史。把应用和它的所有依赖打包成一个镜像，在任何环境都能一致运行。

## 核心概念

- **镜像（Image）**：只读模板，相当于应用的"快照"
- **容器（Container）**：镜像的运行实例，可以启动、停止、删除
- **Dockerfile**：描述如何构建镜像的脚本文件
- **Registry**：镜像仓库，Docker Hub 是最大的公共仓库

## 安装 Docker

前往 [https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/) 下载对应平台安装包。

安装完成后验证：

```bash
docker --version
# Docker version 25.0.3, build 4debf41
```

## 第一个 Dockerfile

以 Node.js 应用为例：

```dockerfile
# 选择基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 先复制依赖文件（利用构建缓存）
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
```

构建并运行：

```bash
# 构建镜像
docker build -t my-app:latest .

# 运行容器
docker run -d -p 3000:3000 --name my-app my-app:latest

# 查看运行中的容器
docker ps
```

## docker-compose 多服务编排

当应用需要数据库、Redis 等多个服务时，用 `docker-compose.yml` 统一管理：

```yaml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:pass@db:5432/mydb
    depends_on:
      - db
      - redis

  db:
    image: postgres:16-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb

  redis:
    image: redis:7-alpine

volumes:
  pg_data:
```

一键启动所有服务：

```bash
docker compose up -d
```

## 常用命令速查

```bash
# 镜像管理
docker images                    # 列出本地镜像
docker pull nginx:latest         # 拉取镜像
docker rmi my-app:latest         # 删除镜像

# 容器管理
docker ps -a                     # 查看所有容器（含已停止）
docker logs -f my-app            # 实时查看日志
docker exec -it my-app sh        # 进入容器 shell
docker stop my-app               # 停止容器
docker rm my-app                 # 删除容器

# 清理
docker system prune -a           # 清理所有未使用资源
```

## 生产建议

1. **使用多阶段构建**减小镜像体积
2. **不要以 root 用户运行**容器
3. **镜像 tag 不要用 latest**，固定版本号
4. **敏感信息用 secrets**，不要写进镜像

```dockerfile
# 多阶段构建示例
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
CMD ["node", "dist/server.js"]
```

Docker 的学习曲线不陡，掌握这些基础就能覆盖大多数场景。
