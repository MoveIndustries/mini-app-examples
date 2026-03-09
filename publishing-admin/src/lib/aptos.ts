import {
  Aptos,
  AptosConfig,
  Network,
  generateTransactionPayload,
} from '@aptos-labs/ts-sdk';
import { REGISTRY_ADDRESS, MULTISIG_ADDRESS } from './config';
import { AppMetadata, PendingChange } from '@/types/app';

// Multisig transaction interface
export interface MultisigTransaction {
  sequence_number: string;
  payload: {
    function: string;
    type_arguments: string[];
    arguments: string[];
  };
  payload_hash: string;
  votes: {
    yes: string[];
    no: string[];
  };
  creator: string;
  creation_time_secs: string;
}

// Lazy initialization to ensure env vars are loaded
let aptosInstance: Aptos | null = null;

function getAptosClient(): Aptos {
  if (!aptosInstance) {
    const fullnodeUrl = process.env.NEXT_PUBLIC_FULLNODE_URL;
    const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;

    if (!fullnodeUrl || !indexerUrl) {
      throw new Error('FULLNODE_URL and INDEXER_URL must be set in environment variables');
    }

    const config = new AptosConfig({
      network: Network.CUSTOM,
      fullnode: fullnodeUrl,
      indexer: indexerUrl,
    });

    aptosInstance = new Aptos(config);
  }
  return aptosInstance;
}

// View functions
export async function getApp(appId: number): Promise<AppMetadata | null> {
  try {
    const aptos = getAptosClient();
    console.log('Fetching app with ID:', appId);
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::get_app`,
        functionArguments: [appId],
      },
    });
    console.log('App result:', result);
    const app = result[0] as AppMetadata;
    // Add app_id to the metadata
    return { ...app, app_id: appId };
  } catch (error) {
    console.error('Error fetching app', appId, ':', error);
    return null;
  }
}

export async function getStats(): Promise<{ total: number; approved: number; pending: number }> {
  try {
    const aptos = getAptosClient();
    console.log('Fetching stats from:', `${REGISTRY_ADDRESS}::app_registry::get_stats`);
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::get_stats`,
        functionArguments: [],
      },
    });
    console.log('Stats result:', result);
    const stats = {
      total: Number(result[0]),
      approved: Number(result[1]),
      pending: Number(result[2]),
    };
    console.log('Parsed stats:', stats);
    return stats;
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { total: 0, approved: 0, pending: 0 };
  }
}

export async function hasPendingChange(appId: number): Promise<boolean> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::has_pending_change`,
        functionArguments: [appId],
      },
    });
    return result[0] as boolean;
  } catch (error) {
    console.error('Error checking pending changes:', error);
    return false;
  }
}

export async function getPendingChange(appId: number): Promise<PendingChange | null> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::get_pending_change`,
        functionArguments: [appId],
      },
    });
    return result[0] as PendingChange;
  } catch (error) {
    console.error('Error fetching pending change:', error);
    return null;
  }
}

// Normalize address to proper 0x + 64 hex chars format
function normalizeAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid address: must be a non-empty string');
  }
  let hex = address.toLowerCase().trim();
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  // Remove any non-hex characters
  hex = hex.replace(/[^0-9a-f]/g, '');
  // Pad to 64 characters if needed
  hex = hex.padStart(64, '0');
  return `0x${hex}`;
}

