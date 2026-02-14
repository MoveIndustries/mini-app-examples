/**
 * Mini App Security Scanner
 *
 * High-level interface for running security scans on mini apps using ZAP
 */

import { ZapClient, type ZapAlert, type ZapScanResult } from './client';
import path from 'path';
import fs from 'fs/promises';

export interface ScanOptions {
  url: string;
  contextName?: string;
  maxDuration?: number; // minutes
  includeActiveScan?: boolean;
  reportDir?: string;
  zapApiKey?: string;
  zapBaseUrl?: string;
}

export interface ScanProgress {
  stage: 'initializing' | 'spidering' | 'scanning' | 'generating-report' | 'completed' | 'failed';
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
   * Run a complete security scan on a mini app
   */
  async scan(
    options: ScanOptions,
    onProgress?: ScanProgressCallback
  ): Promise<ZapScanResult> {
    const {
      url,
      contextName = 'mini-app-scan',
      maxDuration = 30,
      includeActiveScan = true,
      reportDir = './security-reports',
    } = options;

    this.scanId = `scan-${Date.now()}`;

    try {
      // Initialize
      this.reportProgress(onProgress, {
        stage: 'initializing',
        progress: 0,
        message: 'Initializing security scan',
      });

      // Create new ZAP session
      await this.zapClient.newSession(`${contextName}-${Date.now()}`, true);

      // Create context
      await this.zapClient.newContext(contextName);
      await this.zapClient.includeInContext(contextName, `${url}.*`);

      // Access initial URL
      await this.zapClient.accessUrl(url);

      this.reportProgress(onProgress, {
        stage: 'initializing',
        progress: 10,
        message: 'Context created, starting spider',
      });

      // Run Ajax Spider
      this.reportProgress(onProgress, {
        stage: 'spidering',
        progress: 15,
        message: 'Running Ajax spider to discover pages',
        currentUrl: url,
      });

      const ajaxSpiderScanId = await this.zapClient.ajaxSpiderScan(
        url,
        true,
        contextName
      );

      // Poll Ajax Spider status
      let previousProgress = 15;
      while (true) {
        const status = await this.zapClient.ajaxSpiderStatus();
        if (status === 'stopped') break;

        const results = await this.zapClient.ajaxSpiderNumberOfResults();
        const progress = Math.min(15 + Math.floor(results / 10), 40);

        if (progress > previousProgress) {
          this.reportProgress(onProgress, {
            stage: 'spidering',
            progress,
            message: `Found ${results} URLs`,
            currentUrl: url,
          });
          previousProgress = progress;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      this.reportProgress(onProgress, {
        stage: 'spidering',
        progress: 45,
        message: 'Ajax spider completed',
      });

      // Run Active Scan if enabled
      if (includeActiveScan) {
        this.reportProgress(onProgress, {
          stage: 'scanning',
          progress: 50,
          message: 'Starting active security scan',
        });

        const activeScanId = await this.zapClient.activeScan(url, true, true);

        // Poll Active Scan status
        let previousScanProgress = 50;
        while (true) {
          const scanStatus = await this.zapClient.activeScanStatus(activeScanId);
          if (scanStatus >= 100) break;

          const progress = 50 + Math.floor((scanStatus / 100) * 35);

          if (progress > previousScanProgress) {
            this.reportProgress(onProgress, {
              stage: 'scanning',
              progress,
              message: `Active scan progress: ${scanStatus}%`,
            });
            previousScanProgress = progress;
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
        }

        this.reportProgress(onProgress, {
          stage: 'scanning',
          progress: 85,
          message: 'Active scan completed',
        });
      }

      // Generate reports
      this.reportProgress(onProgress, {
        stage: 'generating-report',
        progress: 90,
        message: 'Collecting alerts and generating reports',
      });

      const alerts = await this.zapClient.getAlerts(url);
      const summary = await this.zapClient.getScanSummary(url);

      // Save reports if directory specified
      if (reportDir) {
        await this.saveReports(reportDir, url, alerts, summary);
      }

      this.reportProgress(onProgress, {
        stage: 'completed',
        progress: 100,
        message: 'Scan completed successfully',
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
   * Get a quick security assessment (Ajax spider only, faster)
   */
  async quickScan(url: string, onProgress?: ScanProgressCallback): Promise<ZapScanResult> {
    return this.scan(
      {
        url,
        includeActiveScan: false,
        maxDuration: 10,
      },
      onProgress
    );
  }

  /**
   * Get a comprehensive security assessment (full scan)
   */
  async fullScan(url: string, onProgress?: ScanProgressCallback): Promise<ZapScanResult> {
    return this.scan(
      {
        url,
        includeActiveScan: true,
        maxDuration: 60,
      },
      onProgress
    );
  }

  /**
   * Save scan reports to disk
   */
  private async saveReports(
    reportDir: string,
    url: string,
    alerts: ZapAlert[],
    summary: ZapScanResult['summary']
  ): Promise<void> {
    try {
      await fs.mkdir(reportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '_');
      const baseFileName = `${sanitizedUrl}-${timestamp}`;

      // Save JSON report
      const jsonReport = {
        url,
        timestamp: new Date().toISOString(),
        summary,
        alerts,
      };

      await fs.writeFile(
        path.join(reportDir, `${baseFileName}.json`),
        JSON.stringify(jsonReport, null, 2)
      );

      // Save summary text report
      const textReport = this.generateTextReport(url, summary, alerts);
      await fs.writeFile(
        path.join(reportDir, `${baseFileName}.txt`),
        textReport
      );

      console.log(`Reports saved to ${reportDir}`);
    } catch (error) {
      console.error('Failed to save reports:', error);
    }
  }

  /**
   * Generate a human-readable text report
   */
  private generateTextReport(
    url: string,
    summary: ZapScanResult['summary'],
    alerts: ZapAlert[]
  ): string {
    const lines: string[] = [];

    lines.push('=====================================');
    lines.push('Mini App Security Scan Report');
    lines.push('=====================================');
    lines.push('');
    lines.push(`URL: ${url}`);
    lines.push(`Scan Date: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push('-------');
    lines.push(`High Risk: ${summary.high}`);
    lines.push(`Medium Risk: ${summary.medium}`);
    lines.push(`Low Risk: ${summary.low}`);
    lines.push(`Informational: ${summary.informational}`);
    lines.push('');

    if (alerts.length > 0) {
      lines.push('ALERTS');
      lines.push('------');
      lines.push('');

      const groupedAlerts = {
        High: alerts.filter(a => a.risk === 'High'),
        Medium: alerts.filter(a => a.risk === 'Medium'),
        Low: alerts.filter(a => a.risk === 'Low'),
        Informational: alerts.filter(a => a.risk === 'Informational'),
      };

      for (const [risk, riskAlerts] of Object.entries(groupedAlerts)) {
        if (riskAlerts.length === 0) continue;

        lines.push(`${risk} Risk (${riskAlerts.length})`);
        lines.push('='.repeat(risk.length + 15));
        lines.push('');

        riskAlerts.forEach((alert, index) => {
          lines.push(`${index + 1}. ${alert.alert}`);
          lines.push(`   URL: ${alert.url}`);
          lines.push(`   Confidence: ${alert.confidence}`);
          lines.push(`   Description: ${alert.description}`);
          lines.push(`   Solution: ${alert.solution}`);
          lines.push('');
        });
      }
    } else {
      lines.push('No security alerts found!');
    }

    return lines.join('\n');
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
    console.log(`[Scan Progress] ${progress.stage}: ${progress.message} (${progress.progress}%)`);
  }

  /**
   * Get ZAP client for advanced operations
   */
  getClient(): ZapClient {
    return this.zapClient;
  }
}
