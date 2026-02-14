/**
 * Movement Mini Apps SDK - Web-Compatible Version
 *
 * This is a web-compatible version of the Movement Mini App SDK that can be
 * injected into mini apps during security testing with ZAP/Selenium.
 *
 * It provides the same API surface as the native SDK but uses a mock wallet
 * backend for testing purposes.
 */

import { MockWallet } from './mock-wallet';
import type {
  AccountInfo,
  ClipboardAPI,
  EventListener,
  HapticOptions,
  MiniAppContext,
  MiniAppEvent,
  MiniAppEventType,
  MNSAPI,
  NotificationOptions,
  OpenUrlOptions,
  ReadyOptions,
  SDKConfig,
  ShareOptions,
  SignMessagePayload,
  SignMessageResponse,
  TransactionPayload,
  TransactionResponse,
} from './types';

declare global {
  interface Window {
    movementSDK?: MovementMiniAppSDKWeb;
    ReactNativeWebView?: any;
  }
}

export class MovementMiniAppSDKWeb {
  private mockWallet: MockWallet;
  private context: MiniAppContext | null = null;
  private isReady = false;
  private listeners = new Map<MiniAppEventType, Set<EventListener>>();
  private config: SDKConfig;

  // Public API properties (like the real SDK)
  public clipboard?: ClipboardAPI;
  public mns?: MNSAPI;
  public network?: string;
  public scanQRCode?: () => Promise<string>;
  public notify?: (options: NotificationOptions) => Promise<void>;
  public haptic?: (options: HapticOptions) => Promise<void>;