export async function checkIsOwner(address: string): Promise<boolean> {
  try {
    console.log('checkIsOwner called with address:', address);
    const aptos = getAptosClient();
    const normalizedAddress = normalizeAddress(address);
    console.log('Normalized address:', normalizedAddress);
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::check_is_owner`,
        functionArguments: [normalizedAddress],
      },
    });
    console.log('checkIsOwner result:', result);
    return result[0] as boolean;
  } catch (error) {
    console.error('Error checking owner:', error);
    return false;
  }
}

// ============ Multisig Functions ============

// Get list of multisig owners/signers
export async function getMultisigOwners(): Promise<string[]> {
  try {
    const aptos = getAptosClient();
    console.log('Fetching multisig owners from:', MULTISIG_ADDRESS);
    const result = await aptos.view({
      payload: {
        function: `0x1::multisig_account::owners`,
        functionArguments: [MULTISIG_ADDRESS],
      },
    });
    console.log('Multisig owners result:', result);
    return result[0] as string[];
  } catch (error) {
    console.error('Error fetching multisig owners:', error);
    return [];
  }
}

// Check if address is a multisig signer
export async function isMultisigSigner(address: string): Promise<boolean> {
  try {
    const normalizedAddress = normalizeAddress(address);
    const owners = await getMultisigOwners();
    const normalizedOwners = owners.map(o => normalizeAddress(o));
    return normalizedOwners.includes(normalizedAddress);
  } catch (error) {
    console.error('Error checking multisig signer:', error);
    return false;
  }
}

// Get multisig threshold (signatures required)
export async function getMultisigThreshold(): Promise<number> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `0x1::multisig_account::num_signatures_required`,
        functionArguments: [MULTISIG_ADDRESS],
      },
    });
    return Number(result[0]);
  } catch (error) {
    console.error('Error fetching multisig threshold:', error);
    return 0;
  }
}

// Get last resolved sequence number
export async function getLastResolvedSequenceNumber(): Promise<number> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `0x1::multisig_account::last_resolved_sequence_number`,
        functionArguments: [MULTISIG_ADDRESS],
      },
    });
    return Number(result[0]);
  } catch (error) {
    console.error('Error fetching last resolved sequence number:', error);
    return 0;
  }
}

// Get next sequence number
export async function getNextSequenceNumber(): Promise<number> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `0x1::multisig_account::next_sequence_number`,
        functionArguments: [MULTISIG_ADDRESS],
      },
    });
    return Number(result[0]);
  } catch (error) {
    console.error('Error fetching next sequence number:', error);
    return 0;
  }
}

// Get a specific multisig transaction
export async function getMultisigTransaction(sequenceNumber: number): Promise<MultisigTransaction | null> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `0x1::multisig_account::get_transaction`,
        functionArguments: [MULTISIG_ADDRESS, sequenceNumber],
      },
    });
    return result[0] as MultisigTransaction;
  } catch (error) {
    console.error('Error fetching multisig transaction:', error);
    return null;
  }
}

// Get all pending multisig transactions
export async function getPendingMultisigTransactions(): Promise<MultisigTransaction[]> {
  try {
    const lastResolved = await getLastResolvedSequenceNumber();
    const nextSeq = await getNextSequenceNumber();

    const transactions: MultisigTransaction[] = [];
    for (let i = lastResolved + 1; i < nextSeq; i++) {
      const tx = await getMultisigTransaction(i);
      if (tx) {
        transactions.push({ ...tx, sequence_number: String(i) });
      }
    }

    return transactions;
  } catch (error) {
    console.error('Error fetching pending multisig transactions:', error);
    return [];
  }
}

// Check if a multisig transaction can be executed
export async function canExecuteMultisigTransaction(sequenceNumber: number): Promise<boolean> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `0x1::multisig_account::can_be_executed`,
        functionArguments: [MULTISIG_ADDRESS, sequenceNumber],
      },
    });
    return result[0] as boolean;
  } catch (error) {
    console.error('Error checking if transaction can be executed:', error);
    return false;
  }
}

// Check if address has voted on a transaction
export async function hasVoted(sequenceNumber: number, address: string): Promise<boolean> {
  try {
    const tx = await getMultisigTransaction(sequenceNumber);
    if (!tx) return false;

    const normalizedAddress = normalizeAddress(address);
    const yesVoters = tx.votes.yes.map(a => normalizeAddress(a));
    const noVoters = tx.votes.no.map(a => normalizeAddress(a));

    return yesVoters.includes(normalizedAddress) || noVoters.includes(normalizedAddress);
  } catch (error) {
    console.error('Error checking vote status:', error);
    return false;
  }
}

export async function getOwners(): Promise<string[]> {
  try {
    const aptos = getAptosClient();
    console.log('Fetching owners from registry');
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::get_owners`,
        functionArguments: [],
      },
    });
    console.log('Owners result:', result);
    return result[0] as string[];
  } catch (error) {
    console.error('Error fetching owners:', error);
    return [];
  }
}

