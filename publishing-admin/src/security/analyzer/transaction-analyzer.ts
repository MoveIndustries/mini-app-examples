/**
 * Transaction Analyzer
 *
 * Simulates captured transactions using Movement SDK and analyzes them for threats.
 * This is the core of the "Blowfish for Movement" approach.
 */

import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk';
import type { CapturedTransaction } from '../sdk/mock-wallet';
import type { TransactionPayload } from '../sdk/types';

export interface BalanceChange {
  type: 'incoming' | 'outgoing';
  asset: string;
  amount: string;
  address?: string;
}

export interface ThreatWarning {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SimulationResult {
  payload: TransactionPayload;
  success: boolean;
  gasUsed: string;
  vmStatus: string;
  balanceChanges: BalanceChange[];
  warnings: ThreatWarning[];
  rawEvents: unknown[];
  rawChanges: unknown[];
}

export interface AnalysisReport {
  scannedAt: number;
  totalTransactions: number;
  simulatedSuccessfully: number;
  simulationsFailed: number;
  criticalThreats: number;
  highThreats: number;
  mediumThreats: number;
  lowThreats: number;
  results: SimulationResult[];
  overallRisk: 'critical' | 'high' | 'medium' | 'low' | 'safe';
}

// Known malicious patterns and addresses (would be expanded with real threat intel)
const KNOWN_MALICIOUS_ADDRESSES: Set<string> = new Set([
  // Add known scam addresses here
]);

const SUSPICIOUS_FUNCTION_PATTERNS = [
  /::drain/i,
  /::steal/i,
  /::withdraw_all/i,
  /::transfer_all/i,
  /::claim.*airdrop/i,
  /::emergency_withdraw/i,
];

const SUSPICIOUS_MODULES = [
  // Known drainer modules would go here
];

export class TransactionAnalyzer {
  private aptos: Aptos;
  private signerAddress: string;
  private signerPublicKey: string;

  constructor(
    rpcUrl: string = 'https://testnet.movementnetwork.xyz/v1',
    signerAddress: string,
    signerPublicKey: string
  ) {
    const config = new AptosConfig({ fullnode: rpcUrl });
    this.aptos = new Aptos(config);
    this.signerAddress = signerAddress;
    this.signerPublicKey = signerPublicKey;
  }

