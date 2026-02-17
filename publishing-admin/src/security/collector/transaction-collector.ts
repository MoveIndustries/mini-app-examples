/**
 * Transaction Collector
 *
 * In-memory store for transactions captured during security scans.
 * The injected mock SDK posts transactions here, and the scanner retrieves them for analysis.
 */

import type { TransactionPayload } from '../sdk/types';

export interface CollectedTransaction {
  scanId: string;
  payload: TransactionPayload;
  timestamp: number;
  url: string;
  triggeredBy?: string; // element that triggered it, if known
}

export interface Diagnostic {
  action: string;
  details: Record<string, unknown>;
  time: number;
  url: string;
}

// In-memory store - keyed by scanId
const transactionStore: Map<string, CollectedTransaction[]> = new Map();
const diagnosticStore: Map<string, Diagnostic[]> = new Map();

// Auto-cleanup old scans after 1 hour
const SCAN_TTL_MS = 60 * 60 * 1000;
const scanTimestamps: Map<string, number> = new Map();

function cleanupOldScans() {
  const now = Date.now();
  for (const [scanId, timestamp] of scanTimestamps.entries()) {
    if (now - timestamp > SCAN_TTL_MS) {
      transactionStore.delete(scanId);
      diagnosticStore.delete(scanId);
      scanTimestamps.delete(scanId);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldScans, 10 * 60 * 1000);

export const TransactionCollector = {
  /**
   * Initialize a new scan session
   */
  initScan(scanId: string): void {
    transactionStore.set(scanId, []);
    diagnosticStore.set(scanId, []);
    scanTimestamps.set(scanId, Date.now());
  },

  /**
   * Add a captured transaction to a scan session
   */
  addTransaction(scanId: string, transaction: Omit<CollectedTransaction, 'scanId'>): void {
    const transactions = transactionStore.get(scanId);
    if (!transactions) {
      // Auto-init if scan wasn't explicitly initialized
      this.initScan(scanId);
    }
    transactionStore.get(scanId)!.push({
      ...transaction,
      scanId,
    });
  },

  /**
   * Get all transactions for a scan session
   */
  getTransactions(scanId: string): CollectedTransaction[] {
    return transactionStore.get(scanId) || [];
  },

  /**
   * Clear transactions for a scan session
   */
  clearScan(scanId: string): void {
    transactionStore.delete(scanId);
    diagnosticStore.delete(scanId);
    scanTimestamps.delete(scanId);
  },

  /**
   * Get count of transactions for a scan
   */
  getTransactionCount(scanId: string): number {
    return transactionStore.get(scanId)?.length || 0;
  },

  /**
   * Add a diagnostic entry
   */
  addDiagnostic(scanId: string, diagnostic: Diagnostic): void {
    if (!diagnosticStore.has(scanId)) {
      diagnosticStore.set(scanId, []);
    }
    diagnosticStore.get(scanId)!.push(diagnostic);
  },

  /**
   * Get all diagnostics for a scan
   */
  getDiagnostics(scanId: string): Diagnostic[] {
    return diagnosticStore.get(scanId) || [];
  },
};
