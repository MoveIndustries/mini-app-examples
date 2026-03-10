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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`ZAP API error: ${response.statusText} - ${JSON.stringify(data)}`);
    }

    // Check for ZAP API error in response
    if (data.code && data.message) {
      throw new Error(`ZAP API error: ${data.code} - ${data.message}`);
    }

    return data;
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
  // Replacer API (for SDK injection)
  // ============================================================================

  /**
   * Add a replacer rule to inject content into responses
   */
  async addReplacerRule(
    description: string,
    enabled: boolean,
    matchType: 'REQ_HEADER' | 'REQ_HEADER_STR' | 'REQ_BODY_STR' | 'RESP_HEADER' | 'RESP_HEADER_STR' | 'RESP_BODY_STR',
    matchRegex: boolean,
    matchString: string,
    replacement: string,
    initiators?: string
  ): Promise<void> {
    await this.request('/JSON/replacer/action/addRule/', {
      description,
      enabled: enabled ? 'true' : 'false',
      matchType,
      matchRegex: matchRegex ? 'true' : 'false',
      matchString,
      replacement,
      initiators,
    });
  }

  /**
   * Remove a replacer rule by description
   */
  async removeReplacerRule(description: string): Promise<void> {
    await this.request('/JSON/replacer/action/removeRule/', {
      description,
    });
  }

  /**
   * Enable or disable a specific replacer rule
   */
  async setReplacerRuleEnabled(description: string, enabled: boolean): Promise<void> {
    await this.request('/JSON/replacer/action/setEnabled/', {
      description,
      bool: enabled ? 'true' : 'false',
    });
  }

  /**
   * Get all replacer rules
   */
  async getReplacerRules(): Promise<unknown[]> {
    const result = await this.request('/JSON/replacer/view/rules/');
    return result.rules || [];
  }

  /**
   * Add a header to bypass ngrok's browser warning interstitial
   * This adds the header to all outgoing requests
   */
  async addNgrokBypassHeader(): Promise<void> {
    try {
      await this.addReplacerRule(
        'ngrok-bypass-header',
        true,
        'REQ_HEADER',
        false,
        'ngrok-skip-browser-warning',
        '1'
      );
    } catch {
      // Rule might already exist
    }
  }

  /**
   * Add SDK injection rule - injects the SDK inline before </head>
   * This inlines the entire SDK to avoid network issues with Docker
   */
  async addSdkInjectionRule(scanId: string, collectorUrl: string): Promise<void> {
    // Inline the SDK directly to avoid network/CORS issues
    const inlineScript = this.generateInlineSDK(scanId, collectorUrl);
    const scriptTag = `<script>${inlineScript}</script></head>`;

    await this.addReplacerRule(
      `sdk-injection-${scanId}`,
      true,
      'RESP_BODY_STR',
      false, // not regex, exact match
      '</head>',
      scriptTag
    );
  }

  /**
   * Generate the inline SDK JavaScript
   * Uses string concatenation to avoid template literal escaping issues
   *
   * Diagnostics are sent to paths on the CURRENT domain (which is proxied through ZAP)
   * in the format: /___zap_diag___/{scanId}/{action}
   * These can be read from ZAP's message history after the scan.
   */
  private generateInlineSDK(scanId: string, collectorUrl: string): string {
    // Build script using string concatenation to avoid escaping issues
    const parts: string[] = [
      '(function(){',
      'if(window.movementSDK)return;',
      'var SCAN_ID="' + scanId + '";',
      'var COLLECTOR_URL="' + collectorUrl + '";',
      // Diagnostic beacon goes to current domain (proxied through ZAP) - will 404 but we can see it in ZAP history
      'function diag(action){new Image().src="/___zap_diag___/"+SCAN_ID+"/"+action+"?t="+Date.now();}',
      // Immediately send a beacon to verify injection
      'diag("sdk_injected");',
      // Mock wallet class
      'function MockWallet(){',
      'this.address="0x"+Array.from({length:64},function(){return Math.floor(Math.random()*16).toString(16)}).join("");',
      'this.publicKey="0x"+Array.from({length:64},function(){return Math.floor(Math.random()*16).toString(16)}).join("");',
      '}',
      'MockWallet.prototype.getAccount=function(){return{address:this.address,publicKey:this.publicKey};};',
      'MockWallet.prototype.signTransaction=function(p){',
      'console.log("[ZAP] TX captured:",p);',
      'diag("tx_captured");',
      // Also try to send full transaction data to collector
      'try{fetch(COLLECTOR_URL,{method:"POST",headers:{"Content-Type":"application/json","ngrok-skip-browser-warning":"1"},body:JSON.stringify({scanId:SCAN_ID,payload:p,url:location.href})}).catch(function(){});}catch(e){}',
      'return{hash:"0x1234",success:true};',
      '};',
      // SDK class
      'function SDK(){this.wallet=new MockWallet();}',
      'SDK.prototype.getAccount=function(){return this.wallet.getAccount();};',
      'SDK.prototype.getContext=function(){return{user:{address:this.wallet.address,isConnected:true},network:{chainId:250}};};',
      'SDK.prototype.signTransaction=function(p){return this.wallet.signTransaction(p);};',
      'SDK.prototype.signAndSubmitTransaction=function(p){return this.wallet.signTransaction(p);};',
      'SDK.prototype.ready=function(){};',
      'SDK.prototype.connectWallet=function(){return this.wallet.getAccount();};',
      // Create global instance
      'window.movementSDK=new SDK();',
      'console.log("[ZAP] SDK ready, addr:",window.movementSDK.wallet.address);',
      // Include address in diagnostic (truncated to fit in URL)
      'diag("sdk_ready_"+window.movementSDK.wallet.address.substring(0,18));',
      // Auto-fill inputs
      'setTimeout(function(){',
      'var inputs=document.querySelectorAll("textarea,input[type=text],input:not([type])");',
      'var filled=0;',
      'inputs.forEach(function(el){',
      'if(!el.value){el.value="Test "+Date.now();el.dispatchEvent(new Event("input",{bubbles:true}));filled++;}',
      '});',
      'if(filled>0)diag("filled_"+filled);',
      '},1000);',
      // Auto-click buttons after filling inputs
      'setTimeout(function(){',
      'var btns=document.querySelectorAll("button,input[type=submit],[role=button]");',
      // Report how many buttons found
      'diag("found_"+btns.length+"_buttons");',
      'var clicked=0;',
      'btns.forEach(function(btn){',
      'var txt=(btn.textContent||btn.value||"").toLowerCase().trim();',
      // Report first 3 button texts for debugging
      'if(clicked<3)diag("btn_"+txt.replace(/[^a-z0-9]/gi,"").substring(0,15));',
      // Click buttons that look like they might trigger transactions
      'if(txt.match(/send|submit|post|sign|confirm|swap|transfer|mint|buy|sell|stake|claim|share|publish|create|save|connect|approve|vote|like|react/i)){',
      'diag("clicking_"+txt.replace(/[^a-z]/gi,"").substring(0,20));',
      'try{btn.click();}catch(e){}',
      'clicked++;',
      '}',
      '});',
      'if(clicked>0)diag("clicked_"+clicked);',
      'if(clicked===0)diag("no_matching_buttons");',
      '},2000);',
      '})();',
    ];

    return parts.join('');
  }

  /**
   * Remove SDK injection rule for a scan
   */
  async removeSdkInjectionRule(scanId: string): Promise<void> {
    try {
      await this.removeReplacerRule(`sdk-injection-${scanId}`);
    } catch {
      // Ignore if rule doesn't exist
    }
  }

  // ============================================================================
  // Diagnostic Methods
  // ============================================================================

  /**
   * Get SDK diagnostics from ZAP message history
   * Looks for requests to /___zap_diag___/{scanId}/{action}
   */
  async getDiagnosticsFromHistory(scanId: string): Promise<Array<{ action: string; url: string; timestamp: string }>> {
    const messages = await this.request('/JSON/core/view/messages/', {
      baseurl: '',
      start: 0,
      count: 1000,
    });

    const diagnostics: Array<{ action: string; url: string; timestamp: string }> = [];
    const diagPattern = new RegExp(`/___zap_diag___/${scanId}/([^?]+)`);

    for (const msg of messages.messages || []) {
      const requestHeader = msg.requestHeader || '';
      const match = requestHeader.match(diagPattern);
      if (match) {
        diagnostics.push({
          action: match[1],
          url: requestHeader.split('\n')[0] || '',
          timestamp: msg.timestamp || '',
        });
      }
    }

    return diagnostics;
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
