# Security Testing Setup Guide

Complete setup guide for running automated security tests on Movement mini apps.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Publishing Admin                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  MiniAppSecurityScanner                                   │  │
│  │  - Manages scan lifecycle                                 │  │
│  │  - Provides progress callbacks                            │  │
│  │  - Generates reports                                      │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                              │
│  ┌────────────────▼─────────────────────────────────────────┐  │
│  │  ZapClient (REST API)                                     │  │
│  │  - Communicates with ZAP daemon                           │  │
│  │  - Controls spiders and scans                             │  │
│  │  - Retrieves alerts                                       │  │
│  └────────────────┬─────────────────────────────────────────┘  │
└───────────────────┼──────────────────────────────────────────────┘
                    │
        HTTP API    │
                    │
┌───────────────────▼──────────────────────────────────────────────┐
│                    OWASP ZAP (Daemon)                             │
│                    Port: 8080                                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Selenium WebDriver                                       │  │
│  │  - Controls headless Chrome/Firefox                       │  │
│  │  - Executes inject-sdk.js script                          │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                              │
│  ┌────────────────▼─────────────────────────────────────────┐  │
│  │  Ajax Spider                                              │  │
│  │  - Crawls mini app                                        │  │
│  │  - Discovers all pages/routes                             │  │
│  │  - Executes JavaScript                                    │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                              │
│  ┌────────────────▼─────────────────────────────────────────┐  │
│  │  Active Scanner                                           │  │
│  │  - Tests for vulnerabilities                              │  │
│  │  - Runs attack payloads                                   │  │
│  │  - Generates alerts                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────┬──────────────────────────────────────────────┘
                    │
        Controls    │
                    │
┌───────────────────▼──────────────────────────────────────────────┐
│              Headless Chrome/Firefox                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Mini App Under Test                                      │  │
│  │  https://your-mini-app.com                                │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  window.movementSDK (INJECTED)                     │  │  │
│  │  │  - MovementMiniAppSDKWeb instance                  │  │  │
│  │  │  - MockWallet backend                              │  │  │
│  │  │  - All SDK methods available                       │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Setup

### Step 1: Install OWASP ZAP

Choose your installation method:

#### Option A: Homebrew (macOS)

```bash
brew install --cask owasp-zap
```

#### Option B: Download Binary

Download from: https://www.zaproxy.org/download/

#### Option C: Docker (Recommended for CI/CD)

```bash
docker pull zaproxy/zap-stable
```

### Step 2: Install Browser for Selenium

ZAP needs a browser to crawl JavaScript apps:

```bash
# macOS
brew install --cask chromium

# Ubuntu/Debian
sudo apt-get install chromium-browser

# CentOS/RHEL
sudo yum install chromium
```

### Step 3: Start ZAP in Daemon Mode

#### Local Installation:

```bash
# macOS
/Applications/OWASP\ ZAP.app/Contents/Java/zap.sh \
  -daemon \
  -host 0.0.0.0 \
  -port 8080 \
  -config api.disablekey=true

# Linux
~/ZAP_2.14.0/zap.sh \
  -daemon \
  -host 0.0.0.0 \
  -port 8080 \
  -config api.disablekey=true
```

#### Docker:

```bash
docker run -d \
  --name zap \
  -u zap \
  -p 8080:8080 \
  -v $(pwd)/security-reports:/zap/reports:rw \
  zaproxy/zap-stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true
```

### Step 4: Load SDK Injection Script

Copy the Selenium script to ZAP:

```bash
# Find ZAP home directory
# macOS: ~/.ZAP
# Linux: ~/.ZAP
# Docker: /home/zap/.ZAP

# Create scripts directory if it doesn't exist
mkdir -p ~/.ZAP/scripts/scripts/selenium

# Copy injection script
cp src/security/zap/scripts/inject-sdk.js \
   ~/.ZAP/scripts/scripts/selenium/inject-sdk.js
```

Or load via API:

```bash
curl "http://localhost:8080/JSON/script/action/load/?scriptName=inject-sdk&scriptType=selenium&scriptEngine=ECMAScript&scriptFile=$(pwd)/src/security/zap/scripts/inject-sdk.js"
```

### Step 5: Verify Setup

Test that everything is working:

```bash
# Check ZAP is running
curl http://localhost:8080/JSON/core/view/version/

# Should return something like:
# {"version":"2.14.0"}
```

### Step 6: Run Your First Scan

```bash
# Set the mini app URL
export MINI_APP_URL=http://localhost:3000

# Run quick scan
npm run security:quick-scan

# Or run full scan
npm run security:full-scan
```

## NPM Scripts (Add to package.json)

Add these scripts to your `publishing-admin/package.json`:

```json
{
  "scripts": {
    "security:quick-scan": "tsx src/security/examples/quick-scan.ts",
    "security:full-scan": "tsx src/security/examples/basic-scan.ts",
    "security:check": "tsx src/security/examples/publishing-integration.ts",
    "zap:start": "docker run -d --name zap -p 8080:8080 zaproxy/zap-stable zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true",
    "zap:stop": "docker stop zap && docker rm zap",
    "zap:logs": "docker logs -f zap"
  }
}
```

