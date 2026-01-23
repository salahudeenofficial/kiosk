#!/bin/bash
set -e

# Configuration - UPDATE THESE
EC2_USER="ec2-user"
EC2_HOST="13.127.97.207"  # Replace with your EC2 IP
KEY_PATH="/home/fashionx/xapien.pem" # Replace with path to your .pem file
REMOTE_PATH="/home/ec2-user/kiosk-frontend"
BACKUP_PATH="/home/ec2-user/kiosk-frontend-backup"

echo "🔨 Building production bundle..."
export VITE_API_BASE_URL=""  # Empty = use nginx proxy (same-origin, no CORS)
npm run build

echo "📦 Creating backup on server..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "rm -rf $BACKUP_PATH && cp -r $REMOTE_PATH $BACKUP_PATH 2>/dev/null || true"

echo "🚀 Deploying to EC2..."
# Copy files to a temp directory first (ec2-user can always write to their home)
TEMP_PATH="/home/ec2-user/kiosk-frontend-temp"
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "rm -rf $TEMP_PATH && mkdir -p $TEMP_PATH"
scp -i $KEY_PATH -r dist/* $EC2_USER@$EC2_HOST:$TEMP_PATH/
# Move files to final location with sudo and set proper permissions
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "sudo mkdir -p $REMOTE_PATH && sudo rm -rf $REMOTE_PATH/* && sudo cp -r $TEMP_PATH/* $REMOTE_PATH/ && sudo chown -R $EC2_USER:$EC2_USER $REMOTE_PATH && sudo chmod -R 755 $REMOTE_PATH && rm -rf $TEMP_PATH"

echo "📝 Updating Nginx configuration..."
scp -i $KEY_PATH deployment/nginx.conf $EC2_USER@$EC2_HOST:/tmp/nginx-kiosk.conf
# Copy to conf.d (standard location for this nginx setup)
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "sudo cp /tmp/nginx-kiosk.conf /etc/nginx/conf.d/kiosk.conf && sudo nginx -t && sudo systemctl reload nginx"

echo "✅ Deployment complete!"
echo "🌐 Access at: http://$EC2_HOST:7077"
