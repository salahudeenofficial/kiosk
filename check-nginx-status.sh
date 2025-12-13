#!/bin/bash
# Check nginx status and connectivity

EC2_USER="ec2-user"
EC2_HOST="13.62.127.241"
KEY_PATH="/home/fashionx/xapien.pem"

echo "🔍 Checking nginx status and configuration..."

ssh -i $KEY_PATH $EC2_USER@$EC2_HOST << 'ENDSSH'
  echo "1. Checking if nginx is running..."
  sudo systemctl status nginx --no-pager | head -10
  
  echo -e "\n2. Checking if nginx is listening on port 7077..."
  sudo netstat -tlnp | grep 7077 || ss -tlnp | grep 7077 || echo "⚠️  Not listening on 7077"
  
  echo -e "\n3. Checking nginx error logs..."
  sudo tail -20 /var/log/nginx/error.log
  
  echo -e "\n4. Testing local connection to port 7077..."
  curl -I http://127.0.0.1:7077 2>&1 | head -10
  
  echo -e "\n5. Checking security groups (if AWS CLI available)..."
  curl -s http://169.254.169.254/latest/meta-data/security-groups 2>/dev/null || echo "Cannot check security groups"
  
  echo -e "\n6. Checking nginx config for port 7077..."
  sudo grep -r "listen 7077" /etc/nginx/ 2>/dev/null || echo "Port 7077 not found in config"
ENDSSH

