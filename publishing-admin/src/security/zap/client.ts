/**
 * OWASP ZAP API Client
 *
 * Provides a TypeScript interface to interact with ZAP's REST API
 */

export interface ZapAlert {
  alert: string;
  risk: 'High' | 'Medium' | 'Low' | 'Informational';
  confidence: 'High' | 'Medium' | 'Low';
  url: string;
  description: string;
  solution: string;
  cweid: string;
  wascid: string;
  reference: string;
}

export interface ZapScanStatus {
  status: string;
  progress: number;
}

export interface ZapScanResult {
  scanId: string;
  status: 'running' | 'completed' | 'failed';
  alerts: ZapAlert[];
  summary: {
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
}

export class ZapClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = 'http://localhost:8080', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T = any>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add API key if provided
    if (this.apiKey) {
      url.searchParams.append('apikey', this.apiKey);
    }

    // Add other params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`ZAP API error: ${response.statusText}`);
    }

    return await response.json();
  }

  // ============================================================================
  // Core API
  // ============================================================================

  async getVersion(): Promise<string> {
    const result = await this.request('/JSON/core/view/version/');
    return result.version;
  }

  async newSession(name?: string, overwrite: boolean = false): Promise<string> {
    const result = await this.request('/JSON/core/action/newSession/', {
      name,
      overwrite: overwrite ? 'true' : 'false',
    });
    return result.Result;
  }

  async accessUrl(url: string, followRedirects: boolean = true): Promise<void> {
    await this.request('/JSON/core/action/accessUrl/', {
      url,
      followRedirects: followRedirects ? 'true' : 'false',
    });
  }

  async getAlerts(
    baseurl?: string,
    start?: number,
    count?: number,
    risk?: string
  ): Promise<ZapAlert[]> {
    const result = await this.request('/JSON/core/view/alerts/', {
      baseurl,
      start,
      count,
      risk,
    });
    return result.alerts || [];
  }

  async getNumberOfAlerts(baseurl?: string): Promise<number> {
    const result = await this.request('/JSON/core/view/numberOfAlerts/', {
      baseurl,
    });
    return parseInt(result.numberOfAlerts, 10);
  }

  // ============================================================================
  // Spider API (Traditional)
  // ============================================================================

  async spiderScan(
    url: string,
    maxChildren?: number,
    recurse: boolean = true,
    contextName?: string
  ): Promise<string> {
    const result = await this.request('/JSON/spider/action/scan/', {
      url,
      maxChildren,
      recurse: recurse ? 'true' : 'false',
      contextName,
    });
    return result.scan;
  }

  async spiderStatus(scanId: string): Promise<number> {
    const result = await this.request('/JSON/spider/view/status/', {
      scanId,
    });
    return parseInt(result.status, 10);
  }

  async spiderStop(scanId: string): Promise<void> {
    await this.request('/JSON/spider/action/stop/', { scanId });
  }

  // ============================================================================
  // Ajax Spider API
  // ============================================================================

  async ajaxSpiderScan(
    url: string,
    inScope: boolean = true,
    contextName?: string
  ): Promise<string> {
    const result = await this.request('/JSON/ajaxSpider/action/scan/', {
      url,
      inScope: inScope ? 'true' : 'false',
      contextName,
    });
    return result.Result;
  }

  async ajaxSpiderStatus(): Promise<string> {
    const result = await this.request('/JSON/ajaxSpider/view/status/');
    return result.status;
  }

  async ajaxSpiderStop(): Promise<void> {
    await this.request('/JSON/ajaxSpider/action/stop/');
  }

  async ajaxSpiderNumberOfResults(): Promise<number> {
    const result = await this.request('/JSON/ajaxSpider/view/numberOfResults/');
    return parseInt(result.numberOfResults, 10);
  }

  // ============================================================================
  // Active Scan API
  // ============================================================================

  async activeScan(
    url: string,
    recurse: boolean = true,
    inScopeOnly: boolean = true,
    scanPolicyName?: string,
    method?: string,
    postData?: string
  ): Promise<string> {
    const result = await this.request('/JSON/ascan/action/scan/', {
      url,
      recurse: recurse ? 'true' : 'false',
      inScopeOnly: inScopeOnly ? 'true' : 'false',
      scanPolicyName,
      method,
      postData,
    });
    return result.scan;
  }

  async activeScanStatus(scanId: string): Promise<number> {
    const result = await this.request('/JSON/ascan/view/status/', {
      scanId,
    });
    return parseInt(result.status, 10);
  }

  async activeScanStop(scanId: string): Promise<void> {
    await this.request('/JSON/ascan/action/stop/', { scanId });
  }

  // ============================================================================
  // Context API
  // ============================================================================

  async newContext(contextName: string): Promise<string> {
    const result = await this.request('/JSON/context/action/newContext/', {
      contextName,
    });
    return result.contextId;
  }

  async includeInContext(
    contextName: string,
    regex: string
  ): Promise<void> {
    await this.request('/JSON/context/action/includeInContext/', {
      contextName,
      regex,
    });
  }

  async excludeFromContext(
    contextName: string,
    regex: string
  ): Promise<void> {
    await this.request('/JSON/context/action/excludeFromContext/', {
      contextName,
      regex,
    });
  }

  // ============================================================================
  // Selenium API
  // ============================================================================

  async setSeleniumBrowserArguments(browserArgs: string): Promise<void> {
    await this.request('/JSON/selenium/action/setBrowserArguments/', {
      arguments: browserArgs,
    });
  }

  async addSeleniumScript(
    scriptName: string,
    scriptType: string,
    scriptEngine: string,
    scriptFile: string
  ): Promise<void> {
    await this.request('/JSON/script/action/load/', {
      scriptName,
      scriptType,
      scriptEngine,
      scriptFile,
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  async waitForSpider(scanId: string, timeout: number = 300000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await this.spiderStatus(scanId);
      if (status >= 100) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Spider scan timeout');
  }

  async waitForAjaxSpider(timeout: number = 300000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await this.ajaxSpiderStatus();
      if (status === 'stopped') {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new Error('Ajax spider timeout');
  }

  async waitForActiveScan(scanId: string, timeout: number = 600000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await this.activeScanStatus(scanId);
      if (status >= 100) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error('Active scan timeout');
  }

  async getScanSummary(baseurl?: string): Promise<ZapScanResult['summary']> {
    const alerts = await this.getAlerts(baseurl);

    const summary = {
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    };

    alerts.forEach(alert => {
      switch (alert.risk) {
        case 'High':
          summary.high++;
          break;
        case 'Medium':
          summary.medium++;
          break;
        case 'Low':
          summary.low++;
          break;
        case 'Informational':
          summary.informational++;
          break;
      }
    });

    return summary;
  }
}
