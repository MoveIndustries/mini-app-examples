# Mini App Security Testing Infrastructure

Automated security testing framework for Movement mini apps using OWASP ZAP and Selenium.

## Overview

This infrastructure provides:

1. **Web-Compatible SDK** - A browser-injectable version of the Movement Mini App SDK with mock wallet functionality
2. **ZAP Integration** - Full OWASP ZAP API client and automation framework
3. **Selenium Scripts** - Automatic SDK injection into mini apps during testing
4. **High-Level Scanner** - Easy-to-use interface for running security scans

## Directory Structure

```
security/
├── sdk/                        # Web-compatible mini app SDK
│   ├── mini-app-sdk-web.ts    # Main SDK implementation
│   ├── mock-wallet.ts         # Mock wallet for testing
│   ├── types.ts               # TypeScript types
│   └── index.ts               # Module exports
├── zap/                        # ZAP automation
│   ├── client.ts              # ZAP API client
│   ├── scanner.ts             # High-level scanner interface
│   ├── scripts/               # ZAP scripts
│   │   └── inject-sdk.js      # Selenium SDK injection script
│   ├── config/                # ZAP configurations
│   │   └── automation.yaml    # Automation framework config
│   └── index.ts               # Module exports
└── README.md                   # This file
```

## Prerequisites

### 1. Install OWASP ZAP

**macOS:**
```bash
brew install --cask owasp-zap
```

**Linux:**
```bash
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2.14.0_Linux.tar.gz
tar -xvf ZAP_2.14.0_Linux.tar.gz
```

**Docker:**
```bash
docker pull zaproxy/zap-stable
```

### 2. Start ZAP in Daemon Mode

**Local Install:**
```bash
/Applications/OWASP\ ZAP.app/Contents/Java/zap.sh \
  -daemon \
  -host 0.0.0.0 \
  -port 8080 \
  -config api.disablekey=true
```

**Docker:**
```bash
docker run -u zap -p 8080:8080 -i zaproxy/zap-stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 \
  -config api.disablekey=true
```

### 3. Install Chrome/Chromium for Selenium

ZAP's Ajax Spider needs a browser to crawl JavaScript-heavy apps:

```bash
# macOS
brew install --cask chromium

# Linux
sudo apt-get install chromium-browser
```

## Quick Start

### 1. Basic Security Scan

```typescript
import { MiniAppSecurityScanner } from './security/zap';

const scanner = new MiniAppSecurityScanner('http://localhost:8080');

const result = await scanner.scan({
  url: 'https://your-mini-app.com',
  includeActiveScan: true,
  maxDuration: 30,
  reportDir: './security-reports'
}, (progress) => {
  console.log(`${progress.stage}: ${progress.message} (${progress.progress}%)`);
});

console.log('Security Summary:', result.summary);
console.log(`Found ${result.alerts.length} security issues`);
```

### 2. Quick Scan (Spider Only, No Active Scan)

```typescript
const scanner = new MiniAppSecurityScanner();

const result = await scanner.quickScan('https://your-mini-app.com', (progress) => {
  console.log(progress.message);
});

if (result.summary.high > 0) {
  console.error('High risk vulnerabilities found!');
}
```

### 3. Full Comprehensive Scan

```typescript
const scanner = new MiniAppSecurityScanner();

const result = await scanner.fullScan('https://your-mini-app.com', (progress) => {
  console.log(`[${progress.stage}] ${progress.message}`);
});

// Filter high-risk alerts
const criticalAlerts = result.alerts.filter(a => a.risk === 'High');
console.log('Critical Issues:', criticalAlerts);
```

## Integration with Publishing Admin

### Example: Automated Security Check Before Publishing

