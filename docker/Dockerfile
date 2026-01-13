# 多阶段构建 - 生产环境优化
# =====================================

# 基础阶段: 设置 pnpm
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@10.9.0 --activate

# 设置npm镜像源（使用淘宝镜像加速）
RUN npm config set registry https://registry.npmmirror.com

# =====================================

# 阶段1: 安装依赖
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# =====================================

# 阶段2: 构建阶段
FROM deps AS builder

# 设置工作目录
WORKDIR /app

# 复制源代码
COPY . .

# 编译 TypeScript
RUN pnpm run build

# =====================================

# 阶段3: 生产运行阶段
FROM node:22-alpine AS runner

# 设置npm镜像源（使用淘宝镜像加速）
RUN npm config set registry https://registry.npmmirror.com

# 更新包索引并安装 dumb-init 用于信号处理
RUN apk update && apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 从构建阶段复制编译后的代码和依赖
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# 复制必要的数据文件
COPY data ./data
COPY vectors ./vectors
COPY static ./static

# 创建日志目录
RUN mkdir -p logs && chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 6006

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:6006/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build/index.js"]
