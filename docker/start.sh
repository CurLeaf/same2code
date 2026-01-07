#!/bin/bash
# Product Taxonomy Docker 快速启动脚本

set -e

# 进入 docker 目录
cd "$(dirname "$0")"

echo "📦 Product Taxonomy Docker 启动脚本"
echo "====================================="
echo ""

# 检查根目录的 .env 文件是否存在
ENV_FILE="../.env"
ENV_EXAMPLE="../.env.example"
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  未找到根目录的 .env 文件"
    if [ -f "$ENV_EXAMPLE" ]; then
        echo "正在从根目录的 .env.example 创建 .env..."
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo ""
        echo "✅ .env 文件已创建在项目根目录"
    elif [ -f ".env.example" ]; then
        echo "正在从 docker/.env.example 创建根目录的 .env..."
        cp .env.example "$ENV_FILE"
        echo ""
        echo "✅ .env 文件已创建在项目根目录"
    else
        echo "❌ 错误: 未找到 .env.example 模板文件"
        echo "   请确保根目录或 docker 目录存在 .env.example 文件"
        exit 1
    fi
    echo ""
    echo "🔑 请编辑根目录的 .env 文件，填入您的 EMBEDDING_API_KEY"
    echo "   文件位置: $(realpath "$ENV_FILE")"
    echo "   编辑命令: nano $ENV_FILE 或 vim $ENV_FILE"
    echo ""
    read -p "按 Enter 继续（确保已配置 API Key）..."
fi

# 检查必需的环境变量（从根目录的 .env 读取）
source "$ENV_FILE"
if [ -z "$EMBEDDING_API_KEY" ] || [ "$EMBEDDING_API_KEY" = "your-api-key-here" ]; then
    echo "❌ 错误: 请在 .env 文件中配置 EMBEDDING_API_KEY"
    echo "   当前值: $EMBEDDING_API_KEY"
    exit 1
fi

echo "🔍 检查数据目录..."
if [ ! -d ../data ] || [ ! -d ../vectors ]; then
    echo "❌ 错误: 未找到必需的目录"
    echo "   请确保以下目录存在:"
    echo "   - ../data"
    echo "   - ../vectors"
    exit 1
fi
echo "✅ 数据目录检查通过"
echo ""

echo "🚀 启动服务..."
docker-compose up -d

echo ""
echo "⏳ 等待服务启动..."
sleep 5

echo ""
echo "🏥 健康检查..."
if curl -s http://localhost:6006/health > /dev/null; then
    echo "✅ 服务启动成功！"
    echo ""
    echo "📊 服务信息:"
    docker-compose ps
    echo ""
    echo "📝 下一步:"
    echo "   1. 查看日志: docker-compose logs -f"
    echo "   2. 加载索引: ./load-indexes.sh"
    echo "   3. 测试 API: curl http://localhost:6006/health"
    echo "   4. 查看文档: cat README.md"
    echo ""
else
    echo "⚠️  服务可能未完全启动，请检查日志:"
    echo "   docker-compose logs -f"
    exit 1
fi
