# Mini App Security Testing Infrastructure

Automated security testing framework for Movement mini apps using OWASP ZAP, transaction simulation, and the Movement SDK.

## Quick Start (Run Locally)

```bash
# 1. Navigate to publishing-admin
cd publishing-admin

# 2. Copy environment file
cp .env.example .env.local

# 3. Start ZAP (in a separate terminal)
docker run -p 8080:8080 ghcr.io/zaproxy/zaproxy:stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 \
  -config 'api.addrs.addr.name=.*' \
  -config api.addrs.addr.regex=true \
  -config api.disablekey=true

# 4. Verify ZAP is running
curl http://localhost:8080/JSON/core/view/version/

# 5. Start publishing-admin
pnpm dev

# 6. Open http://localhost:3000, review a pending app, click "Run Security Scan"
```

## Overview

This infrastructure provides:

1. **Web-Compatible SDK** - A browser-injectable version of the Movement Mini App SDK with mock wallet functionality
2. **ZAP Integration** - Full OWASP ZAP API client and automation framework for crawling mini apps
3. **Transaction Capture** - Intercepts all transaction requests made by mini apps during scanning
4. **Movement SDK Simulation** - Simulates captured transactions to detect malicious patterns
5. **Integrated Scanner** - Combines web vulnerability scanning with transaction security analysis

## Directory Structure

```
security/
├── sdk/                        # Web-compatible mini app SDK
│   ├── mini-app-sdk-web.ts    # Main SDK implementation
│   ├── mock-wallet.ts         # Mock wallet with transaction capture
│   ├── types.ts               # TypeScript types
│   └── index.ts               # Module exports
├── zap/                        # ZAP automation
│   ├── client.ts              # ZAP API client
│   ├── scanner-serverless.ts  # Serverless-compatible scanner
│   ├── scripts/               # ZAP scripts
│   │   └── inject-sdk.js      # Selenium SDK injection script
│   ├── config/                # ZAP configurations
│   │   └── automation.yaml    # Automation framework config
│   └── index.ts               # Module exports
├── analyzer/                   # Transaction analysis
│   ├── transaction-analyzer.ts # Movement SDK simulation + threat detection
│   └── index.ts               # Module exports
├── collector/                  # Transaction collection
│   ├── transaction-collector.ts # In-memory store for captured transactions
│   └── index.ts               # Module exports
├── scanner/                    # Integrated scanner
│   ├── mini-app-scanner.ts    # Full security scanner (ZAP + transaction analysis)
│   └── index.ts               # Module exports
└── README.md                   # This file
```

## Prerequisites

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Required for security scanning:
```env
# ZAProxy URL
ZAP_BASE_URL=http://localhost:8080

# Optional: ZAP API key (recommended for production)
# ZAP_API_KEY=your-api-key

# App URL for transaction collector
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The Movement RPC URL is automatically picked up from `NEXT_PUBLIC_FULLNODE_URL`.

### 2. Start ZAP in Daemon Mode

**Docker (Recommended):**
```bash
docker run -p 8080:8080 ghcr.io/zaproxy/zaproxy:stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 \
  -config 'api.addrs.addr.name=.*' \
  -config api.addrs.addr.regex=true \
  -config api.disablekey=true
```

**Local Install (macOS):**
```bash
brew install --cask owasp-zap

/Applications/OWASP\ ZAP.app/Contents/Java/zap.sh \
  -daemon \
  -host 0.0.0.0 \
  -port 8080 \
  -config api.disablekey=true
```

**Local Install (Linux):**
```bash
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2.14.0_Linux.tar.gz
tar -xvf ZAP_2.14.0_Linux.tar.gz
./ZAP_2.14.0/zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=true
```

### 3. Verify ZAP is Running

```bash
curl http://localhost:8080/JSON/core/view/version/
```

## Quick Start

### Using the Publishing Admin UI

The security scanner is integrated into the review flow. When reviewing a pending app:

1. Open the app details modal
2. Click "Run Security Scan" in the Transaction Security Scan panel
3. The scanner will:
   - Crawl the mini app with ZAP's Ajax Spider
   - Capture any transaction requests the app makes
   - Simulate those transactions against Movement testnet
   - Analyze for malicious patterns
4. Review the results and risk level before approving

### Programmatic Usage

#### Full Security Scan (Web + Transaction Analysis)

```typescript
import { MiniAppScanner } from '@/security/scanner';

