#!/bin/bash

# Quick Local Testing Script for SmartWave Mobile
# This script helps you test the mobile app locally

set -e

PROJECT_DIR="/Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave-mobile"
WEB_DIR="/Users/sureshmenon/Desktop/nextjsapps/smartwave/smartwave"

echo "🚀 SmartWave Mobile - Local Testing Setup"
echo "=========================================="
echo ""

# Step 1: Find laptop IP
echo "📡 Finding your laptop's IP address..."
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
if [ -z "$IP" ]; then
    echo "⚠️  Could not auto-detect IP. Please find it manually:"
    echo "   System Settings > Network > Wi-Fi/Ethernet > Details > IP Address"
    echo ""
    read -p "Enter your laptop's IP address: " IP
else
    echo "✅ Found IP: $IP"
fi

# Step 2: Update .env file
echo ""
echo "📝 Updating .env file for local testing..."
cd "$PROJECT_DIR"

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Create/update .env with local IP
cat > .env << EOF
# Local development - testing with laptop backend
EXPO_PUBLIC_API_URL=http://${IP}:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=698373238257-qpsus19n1bnf8rogjm8ot9tvnbouccau.apps.googleusercontent.com
EOF

echo "✅ Updated .env to use: http://${IP}:3000"
echo ""

# Step 3: Check if web app is running
echo "🔍 Checking if web app is running..."
if curl -s "http://${IP}:3000/api/mobile/passes" > /dev/null 2>&1; then
    echo "✅ Web app is running and accessible"
else
    echo "⚠️  Web app doesn't seem to be running or accessible"
    echo ""
    echo "Please start the web app in another terminal:"
    echo "  cd $WEB_DIR"
    echo "  npm run dev"
    echo ""
    read -p "Press Enter when web app is running..."
fi

# Step 4: Start Expo
echo ""
echo "🎯 Starting Expo dev server..."
echo ""
echo "Choose testing method:"
echo "  1) Web browser (fastest, limited features)"
echo "  2) Expo Go app (recommended for mobile-like testing)"
echo "  3) Development build (full native features)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🌐 Starting web version..."
        npm run web
        ;;
    2)
        echo "📱 Starting Expo Go server..."
        echo ""
        echo "📲 Next steps:"
        echo "  1. Install Expo Go app on your phone"
        echo "  2. Scan the QR code that appears"
        echo "  3. Or enter manually: exp://${IP}:8081"
        echo ""
        npm start
        ;;
    3)
        echo "🔧 Starting development build server..."
        echo ""
        echo "📲 Make sure you have a dev build installed:"
        echo "  - Check: eas build:list --platform ios --profile development"
        echo "  - Or build: eas build --platform ios --profile development"
        echo ""
        echo "Then connect the dev build to: exp://${IP}:8081"
        echo ""
        npm start
        ;;
    *)
        echo "Invalid choice. Starting default Expo server..."
        npm start
        ;;
esac