```typescript
// src/lib/security-check.ts
import { MiniAppSecurityScanner } from '../security/zap';

export async function runSecurityCheck(miniAppUrl: string): Promise<{
  passed: boolean;
  summary: {
    high: number;
    medium: number;
    low: number;
  };
  report: string;
}> {
  const scanner = new MiniAppSecurityScanner();

  try {
    const result = await scanner.scan({
      url: miniAppUrl,
      includeActiveScan: true,
      maxDuration: 30,
      reportDir: `./security-reports/${Date.now()}`
    });

    // Fail if any high-risk vulnerabilities found
    const passed = result.summary.high === 0;

    return {
      passed,
      summary: result.summary,
      report: `Found ${result.alerts.length} issues: ${result.summary.high} high, ${result.summary.medium} medium, ${result.summary.low} low`
    };
  } catch (error) {
    console.error('Security scan failed:', error);
    throw error;
  }
}
```

### Example: API Endpoint for Security Scans

```typescript
// src/app/api/security-scan/route.ts
import { NextResponse } from 'next/server';
import { MiniAppSecurityScanner } from '@/security/zap';

export async function POST(request: Request) {
  const { url } = await request.json();

  const scanner = new MiniAppSecurityScanner();

  const result = await scanner.quickScan(url);

  return NextResponse.json({
    success: true,
    summary: result.summary,
    alerts: result.alerts.map(alert => ({
      risk: alert.risk,
      alert: alert.alert,
      url: alert.url,
      description: alert.description,
    })),
  });
}
```

## SDK Injection

The web-compatible SDK is automatically injected by the Selenium script when ZAP launches a browser.

### How It Works

1. ZAP starts a Selenium-controlled browser
2. `inject-sdk.js` script runs on browser launch
3. Script injects the full SDK into every page that loads
4. Mini app can now use `window.movementSDK` as if running in the real wallet

### Manual Injection (for testing)

You can also inject the SDK manually in your browser console:

```javascript
// Load the SDK bundle
const script = document.createElement('script');
script.src = 'http://localhost:3000/security/sdk/bundle.js';
document.head.appendChild(script);

// Or inject inline
// (copy the contents of mini-app-sdk-web.ts transpiled to JS)
```

### Testing SDK Injection

```typescript
import { MovementMiniAppSDKWeb } from './security/sdk';

// Create SDK instance
const sdk = new MovementMiniAppSDKWeb({
  debug: true,
  mockWallet: {
    address: '0x123...',
    network: 'testnet',
    autoApprove: true,
  }
});

// Test wallet connection
const account = await sdk.getAccount();
console.log('Address:', account.address);

// Test transaction signing
const tx = await sdk.signTransaction({
  function: '0x1::coin::transfer',
  type_arguments: ['0x1::aptos_coin::AptosCoin'],
  arguments: ['0xrecipient...', '1000000']
});
console.log('Transaction hash:', tx.hash);
```

## Advanced Usage

### Using ZAP API Client Directly

```typescript
import { ZapClient } from './security/zap';

const zap = new ZapClient('http://localhost:8080');

// Create a new session
await zap.newSession('my-scan');

// Create context
const contextId = await zap.newContext('mini-app-context');
await zap.includeInContext('mini-app-context', 'https://mini-app.com/.*');

// Access URL
await zap.accessUrl('https://mini-app.com');

// Run Ajax Spider
const spiderScanId = await zap.ajaxSpiderScan('https://mini-app.com', true, 'mini-app-context');
await zap.waitForAjaxSpider(600000); // 10 minute timeout

// Run Active Scan
const activeScanId = await zap.activeScan('https://mini-app.com', true, true);
await zap.waitForActiveScan(activeScanId, 1800000); // 30 minute timeout

// Get alerts
const alerts = await zap.getAlerts('https://mini-app.com');
console.log('Alerts:', alerts);

// Get summary
const summary = await zap.getScanSummary('https://mini-app.com');
console.log('Summary:', summary);
```

### Loading Custom Selenium Scripts

The `inject-sdk.js` script needs to be loaded into ZAP:

```bash
# Copy script to ZAP scripts directory
cp src/security/zap/scripts/inject-sdk.js \
   ~/.ZAP/scripts/scripts/selenium/

# Or use ZAP API to load it
curl "http://localhost:8080/JSON/script/action/load/?scriptName=inject-sdk&scriptType=selenium&scriptEngine=ECMAScript&scriptFile=/path/to/inject-sdk.js"
```

