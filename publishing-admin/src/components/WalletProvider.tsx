'use client';

import { MovementWalletAdapterProvider } from '@moveindustries/wallet-adapter-react';

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <MovementWalletAdapterProvider
      autoConnect={true}
      onError={(error) => {
        console.error('Wallet error:', error);
      }}
    >
      {children}
    </MovementWalletAdapterProvider>
  );
}