  constructor(config: SDKConfig = {}) {
    this.config = {
      debug: config.debug !== undefined ? config.debug : true,
      timeout: config.timeout || 30000,
      mockWallet: config.mockWallet || {},
    };

    this.mockWallet = new MockWallet(this.config.mockWallet);
    this.initializeAPIs();
    this.log('SDK initialized in web mode');
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[Movement SDK Web]', ...args);
    }
  }

  private initializeAPIs(): void {
    // Initialize clipboard API
    this.clipboard = {
      copy: async (text: string) => {
        this.log('Clipboard copy:', text);
        await navigator.clipboard.writeText(text);
      },
      paste: async () => {
        const text = await navigator.clipboard.readText();
        this.log('Clipboard paste:', text);
        return text;
      },
    };

    // Initialize MNS API
    this.mns = {
      getPrimaryName: async (address: string) => {
        this.log('MNS getPrimaryName:', address);
        // Mock implementation
        return null;
      },
      getTargetAddress: async (name: string) => {
        this.log('MNS getTargetAddress:', name);
        // Mock implementation - return a mock address in byte array format
        const mockAddress = this.mockWallet.getAddress().slice(2); // Remove 0x
        const bytes: { [key: number]: number } = {};
        for (let i = 0; i < mockAddress.length; i += 2) {
          bytes[i / 2] = parseInt(mockAddress.slice(i, i + 2), 16);
        }
        return { data: bytes };
      },
    };

    // Initialize scanQRCode
    this.scanQRCode = async () => {
      this.log('Scan QR code requested');
      // Return a mock address
      return this.mockWallet.getAddress();
    };

    // Initialize notify
    this.notify = async (options: NotificationOptions) => {
      this.log('Notification:', options);
      // Mock notification
    };

    // Initialize haptic
    this.haptic = async (options: HapticOptions) => {
      this.log('Haptic feedback:', options.type);
      // Mock haptic
    };

    // Set network from mock wallet
    this.network = this.mockWallet.getNetwork();
  }

  /**
   * Signal that the mini app is ready to be displayed
   */
  async ready(options: ReadyOptions = {}): Promise<void> {
    this.log('Ready called', options);
    this.isReady = true;

    // Initialize context if not already set
    if (!this.context) {
      this.context = await this.getContext();
    }
  }

  /**
   * Close the mini app
   */
  async close(): Promise<void> {
    this.log('Close called');
    // In a test environment, this is a no-op
  }

  /**
   * Get the current context
   */
  async getContext(): Promise<MiniAppContext> {
    if (this.context) {
      return this.context;
    }

    const account = await this.mockWallet.getAccount();

    this.context = {
      location: 'launcher',
      user: {
        address: account.address,
        displayName: 'Test User',
        isConnected: true,
      },
      client: {
        platformType: 'web',
        version: '1.0.0-test',
        added: false,
        safeAreaInsets: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
      network: {
        chainId: this.mockWallet.getNetwork() === 'mainnet' ? 126 : 250,
        network: this.mockWallet.getNetwork(),
        rpcUrl: this.mockWallet.getNetwork() === 'mainnet'
          ? 'https://mainnet.movementnetwork.xyz/v1'
          : 'https://testnet.movementnetwork.xyz/v1',
        explorerUrl: this.mockWallet.getNetwork() === 'mainnet'
          ? 'https://explorer.movementnetwork.xyz'
          : 'https://explorer.testnet.movementnetwork.xyz',
      },
      features: {
        haptics: true,
        camera: true,
        biometrics: false,
      },
      theme: {
        colorScheme: 'dark',
      },
    };

    this.log('Context:', this.context);
    return this.context;
  }

  /**
   * Get theme information
   */
  async getTheme(): Promise<{ colorScheme: 'light' | 'dark' }> {
    const context = await this.getContext();
    return context.theme;
  }

  /**
   * Open a URL
   */
  async openUrl(optionsOrUrl: OpenUrlOptions | string, target?: 'external' | 'in-app'): Promise<void> {
    const options: OpenUrlOptions = typeof optionsOrUrl === 'string'
      ? { url: optionsOrUrl, target }
      : optionsOrUrl;

    this.log('Open URL:', options);

    // In test mode, log but don't actually open
    if (options.target === 'external') {
      this.log('Would open external URL:', options.url);
    } else {
      this.log('Would open in-app URL:', options.url);
    }
  }

  /**
   * Share content
   */
  async share(options: ShareOptions): Promise<void> {
    this.log('Share:', options);
    // Mock share
  }

  /**
   * Connect wallet (returns mock account)
   */
  async connectWallet(): Promise<AccountInfo> {
    this.log('Connect wallet');
    return await this.mockWallet.getAccount();
  }

  /**
   * Get current account info
   */
  async getAccount(): Promise<AccountInfo> {
    return await this.mockWallet.getAccount();
  }

  /**
   * Sign a transaction (same as signAndSubmitTransaction)
   */
  async signTransaction(payload: TransactionPayload): Promise<TransactionResponse> {
    this.log('Sign transaction:', payload);
    return await this.mockWallet.signTransaction(payload);
  }

  /**
   * Sign and submit a transaction
   */
  async signAndSubmitTransaction(payload: TransactionPayload): Promise<TransactionResponse> {
    return await this.signTransaction(payload);
  }

  /**
   * Sign a message
   */
  async signMessage(payload: SignMessagePayload): Promise<SignMessageResponse> {
    this.log('Sign message:', payload);
    return await this.mockWallet.signMessage(payload);
  }

  /**
   * Send a notification
   */
  async sendNotification(options: NotificationOptions): Promise<void> {
    this.log('Send notification:', options);
    // Mock notification
  }

  /**
   * Subscribe to events
   */
  on<T = any>(type: MiniAppEventType, listener: EventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(listener);
    this.log('Event listener added:', type);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  /**
   * Remove event listener
   */
  off(type: MiniAppEventType, listener: EventListener): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit an event (for testing)
   */
  emitEvent<T = any>(type: MiniAppEventType, data: T): void {
    const event: MiniAppEvent<T> = {
      type,
      data,
      timestamp: Date.now(),
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  /**
   * Check if SDK is ready
   */
  get isSDKReady(): boolean {
    return this.isReady;
  }

  /**
   * Get cached context
   */
  get cachedContext(): MiniAppContext | null {
    return this.context;
  }

  /**
   * Enable/disable debug mode
   */
  setDebug(enabled: boolean): void {
    this.config.debug = enabled;
    this.log('Debug mode:', enabled);
  }

  /**
   * Get mock wallet (for testing purposes)
   */
  getMockWallet(): MockWallet {
    return this.mockWallet;
  }
}

// Create and expose singleton instance
if (typeof window !== 'undefined') {
  window.movementSDK = new MovementMiniAppSDKWeb();
  console.log('[Movement SDK Web] Global instance created and attached to window.movementSDK');
}

export const movementSDK = typeof window !== 'undefined'
  ? window.movementSDK!
  : new MovementMiniAppSDKWeb();
