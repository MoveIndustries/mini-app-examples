/**
 * Mock Wallet Implementation
 *
 * Simulates wallet operations for security testing without requiring
 * a real wallet connection
 */

import type {
  AccountInfo,
  MockWalletConfig,
  SignMessagePayload,
  SignMessageResponse,
  TransactionPayload,
  TransactionResponse,
} from './types';

export interface CapturedTransaction {
  payload: TransactionPayload;
  response: TransactionResponse;
  timestamp: number;
}

export class MockWallet {
  private config: Required<MockWalletConfig>;
  private transactionHistory: TransactionResponse[] = [];
  private capturedTransactions: CapturedTransaction[] = [];

  constructor(config: MockWalletConfig = {}) {
    this.config = {
      address: config.address || this.generateMockAddress(),
      publicKey: config.publicKey || this.generateMockPublicKey(),
      network: config.network || 'testnet',
      autoApprove: config.autoApprove !== undefined ? config.autoApprove : true,
      simulateDelay: config.simulateDelay !== undefined ? config.simulateDelay : true,
    };
  }

  private generateMockAddress(): string {
    const randomHex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `0x${randomHex}`;
  }

  private generateMockPublicKey(): string {
    const randomHex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `0x${randomHex}`;
  }

  private generateMockSignature(): string {
    const randomHex = Array.from({ length: 128 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `0x${randomHex}`;
  }

  private generateMockTxHash(): string {
    const randomHex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    return `0x${randomHex}`;
  }

  private async simulateDelay(min: number = 500, max: number = 1500): Promise<void> {
    if (!this.config.simulateDelay) return;
    const delay = Math.floor(Math.random() * (max - min) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async getAccount(): Promise<AccountInfo> {
    await this.simulateDelay(100, 300);
    return {
      address: this.config.address,
      publicKey: this.config.publicKey,
      minKeysRequired: 1,
    };
  }

  async signTransaction(payload: TransactionPayload): Promise<TransactionResponse> {
    await this.simulateDelay();

    if (!this.config.autoApprove) {
      // In a real scenario, this would show a UI prompt
      console.log('[Mock Wallet] Transaction approval required:', payload);
    }

    const response: TransactionResponse = {
      hash: this.generateMockTxHash(),
      success: true,
    };

    // Capture the full transaction for analysis
    this.capturedTransactions.push({
      payload,
      response,
      timestamp: Date.now(),
    });

    this.transactionHistory.push(response);

    console.log('[Mock Wallet] Transaction captured:', {
      function: payload.function,
      arguments: payload.arguments,
      hash: response.hash,
    });

    return response;
  }

  async signMessage(payload: SignMessagePayload): Promise<SignMessageResponse> {
    await this.simulateDelay();

    if (!this.config.autoApprove) {
      console.log('[Mock Wallet] Message signing approval required:', payload);
    }

    return {
      signature: this.generateMockSignature(),
      publicKey: this.config.publicKey,
    };
  }

  async getBalance(coinType: string): Promise<string> {
    await this.simulateDelay(200, 500);

    // Return mock balances based on coin type
    const mockBalances: Record<string, string> = {
      '0x1::aptos_coin::AptosCoin': '10000000000', // 100 MOVE (8 decimals)
      'USDC': '1000000000', // 1000 USDC (6 decimals)
      'USDT': '500000000', // 500 USDT (6 decimals)
    };

    return mockBalances[coinType] || '0';
  }

  getTransactionHistory(): TransactionResponse[] {
    return [...this.transactionHistory];
  }

  /**
   * Get all captured transactions with full payloads for analysis
   */
  getCapturedTransactions(): CapturedTransaction[] {
    return [...this.capturedTransactions];
  }

  /**
   * Clear captured transactions (call after analysis)
   */
  clearCapturedTransactions(): void {
    this.capturedTransactions = [];
  }

  getAddress(): string {
    return this.config.address;
  }

  getPublicKey(): string {
    return this.config.publicKey;
  }

  getNetwork(): 'mainnet' | 'testnet' {
    return this.config.network;
  }

  updateConfig(config: Partial<MockWalletConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
