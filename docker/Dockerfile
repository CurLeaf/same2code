# 多阶段构建 - 生产环境优化
# =====================================

# 阶段1: 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies）
RUN npm ci

# 复制源代码
COPY . .

# 编译 TypeScript
RUN npm run build

# =====================================

# 阶段2: 生产运行阶段
FROM node:18-alpine AS runner

# 安装 dumb-init 用于信号处理
RUN apk add --no-cache dumb-init

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 仅复制生产依赖
COPY package*.json ./
RUN npm ci --only=production

# 从构建阶段复制编译后的代码
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

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