## Environment Variables

Create a `.env.local` file in `publishing-admin/`:

```bash
# ZAP Configuration
ZAP_BASE_URL=http://localhost:8080
ZAP_API_KEY=  # Leave empty if api.disablekey=true

# Mini App Under Test
MINI_APP_URL=http://localhost:3000

# Scan Configuration
SECURITY_SCAN_MAX_DURATION=30  # minutes
SECURITY_SCAN_ACTIVE=true      # Enable active scanning
SECURITY_REPORT_DIR=./security-reports

# Thresholds
SECURITY_FAIL_ON_HIGH=true
SECURITY_WARN_ON_MEDIUM=true
SECURITY_MIN_SCORE=70
```

## Docker Compose Setup

For easy management, create `docker-compose.yml` in `publishing-admin/`:

```yaml
version: '3.8'

services:
  zap:
    image: zaproxy/zap-stable
    container_name: mini-app-zap
    ports:
      - "8080:8080"
    command: zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true
    volumes:
      - ./security-reports:/zap/reports
      - ./src/security/zap/scripts:/zap/scripts
    networks:
      - mini-app-security

  chrome:
    image: selenium/standalone-chrome:latest
    container_name: mini-app-chrome
    ports:
      - "4444:4444"
    shm_size: 2gb
    networks:
      - mini-app-security

networks:
  mini-app-security:
    driver: bridge
```

Then run:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/security-scan.yml`:

```yaml
name: Security Scan

on:
  pull_request:
    paths:
      - 'mini-app-/**'
  push:
    branches:
      - main

jobs:
  security-scan:
    runs-on: ubuntu-latest

    services:
      zap:
        image: zaproxy/zap-stable
        ports:
          - 8080:8080
        options: >-
          --health-cmd "curl -f http://localhost:8080"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install
        working-directory: ./publishing-admin

      - name: Build mini app
        run: npm run build
        working-directory: ./mini-app-send

      - name: Start mini app
        run: npm run dev &
        working-directory: ./mini-app-send

      - name: Wait for mini app
        run: npx wait-on http://localhost:3000

      - name: Run security scan
        run: npm run security:check
        working-directory: ./publishing-admin
        env:
          MINI_APP_URL: http://localhost:3000
          ZAP_BASE_URL: http://localhost:8080

      - name: Upload security report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: publishing-admin/security-reports/
```

## Troubleshooting

### ZAP Won't Start

```bash
# Check if port 8080 is already in use
lsof -i :8080

# Kill process using port
kill -9 <PID>

# Or use a different port
zap.sh -daemon -port 8081
```

### Selenium Can't Find Browser

```bash
# Set Chrome path explicitly
export CHROME_BIN=/usr/bin/chromium-browser

# Or in ZAP API:
curl "http://localhost:8080/JSON/selenium/action/setOptionChromeBinaryPath/?String=/usr/bin/chromium-browser"
```

### SDK Not Injecting

```bash
# Verify script is loaded
curl "http://localhost:8080/JSON/script/view/listScripts/"

# Enable script if disabled
curl "http://localhost:8080/JSON/script/action/enable/?scriptName=inject-sdk"

# Check ZAP logs
tail -f ~/.ZAP/zap.log
```

### Scan Taking Too Long

Reduce scan scope:

```typescript
const result = await scanner.scan({
  url: miniAppUrl,
  includeActiveScan: false,  // Disable active scan
  maxDuration: 10,           // Reduce duration
});
```

### Network Connection Issues

If mini app is on localhost and ZAP is in Docker:

```bash
# Use host.docker.internal instead of localhost
export MINI_APP_URL=http://host.docker.internal:3000

# Or use --network=host
docker run --network=host zaproxy/zap-stable ...
```

## Production Checklist

Before deploying to production:

- [ ] Enable ZAP API key authentication
- [ ] Run ZAP in isolated network
- [ ] Set up proper firewall rules
- [ ] Use HTTPS for mini apps
- [ ] Configure scan result retention policy
- [ ] Set up alerting for high-risk findings
- [ ] Document false positives
- [ ] Create custom scan policies
- [ ] Test in staging first
- [ ] Monitor ZAP resource usage

## Support

For issues or questions:

1. Check ZAP logs: `~/.ZAP/zap.log`
2. Review scan reports in `./security-reports/`
3. Enable debug mode in scanner:
   ```typescript
   const scanner = new MiniAppSecurityScanner('http://localhost:8080');
   scanner.getClient().setDebug(true);
   ```
4. Consult ZAP documentation: https://www.zaproxy.org/docs/

## Next Steps

1. Run your first scan: `npm run security:quick-scan`
2. Review the security report
3. Fix any high-risk vulnerabilities
4. Integrate into publishing workflow
5. Set up CI/CD automation
6. Configure alerting and notifications
