/**
 * ZAP Selenium Script - SDK Injection
 *
 * This script runs when Selenium launches a browser for the Ajax Spider.
 * It injects the Movement Mini App SDK (web version) into the page.
 *
 * Script Type: Selenium
 * Script Engine: ECMAScript
 */

// This function is called by ZAP when the browser launches
function browserLaunched(ssutils, msg) {
  var webDriver = msg.getWebDriver();
  var logger = org.apache.log4j.LogManager.getLogger('inject-sdk');

  logger.info('Browser launched, preparing SDK injection script');

  // SDK injection script
  // This will be stringified and injected into the page
  var sdkInjectionCode = function() {
    // Check if SDK is already loaded
    if (window.movementSDK) {
      console.log('[ZAP Injection] SDK already loaded');
      return;
    }

    console.log('[ZAP Injection] Injecting Movement Mini App SDK...');

    // Configuration - these will be replaced by the scanner
    var SCAN_ID = '__SCAN_ID__';
    var COLLECTOR_URL = '__COLLECTOR_URL__';

    // Mock Wallet Implementation with transaction capture
    class MockWallet {
      constructor() {
        this.address = '0x' + Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        this.publicKey = '0x' + Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('');
        this.capturedTransactions = [];
      }

      async getAccount() {
        return {
          address: this.address,
          publicKey: this.publicKey,
          minKeysRequired: 1
        };
      }

      async captureAndReport(payload) {
        // Store locally
        this.capturedTransactions.push({
          payload: payload,
          timestamp: Date.now(),
          url: window.location.href
        });

        // Report to collector if configured
        if (COLLECTOR_URL && COLLECTOR_URL !== '__COLLECTOR_URL__') {
          try {
            await fetch(COLLECTOR_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scanId: SCAN_ID,
                payload: payload,
                url: window.location.href,
                triggeredBy: document.activeElement?.tagName || 'unknown'
              })
            });
            console.log('[Mock Wallet] Transaction reported to collector');
          } catch (e) {
            console.warn('[Mock Wallet] Failed to report transaction:', e);
          }
        }
      }

      async signTransaction(payload) {
        console.log('[Mock Wallet] Capturing transaction:', payload);
        await this.captureAndReport(payload);
        return {
          hash: '0x' + Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join(''),
          success: true
        };
      }

      async signMessage(payload) {
        console.log('[Mock Wallet] Signing message:', payload);
        return {
          signature: '0x' + Array.from({ length: 128 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join(''),
          publicKey: this.publicKey
        };
      }

      getCapturedTransactions() {
        return this.capturedTransactions;
      }
    }

    // Movement Mini App SDK Web Implementation
    class MovementMiniAppSDKWeb {
      constructor() {
        this.mockWallet = new MockWallet();
        this.context = null;
        this.isReady = false;
        this.network = 'testnet';

        // Initialize APIs
        this.clipboard = {
          copy: async (text) => {
            console.log('[SDK] Clipboard copy:', text);
            await navigator.clipboard.writeText(text);
          },
          paste: async () => {
            const text = await navigator.clipboard.readText();
            console.log('[SDK] Clipboard paste:', text);
            return text;
          }
        };

        this.mns = {
          getPrimaryName: async (address) => {
            console.log('[SDK] MNS getPrimaryName:', address);
            return null;
          },
          getTargetAddress: async (name) => {
            console.log('[SDK] MNS getTargetAddress:', name);
            const mockAddress = this.mockWallet.address.slice(2);
            const bytes = {};
            for (let i = 0; i < mockAddress.length; i += 2) {
              bytes[i / 2] = parseInt(mockAddress.slice(i, i + 2), 16);
            }
            return { data: bytes };
          }
        };

        this.scanQRCode = async () => {
          console.log('[SDK] Scan QR code');
          return this.mockWallet.address;
        };

        this.notify = async (options) => {
          console.log('[SDK] Notification:', options);
        };

        this.haptic = async (options) => {
          console.log('[SDK] Haptic:', options.type);
        };

        console.log('[SDK] Initialized');
      }

      async ready(options = {}) {
        console.log('[SDK] Ready called', options);
        this.isReady = true;
        if (!this.context) {
          this.context = await this.getContext();
        }
      }

      async close() {
        console.log('[SDK] Close called');
      }

      async getContext() {
        if (this.context) return this.context;

        const account = await this.mockWallet.getAccount();
        this.context = {
          location: 'launcher',
          user: {
            address: account.address,
            displayName: 'ZAP Test User',
            isConnected: true
          },
          client: {
            platformType: 'web',
            version: '1.0.0-zap-test',
            added: false
          },
          network: {
            chainId: 250,
            network: 'testnet',
            rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
            explorerUrl: 'https://explorer.testnet.movementnetwork.xyz'
          },
          features: {
            haptics: true,
            camera: true,
            biometrics: false
          },
          theme: {
            colorScheme: 'dark'
          }
        };

        console.log('[SDK] Context:', this.context);
        return this.context;
      }

      async getTheme() {
        const context = await this.getContext();
        return context.theme;
      }

      async openUrl(optionsOrUrl, target) {
        const options = typeof optionsOrUrl === 'string'
          ? { url: optionsOrUrl, target }
          : optionsOrUrl;
        console.log('[SDK] Open URL:', options);
      }

      async share(options) {
        console.log('[SDK] Share:', options);
      }

      async connectWallet() {
        console.log('[SDK] Connect wallet');
        return await this.mockWallet.getAccount();
      }

      async getAccount() {
        return await this.mockWallet.getAccount();
      }

      async signTransaction(payload) {
        console.log('[SDK] Sign transaction:', payload);
        return await this.mockWallet.signTransaction(payload);
      }

      async signAndSubmitTransaction(payload) {
        console.log('[SDK] Sign and submit transaction:', payload);
        return await this.mockWallet.signTransaction(payload);
      }

      // For retrieving captured transactions (useful for debugging)
      getCapturedTransactions() {
        return this.mockWallet.getCapturedTransactions();
      }

      async signMessage(payload) {
        console.log('[SDK] Sign message:', payload);
        return await this.mockWallet.signMessage(payload);
      }

      async sendNotification(options) {
        console.log('[SDK] Send notification:', options);
      }

      on(type, listener) {
        console.log('[SDK] Event listener added:', type);
        return () => {};
      }

      off(type, listener) {
        console.log('[SDK] Event listener removed:', type);
      }

      get isSDKReady() {
        return this.isReady;
      }

      get cachedContext() {
        return this.context;
      }

      setDebug(enabled) {
        console.log('[SDK] Debug mode:', enabled);
      }
    }

    // Create and expose global SDK instance
    window.movementSDK = new MovementMiniAppSDKWeb();
    console.log('[ZAP Injection] SDK injected successfully');
    console.log('[ZAP Injection] window.movementSDK is now available');
  };

  // Convert the function to a string and wrap it in an IIFE
  var injectionScript = '(' + sdkInjectionCode.toString() + ')();';

  logger.info('SDK injection script prepared, length: ' + injectionScript.length);

  // Store the script so it can be injected when pages load
  msg.setCustom('sdkInjectionScript', injectionScript);
}

// This function is called by ZAP before each page load
function pageLoaded(utils, page) {
  var webDriver = page.getWebDriver();
  var logger = org.apache.log4j.LogManager.getLogger('inject-sdk');

  try {
    var injectionScript = page.getCustom('sdkInjectionScript');

    if (injectionScript) {
      logger.info('Injecting SDK into page: ' + page.getUrl());
      webDriver.executeScript(injectionScript);
      logger.info('SDK injection completed');
    } else {
      logger.warn('No injection script found in page context');
    }
  } catch (e) {
    logger.error('Failed to inject SDK: ' + e.message);
  }
}
