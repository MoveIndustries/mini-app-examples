/**
 * Mini App Security Scanner
 *
 * Integrated scanner that combines:
 * 1. ZAProxy Ajax Spider for crawling
 * 2. Mock SDK injection for transaction capture
 * 3. Movement SDK simulation for transaction analysis
 */

import { ZapClient } from '../zap/client';
import { TransactionCollector, type CollectedTransaction } from '../collector';
import {
  TransactionAnalyzer,
  type AnalysisReport,
  type ThreatWarning,
} from '../analyzer/transaction-analyzer';

export interface MiniAppScanConfig {
  zapBaseUrl: string;
  zapApiKey?: string;
  collectorBaseUrl: string; // URL where the collector API is hosted
  movementRpcUrl?: string;
  maxSpiderDuration?: number; // minutes
}

export interface MiniAppScanProgress {
  stage:
    | 'initializing'
    | 'configuring'
    | 'spidering'
    | 'collecting'
    | 'analyzing'
    | 'completed'
    | 'failed';
  progress: number;
  message: string;
  transactionsCaptured?: number;
}

export type MiniAppScanProgressCallback = (progress: MiniAppScanProgress) => void;

export interface MiniAppScanResult {
  scanId: string;
  targetUrl: string;
  startedAt: number;
  completedAt: number;
  spiderResults: {
    urlsDiscovered: number;
    duration: number;
  };
  transactionAnalysis: AnalysisReport | null;
  webVulnerabilities: {
    high: number;
    medium: number;
    low: number;
    informational: number;
    alerts: Array<{
      risk: string;
      alert: string;
      url: string;
      description: string;
    }>;
  };
  overallRisk: 'critical' | 'high' | 'medium' | 'low' | 'safe';
  recommendation: 'block' | 'review' | 'approve';
  summary: string;
}

export class MiniAppScanner {
  private config: Required<MiniAppScanConfig>;
  private zapClient: ZapClient;

  constructor(config: MiniAppScanConfig) {
    this.config = {
      zapBaseUrl: config.zapBaseUrl,
      zapApiKey: config.zapApiKey || '',
      collectorBaseUrl: config.collectorBaseUrl,
      movementRpcUrl:
        config.movementRpcUrl || 'https://testnet.bardock.movementnetwork.xyz/v1',
      maxSpiderDuration: config.maxSpiderDuration || 10,
    };

    this.zapClient = new ZapClient(this.config.zapBaseUrl, this.config.zapApiKey);
  }

