@echo off
REM Algoman Setup Script for Windows
REM This script installs all dependencies and configures the environment

echo.
echo ╔════════════════════════════════════════╗
echo ║  Algoman - Setup Script (Windows)      ║
echo ╚════════════════════════════════════════╝
echo.

REM Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Node.js is not installed. Please install Node.js v14+
    echo   Visit: https://nodejs.org/
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo ✓ Node.js %%i found

REM Check Python
echo [2/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ✗ Python 3 is not installed. Please install Python 3.8+
    echo   Visit: https://www.python.org/downloads/
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo ✓ %%i found

REM Install Node.js dependencies
echo [3/4] Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo ✗ Failed to install Node.js dependencies
    exit /b 1
)
echo ✓ Node.js dependencies installed

REM Install Python dependencies
echo [4/4] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ✗ Failed to install Python dependencies
    echo   Try: pip install --user -r requirements.txt
    exit /b 1
)
echo ✓ Python dependencies installed

REM Check if .env exists
echo.
if not exist .env (
    echo [Setup] Creating .env file from template...
    copy .env.example .env
    echo ✓ .env file created. Please edit it with your Binance API credentials.
    echo   Edit .env and add:
    echo   - BINANCE_API_KEY=your_api_key
    echo   - BINANCE_API_SECRET=your_api_secret
) else (
    echo [Setup] .env file already exists
)

echo.
echo ╔════════════════════════════════════════╗
echo ║  Setup Complete!                       ║
echo ╚════════════════════════════════════════╝
echo.
echo Next steps:
echo 1. Edit .env file with your Binance API credentials
echo 2. Run 'npm start' to start the server
echo 3. Open http://localhost:3000 in your browser
echo.
echo For help, see README.md
echo.
pause
