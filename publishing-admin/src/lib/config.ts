// Registry Contract Configuration
export const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '0xe8c84530749dd8294c635aa5af50d95025dc0261603cb83f69a608e1ded8eb0f';

// Multisig Configuration
export const MULTISIG_ADDRESS = process.env.NEXT_PUBLIC_MULTISIG_ADDRESS || '0x622045ec913acef7760abcfdbaa345d4aca9b20782bf3bcfe0b7d05f8b774794';

// Admin addresses (hardcoded for now)
export const ADMIN_ADDRESSES = process.env.NEXT_PUBLIC_ADMIN_ADDRESSES
  ? process.env.NEXT_PUBLIC_ADMIN_ADDRESSES.split(',').map(addr => addr.trim().toLowerCase())
  : [];

// Network configuration
export const NETWORK: 'testnet' | 'mainnet' = 'mainnet';

// Node URLs
export const FULLNODE_URL = process.env.NEXT_PUBLIC_FULLNODE_URL;
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL;

export const isAdmin = (address: string | undefined): boolean => {
  if (!address) return false;
  return ADMIN_ADDRESSES.includes(address.toLowerCase());
};
