#!/bin/bash

# Algoman Setup Script
# This script installs all dependencies and configures the environment

echo "╔════════════════════════════════════════╗"
echo "║  Algoman - Setup Script                ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "[1/4] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "✗ Node.js is not installed. Please install Node.js v14+"
    echo "  Visit: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js $(node --version) found"

# Check Python
echo "[2/4] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "✗ Python 3 is not installed. Please install Python 3.8+"
    echo "  Visit: https://www.python.org/downloads/"
    exit 1
fi
echo "✓ Python $(python3 --version) found"

# Install Node.js dependencies
echo "[3/4] Installing Node.js dependencies..."
if npm install; then
    echo "✓ Node.js dependencies installed"
else
    echo "✗ Failed to install Node.js dependencies"
    exit 1
fi

# Install Python dependencies
echo "[4/4] Installing Python dependencies..."
if pip3 install -r requirements.txt; then
    echo "✓ Python dependencies installed"
else
    echo "✗ Failed to install Python dependencies"
    echo "  Try: pip3 install --user -r requirements.txt"
    exit 1
fi

# Check if .env exists
echo ""
if [ ! -f .env ]; then
    echo "[Setup] Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created. Please edit it with your Binance API credentials."
    echo "  Edit .env and add:"
    echo "  - BINANCE_API_KEY=your_api_key"
    echo "  - BINANCE_API_SECRET=your_api_secret"
else
    echo "[Setup] .env file already exists"
fi

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Setup Complete!                       ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Binance API credentials"
echo "2. Run 'npm start' to start the server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For help, see README.md"