### Using Automation Framework

```bash
# Export environment variable for mini app URL
export MINI_APP_URL=https://your-mini-app.com

# Run ZAP with automation framework
docker run -v $(pwd)/src/security/zap/config:/zap/configs \
  -v $(pwd)/security-reports:/zap/reports \
  zaproxy/zap-stable \
  zap.sh -cmd \
  -autorun /zap/configs/automation.yaml
```

## Scan Results

### Summary Object

```typescript
{
  high: number;      // Number of high-risk vulnerabilities
  medium: number;    // Number of medium-risk vulnerabilities
  low: number;       // Number of low-risk vulnerabilities
  informational: number; // Number of informational findings
}
```

### Alert Object

```typescript
{
  alert: string;           // Alert name
  risk: 'High' | 'Medium' | 'Low' | 'Informational';
  confidence: 'High' | 'Medium' | 'Low';
  url: string;            // Affected URL
  description: string;     // Detailed description
  solution: string;        // Recommended fix
  cweid: string;          // CWE ID
  wascid: string;         // WASC ID
  reference: string;      // References/links
}
```

## Common Vulnerabilities Detected

The scanner checks for:

- **XSS (Cross-Site Scripting)** - Both reflected and stored
- **SQL Injection** - Even though mini apps use Aptos, API endpoints might be vulnerable
- **CSRF (Cross-Site Request Forgery)**
- **Insecure Authentication**
- **Sensitive Data Exposure**
- **Security Misconfiguration**
- **Broken Access Control**
- **Known Vulnerable Components**

## Troubleshooting

### ZAP Connection Issues

```bash
# Check if ZAP is running
curl http://localhost:8080/JSON/core/view/version/

# If not running, start ZAP in daemon mode
/Applications/OWASP\ ZAP.app/Contents/Java/zap.sh -daemon -port 8080
```

### Selenium Browser Issues

```bash
# Check if Chrome/Chromium is installed
which chromium-browser
which google-chrome

# Set browser path in ZAP
curl "http://localhost:8080/JSON/selenium/action/setOptionChromeBinaryPath/?String=/usr/bin/chromium-browser"
```

### SDK Not Injecting

1. Check that `inject-sdk.js` is loaded in ZAP scripts
2. Verify Selenium is enabled for Ajax Spider
3. Check browser console for injection errors
4. Enable debug mode in SDK:

```typescript
const sdk = new MovementMiniAppSDKWeb({ debug: true });
```

## Performance Tips

1. **Use Quick Scan for CI/CD** - Active scans can take 30+ minutes
2. **Limit Scan Duration** - Set reasonable `maxDuration` values
3. **Run Scans in Background** - Don't block publishing on security scans
4. **Cache Results** - Store scan results and only re-scan on code changes
5. **Parallel Scans** - Run multiple mini app scans concurrently

## Security Considerations

1. **ZAP Access** - Always run ZAP in a secure, isolated environment
2. **API Key** - Use API keys in production (`-config api.key=yourkey`)
3. **Network Isolation** - Don't expose ZAP port publicly
4. **Test Environments** - Only scan staging/test versions of mini apps
5. **Rate Limiting** - Active scans can trigger rate limits

## Next Steps

1. **CI/CD Integration** - Add security scans to GitHub Actions
2. **Automated Reporting** - Send scan results to Slack/Email
3. **Trend Analysis** - Track security posture over time
4. **Custom Policies** - Create mini-app-specific scan policies
5. **False Positive Management** - Build a database of known false positives

## Resources

- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [ZAP API Documentation](https://www.zaproxy.org/docs/api/)
- [Selenium Integration](https://www.zaproxy.org/docs/desktop/addons/selenium/)
- [Automation Framework Guide](https://www.zaproxy.org/docs/automate/automation-framework/)
