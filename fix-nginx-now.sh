#!/bin/bash
# Run this on your EC2 server to fix nginx immediately

# Update nginx config to use 127.0.0.1:8000
sudo tee /etc/nginx/sites-available/kiosk.conf > /dev/null << 'EOF'
server {
    listen 7070;
    server_name _;

    root /home/ec2-user/kiosk-frontend;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;

    # Cache static assets (1 year)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend on port 8000
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Pass client IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Timeouts for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Error handling
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/kiosk.conf /etc/nginx/sites-enabled/kiosk.conf

# Test and reload
sudo nginx -t && sudo systemctl reload nginx && echo "✅ Nginx updated and reloaded!"

# Test the proxy
echo "Testing nginx proxy..."
curl -v http://127.0.0.1:7070/api/auth/signup -X POST -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test","name":"test"}' 2>&1 | head -30

