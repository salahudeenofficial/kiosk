#!/bin/bash
set -e

# Configuration - UPDATE THESE
EC2_USER="ec2-user"
EC2_HOST="13.62.127.241"
KEY_PATH="/home/fashionx/xapien.pem"
REMOTE_PATH="/home/ec2-user/kiosk-frontend"
BACKUP_PATH="/home/ec2-user/kiosk-frontend-backup"

echo "⏪ Rolling back to previous version..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "rm -rf $REMOTE_PATH && mv $BACKUP_PATH $REMOTE_PATH"

echo "🔄 Reloading Nginx..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "sudo systemctl reload nginx"

echo "✅ Rollback complete!"
