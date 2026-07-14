# Deployment Guide for ASC Agent Service

This guide explains how to deploy updates to your live server at `vanguard.asccreative.com` (`38.49.216.119`).

---

## Deployment Architecture Summary
* **Local Workspace:** `C:\Users\Jeff Domingo\Videos\Core-agent-initial`
* **GitHub Repository:** `https://github.com/jeff1412/Core-agent-initial.git`
* **Production Directory on VPS:** `/root/core-agent`
* **Process Manager:** PM2 (running the server process named `asc-agent-service`)
* **Reverse Proxy:** Nginx (mapping public ports 80/443 to internal port 3000)
* **Firewall:** firewalld (active, with HTTP/HTTPS ports open)

---

## Standard Deployment Workflow (Step-by-Step)

Follow these steps every time you make changes locally and want to push them live.

### Step 1: Push Local Changes to GitHub
From your local PowerShell (`C:\Users\Jeff Domingo\Videos\Core-agent-initial`), run:

```powershell
# 1. Stage all changes
git add .

# 2. Commit the changes with a description
git commit -m "your-commit-message-here"

# 3. Push to GitHub
git push origin main
```

---

### Step 2: Connect to the Server
Open your local PowerShell and log into the server via PuTTY:

```powershell
putty.exe -i "C:\Users\Jeff Domingo\Videos\newkeymeeting.ppk" root@vanguard.asccreative.com
```

---

### Step 3: Pull Changes and Build on the Server
Once you are logged into the VPS, run the following commands to pull the code and rebuild:

```bash
# 1. Go to the project directory
cd /root/core-agent

# 2. Pull the latest code from GitHub
git pull origin main

# 3. (Optional) Install dependencies if package.json has changed
# For backend:
cd /root/core-agent/asc-agent-service
npm install

# For frontend:
cd /root/core-agent/asc-agent-service/client
npm install

# 4. Rebuild the frontend client
cd /root/core-agent/asc-agent-service/client
npm run build

# 5. Restart the server in PM2
pm2 restart asc-agent-service
```

---

## Verification & Monitoring Commands

Use these commands on the server to check that everything is running properly:

### Check App Status
```bash
pm2 status
```
Ensure `asc-agent-service` status is `online` and there are no rapid restarts.

### Check App Logs
To see real-time output/errors from the Node server:
```bash
pm2 logs asc-agent-service --lines 50
```

### Restart Nginx (if you modified server blocks)
```bash
nginx -t && systemctl restart nginx
```

### Check Firewall Status
```bash
systemctl status firewalld
```
