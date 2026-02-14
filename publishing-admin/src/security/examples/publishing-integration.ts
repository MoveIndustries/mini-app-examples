/**
 * Publishing Admin Integration Example
 *
 * Shows how to integrate security scanning into the mini app publishing workflow
 */

import { MiniAppSecurityScanner } from '../zap';
import type { ZapScanResult } from '../zap';

interface PublishingSecurityCheck {
  passed: boolean;
  score: number; // 0-100
  summary: ZapScanResult['summary'];
  blockingIssues: string[];
  warnings: string[];
}

/**
 * Run security check before publishing a mini app
 */
export async function checkMiniAppSecurity(
  miniAppUrl: string
): Promise<PublishingSecurityCheck> {
  const scanner = new MiniAppSecurityScanner('http://localhost:8080');

  console.log('[Publishing] Running security check for:', miniAppUrl);

  const result = await scanner.scan(
    {
      url: miniAppUrl,
      includeActiveScan: true,
      maxDuration: 20,
      reportDir: './security-reports',
    },
    (progress) => {
      console.log(`[Publishing] ${progress.stage}: ${progress.message}`);
    }
  );

  // Calculate security score (0-100)
  // Penalize based on risk level
  const penalties = {
    high: 20,
    medium: 5,
    low: 1,
  };

  const totalPenalty =
    result.summary.high * penalties.high +
    result.summary.medium * penalties.medium +
    result.summary.low * penalties.low;

  const score = Math.max(0, 100 - totalPenalty);

  // Determine blocking issues (high-risk only)
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  result.alerts.forEach(alert => {
    if (alert.risk === 'High') {
      blockingIssues.push(`${alert.alert} at ${alert.url}`);
    } else if (alert.risk === 'Medium') {
      warnings.push(`${alert.alert} at ${alert.url}`);
    }
  });

  // Determine if publishing should be blocked
  const passed = result.summary.high === 0 && score >= 70;

  return {
    passed,
    score,
    summary: result.summary,
    blockingIssues,
    warnings,
  };
}

/**
 * Example usage in publishing workflow
 */
async function examplePublishWorkflow() {
  const miniAppUrl = 'https://staging.mini-app.com';

  try {
    const securityCheck = await checkMiniAppSecurity(miniAppUrl);

    console.log('\n=================================');
    console.log('SECURITY CHECK RESULTS');
    console.log('=================================\n');

    console.log(`Security Score: ${securityCheck.score}/100`);
    console.log(`Status: ${securityCheck.passed ? '✓ PASSED' : '✗ FAILED'}\n`);

    if (securityCheck.blockingIssues.length > 0) {
      console.log('⛔ BLOCKING ISSUES:');
      securityCheck.blockingIssues.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue}`);
      });
      console.log('\nPublishing BLOCKED. Fix high-risk issues before publishing.\n');
      process.exit(1);
    }

    if (securityCheck.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      securityCheck.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
      console.log(
        '\nPublishing allowed, but please address these warnings in a future update.\n'
      );
    }

    if (securityCheck.passed) {
      console.log('✓ Security check passed! Ready to publish.\n');

      // Proceed with publishing
      // await publishMiniApp(miniAppUrl);
    } else {
      console.log('✗ Security check failed. Score too low.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('Security check failed with error:', error);
    process.exit(1);
  }
}

// Run example if called directly
if (require.main === module) {
  examplePublishWorkflow();
}
