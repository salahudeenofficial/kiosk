# Fix 502 Bad Gateway with AWS Application Load Balancer (ALB)

## Step-by-Step Fix:

### 1. **EC2 Security Group** (Most Common Issue)
   - Go to: EC2 Console → Security Groups
   - Find your EC2 instance's security group
   - **Inbound Rules** → **Edit inbound rules** → **Add rule**:
     - Type: `Custom TCP`
     - Port: `7077`
     - Source: Select your **ALB Security Group** (or temporarily `0.0.0.0/0` for testing)
     - Description: "Allow ALB to reach nginx on port 7077"
   - Save rules

### 2. **Target Group Configuration**
   - Go to: EC2 Console → Target Groups
   - Select your target group
   - **Health checks** tab:
     - Protocol: `HTTP`
     - Port: `7077` (NOT 80!)
     - Path: `/` or `/index.html`
     - Healthy threshold: `2`
     - Unhealthy threshold: `2`
     - Timeout: `5 seconds`
     - Interval: `30 seconds`
   - **Targets** tab:
     - Make sure your EC2 instance is registered
     - Port should be `7077`
     - Status should show "healthy" (may take 1-2 minutes)

### 3. **ALB Listener Configuration**
   - Go to: EC2 Console → Load Balancers
   - Select your ALB
   - **Listeners** tab:
     - HTTPS:443 → Should forward to your Target Group
     - Check the **Default action**:
       - Type: `Forward to...`
       - Target group: Your target group
       - Port: Should be `7077` (or leave default if target group is configured)

### 4. **Verify Target Health**
   - In Target Groups → Your target group → **Targets** tab
   - Wait 1-2 minutes after making changes
   - Status should be: `healthy`
   - If `unhealthy`, check:
     - Security group allows port 7077
     - Nginx is running: `sudo systemctl status nginx`
     - Health check path is accessible: `curl http://localhost:7077/`

## Quick Test Commands (Run on EC2):

```bash
# Test nginx locally
curl -I http://localhost:7077

# Check if port is open
sudo netstat -tlnp | grep 7077

# Check nginx status
sudo systemctl status nginx

# View nginx error logs
sudo tail -50 /var/log/nginx/error.log
```

## Common Mistakes:
- ❌ Target group health check using port 80 instead of 7077
- ❌ Security group not allowing ALB security group on port 7077
- ❌ EC2 instance not registered in target group
- ❌ Target group forwarding to wrong port