const scanner = new MiniAppScanner({
  zapBaseUrl: 'http://localhost:8080',
  collectorBaseUrl: 'http://localhost:3000',
});

const result = await scanner.scan('https://your-mini-app.com', (progress) => {
  console.log(`[${progress.stage}] ${progress.message} (${progress.progress}%)`);
});

console.log('Overall Risk:', result.overallRisk);
console.log('Recommendation:', result.recommendation);
console.log('Transactions Found:', result.transactionAnalysis?.totalTransactions);
console.log('Web Vulnerabilities:', result.webVulnerabilities.high, 'high risk');
```

#### Quick Web Scan (No Transaction Analysis)

```typescript
import { MiniAppSecurityScanner } from '@/security/zap';

const scanner = new MiniAppSecurityScanner('http://localhost:8080');

const result = await scanner.quickScan('https://your-mini-app.com', (progress) => {
  console.log(progress.message);
});

if (result.summary.high > 0) {
  console.error('High risk web vulnerabilities found!');
}
```

#### Transaction-Only Analysis

```typescript
import { TransactionAnalyzer } from '@/security/analyzer';

const analyzer = new TransactionAnalyzer(
  'https://testnet.movementnetwork.xyz/v1',
  '0xYourTestAddress',
  '0xYourTestPublicKey'
);

const report = await analyzer.analyzeTransactions([
  {
    payload: {
      function: '0x1::coin::transfer',
      arguments: ['0xRecipient', '1000000'],
    },
    response: { hash: '0x...', success: true },
    timestamp: Date.now(),
  },
]);

console.log('Risk:', report.overallRisk);
console.log('Threats:', report.criticalThreats, 'critical,', report.highThreats, 'high');
```

## Integration with Publishing Admin

The security scanner is already integrated into the publishing admin UI via the `SecurityScanPanel` component.

### API Endpoints

**POST /api/security/scan** - Run a full security scan
```bash
curl -X POST http://localhost:3000/api/security/scan \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-mini-app.com", "maxDuration": 5}'
```

**POST /api/security/collect-transaction** - Receives captured transactions (used internally)

**GET /api/security/collect-transaction?scanId=xxx** - Get captured transactions for a scan

## What the Scanner Detects

### Web Vulnerabilities (via ZAP)
- XSS (Cross-Site Scripting) - reflected and stored
- SQL Injection
- CSRF (Cross-Site Request Forgery)
- Insecure Authentication
- Sensitive Data Exposure
- Security Misconfiguration
- Broken Access Control
- Missing Security Headers

### Transaction Threats (via Movement SDK Simulation)

| Check | Type | Example |
|-------|------|---------|
| Suspicious function names | Static | `::drain`, `::steal`, `::withdraw_all` |
| Known malicious addresses | Static | Blocklist lookup |
| Large outflows | Dynamic | >90% of balance leaving |
| Multiple outflows | Dynamic | Drain pattern (many transfers) |
| Transaction failures | Dynamic | Would revert on-chain |
| High gas usage | Dynamic | Unusual computation |

### How Transaction Detection Works

```
1. ZAP Ajax Spider crawls the mini app, clicking buttons and filling forms
2. Mini app's JavaScript calls sdk.signTransaction(payload)
3. Injected mock SDK captures the payload and POSTs it to /api/security/collect-transaction
4. After crawling, scanner retrieves all captured transactions
5. Each transaction is simulated against Movement testnet using @aptos-labs/ts-sdk
6. Simulation results (events, balance changes) are analyzed for threats
7. Report includes both web vulns and transaction threats
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
