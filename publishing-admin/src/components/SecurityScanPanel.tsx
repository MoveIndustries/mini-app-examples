'use client';

import { useState } from 'react';
import { AppMetadata } from '@/types/app';
import type { MiniAppScanResult } from '@/security/scanner';

interface SecurityScanPanelProps {
  app: AppMetadata;
  onScanComplete?: (result: MiniAppScanResult) => void;
}

const RISK_COLORS = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  safe: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
};

const RECOMMENDATION_STYLES = {
  block: { bg: 'bg-red-600', text: 'text-white', label: 'Block - Do Not Approve' },
  review: { bg: 'bg-yellow-500', text: 'text-white', label: 'Requires Manual Review' },
  approve: { bg: 'bg-green-600', text: 'text-white', label: 'Safe to Approve' },
};

export function SecurityScanPanel({ app, onScanComplete }: SecurityScanPanelProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [result, setResult] = useState<MiniAppScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const runSecurityScan = async () => {
    setIsScanning(true);
    setError(null);
    setProgress({ stage: 'initializing', progress: 0, message: 'Starting security scan...' });

    try {
      const response = await fetch('/api/security/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: app.url,
          maxDuration: 5, // 5 minutes for quick scan
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.message || 'Scan failed');
      }

      const data = await response.json();
      setResult(data.result);
      onScanComplete?.(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  };

  const riskStyle = result ? RISK_COLORS[result.overallRisk] : null;
  const recStyle = result ? RECOMMENDATION_STYLES[result.recommendation] : null;

  return (
    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔒</span>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Transaction Security Scan
          </h3>
        </div>
        <button
          onClick={runSecurityScan}
          disabled={isScanning}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isScanning ? (
            <>
              <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
              Scanning...
            </>
          ) : result ? (
            'Re-scan'
          ) : (
            'Run Security Scan'
          )}
        </button>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
        Crawls the mini app, captures transaction requests, and simulates them to detect malicious patterns.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Make sure ZAP is running and configured. See environment variables.
          </p>
        </div>
      )}

      {isScanning && progress && (
        <div className="space-y-2 py-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{progress.message}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-purple-600 transition-all"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {result && !isScanning && (
        <div className="space-y-4">
          {/* Overall Risk & Recommendation */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`px-3 py-1.5 rounded-lg ${riskStyle?.bg} ${riskStyle?.border} border`}>
              <span className={`text-sm font-semibold ${riskStyle?.text}`}>
                Risk: {result.overallRisk.toUpperCase()}
              </span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg ${recStyle?.bg}`}>
              <span className={`text-sm font-semibold ${recStyle?.text}`}>
                {recStyle?.label}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Transactions Found</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {result.transactionAnalysis?.totalTransactions || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">URLs Crawled</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {result.spiderResults.urlsDiscovered}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Web Vulns</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {result.webVulnerabilities.high + result.webVulnerabilities.medium}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {Math.round(result.spiderResults.duration / 1000)}s
              </p>
            </div>
          </div>

          {/* Transaction Threats */}
          {result.transactionAnalysis && result.transactionAnalysis.totalTransactions > 0 && (
            <div className={`rounded-lg p-3 border ${
              result.transactionAnalysis.criticalThreats > 0 || result.transactionAnalysis.highThreats > 0
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                Transaction Analysis
              </h4>
              <div className="flex gap-4 text-sm">
                <span className={result.transactionAnalysis.criticalThreats > 0 ? 'text-red-700 dark:text-red-300 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                  Critical: {result.transactionAnalysis.criticalThreats}
                </span>
                <span className={result.transactionAnalysis.highThreats > 0 ? 'text-orange-700 dark:text-orange-300 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                  High: {result.transactionAnalysis.highThreats}
                </span>
                <span className={result.transactionAnalysis.mediumThreats > 0 ? 'text-yellow-700 dark:text-yellow-300' : 'text-gray-600 dark:text-gray-400'}>
                  Medium: {result.transactionAnalysis.mediumThreats}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  Low: {result.transactionAnalysis.lowThreats}
                </span>
              </div>
            </div>
          )}

          {/* No transactions warning */}
          {(!result.transactionAnalysis || result.transactionAnalysis.totalTransactions === 0) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                No transactions were captured during the scan. This could mean:
              </p>
              <ul className="text-xs text-yellow-600 dark:text-yellow-400 mt-1 list-disc list-inside">
                <li>The app doesn't request any transactions</li>
                <li>Transactions require specific user flows not triggered by the spider</li>
                <li>The SDK injection may not have worked correctly</li>
              </ul>
            </div>
          )}

          {/* Expandable Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
          >
            {showDetails ? '▼ Hide Details' : '▶ Show Details'}
          </button>

          {showDetails && (
            <div className="space-y-4 pt-2">
              {/* Web Vulnerabilities */}
              {result.webVulnerabilities.alerts.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Web Vulnerabilities ({result.webVulnerabilities.alerts.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.webVulnerabilities.alerts.slice(0, 10).map((alert, i) => (
                      <div
                        key={i}
                        className={`rounded-lg p-2 text-xs ${
                          alert.risk === 'High'
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : alert.risk === 'Medium'
                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            alert.risk === 'High' ? 'text-red-700 dark:text-red-300' :
                            alert.risk === 'Medium' ? 'text-yellow-700 dark:text-yellow-300' :
                            'text-gray-700 dark:text-gray-300'
                          }`}>
                            [{alert.risk}] {alert.alert}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mt-1 truncate">{alert.url}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              {result.transactionAnalysis?.results && result.transactionAnalysis.results.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Captured Transactions ({result.transactionAnalysis.results.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {result.transactionAnalysis.results.map((tx, i) => (
                      <div
                        key={i}
                        className={`rounded-lg p-2 text-xs ${
                          tx.warnings.some(w => w.severity === 'critical' || w.severity === 'high')
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <code className="font-mono text-gray-900 dark:text-gray-100 break-all">
                          {tx.payload.function}
                        </code>
                        {tx.warnings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {tx.warnings.map((w, j) => (
                              <p key={j} className={`${
                                w.severity === 'critical' || w.severity === 'high'
                                  ? 'text-red-700 dark:text-red-300'
                                  : 'text-yellow-700 dark:text-yellow-300'
                              }`}>
                                [{w.severity.toUpperCase()}] {w.message}
                              </p>
                            ))}
                          </div>
                        )}
                        {tx.balanceChanges.length > 0 && (
                          <div className="mt-2 text-gray-600 dark:text-gray-400">
                            Balance changes: {tx.balanceChanges.map((c, k) => (
                              <span key={k} className={c.type === 'outgoing' ? 'text-red-600' : 'text-green-600'}>
                                {c.type === 'outgoing' ? '-' : '+'}{c.amount}{' '}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                  {result.summary}
                </pre>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-gray-400 text-right">
            Scanned: {new Date(result.completedAt).toLocaleString()}
          </p>
        </div>
      )}

      {!result && !isScanning && !error && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Click "Run Security Scan" to analyze transaction behavior
          </p>
        </div>
      )}
    </div>
  );
}
