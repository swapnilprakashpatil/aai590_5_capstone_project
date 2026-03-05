#!/bin/bash

echo "========================================"
echo "  NutriVision AI - Frontend Setup"
echo "========================================"
echo ""

echo "[1/3] Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Failed to install dependencies"
    echo "Please make sure Node.js and npm are installed"
    exit 1
fi

echo ""
echo "[2/3] Setup complete!"
echo ""
echo "[3/3] Starting development server..."
echo ""
echo "Your app will open at http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
