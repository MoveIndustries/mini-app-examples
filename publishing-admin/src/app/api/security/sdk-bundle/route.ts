/**
 * API Route: SDK Bundle
 *
 * Serves the Movement Mini App SDK bundle configured for a specific scan.
 * This endpoint is called by the injected script tag in scanned pages.
 */

import { NextRequest, NextResponse } from 'next/server';

const COLLECTOR_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId') || 'unknown';
  const collectorUrl = `${COLLECTOR_BASE_URL}/api/security/collect-transaction`;

  // Generate the SDK bundle with configuration baked in
  const sdkBundle = generateSDKBundle(scanId, collectorUrl);

  return new NextResponse(sdkBundle, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

function generateSDKBundle(scanId: string, collectorUrl: string): string {
  return `
(function() {
  // Check if SDK is already loaded
  if (window.movementSDK) {
    console.log('[ZAP Injection] SDK already loaded');
    return;
  }

  console.log('[ZAP Injection] Injecting Movement Mini App SDK...');
  console.log('[ZAP Injection] Scan ID: ${scanId}');
  console.log('[ZAP Injection] Collector URL: ${collectorUrl}');

  // Configuration
  var SCAN_ID = '${scanId}';
  var COLLECTOR_URL = '${collectorUrl}';

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

      // Report to collector
      try {
        const response = await fetch(COLLECTOR_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scanId: SCAN_ID,
            payload: payload,
            url: window.location.href,
            triggeredBy: document.activeElement?.tagName || 'unknown'
          })
        });
        console.log('[Mock Wallet] Transaction reported to collector, status:', response.status);
      } catch (e) {
        console.warn('[Mock Wallet] Failed to report transaction:', e);
      }
    }

    async signTransaction(payload) {
      console.log('[Mock Wallet] Capturing transaction:', JSON.stringify(payload, null, 2));
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
          try {
            await navigator.clipboard.writeText(text);
          } catch (e) {
            console.warn('[SDK] Clipboard copy failed:', e);
          }
        },
        paste: async () => {
          try {
            const text = await navigator.clipboard.readText();
            console.log('[SDK] Clipboard paste:', text);
            return text;
          } catch (e) {
            console.warn('[SDK] Clipboard paste failed:', e);
            return '';
          }
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
        console.log('[SDK] Haptic:', options?.type);
      };

      console.log('[SDK] Initialized with address:', this.mockWallet.address);
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

      console.log('[SDK] Context:', JSON.stringify(this.context, null, 2));
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
      console.log('[SDK] Sign transaction:', JSON.stringify(payload, null, 2));
      return await this.mockWallet.signTransaction(payload);
    }

    async signAndSubmitTransaction(payload) {
      console.log('[SDK] Sign and submit transaction:', JSON.stringify(payload, null, 2));
      return await this.mockWallet.signTransaction(payload);
    }

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
})();
`;
}
