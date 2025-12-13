#!/bin/bash
# Verify ALB setup and provide specific fixes

EC2_USER="ec2-user"
EC2_HOST="13.62.127.241"
KEY_PATH="/home/fashionx/xapien.pem"

echo "🔍 Verifying ALB Setup..."
echo ""

# Check nginx status
echo "1. Nginx Status:"
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "sudo systemctl is-active nginx && echo '✅ Nginx is running' || echo '❌ Nginx is not running'"

echo ""
echo "2. Port 7077 Listening:"
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "sudo netstat -tlnp | grep 7077 && echo '✅ Port 7077 is listening' || echo '❌ Port 7077 is NOT listening'"

echo ""
echo "3. Local Health Check Test:"
ssh -i $KEY_PATH $EC2_USER@$EC2_HOST "curl -s -o /dev/null -w 'HTTP Status: %{http_code}\n' http://localhost:7077/ && echo '✅ Health check path works' || echo '❌ Health check path failed'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 ALB Configuration Checklist:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ In AWS Console, verify:"
echo ""
echo "1. TARGET GROUP → Health Checks:"
echo "   - Protocol: HTTP"
echo "   - Port: 7077 ⚠️  (NOT 80!)"
echo "   - Path: /"
echo ""
echo "2. TARGET GROUP → Targets:"
echo "   - Your EC2 instance should be registered"
echo "   - Port: 7077"
echo "   - Status: healthy (may take 1-2 min)"
echo ""
echo "3. EC2 SECURITY GROUP → Inbound Rules:"
echo "   - Type: Custom TCP"
echo "   - Port: 7077"
echo "   - Source: Your ALB Security Group ID"
echo ""
echo "4. ALB LISTENER (HTTPS:443):"
echo "   - Default action: Forward to Target Group"
echo "   - Target group: Your target group"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Most common issue: Target Group health check port is set to 80 instead of 7077"
echo "   Fix: Target Groups → Your TG → Health checks → Change port to 7077"
echo ""

