#!/bin/bash
# Debug script - check what URL the frontend is actually using

EC2_USER="ec2-user"
EC2_HOST="13.62.127.241"
KEY_PATH="/home/fashionx/xapien.pem"

echo "🔍 Checking deployed frontend JavaScript for API URLs..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "grep -o 'https://[^\"'\'' ]*' /home/ec2-user/kiosk-frontend/assets/*.js 2>/dev/null | head -5 || echo 'No absolute URLs found (good!)'"

echo -e "\n🔍 Checking for API base URL patterns..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "grep -o 'apiprod.xapien.in\|BASE_URL\|getApiUrl' /home/ec2-user/kiosk-frontend/assets/*.js 2>/dev/null | head -10"

echo -e "\n🔍 Testing API from browser perspective (with Host header)..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "curl -v http://127.0.0.1:7070/api/auth/signup -X POST -H 'Content-Type: application/json' -H 'Host: $EC2_HOST:7070' -d '{\"email\":\"test@test.com\",\"password\":\"test\",\"name\":\"test\"}' 2>&1 | grep -E '(HTTP|Host|Location|error)'"

