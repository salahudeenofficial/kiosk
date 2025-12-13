#!/bin/bash
# Run this from your LOCAL machine - it will SSH into EC2 and fix nginx

EC2_USER="ec2-user"
EC2_HOST="13.62.127.241"
KEY_PATH="/home/fashionx/xapien.pem"

echo "🔧 Fixing nginx on EC2 server..."

ssh -i $KEY_PATH $EC2_USER@$EC2_HOST << 'ENDSSH'
  # Create nginx config
  sudo tee /etc/nginx/conf.d/kiosk.conf > /dev/null << 'EOF'
server {
    listen 7070;
    server_name _;
    root /home/ec2-user/kiosk-frontend;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

  # Test and reload nginx
  echo "Testing nginx configuration..."
  sudo nginx -t && sudo systemctl reload nginx && echo "✅ Nginx updated successfully!"
  
  # Test the proxy
  echo "Testing API proxy..."
  curl -s http://127.0.0.1:7070/api/auth/signup -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test","name":"test"}' | head -5 || echo "Backend might need different test data"
  
  # Check if nginx is listening
  echo -e "\nChecking if nginx is listening on port 7070..."
  sudo netstat -tlnp | grep 7070 || ss -tlnp | grep 7070 || echo "⚠️  Nginx might not be running on port 7070"
ENDSSH

echo "✅ Done! Test your website at http://$EC2_HOST:7070"

