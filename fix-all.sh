#!/bin/bash
# Complete fix: rebuild, redeploy, and update nginx with CORS

set -e

EC2_USER="ec2-user"
EC2_HOST="13.62.127.241"
KEY_PATH="/home/fashionx/xapien.pem"

echo "🧹 Cleaning old build..."
rm -rf dist

echo "🔨 Building with empty BASE_URL (relative URLs)..."
export VITE_API_BASE_URL=""
npm run build

echo "📦 Deploying frontend..."
TEMP_PATH="/home/ec2-user/kiosk-frontend-temp"
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "rm -rf $TEMP_PATH && mkdir -p $TEMP_PATH"
scp -i $KEY_PATH -r dist/* $EC2_USER@$EC2_HOST:$TEMP_PATH/
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "sudo mkdir -p /home/ec2-user/kiosk-frontend && sudo rm -rf /home/ec2-user/kiosk-frontend/* && sudo cp -r $TEMP_PATH/* /home/ec2-user/kiosk-frontend/ && sudo chown -R $EC2_USER:$EC2_USER /home/ec2-user/kiosk-frontend && sudo chmod -R 755 /home/ec2-user/kiosk-frontend && rm -rf $TEMP_PATH"

echo "📝 Updating nginx with CORS headers..."
scp -i $KEY_PATH deployment/nginx.conf $EC2_USER@$EC2_HOST:/tmp/nginx-kiosk.conf
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "sudo cp /tmp/nginx-kiosk.conf /etc/nginx/conf.d/kiosk.conf && sudo nginx -t && sudo systemctl reload nginx"

echo "✅ Done! Clear your browser cache (Ctrl+Shift+R) and test again."
echo "🌐 Access at: http://$EC2_HOST:7070"