export async function getAllAppIds(): Promise<number[]> {
  try {
    const aptos = getAptosClient();
    console.log('Fetching all app indices');
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::get_all_app_indices`,
        functionArguments: [],
      },
    });
    console.log('All app indices result:', result);
    return (result[0] as number[]) || [];
  } catch (error) {
    console.error('Error fetching all app indices:', error);
    return [];
  }
}

export async function getNonApprovedApps(): Promise<AppMetadata[]> {
  try {
    const aptos = getAptosClient();
    console.log('Fetching non-approved apps');
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::get_non_approved_apps`,
        functionArguments: [],
      },
    });
    console.log('Non-approved apps result:', result);
    return result[0] as AppMetadata[];
  } catch (error) {
    console.error('Error fetching non-approved apps:', error);
    return [];
  }
}

// Get ALL apps (approved, pending, rejected) - requires admin/owner access
export async function getAllApps(callerAddress: string): Promise<AppMetadata[]> {
  try {
    console.log('Fetching all apps for admin:', callerAddress);

    // Get all app IDs first
    const allIds = await getAllAppIds();
    console.log('Found app IDs:', allIds.length);

    // Fetch metadata for each app
    const apps: AppMetadata[] = [];
    for (const appId of allIds) {
      try {
        const app = await getApp(appId);
        if (app) {
          apps.push(app);
        }
      } catch (error) {
        console.error(`Error fetching app with ID ${appId}:`, error);
      }
    }

    console.log('Total apps loaded:', apps.length);
    return apps;
  } catch (error) {
    console.error('Error fetching all apps:', error);
    return [];
  }
}

// Helper function to build and submit transactions manually
// This bypasses the wallet adapter's network validation
async function buildAndSubmitTransaction(
  account: any,
  signTransaction: any,
  functionName: `${string}::${string}::${string}`,
  functionArguments: any[]
): Promise<boolean> {
  try {
    const aptos = getAptosClient();

    // Build the transaction
    const transaction = await aptos.transaction.build.simple({
      sender: account.address,
      data: {
        function: functionName,
        functionArguments: functionArguments,
      },
    });

    // Sign the transaction with the wallet
    const senderAuthenticator = await signTransaction(transaction);

    // Submit the signed transaction
    const committedTransaction = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    // Wait for transaction confirmation
    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash
    });

    console.log('Transaction successful:', executedTransaction);
    return true;
  } catch (error) {
    console.error('Transaction error:', error);
    throw error;
  }
}

// ============ Multisig Proposal Functions ============

// Create a multisig proposal for a transaction
// Calls 0x1::multisig_account::create_transaction with BCS-encoded payload
export async function createMultisigProposal(
  account: any,
  signTransaction: any,
  functionName: `${string}::${string}::${string}`,
  functionArguments: any[]
): Promise<boolean> {
  try {
    const aptos = getAptosClient();

    // Step 1: Generate the transaction payload that will be executed by the multisig
    // Using multisigAddress parameter creates a TransactionPayloadMultiSig
    const multisigPayload = await generateTransactionPayload({
      multisigAddress: MULTISIG_ADDRESS,
      function: functionName,
      functionArguments: functionArguments,
      aptosConfig: aptos.config,
    });

    // Step 2: Extract the BCS-encoded payload bytes
    // The multiSig.transaction_payload contains the entry function to execute
    const payloadBytes = multisigPayload.multiSig.transaction_payload?.bcsToBytes();
    if (!payloadBytes) {
      throw new Error('Failed to generate payload bytes');
    }

    // Step 3: Call create_transaction with the payload bytes
    const transaction = await aptos.transaction.build.simple({
      sender: account.address,
      data: {
        function: `0x1::multisig_account::create_transaction`,
        functionArguments: [
          MULTISIG_ADDRESS,
          Array.from(payloadBytes), // vector<u8>
        ],
      },
    });

    const senderAuthenticator = await signTransaction(transaction);

    const committedTransaction = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash
    });

    console.log('Multisig proposal created successfully');
    return true;
  } catch (error) {
    console.error('Error creating multisig proposal:', error);
    throw error;
  }
}

