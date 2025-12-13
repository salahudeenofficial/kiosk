#!/bin/bash
# Run this directly on your EC2 server

# Check nginx structure
echo "Checking nginx configuration structure..."
if [ -d /etc/nginx/conf.d ]; then
    CONFIG_PATH="/etc/nginx/conf.d/kiosk.conf"
    echo "Using conf.d directory"
elif [ -d /etc/nginx/sites-available ]; then
    CONFIG_PATH="/etc/nginx/sites-available/kiosk.conf"
    echo "Using sites-available directory"
else
    CONFIG_PATH="/etc/nginx/kiosk.conf"
    echo "Using root nginx directory"
fi

# Create the config file
sudo tee $CONFIG_PATH > /dev/null << 'EOF'
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

# If using sites-available, enable it
if [ -d /etc/nginx/sites-enabled ]; then
    sudo ln -sf /etc/nginx/sites-available/kiosk.conf /etc/nginx/sites-enabled/kiosk.conf
fi

# Test and reload
echo "Testing nginx configuration..."
sudo nginx -t && sudo systemctl reload nginx && echo "✅ Nginx updated successfully!"