  /**
   * Run a complete security scan on a mini app
   */
  async scan(
    targetUrl: string,
    onProgress?: MiniAppScanProgressCallback
  ): Promise<MiniAppScanResult> {
    const scanId = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();

    this.reportProgress(onProgress, {
      stage: 'initializing',
      progress: 5,
      message: 'Initializing security scan',
    });

    try {
      // Initialize transaction collector
      TransactionCollector.initScan(scanId);

      // Create ZAP session
      this.reportProgress(onProgress, {
        stage: 'configuring',
        progress: 10,
        message: 'Configuring ZAP session',
      });

      await this.zapClient.newSession(`mini-app-${scanId}`, true);

      // Configure the injection script with scanId and collector URL
      const collectorUrl = `${this.config.collectorBaseUrl}/api/security/collect-transaction`;
      await this.configureInjectionScript(scanId, collectorUrl);

      // Access the target URL first
      this.reportProgress(onProgress, {
        stage: 'spidering',
        progress: 15,
        message: 'Accessing target URL',
      });

      await this.zapClient.accessUrl(targetUrl);

      // Start Ajax Spider
      this.reportProgress(onProgress, {
        stage: 'spidering',
        progress: 20,
        message: 'Starting Ajax Spider',
      });

      await this.zapClient.ajaxSpiderScan(targetUrl, true);

      // Wait for spider to complete
      const maxTime = this.config.maxSpiderDuration * 60 * 1000;
      const spiderStartTime = Date.now();

      while (Date.now() - spiderStartTime < maxTime) {
        const status = await this.zapClient.ajaxSpiderStatus();
        const txCount = TransactionCollector.getTransactionCount(scanId);

        const elapsed = Date.now() - spiderStartTime;
        const progress = 20 + Math.min(50, (elapsed / maxTime) * 50);

        this.reportProgress(onProgress, {
          stage: 'spidering',
          progress: Math.floor(progress),
          message: `Crawling mini app...`,
          transactionsCaptured: txCount,
        });

        if (status === 'stopped') {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const spiderDuration = Date.now() - spiderStartTime;

      // Stop spider if still running
      try {
        await this.zapClient.ajaxSpiderStop();
      } catch {
        // Ignore - might already be stopped
      }

      // Collect results
      this.reportProgress(onProgress, {
        stage: 'collecting',
        progress: 75,
        message: 'Collecting scan results',
      });

      // Get captured transactions
      const capturedTransactions = TransactionCollector.getTransactions(scanId);

      // Get web vulnerability alerts
      const webAlerts = await this.zapClient.getAlerts(targetUrl);
      const webSummary = await this.zapClient.getScanSummary(targetUrl);

      // Get spider results
      const urlsDiscovered = await this.zapClient.ajaxSpiderNumberOfResults();

      // Analyze transactions if any were captured
      this.reportProgress(onProgress, {
        stage: 'analyzing',
        progress: 85,
        message: `Analyzing ${capturedTransactions.length} captured transactions`,
        transactionsCaptured: capturedTransactions.length,
      });

      let transactionAnalysis: AnalysisReport | null = null;

      if (capturedTransactions.length > 0) {
        transactionAnalysis = await this.analyzeTransactions(capturedTransactions);
      }

      // Cleanup
      TransactionCollector.clearScan(scanId);

      // Determine overall risk
      const overallRisk = this.calculateOverallRisk(
        webSummary,
        transactionAnalysis
      );

      // Determine recommendation
      const recommendation = this.getRecommendation(overallRisk, transactionAnalysis);

      // Generate summary
      const summary = this.generateSummary(
        targetUrl,
        capturedTransactions.length,
        webSummary,
        transactionAnalysis
      );

      const completedAt = Date.now();

      this.reportProgress(onProgress, {
        stage: 'completed',
        progress: 100,
        message: 'Scan completed',
        transactionsCaptured: capturedTransactions.length,
      });

      return {
        scanId,
        targetUrl,
        startedAt,
        completedAt,
        spiderResults: {
          urlsDiscovered,
          duration: spiderDuration,
        },
        transactionAnalysis,
        webVulnerabilities: {
          high: webSummary.high,
          medium: webSummary.medium,
          low: webSummary.low,
          informational: webSummary.informational,
          alerts: webAlerts.slice(0, 20).map((a) => ({
            risk: a.risk,
            alert: a.alert,
            url: a.url,
            description: a.description,
          })),
        },
        overallRisk,
        recommendation,
        summary,
      };
    } catch (error) {
      this.reportProgress(onProgress, {
        stage: 'failed',
        progress: 0,
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      TransactionCollector.clearScan(scanId);
      throw error;
    }
  }

  /**
   * Configure the ZAP injection script with scan-specific parameters
   */
  private async configureInjectionScript(
    scanId: string,
    collectorUrl: string
  ): Promise<void> {
    // Note: In a production setup, you'd use ZAP's script API to load
    // the injection script with parameters. For now, we rely on the
    // script being pre-loaded with placeholders that get replaced.
    //
    // The inject-sdk.js script has __SCAN_ID__ and __COLLECTOR_URL__
    // placeholders that should be replaced when loading the script.
    //
    // This is a limitation of the current implementation - in production,
    // you'd want to use ZAP's API to dynamically configure scripts.

    console.log(`Scan ${scanId} configured with collector: ${collectorUrl}`);
  }

  /**
   * Analyze captured transactions using Movement SDK simulation
   */
  private async analyzeTransactions(
    transactions: CollectedTransaction[]
  ): Promise<AnalysisReport> {
    // Generate a test wallet for simulation
    const testAddress =
      '0x' +
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(
        ''
      );
    const testPublicKey =
      '0x' +
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(
        ''
      );

    const analyzer = new TransactionAnalyzer(
      this.config.movementRpcUrl,
      testAddress,
      testPublicKey
    );

    // Convert CollectedTransaction to format expected by analyzer
    const capturedForAnalysis = transactions.map((t) => ({
      payload: t.payload,
      response: { hash: '0x0', success: true },
      timestamp: t.timestamp,
    }));

    return analyzer.analyzeTransactions(capturedForAnalysis);
  }

  /**
   * Calculate overall risk from web vulns and transaction analysis
   */
  private calculateOverallRisk(
    webSummary: { high: number; medium: number; low: number; informational: number },
    txAnalysis: AnalysisReport | null
  ): MiniAppScanResult['overallRisk'] {
    // Transaction threats take priority
    if (txAnalysis) {
      if (txAnalysis.criticalThreats > 0) return 'critical';
      if (txAnalysis.highThreats > 0) return 'high';
    }

    // Then web vulnerabilities
    if (webSummary.high > 0) return 'high';
    if (webSummary.medium > 2) return 'medium';
    if (webSummary.medium > 0 || webSummary.low > 5) return 'low';

    // Transaction medium/low threats
    if (txAnalysis) {
      if (txAnalysis.mediumThreats > 0) return 'medium';
      if (txAnalysis.lowThreats > 0) return 'low';
    }

    return 'safe';
  }

  /**
   * Get recommendation based on risk
   */
  private getRecommendation(
    risk: MiniAppScanResult['overallRisk'],
    txAnalysis: AnalysisReport | null
  ): MiniAppScanResult['recommendation'] {
    if (risk === 'critical') return 'block';
    if (risk === 'high') return 'block';

    // If there are transaction threats, require review
    if (txAnalysis && (txAnalysis.highThreats > 0 || txAnalysis.mediumThreats > 0)) {
      return 'review';
    }

    if (risk === 'medium') return 'review';
    if (risk === 'low') return 'review';

    return 'approve';
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    targetUrl: string,
    txCount: number,
    webSummary: { high: number; medium: number; low: number; informational: number },
    txAnalysis: AnalysisReport | null
  ): string {
    const lines: string[] = [`Security scan completed for ${targetUrl}`];

    lines.push('');
    lines.push(`Transactions captured: ${txCount}`);

    if (txAnalysis && txCount > 0) {
      lines.push(
        `Transaction threats: ${txAnalysis.criticalThreats} critical, ${txAnalysis.highThreats} high, ${txAnalysis.mediumThreats} medium`
      );
    }

    lines.push('');
    lines.push(
      `Web vulnerabilities: ${webSummary.high} high, ${webSummary.medium} medium, ${webSummary.low} low`
    );

    return lines.join('\n');
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    callback: MiniAppScanProgressCallback | undefined,
    progress: MiniAppScanProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }
}
