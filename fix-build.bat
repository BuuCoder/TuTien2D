@echo off
echo ============================================
echo Cleaning all caches and rebuilding...
echo ============================================

echo.
echo [1/5] Removing .next folder...
if exist .next rmdir /s /q .next

echo [2/5] Removing node_modules/.cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo [3/5] Clearing npm cache...
call npm cache clean --force

echo [4/5] Reinstalling dependencies...
call npm install

echo [5/5] Building with clean state...
call npm run build

echo.
echo ============================================
echo Done! Try running: node server.js
echo ============================================