// Approve a pending multisig transaction
export async function approveMultisigTransaction(
  account: any,
  signTransaction: any,
  sequenceNumber: number
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `0x1::multisig_account::approve_transaction`,
      [MULTISIG_ADDRESS, sequenceNumber]
    );
  } catch (error) {
    console.error('Error approving multisig transaction:', error);
    throw error;
  }
}

// Reject a pending multisig transaction
export async function rejectMultisigTransaction(
  account: any,
  signTransaction: any,
  sequenceNumber: number
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `0x1::multisig_account::reject_transaction`,
      [MULTISIG_ADDRESS, sequenceNumber]
    );
  } catch (error) {
    console.error('Error rejecting multisig transaction:', error);
    throw error;
  }
}

// Execute an approved multisig transaction
// When payload is stored on-chain, we submit a TransactionPayloadMultiSig with just the address
export async function executeMultisigTransaction(
  account: any,
  signTransaction: any
): Promise<boolean> {
  try {
    const aptos = getAptosClient();

    // Create a multisig execution payload - no inner transaction_payload needed
    // because the payload is already stored on-chain.
    // Type assertion needed because SDK types expect function data, but multisig
    // execution with stored payload only requires the multisig address.
    const rawTransaction = await aptos.transaction.build.simple({
      sender: account.address,
      data: {
        multisigAddress: MULTISIG_ADDRESS,
      } as any,
    });

    const senderAuthenticator = await signTransaction(rawTransaction);

    const committedTransaction = await aptos.transaction.submit.simple({
      transaction: rawTransaction,
      senderAuthenticator,
    });

    await aptos.waitForTransaction({
      transactionHash: committedTransaction.hash
    });

    console.log('Multisig transaction executed successfully');
    return true;
  } catch (error) {
    console.error('Error executing multisig transaction:', error);
    throw error;
  }
}

// Entry functions (require wallet signature)
export async function approveApp(
  account: any,
  signTransaction: any,
  appId: number
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::approve_app`,
      [appId]
    );
  } catch (error) {
    console.error('Error approving app:', error);
    return false;
  }
}

export async function rejectApp(
  account: any,
  signTransaction: any,
  appId: number,
  reason: string
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::reject_app`,
      [appId, reason]
    );
  } catch (error) {
    console.error('Error rejecting app:', error);
    return false;
  }
}

export async function approveUpdate(
  account: any,
  signTransaction: any,
  appId: number
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::approve_update`,
      [appId]
    );
  } catch (error) {
    console.error('Error approving update:', error);
    return false;
  }
}

export async function updateStats(
  account: any,
  signTransaction: any,
  appId: number,
  downloads: number,
  rating: number
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::update_stats`,
      [appId, downloads, rating * 10]
    );
  } catch (error) {
    console.error('Error updating stats:', error);
    return false;
  }
}

export async function approveRejectedApp(
  account: any,
  signTransaction: any,
  appId: number
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::approve_rejected_app`,
      [appId]
    );
  } catch (error) {
    console.error('Error approving rejected app:', error);
    return false;
  }
}

export async function revertToPending(
  account: any,
  signTransaction: any,
  appId: number
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::revert_to_pending`,
      [appId]
    );
  } catch (error) {
    console.error('Error reverting app to pending:', error);
    return false;
  }
}

export async function addOwner(
  account: any,
  signTransaction: any,
  newOwnerAddress: string
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::add_owner`,
      [newOwnerAddress]
    );
  } catch (error) {
    console.error('Error adding owner:', error);
    return false;
  }
}

export async function removeOwner(
  account: any,
  signTransaction: any,
  ownerToRemove: string
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::remove_owner`,
      [ownerToRemove]
    );
  } catch (error) {
    console.error('Error removing owner:', error);
    return false;
  }
}

