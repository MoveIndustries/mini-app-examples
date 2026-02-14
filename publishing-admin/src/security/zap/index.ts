/**
 * ZAP Security Testing Module
 *
 * Exports all ZAP-related functionality for mini app security testing
 *
 * IMPORTANT: Uses serverless-compatible scanner by default.
 * For Node.js environments with filesystem access, use scanner.ts directly.
 */

export { ZapClient, type ZapAlert, type ZapScanStatus, type ZapScanResult } from './client';

// Export serverless-compatible scanner (works in Vercel and Node.js)
export {
  MiniAppSecurityScanner,
  type ScanOptions,
  type ScanProgress,
  type ScanProgressCallback,
} from './scanner-serverless';

// Full scanner with report saving (Node.js only)
// Uncomment if you need disk-based report saving:
// export { MiniAppSecurityScanner as MiniAppSecurityScannerFull } from './scanner';
