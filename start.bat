@echo off
chcp 65001 >nul
title Teyvat Manager

echo ============================================
echo   Teyvat Manager v0.2.0
echo   Grasscutter 私服综合管理平台
echo ============================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] 启动后端服务...
start "Teyvat Manager Server" /MIN node server.js

:: 等待服务就绪
echo [2/3] 等待服务就绪...
:wait
timeout /t 2 /nobreak >nul
curl -s http://localhost:8080/login.html >nul 2>&1
if %errorlevel% neq 0 goto wait

echo [3/3] 打开管理台 + 启动游戏服务...
start http://localhost:8080

:: 自动启动 MongoDB + Grasscutter
curl -s -X POST http://localhost:8080/api/server/start-all >nul 2>&1

echo.
echo ============================================
echo   管理台已在浏览器中打开！
echo   关闭此窗口不会停止服务。
echo   服务运行在: http://localhost:8080
echo   停止服务: 关闭 "Teyvat Manager Server" 窗口
echo ============================================
pause
