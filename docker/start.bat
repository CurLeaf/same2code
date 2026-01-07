@echo off
REM Product Taxonomy Docker 快速启动脚本 (Windows)

cd /d "%~dp0"

echo 📦 Product Taxonomy Docker 启动脚本
echo =====================================
echo.

REM 检查根目录的 .env 文件是否存在
set "ENV_FILE=..\.env"
set "ENV_EXAMPLE=..\.env.example"
if not exist "%ENV_FILE%" (
    echo ⚠️  未找到根目录的 .env 文件
    if exist "%ENV_EXAMPLE%" (
        echo 正在从根目录的 .env.example 创建 .env...
        copy "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
        echo.
        echo ✅ .env 文件已创建在项目根目录
    ) else if exist ".env.example" (
        echo 正在从 docker\.env.example 创建根目录的 .env...
        copy .env.example "%ENV_FILE%" >nul
        echo.
        echo ✅ .env 文件已创建在项目根目录
    ) else (
        echo ❌ 错误: 未找到 .env.example 模板文件
        echo    请确保根目录或 docker 目录存在 .env.example 文件
        pause
        exit /b 1
    )
    echo.
    echo 🔑 请编辑根目录的 .env 文件，填入您的 EMBEDDING_API_KEY
    echo    文件位置: %CD%\..\.env
    echo    编辑命令: notepad "%ENV_FILE%"
    echo.
    pause
)

REM 检查必需的目录
if not exist ..\data (
    echo ❌ 错误: 未找到必需的目录
    echo    请确保以下目录存在:
    echo    - ..\data
    echo    - ..\vectors
    pause
    exit /b 1
)

echo 🔍 数据目录检查通过
echo.

echo 🚀 启动服务...
docker-compose up -d

echo.
echo ⏳ 等待服务启动...
timeout /t 5 /nobreak >nul

echo.
echo 🏥 健康检查...
curl -s http://localhost:6006/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 服务启动成功！
    echo.
    echo 📊 服务信息:
    docker-compose ps
    echo.
    echo 📝 下一步:
    echo    1. 查看日志: docker-compose logs -f
    echo    2. 加载索引: load-indexes.bat
    echo    3. 测试 API: curl http://localhost:6006/health
    echo    4. 查看文档: type README.md
    echo.
) else (
    echo ⚠️  服务可能未完全启动，请检查日志:
    echo    docker-compose logs -f
    pause
    exit /b 1
)

pause