// Treasury and Fee Management
export async function getTreasuryAddress(): Promise<string> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::get_treasury_address`,
        functionArguments: [],
      },
    });
    return result[0] as string;
  } catch (error) {
    console.error('Error fetching treasury address:', error);
    return '';
  }
}

export async function getSubmitFee(): Promise<number> {
  try {
    const aptos = getAptosClient();
    const result = await aptos.view({
      payload: {
        function: `${REGISTRY_ADDRESS}::app_registry::get_submit_fee`,
        functionArguments: [],
      },
    });
    return Number(result[0]);
  } catch (error) {
    console.error('Error fetching submit fee:', error);
    return 0;
  }
}

export async function updateTreasuryAddress(
  account: any,
  signTransaction: any,
  newTreasuryAddress: string
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::update_treasury_address`,
      [newTreasuryAddress]
    );
  } catch (error) {
    console.error('Error updating treasury address:', error);
    return false;
  }
}

export async function updateSubmitFee(
  account: any,
  signTransaction: any,
  newFeeInOctas: number
): Promise<boolean> {
  try {
    return await buildAndSubmitTransaction(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::update_submit_fee`,
      [newFeeInOctas]
    );
  } catch (error) {
    console.error('Error updating submit fee:', error);
    return false;
  }
}

// ============ Multisig Proposal Entry Functions ============
// These create proposals instead of executing directly

export async function proposeApproveApp(
  account: any,
  signTransaction: any,
  appId: number
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::approve_app`,
      [appId]
    );
  } catch (error) {
    console.error('Error proposing app approval:', error);
    return false;
  }
}

export async function proposeRejectApp(
  account: any,
  signTransaction: any,
  appId: number,
  reason: string
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::reject_app`,
      [appId, reason]
    );
  } catch (error) {
    console.error('Error proposing app rejection:', error);
    return false;
  }
}

export async function proposeApproveUpdate(
  account: any,
  signTransaction: any,
  appId: number
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::approve_update`,
      [appId]
    );
  } catch (error) {
    console.error('Error proposing update approval:', error);
    return false;
  }
}

export async function proposeApproveRejectedApp(
  account: any,
  signTransaction: any,
  appId: number
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::approve_rejected_app`,
      [appId]
    );
  } catch (error) {
    console.error('Error proposing rejected app approval:', error);
    return false;
  }
}

export async function proposeRevertToPending(
  account: any,
  signTransaction: any,
  appId: number
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::revert_to_pending`,
      [appId]
    );
  } catch (error) {
    console.error('Error proposing revert to pending:', error);
    return false;
  }
}

export async function proposeAddOwner(
  account: any,
  signTransaction: any,
  newOwnerAddress: string
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::add_owner`,
      [newOwnerAddress]
    );
  } catch (error) {
    console.error('Error proposing add owner:', error);
    return false;
  }
}

export async function proposeRemoveOwner(
  account: any,
  signTransaction: any,
  ownerToRemove: string
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::remove_owner`,
      [ownerToRemove]
    );
  } catch (error) {
    console.error('Error proposing remove owner:', error);
    return false;
  }
}

export async function proposeUpdateTreasuryAddress(
  account: any,
  signTransaction: any,
  newTreasuryAddress: string
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::update_treasury_address`,
      [newTreasuryAddress]
    );
  } catch (error) {
    console.error('Error proposing treasury address update:', error);
    return false;
  }
}

export async function proposeUpdateSubmitFee(
  account: any,
  signTransaction: any,
  newFeeInOctas: number
): Promise<boolean> {
  try {
    return await createMultisigProposal(
      account,
      signTransaction,
      `${REGISTRY_ADDRESS}::app_registry::update_submit_fee`,
      [newFeeInOctas]
    );
  } catch (error) {
    console.error('Error proposing submit fee update:', error);
    return false;
  }
}
