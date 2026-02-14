/**
 * Movement Mini Apps SDK - Type Definitions (Web Version)
 *
 * Types extracted from movement-mobile-app for web compatibility
 */

export type PlatformType = 'mobile' | 'web';

export type LaunchContext =
  | 'launcher'
  | 'notification'
  | 'deeplink'
  | 'share'
  | 'embedded';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ClientInfo {
  platformType: PlatformType;
  version: string;
  added: boolean;
  safeAreaInsets?: SafeAreaInsets;
}

export interface UserInfo {
  address: string;
  displayName?: string;
  avatarUrl?: string;
  isConnected: boolean;
}

export interface NetworkInfo {
  chainId: number;
  network: 'mainnet' | 'testnet';
  rpcUrl: string;
  explorerUrl: string;
}

export interface ThemeInfo {
  colorScheme: 'light' | 'dark';
}

export interface MiniAppContext {
  location: LaunchContext;
  user: UserInfo | null;
  client: ClientInfo;
  network: NetworkInfo;
  features: {
    haptics: boolean;
    camera: boolean;
    biometrics: boolean;
  };
  theme: ThemeInfo;
}

export interface TransactionPayload {
  function: string;
  type_arguments?: string[];
  arguments?: any[];
  to?: string;
  amount?: string | number;
  title?: string;
  description?: string;
  useFeePayer?: boolean;
  feePayerUrl?: string;
  gasLimit?: string | number;
  metadata?: {
    to?: string;
    amount?: string | number;
    title?: string;
    description?: string;
  };
}

export interface SignMessagePayload {
  message: string;
  nonce: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

export interface SignMessageResponse {
  signature: string;
  publicKey: string;
}

export interface TransactionResponse {
  hash: string;
  success: boolean;
}

export interface AccountInfo {
  address: string;
  publicKey: string;
  minKeysRequired?: number;
}

export interface ReadyOptions {
  splashDuration?: number;
}

export interface OpenUrlOptions {
  url: string;
  target?: 'external' | 'in-app';
}

export interface ShareOptions {
  title?: string;
  message: string;
  url?: string;
}

export interface HapticOptions {
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
}

export interface NotificationOptions {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export type MiniAppEventType =
  | 'walletChanged'
  | 'networkChanged'
  | 'userUpdated'
  | 'appStateChanged'
  | 'themeChanged';

export interface MiniAppEvent<T = any> {
  type: MiniAppEventType;
  data: T;
  timestamp: number;
}

export type EventListener<T = any> = (event: MiniAppEvent<T>) => void;

export interface SDKConfig {
  debug?: boolean;
  timeout?: number;
  mockWallet?: MockWalletConfig;
}

export interface MockWalletConfig {
  address?: string;
  publicKey?: string;
  network?: 'mainnet' | 'testnet';
  autoApprove?: boolean;
  simulateDelay?: boolean;
}

export interface ClipboardAPI {
  copy: (text: string) => Promise<void>;
  paste: () => Promise<string>;
}

export interface MNSAPI {
  getPrimaryName: (address: string) => Promise<string | null>;
  getTargetAddress: (name: string) => Promise<any>;
}
