#!/bin/bash
# Run this on your EC2 server to verify nginx is working

echo "1. Checking if kiosk.conf exists..."
ls -la /etc/nginx/conf.d/kiosk.conf

echo -e "\n2. Checking nginx is listening on port 7070..."
sudo netstat -tlnp | grep 7070 || ss -tlnp | grep 7070

echo -e "\n3. Testing nginx proxy to backend..."
curl -v http://127.0.0.1:7070/api/auth/signup \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","name":"test"}' 2>&1 | head -40

echo -e "\n4. Checking nginx error log..."
sudo tail -20 /var/log/nginx/error.log

echo -e "\n5. Checking nginx access log..."
sudo tail -10 /var/log/nginx/access.log