  /**
   * Analyze all captured transactions from a scan
   */
  async analyzeTransactions(
    capturedTransactions: CapturedTransaction[]
  ): Promise<AnalysisReport> {
    const results: SimulationResult[] = [];
    let simulatedSuccessfully = 0;
    let simulationsFailed = 0;

    for (const captured of capturedTransactions) {
      try {
        const result = await this.simulateAndAnalyze(captured.payload);
        results.push(result);
        if (result.success) {
          simulatedSuccessfully++;
        } else {
          simulationsFailed++;
        }
      } catch (error) {
        console.error('Simulation failed for:', captured.payload.function, error);
        simulationsFailed++;
        results.push({
          payload: captured.payload,
          success: false,
          gasUsed: '0',
          vmStatus: `Simulation error: ${error instanceof Error ? error.message : 'Unknown'}`,
          balanceChanges: [],
          warnings: [
            {
              severity: 'medium',
              type: 'simulation_failed',
              message: `Could not simulate transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          rawEvents: [],
          rawChanges: [],
        });
      }
    }

    // Count threats by severity
    const threatCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const result of results) {
      for (const warning of result.warnings) {
        threatCounts[warning.severity]++;
      }
    }

    // Determine overall risk
    let overallRisk: AnalysisReport['overallRisk'] = 'safe';
    if (threatCounts.critical > 0) overallRisk = 'critical';
    else if (threatCounts.high > 0) overallRisk = 'high';
    else if (threatCounts.medium > 0) overallRisk = 'medium';
    else if (threatCounts.low > 0) overallRisk = 'low';

    return {
      scannedAt: Date.now(),
      totalTransactions: capturedTransactions.length,
      simulatedSuccessfully,
      simulationsFailed,
      criticalThreats: threatCounts.critical,
      highThreats: threatCounts.high,
      mediumThreats: threatCounts.medium,
      lowThreats: threatCounts.low,
      results,
      overallRisk,
    };
  }

  /**
   * Simulate a single transaction and analyze the results
   */
  private async simulateAndAnalyze(payload: TransactionPayload): Promise<SimulationResult> {
    const warnings: ThreatWarning[] = [];

    // Static analysis first (doesn't require simulation)
    warnings.push(...this.staticAnalysis(payload));

    // Build and simulate transaction
    let simulation;
    try {
      const transaction = await this.aptos.transaction.build.simple({
        sender: this.signerAddress as `0x${string}`,
        data: {
          function: payload.function as `${string}::${string}::${string}`,
          typeArguments: (payload.type_arguments || []) as [],
          functionArguments: payload.arguments || [],
        },
      });

      [simulation] = await this.aptos.transaction.simulate.simple({
        signerPublicKey: this.signerPublicKey as unknown as import('@aptos-labs/ts-sdk').PublicKey,
        transaction,
      });
    } catch (error) {
      return {
        payload,
        success: false,
        gasUsed: '0',
        vmStatus: `Build/simulate error: ${error instanceof Error ? error.message : 'Unknown'}`,
        balanceChanges: [],
        warnings,
        rawEvents: [],
        rawChanges: [],
      };
    }

    // Parse balance changes from events
    const balanceChanges = this.parseBalanceChanges(simulation.events || []);

    // Dynamic analysis based on simulation results
    warnings.push(...this.dynamicAnalysis(simulation, balanceChanges));

    return {
      payload,
      success: simulation.success,
      gasUsed: simulation.gas_used,
      vmStatus: simulation.vm_status,
      balanceChanges,
      warnings,
      rawEvents: simulation.events || [],
      rawChanges: simulation.changes || [],
    };
  }

  /**
   * Static analysis - check patterns without simulation
   */
  private staticAnalysis(payload: TransactionPayload): ThreatWarning[] {
    const warnings: ThreatWarning[] = [];
    const fn = payload.function;

    // Check for suspicious function names
    for (const pattern of SUSPICIOUS_FUNCTION_PATTERNS) {
      if (pattern.test(fn)) {
        warnings.push({
          severity: 'high',
          type: 'suspicious_function_name',
          message: `Function name matches suspicious pattern: ${fn}`,
          details: { pattern: pattern.toString() },
        });
      }
    }

    // Check for known malicious addresses
    const moduleAddress = fn.split('::')[0];
    if (KNOWN_MALICIOUS_ADDRESSES.has(moduleAddress)) {
      warnings.push({
        severity: 'critical',
        type: 'known_malicious_address',
        message: `Transaction targets known malicious address: ${moduleAddress}`,
      });
    }

    // Check recipient if specified
    if (payload.to && KNOWN_MALICIOUS_ADDRESSES.has(payload.to)) {
      warnings.push({
        severity: 'critical',
        type: 'known_malicious_recipient',
        message: `Transaction sends to known malicious address: ${payload.to}`,
      });
    }

    return warnings;
  }

  /**
   * Dynamic analysis - check simulation results
   */
  private dynamicAnalysis(
    simulation: { success: boolean; gas_used: string; events?: unknown[] },
    balanceChanges: BalanceChange[]
  ): ThreatWarning[] {
    const warnings: ThreatWarning[] = [];

    // Check for large outflows
    const outflows = balanceChanges.filter((c) => c.type === 'outgoing');
    for (const outflow of outflows) {
      const amount = BigInt(outflow.amount);
      // Flag if outflow is > 90% of typical test balance (heuristic)
      if (amount > BigInt('9000000000')) {
        warnings.push({
          severity: 'high',
          type: 'large_outflow',
          message: `Large token outflow detected: ${outflow.amount} of ${outflow.asset}`,
          details: { amount: outflow.amount, asset: outflow.asset },
        });
      }
    }

    // Check for multiple outflows to different addresses (potential drain)
    if (outflows.length > 3) {
      warnings.push({
        severity: 'medium',
        type: 'multiple_outflows',
        message: `Transaction causes ${outflows.length} separate outflows - possible drain pattern`,
      });
    }

    // Check if transaction fails
    if (!simulation.success) {
      warnings.push({
        severity: 'low',
        type: 'transaction_would_fail',
        message: 'Transaction simulation indicates it would fail on-chain',
      });
    }

    // Check for unusually high gas
    if (BigInt(simulation.gas_used) > BigInt('1000000')) {
      warnings.push({
        severity: 'low',
        type: 'high_gas_usage',
        message: `Unusually high gas usage: ${simulation.gas_used}`,
      });
    }

    return warnings;
  }

  /**
   * Parse balance changes from transaction events
   */
  private parseBalanceChanges(events: unknown[]): BalanceChange[] {
    const changes: BalanceChange[] = [];

    for (const event of events) {
      const e = event as { type?: string; data?: { amount?: string; store?: string } };
      if (!e.type) continue;

      if (e.type.includes('Withdraw') || e.type.includes('withdraw')) {
        changes.push({
          type: 'outgoing',
          asset: e.type,
          amount: e.data?.amount || '0',
        });
      } else if (e.type.includes('Deposit') || e.type.includes('deposit')) {
        changes.push({
          type: 'incoming',
          asset: e.type,
          amount: e.data?.amount || '0',
        });
      }
    }

    return changes;
  }

  /**
   * Generate a human-readable summary of the analysis
   */
  static generateSummary(report: AnalysisReport): string {
    const lines: string[] = [
      '=== Transaction Security Analysis ===',
      `Scanned: ${new Date(report.scannedAt).toISOString()}`,
      `Total Transactions: ${report.totalTransactions}`,
      `Simulated Successfully: ${report.simulatedSuccessfully}`,
      `Simulations Failed: ${report.simulationsFailed}`,
      '',
      '--- Threat Summary ---',
      `Critical: ${report.criticalThreats}`,
      `High: ${report.highThreats}`,
      `Medium: ${report.mediumThreats}`,
      `Low: ${report.lowThreats}`,
      '',
      `Overall Risk: ${report.overallRisk.toUpperCase()}`,
      '',
    ];

    if (report.results.some((r) => r.warnings.length > 0)) {
      lines.push('--- Detailed Warnings ---');
      for (const result of report.results) {
        if (result.warnings.length > 0) {
          lines.push(`\nFunction: ${result.payload.function}`);
          for (const warning of result.warnings) {
            lines.push(`  [${warning.severity.toUpperCase()}] ${warning.message}`);
          }
        }
      }
    }

    return lines.join('\n');
  }
}
