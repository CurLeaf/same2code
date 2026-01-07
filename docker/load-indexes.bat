@echo off
REM 加载所有平台的向量索引 (Windows)

echo 📚 加载 Product Taxonomy 向量索引
echo ==================================
echo.

curl -s -X POST http://localhost:6006/category/load -H "Content-Type: application/json" -d "{\"platform\": \"shopify\"}"
echo.
echo ✅ Shopify 索引已加载
echo.

curl -s -X POST http://localhost:6006/category/load -H "Content-Type: application/json" -d "{\"platform\": \"ozon\"}"
echo.
echo ✅ Ozon 索引已加载
echo.

curl -s -X POST http://localhost:6006/category/load -H "Content-Type: application/json" -d "{\"platform\": \"yandex\"}"
echo.
echo ✅ Yandex 索引已加载
echo.

echo 🏥 检查加载状态...
curl -s http://localhost:6006/health
echo.

pause
