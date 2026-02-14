/**
 * Basic Security Scan Example
 *
 * This example shows how to run a basic security scan on a mini app
 */

import { MiniAppSecurityScanner } from '../zap';

async function runBasicScan() {
  const miniAppUrl = process.env.MINI_APP_URL || 'http://localhost:3000';

  console.log('Starting security scan for:', miniAppUrl);
  console.log('Make sure ZAP is running on http://localhost:8080');
  console.log('');

  const scanner = new MiniAppSecurityScanner('http://localhost:8080');

  try {
    const result = await scanner.scan(
      {
        url: miniAppUrl,
        includeActiveScan: true,
        maxDuration: 30,
        reportDir: './security-reports',
      },
      (progress) => {
        console.log(
          `[${progress.stage.toUpperCase()}] ${progress.message} (${progress.progress}%)`
        );
      }
    );

    console.log('\n=================================');
    console.log('SCAN COMPLETED');
    console.log('=================================\n');

    console.log('Summary:');
    console.log(`  High Risk: ${result.summary.high}`);
    console.log(`  Medium Risk: ${result.summary.medium}`);
    console.log(`  Low Risk: ${result.summary.low}`);
    console.log(`  Informational: ${result.summary.informational}`);
    console.log('');

    if (result.summary.high > 0) {
      console.log('⚠️  HIGH RISK VULNERABILITIES FOUND:');
      const highAlerts = result.alerts.filter(a => a.risk === 'High');
      highAlerts.forEach((alert, index) => {
        console.log(`\n${index + 1}. ${alert.alert}`);
        console.log(`   URL: ${alert.url}`);
        console.log(`   Description: ${alert.description.substring(0, 200)}...`);
        console.log(`   Solution: ${alert.solution.substring(0, 200)}...`);
      });
    } else {
      console.log('✓ No high-risk vulnerabilities found!');
    }

    console.log('\nFull report saved to ./security-reports/');

    process.exit(result.summary.high > 0 ? 1 : 0);
  } catch (error) {
    console.error('Scan failed:', error);
    process.exit(1);
  }
}

runBasicScan();
