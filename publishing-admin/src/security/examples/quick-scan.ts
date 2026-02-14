/**
 * Quick Security Scan Example
 *
 * Fast security assessment using Ajax Spider only (no active scanning)
 * Good for CI/CD pipelines where speed is important
 */

import { MiniAppSecurityScanner } from '../zap';

async function runQuickScan() {
  const miniAppUrl = process.env.MINI_APP_URL || 'http://localhost:3000';

  console.log('Running quick security scan for:', miniAppUrl);
  console.log('');

  const scanner = new MiniAppSecurityScanner('http://localhost:8080');

  try {
    const result = await scanner.quickScan(miniAppUrl, (progress) => {
      console.log(`${progress.message} (${progress.progress}%)`);
    });

    console.log('\n=================================');
    console.log('QUICK SCAN COMPLETED');
    console.log('=================================\n');

    console.log('Summary:');
    console.log(`  High: ${result.summary.high}`);
    console.log(`  Medium: ${result.summary.medium}`);
    console.log(`  Low: ${result.summary.low}`);
    console.log(`  Info: ${result.summary.informational}`);

    if (result.summary.high > 0) {
      console.log('\n⚠️  WARNING: High-risk vulnerabilities detected!');
      console.log('Run a full scan for detailed analysis.');
      process.exit(1);
    } else {
      console.log('\n✓ Quick scan passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Quick scan failed:', error);
    process.exit(1);
  }
}

runQuickScan();
