#!/bin/bash
set -e

# Configuration - UPDATE THESE
EC2_USER="ec2-user"
EC2_HOST="35.154.214.159"
KEY_PATH="./xapien.pem"
REMOTE_PATH="/var/www/kiosk-frontend"
BACKUP_PATH="/var/www/kiosk-frontend-backup"

echo "⏪ Rolling back to previous version..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "rm -rf $REMOTE_PATH && mv $BACKUP_PATH $REMOTE_PATH"

echo "🔄 Reloading Nginx..."
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "sudo systemctl reload nginx"

echo "✅ Rollback complete!"
