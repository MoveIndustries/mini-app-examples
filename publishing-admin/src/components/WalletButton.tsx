'use client';

import { useWallet } from '@moveindustries/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { isMultisigSigner } from '@/lib/aptos';

// Session storage key for verified addresses
const VERIFIED_KEY = 'wallet_verified';

export function WalletButton() {
  const { account, connected, disconnect, wallet, signMessage } = useWallet();
  const [walletName, setWalletName] = useState<string>('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [userIsAdmin, setUserIsAdmin] = useState<boolean | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (wallet?.name) {
      setWalletName(wallet.name);
    }
  }, [wallet]);

  // Check if this address was already verified in this session
  useEffect(() => {
    if (account?.address) {
      const addressStr = account.address.toString();
      const verified = sessionStorage.getItem(VERIFIED_KEY);
      if (verified === addressStr) {
        setIsVerified(true);
      } else {
        setIsVerified(false);
      }
    } else {
      setIsVerified(false);
    }
  }, [account?.address]);

  // Check admin status only after verification
  useEffect(() => {
    const checkAdmin = async () => {
      if (!account?.address || !isVerified) {
        setUserIsAdmin(null);
        return;
      }
      try {
        const isSigner = await isMultisigSigner(account.address.toString());
        setUserIsAdmin(isSigner);
      } catch {
        setUserIsAdmin(null);
      }
    };
    checkAdmin();
  }, [account?.address, isVerified]);

  const handleVerify = async () => {
    if (!account?.address || !signMessage) return;

    const addressStr = account.address.toString();
    setIsVerifying(true);
    try {
      const message = `Sign this message to verify ownership of your wallet for Movement Publishing Admin.\n\nAddress: ${addressStr}\nTimestamp: ${Date.now()}`;

      const response = await signMessage({ message, nonce: Date.now().toString() });

      if (response) {
        // Signature verified - store in session
        sessionStorage.setItem(VERIFIED_KEY, addressStr);
        setIsVerified(true);
        // Notify other components
        window.dispatchEvent(new CustomEvent('wallet-verified', { detail: addressStr }));
      }
    } catch (error) {
      console.error('Signature verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem(VERIFIED_KEY);
    setIsVerified(false);
    disconnect();
  };

  const addressStr = account?.address?.toString() || '';
  const shortAddress = addressStr
    ? `${addressStr.slice(0, 6)}...${addressStr.slice(-4)}`
    : '';

  if (!connected) {
    return (
      <div>
        <button
          onClick={() => setShowWalletModal(true)}
          className="bg-guild-green-500 hover:bg-guild-green-600 dark:bg-guild-green-600 dark:hover:bg-guild-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Connect Wallet
        </button>

        {showWalletModal && (
          <WalletModal onClose={() => setShowWalletModal(false)} />
        )}
      </div>
    );
  }

  // Connected but not verified - show verify button
  if (!isVerified) {
    return (
      <div className="flex items-center gap-3">
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isVerifying ? 'Signing...' : 'Verify Wallet'}
        </button>
        <button
          onClick={handleDisconnect}
          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {userIsAdmin === false && (
        <span className="text-red-600 dark:text-red-400 text-sm font-medium">
          Not Signer
        </span>
      )}
      {userIsAdmin === true && (
        <span className="text-green-600 dark:text-green-400 text-sm font-medium">
          ✓ Signer
        </span>
      )}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
        <div className="text-xs text-gray-500 dark:text-gray-400">{walletName}</div>
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {shortAddress}
        </div>
      </div>
      <button
        onClick={handleDisconnect}
        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
      >
        Disconnect
      </button>
    </div>
  );
}

function WalletModal({ onClose }: { onClose: () => void }) {
  const { wallets, connect } = useWallet();

  const unsupportedWallets = [
    'Dev T wallet',
    'Pontem Wallet',
    'Pontem',
    'TrustWallet',
    'TokenPocket',
    'Martian',
    'Rise',
    'Petra',
    'Aptos Connect',
    'Continue with Google',
    'Continue with Apple'
  ];

  const supportedWallets = wallets?.filter(
    (wallet) => !unsupportedWallets.includes(wallet.name)
  );

  const handleConnect = async (walletName: string) => {
    try {
      await connect(walletName as any);
      onClose();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Connect Wallet
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2">
          {supportedWallets && supportedWallets.length > 0 ? (
            supportedWallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet.name)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {wallet.icon && (
                  <img src={wallet.icon} alt={wallet.name} className="w-8 h-8" />
                )}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {wallet.name}
                </span>
              </button>
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No supported wallets found. Please install a compatible wallet.
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          You will need to sign a message to verify wallet ownership
        </p>
      </div>
    </div>
  );
}
