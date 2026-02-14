/**
 * Serverless-Compatible Security Scanner
 *
 * Works in Vercel/serverless environments (no fs/path dependencies)
 * Optimized for short timeout limits
 */

import { ZapClient, type ZapAlert, type ZapScanResult } from './client';

export interface ScanOptions {
  url: string;
  contextName?: string;
  maxDuration?: number; // minutes
  includeActiveScan?: boolean;
}

export interface ScanProgress {
  stage: 'initializing' | 'spidering' | 'scanning' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  currentUrl?: string;
}

export type ScanProgressCallback = (progress: ScanProgress) => void;

export class MiniAppSecurityScanner {
  private zapClient: ZapClient;
  private scanId: string | null = null;

  constructor(zapBaseUrl: string = 'http://localhost:8080', apiKey?: string) {
    this.zapClient = new ZapClient(zapBaseUrl, apiKey);
  }

  /**
   * Quick security scan (spider only, no active scan)
   * Optimized for serverless environments with short timeouts
   * Typically completes in 2-5 minutes
   */
  async quickScan(
    url: string,
    onProgress?: ScanProgressCallback
  ): Promise<ZapScanResult> {
    this.scanId = `quick-scan-${Date.now()}`;

    try {
      // Initialize
      this.reportProgress(onProgress, {
        stage: 'initializing',
        progress: 5,
        message: 'Initializing security scan',
      });

      // Create new session
      await this.zapClient.newSession(`mini-app-scan-${Date.now()}`, true);

      this.reportProgress(onProgress, {
        stage: 'initializing',
        progress: 10,
        message: 'Accessing target URL',
      });

      await this.zapClient.accessUrl(url);

      // Run Ajax Spider
      this.reportProgress(onProgress, {
        stage: 'spidering',
        progress: 20,
        message: 'Starting Ajax spider',
        currentUrl: url,
      });

      await this.zapClient.ajaxSpiderScan(url, true);

      // Poll until complete or timeout
      // Max 8 minutes for serverless (leaves buffer for response)
      const maxTime = 8 * 60 * 1000;
      const startTime = Date.now();
      let lastProgress = 20;

      while (Date.now() - startTime < maxTime) {
        const status = await this.zapClient.ajaxSpiderStatus();

        if (status === 'stopped') {
          this.reportProgress(onProgress, {
            stage: 'spidering',
            progress: 80,
            message: 'Spider completed',
          });
          break;
        }

        // Calculate progress (20% to 80% during spidering)
        const elapsed = Date.now() - startTime;
        const progress = 20 + Math.min(60, (elapsed / maxTime) * 60);

        if (progress > lastProgress + 5) {
          const numResults = await this.zapClient.ajaxSpiderNumberOfResults();
          this.reportProgress(onProgress, {
            stage: 'spidering',
            progress: Math.floor(progress),
            message: `Discovered ${numResults} URLs`,
          });
          lastProgress = progress;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Get results
      this.reportProgress(onProgress, {
        stage: 'completed',
        progress: 90,
        message: 'Collecting security alerts',
      });

      const alerts = await this.zapClient.getAlerts(url);
      const summary = await this.zapClient.getScanSummary(url);

      this.reportProgress(onProgress, {
        stage: 'completed',
        progress: 100,
        message: `Scan completed - found ${alerts.length} issues`,
      });

      return {
        scanId: this.scanId,
        status: 'completed',
        alerts,
        summary,
      };
    } catch (error) {
      this.reportProgress(onProgress, {
        stage: 'failed',
        progress: 0,
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      throw error;
    }
  }

  /**
   * Run a scan with custom options
   * WARNING: includeActiveScan=true can take 30+ minutes, not suitable for serverless!
   */
  async scan(
    options: ScanOptions,
    onProgress?: ScanProgressCallback
  ): Promise<ZapScanResult> {
    if (options.includeActiveScan) {
      throw new Error(
        'Active scanning is not supported in serverless environments (takes 30+ minutes). ' +
        'Use quickScan() for fast passive scanning, or implement background jobs for active scans.'
      );
    }

    return this.quickScan(options.url, onProgress);
  }

  /**
   * Full scan with active scanning
   * NOT SUPPORTED in serverless - use background jobs
   */
  async fullScan(url: string, onProgress?: ScanProgressCallback): Promise<ZapScanResult> {
    throw new Error(
      'Full scans with active scanning are not supported in serverless environments. ' +
      'Active scans can take 30-60 minutes which exceeds serverless timeout limits. ' +
      'Please use quickScan() for passive scanning, or implement a background job queue ' +
      'with services like BullMQ + Redis for long-running scans.'
    );
  }

  /**
   * Report progress to callback
   */
  private reportProgress(
    callback: ScanProgressCallback | undefined,
    progress: ScanProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Get ZAP client for advanced operations
   */
  getClient(): ZapClient {
    return this.zapClient;
  }
}
