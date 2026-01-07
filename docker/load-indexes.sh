#!/bin/bash
# 加载所有平台的向量索引

set -e

echo "📚 加载 Product Taxonomy 向量索引"
echo "=================================="
echo ""

platforms=("shopify" "ozon" "yandex")

for platform in "${platforms[@]}"; do
    echo "加载 $platform 索引..."
    response=$(curl -s -X POST http://localhost:6006/category/load \
        -H "Content-Type: application/json" \
        -d "{\"platform\": \"$platform\"}")

    if echo "$response" | grep -q "\"success\": true"; then
        echo "✅ $platform 索引加载成功"
    else
        echo "❌ $platform 索引加载失败"
        echo "   响应: $response"
    fi
done

echo ""
echo "🏥 检查加载状态..."
curl -s http://localhost:6006/health | jq '.'
