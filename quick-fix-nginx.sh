#!/bin/bash
# Quick fix script - run this on your EC2 server to update nginx config

# Test if backend is accessible
echo "Testing backend connection..."
curl -v http://127.0.0.1:8000/api/health 2>&1 | head -20 || echo "Backend not reachable at 127.0.0.1:8000"

# Check Docker containers
echo -e "\nChecking Docker containers..."
docker ps | grep 8000 || echo "No Docker container found on port 8000"

# Check if port 8000 is listening
echo -e "\nChecking if port 8000 is listening..."
sudo netstat -tlnp | grep 8000 || ss -tlnp | grep 8000 || echo "Port 8000 not found"

# Update nginx config (adjust path if different)
echo -e "\nUpdating nginx config..."
sudo sed -i 's|proxy_pass http://localhost:8000/api/;|proxy_pass http://127.0.0.1:8000/api/;|g' /etc/nginx/sites-available/kiosk.conf
# Or if nginx.conf is in a different location:
# sudo sed -i 's|proxy_pass http://localhost:8000/api/;|proxy_pass http://127.0.0.1:8000/api/;|g' /etc/nginx/nginx.conf

# Test nginx config
sudo nginx -t && sudo systemctl reload nginx && echo "✅ Nginx reloaded successfully"

