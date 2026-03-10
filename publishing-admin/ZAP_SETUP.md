# ZAP Security Scanner Setup Guide

Complete guide for running OWASP ZAP security scanning for mini apps, both locally and in production with Vercel.

## 📋 Table of Contents

- [Overview](#overview)
- [Local Development Setup](#local-development-setup)
- [Production Setup (Vercel + Railway/DigitalOcean)](#production-setup)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Cost Breakdown](#cost-breakdown)

---

## Overview

This setup allows you and your admin team to run automated security scans on mini apps before publishing them.

**Architecture:**
```
Publishing Admin (Vercel)
    ↓ HTTP API calls
ZAP Scanner (Railway/DigitalOcean)
    ↓ Scans
Mini Apps
    ↓ Returns
Security Report
```

**What gets scanned:**
- XSS vulnerabilities
- SQL injection
- CSRF issues
- Security misconfigurations
- Insecure authentication
- And 50+ other security checks

---

## Local Development Setup

Use this when developing/testing on your laptop.

### Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Node.js 18+ installed
- This repository cloned

### Step 1: Start ZAP Locally

Open a terminal and run:

```bash
# Start ZAP in daemon mode
docker run -d \
  --name zap-local \
  -p 8080:8080 \
  -v $(pwd)/security-reports:/zap/reports \
  zaproxy/zap-stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true

# Verify it's running
curl http://localhost:8080/JSON/core/view/version/
# Should return: {"version":"2.14.0"}
```

### Step 2: Configure Environment

Create `.env.local` in the publishing-admin directory:

```bash
# ZAP Configuration (local)
ZAP_BASE_URL=http://localhost:8080

# Optional: Test mini app URL
MINI_APP_URL=http://localhost:3000
```

### Step 3: Test the Connection

Create a test script `test-zap-local.ts`:

```typescript
import { ZapClient } from './src/security/zap';

async function test() {
  const zap = new ZapClient('http://localhost:8080');

  try {
    const version = await zap.getVersion();
    console.log('✓ ZAP connected! Version:', version);
  } catch (error) {
    console.error('✗ Failed to connect to ZAP:', error);
  }
}

test();
```

Run it:
```bash
npx tsx test-zap-local.ts
```

### Step 4: Run Your First Scan

```typescript
import { MiniAppSecurityScanner } from './src/security/zap';

async function scanMiniApp() {
  const scanner = new MiniAppSecurityScanner('http://localhost:8080');

  console.log('Starting security scan...');

  const result = await scanner.quickScan(
    'http://localhost:3000', // Your mini app URL
    (progress) => {
      console.log(`[${progress.stage}] ${progress.message} (${progress.progress}%)`);
    }
  );

  console.log('\nScan Results:');
  console.log('High:', result.summary.high);
  console.log('Medium:', result.summary.medium);
  console.log('Low:', result.summary.low);
}

scanMiniApp();
```

### Stop ZAP When Done

```bash
docker stop zap-local
docker rm zap-local
```

---

## Production Setup

Choose one of these options for your deployed publishing-admin site:

### Option 1: Railway (Easiest, ~$5/month or free)

**Step 1: Create Railway Account**

1. Go to https://railway.app
2. Sign up (free, no credit card needed for trial)

**Step 2: Deploy ZAP to Railway**

1. Create a new GitHub repository (or use existing) with this structure:

```
zap-deployment/
├── Dockerfile
└── railway.json (optional)
```

2. Create `Dockerfile`:

```dockerfile
FROM zaproxy/zap-stable

# Expose ZAP port
EXPOSE 8080

# Start ZAP in daemon mode
CMD ["zap.sh", "-daemon", "-host", "0.0.0.0", "-port", "8080", "-config", "api.disablekey=true"]
```

3. In Railway:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Select your zap-deployment repo
   - Railway auto-deploys from the Dockerfile

4. Get your ZAP URL:
   - Railway assigns: `https://zap-production-xxxxx.up.railway.app`
   - Copy this URL

**Step 3: Configure Vercel**

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   ```
   Name: ZAP_BASE_URL
   Value: https://zap-production-xxxxx.up.railway.app
   ```
4. Redeploy:
   ```bash
   vercel --prod
   ```

**Step 4: Test Production Connection**

Visit: `https://your-publishing-admin.vercel.app/api/test-zap`

(You'll need to create this test endpoint - see [Usage](#usage) section)

### Option 2: DigitalOcean (Most Cost-Effective, $6/month)

**Step 1: Create Droplet**

1. Go to https://digitalocean.com
2. Create account
3. Click "Create" → "Droplets"
4. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic ($6/month - 1GB RAM, 25GB SSD)
   - **Datacenter:** Closest to your users
   - **Authentication:** SSH key (recommended) or password

**Step 2: Setup Server**

SSH into your droplet:

```bash
ssh root@your-droplet-ip
```

Install Docker:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verify installation
docker --version
```

**Step 3: Run ZAP**

```bash
# Start ZAP container
docker run -d \
  --name zap \
  --restart unless-stopped \
  -p 8080:8080 \
  -v /opt/zap-reports:/zap/reports \
  zaproxy/zap-stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true

# Verify it's running
docker ps
curl http://localhost:8080/JSON/core/view/version/
```

**Step 4: Configure Firewall**

```bash
# Allow SSH and ZAP port
ufw allow 22/tcp
ufw allow 8080/tcp
ufw enable

# Check status
ufw status
```

**Step 5: Configure Vercel**

Add to Vercel environment variables:
```
Name: ZAP_BASE_URL
Value: http://your-droplet-ip:8080
```

Redeploy Vercel.

**Optional: Setup Domain & SSL**

If you want `https://zap.yourdomain.com` instead of IP:

```bash
# Install nginx
apt install nginx certbot python3-certbot-nginx -y

# Configure nginx reverse proxy
cat > /etc/nginx/sites-available/zap << 'EOF'
server {
    listen 80;
    server_name zap.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/zap /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Get SSL certificate
certbot --nginx -d zap.yourdomain.com

# Now use: https://zap.yourdomain.com in Vercel
```

### Option 3: Render ($7/month)

**Step 1: Create Render Account**

1. Go to https://render.com
2. Sign up (free trial available)

**Step 2: Deploy ZAP**

1. Create new "Web Service"
2. Connect GitHub repo with Dockerfile (same as Railway)
3. Settings:
   - **Name:** zap-scanner
   - **Environment:** Docker
   - **Port:** 8080
   - **Plan:** Starter ($7/month)

4. Deploy

5. Get URL: `https://zap-scanner.onrender.com`

**Step 3: Configure Vercel**

Add to Vercel:
```
ZAP_BASE_URL=https://zap-scanner.onrender.com
```

---

## Usage

### API Route for Scanning

Create `src/app/api/scan-mini-app/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { MiniAppSecurityScanner } from '@/security/zap';

export const maxDuration = 60; // Vercel timeout: 60s max on Pro, 10s on Hobby

export async function POST(request: Request) {
  try {
    const { miniAppUrl } = await request.json();

    if (!miniAppUrl) {
      return NextResponse.json(
        { error: 'miniAppUrl is required' },
        { status: 400 }
      );
    }

    const zapUrl = process.env.ZAP_BASE_URL;
    if (!zapUrl) {
      return NextResponse.json(
        { error: 'ZAP_BASE_URL not configured' },
        { status: 500 }
      );
    }

    const scanner = new MiniAppSecurityScanner(zapUrl);

    // Quick scan only (10 minutes max)
    const result = await scanner.quickScan(miniAppUrl);

    return NextResponse.json({
      success: true,
      passed: result.summary.high === 0,
      summary: result.summary,
      alerts: result.alerts.map(alert => ({
        risk: alert.risk,
        alert: alert.alert,
        url: alert.url,
        description: alert.description,
        solution: alert.solution,
      })),
    });
  } catch (error) {
    console.error('Scan failed:', error);
    return NextResponse.json(
      { error: 'Scan failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

### Test Connection Endpoint

Create `src/app/api/test-zap/route.ts`:

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const zapUrl = process.env.ZAP_BASE_URL;

  if (!zapUrl) {
    return NextResponse.json({
      success: false,
      error: 'ZAP_BASE_URL not configured',
    }, { status: 500 });
  }

  try {
    const response = await fetch(`${zapUrl}/JSON/core/view/version/`);
    const data = await response.json();

    return NextResponse.json({
      success: true,
      zapVersion: data.version,
      zapUrl: zapUrl,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Cannot connect to ZAP',
      zapUrl: zapUrl,
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

### UI Component

Create `src/components/SecurityScanButton.tsx`:

```typescript
'use client';

import { useState } from 'react';

interface ScanResult {
  passed: boolean;
  summary: {
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
}

export function SecurityScanButton({ miniAppUrl }: { miniAppUrl: string }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    setError(null);

    try {
      const response = await fetch('/api/scan-mini-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ miniAppUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleScan}
        disabled={scanning}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {scanning ? 'Scanning...' : 'Run Security Scan'}
      </button>

      {error && (
        <div className="p-4 bg-red-50 text-red-800 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className={`p-4 rounded ${result.passed ? 'bg-green-50' : 'bg-yellow-50'}`}>
          <div className="font-semibold mb-2">
            {result.passed ? '✓ Security Check Passed' : '⚠️ Security Issues Found'}
          </div>
          <div className="space-y-1 text-sm">
            <div>High Risk: {result.summary.high}</div>
            <div>Medium Risk: {result.summary.medium}</div>
            <div>Low Risk: {result.summary.low}</div>
            <div>Informational: {result.summary.informational}</div>
          </div>
        </div>
      )}
    </div>
  );
}
```

Use it in your admin pages:

```typescript
import { SecurityScanButton } from '@/components/SecurityScanButton';

export default function MiniAppReviewPage() {
  return (
    <div>
      <h1>Mini App Review</h1>
      <SecurityScanButton miniAppUrl="https://mini-app-to-review.com" />
    </div>
  );
}
```

---

## Troubleshooting

### ZAP Won't Start

**Problem:** Docker container exits immediately

```bash
# Check logs
docker logs zap-local

# Common issues:
# 1. Port 8080 already in use
lsof -i :8080
# Kill the process or use different port:
docker run -p 8081:8080 ...

# 2. Permission issues
# Make sure reports directory is writable
chmod 777 ./security-reports
```

### Can't Connect to ZAP from Vercel

**Problem:** API returns "Cannot connect to ZAP"

**Check:**
1. ZAP URL is correct in Vercel env vars
2. ZAP is actually running:
   ```bash
   # For Railway/Render
   curl https://your-zap-url.com/JSON/core/view/version/

   # For DigitalOcean
   curl http://your-droplet-ip:8080/JSON/core/view/version/
   ```
3. Firewall allows connections (DigitalOcean)
4. Vercel has latest env vars (redeploy after changing)

### Scans Timeout

**Problem:** Scans take too long and timeout

**Solution:** Use `quickScan` instead of full scan:

```typescript
// Fast scan (spider only, ~2-5 minutes)
const result = await scanner.quickScan(miniAppUrl);

// Avoid full scans in Vercel (can take 30+ minutes)
// const result = await scanner.fullScan(miniAppUrl); // ❌ Too slow
```

**Vercel Timeout Limits:**
- **Hobby plan:** 10 seconds max
- **Pro plan:** 60 seconds max
- **Enterprise:** Up to 900 seconds

If you need longer scans, use a separate background job service.

### SDK Not Injecting

**Problem:** Mini apps fail because SDK is missing

**Current Status:** The Selenium injection script needs to be loaded into ZAP manually.

**Solution:**

```bash
# Copy script to ZAP
docker cp src/security/zap/scripts/inject-sdk.js zap-local:/home/zap/.ZAP/scripts/scripts/selenium/

# Restart ZAP
docker restart zap-local

# Or load via API (not supported in daemon mode currently)
```

**Note:** SDK injection is advanced - basic scans work without it. You may need to run ZAP GUI mode to load scripts initially.

### High Memory Usage

**Problem:** ZAP uses too much memory

**Solution:**

```bash
# Limit Docker memory
docker run -d \
  --name zap \
  --memory="1g" \
  --memory-swap="1g" \
  -p 8080:8080 \
  zaproxy/zap-stable ...

# Or upgrade your Railway/DigitalOcean plan
```

---

## Cost Breakdown

### Monthly Costs

| Option | Cost | Best For |
|--------|------|----------|
| **Railway Free Tier** | $0 (if under $5 usage) | Light usage, testing |
| **DigitalOcean Droplet** | $6/month | Best value, always-on |
| **Render Starter** | $7/month | Simple setup |
| **Railway Pro** | $20+/month | ❌ Overpriced |

### Recommended Setup

**For your team:**
- **Try Railway free tier first** - See if $5/month credit covers your usage
- **If over budget → Switch to DigitalOcean** - $6/month flat rate

**Don't use:**
- Railway Pro ($20/month) - too expensive vs alternatives

---

## Next Steps

1. ✅ **Set up ZAP locally** (test it works)
2. ✅ **Create API routes** (test connection, scan endpoints)
3. ✅ **Deploy ZAP to Railway or DigitalOcean** (production)
4. ✅ **Add scan button to your admin UI** (for admins to use)
5. ✅ **Test with a real mini app** (mini-app-send)
6. ✅ **Document results** (track security issues found)

---

## Support

**Issues?**
1. Check ZAP logs: `docker logs zap-local`
2. Test connection: Visit `/api/test-zap` endpoint
3. Verify environment variables in Vercel
4. Check ZAP is running: `docker ps`

**Questions?**
- ZAP docs: https://www.zaproxy.org/docs/
- API reference: https://www.zaproxy.org/docs/api/

---

## Security Notes

⚠️ **Important:**

1. **Don't expose ZAP publicly** - Only your Vercel app should access it
2. **Use API keys in production** - Change `api.disablekey=true` to `api.key=your-secret-key`
3. **Firewall rules** - Restrict port 8080 to only your Vercel IPs
4. **HTTPS recommended** - Use nginx + Let's Encrypt for SSL
5. **Regular updates** - Update ZAP docker image monthly: `docker pull zaproxy/zap-stable`
