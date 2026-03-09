import {
  Movement,
  MovementConfig,
  Network,
  generateTransactionPayload,
  AccountAddress,
  RawTransaction,
  TransactionPayloadMultiSig,
  MultiSig,
  ChainId,
  SignedTransaction,
  Deserializer,
} from '@moveindustries/ts-sdk';
import { REGISTRY_ADDRESS, MULTISIG_ADDRESS } from './config';
import { AppMetadata, PendingChange } from '@/types/app';

// Multisig transaction interface (matches Move struct)
export interface MultisigTransaction {
  sequence_number: string;
  payload: any; // Option<vector<u8>> - raw bytes or null
  payload_hash: any; // Option<vector<u8>>
  votes: { data: Array<{ key: string; value: boolean }> }; // SimpleMap<address, bool>
  creator: string;
  creation_time_secs: string;
  // Computed fields we add
  yesVotes?: string[];
  noVotes?: string[];
  // Decoded payload info
  decodedAction?: {
    functionName: string;
    appId?: number;
    label: string;
    icon: string;
  };
}

// Decode the BCS payload to extract action info
export function decodeMultisigPayload(payload: any): MultisigTransaction['decodedAction'] {
  try {
    console.log('Decoding payload:', payload);

    if (!payload) {
      console.log('No payload');
      return undefined;
    }

    // Handle different payload formats
    let bytes: number[] | undefined;

    // Format 1: { vec: [hexString] } (Option<vector<u8>> returned as hex)
    if (payload.vec && Array.isArray(payload.vec) && payload.vec.length > 0) {
      const innerValue = payload.vec[0];
      if (typeof innerValue === 'string') {
        // It's a hex string
        const hex = innerValue.startsWith('0x') ? innerValue.slice(2) : innerValue;
        bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
          bytes.push(parseInt(hex.substring(i, i + 2), 16));
        }
      } else if (Array.isArray(innerValue)) {
        // It's already a byte array
        bytes = innerValue;
      }
    }
    // Format 2: Direct array
    else if (Array.isArray(payload)) {
      bytes = payload;
    }
    // Format 3: Hex string directly
    else if (typeof payload === 'string') {
      const hex = payload.startsWith('0x') ? payload.slice(2) : payload;
      bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, i + 2), 16));
      }
    }

    if (!bytes || bytes.length === 0) {
      console.log('No bytes found in payload');
      return undefined;
    }

    console.log('Payload bytes length:', bytes.length);

    // Convert to Uint8Array for parsing
    const data = new Uint8Array(bytes);

    // Try to find function name in the bytes by looking for known patterns
    // The function name is a BCS string (length-prefixed)
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const text = textDecoder.decode(data);

    console.log('Decoded text (partial):', text.substring(0, 200));

    // Look for our known function names
    const functionPatterns: { pattern: string; label: string; icon: string }[] = [
      { pattern: 'approve_app', label: 'Approve App', icon: '✅' },
      { pattern: 'reject_app', label: 'Reject App', icon: '❌' },
      { pattern: 'revert_to_pending', label: 'Revert to Pending', icon: '↩️' },
      { pattern: 'approve_update', label: 'Approve Update', icon: '🔄' },
      { pattern: 'approve_rejected_app', label: 'Approve Rejected App', icon: '✅' },
      { pattern: 'add_owner', label: 'Add Owner', icon: '👤' },
      { pattern: 'remove_owner', label: 'Remove Owner', icon: '🚫' },
      { pattern: 'update_treasury_address', label: 'Update Treasury', icon: '💰' },
      { pattern: 'update_submit_fee', label: 'Update Submit Fee', icon: '💵' },
    ];

    for (const { pattern, label, icon } of functionPatterns) {
      const patternIndex = text.indexOf(pattern);
      if (patternIndex !== -1) {
        console.log('Found pattern:', pattern, 'at index:', patternIndex);
        // Try to extract app_id from the payload
        let appId: number | undefined;

        // For app-related functions, find the arguments section
        // BCS format: after function name, there's type_args (usually empty vector = 0x00)
        // then args vector, where first arg for app functions is u64 app_id
        if (pattern.includes('app') || pattern === 'revert_to_pending' || pattern === 'approve_update') {
          // Find position after the function name in bytes
          const funcNameEnd = patternIndex + pattern.length;

          // Look for the args section - it starts with vector lengths
          // The first arg should be a vector containing the u64 app_id (8 bytes)
          // Search for pattern: 0x00 (empty type args) followed by 0x01 or 0x02 (1-2 args)
          // then 0x08 (8 bytes for u64)
          for (let i = funcNameEnd; i < data.length - 10; i++) {
            // Look for: type_args_len(0) + args_len(1+) + first_arg_len(8) + u64 bytes
            if (data[i] === 0x00 && (data[i + 1] === 0x01 || data[i + 1] === 0x02) && data[i + 2] === 0x08) {
              // Read u64 little-endian starting at i+3
              appId = data[i + 3] |
                     (data[i + 4] << 8) |
                     (data[i + 5] << 16) |
                     (data[i + 6] << 24);
              console.log('Found app_id:', appId, 'at offset:', i + 3);
              break;
            }
          }
        }

        return {
          functionName: pattern,
          appId,
          label: appId !== undefined ? `${label} #${appId}` : label,
          icon,
        };
      }
    }

    console.log('No known pattern found in payload');
    return undefined;
  } catch (error) {
    console.error('Error decoding payload:', error);
    return undefined;
  }
}

// Lazy initialization to ensure env vars are loaded
let movementInstance: Movement | null = null;

function getMovementClient(): Movement {
  if (!movementInstance) {
    const fullnodeUrl = process.env.NEXT_PUBLIC_FULLNODE_URL;
    const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;

    if (!fullnodeUrl || !indexerUrl) {
      throw new Error('FULLNODE_URL and INDEXER_URL must be set in environment variables');
    }

    const config = new MovementConfig({
      network: Network.CUSTOM,
      fullnode: fullnodeUrl,
      indexer: indexerUrl,
    });

    movementInstance = new Movement(config);
  }
  return movementInstance;
}

// View functions
export async function getApp(appId: number): Promise<AppMetadata | null> {
  try {
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
    const result = await aptos.view({
      payload: {
        function: `0x1::multisig_account::get_transaction`,
        functionArguments: [MULTISIG_ADDRESS, sequenceNumber],
      },
    });

    const tx = result[0] as MultisigTransaction;

    // Process votes from SimpleMap to yes/no arrays
    const yesVotes: string[] = [];
    const noVotes: string[] = [];

    if (tx.votes?.data) {
      for (const vote of tx.votes.data) {
        if (vote.value === true) {
          yesVotes.push(vote.key);
        } else {
          noVotes.push(vote.key);
        }
      }
    }

    tx.yesVotes = yesVotes;
    tx.noVotes = noVotes;

    // Decode the payload to get action info
    console.log('Raw tx payload:', tx.payload);
    console.log('Raw tx payload_hash:', tx.payload_hash);
    tx.decodedAction = decodeMultisigPayload(tx.payload);

    console.log('Fetched tx:', sequenceNumber, 'votes:', tx.votes, 'yesVotes:', yesVotes, 'noVotes:', noVotes, 'action:', tx.decodedAction);

    return tx;
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
    const aptos = getMovementClient();
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
    const yesVoters = (tx.yesVotes || []).map((a: string) => normalizeAddress(a));
    const noVoters = (tx.noVotes || []).map((a: string) => normalizeAddress(a));

    return yesVoters.includes(normalizedAddress) || noVoters.includes(normalizedAddress);
  } catch (error) {
    console.error('Error checking vote status:', error);
    return false;
  }
}

export async function getOwners(): Promise<string[]> {
  try {
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();

    // Build the transaction
    const transaction = await aptos.transaction.build.simple({
      sender: account.address,
      data: {
        function: functionName,
        functionArguments: functionArguments,
      },
    });

    // Sign the transaction with the wallet (correct format for Movement adapter)
    const signResult = await signTransaction({ transactionOrPayload: transaction });

    // Submit the signed transaction
    const committedTransaction = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator: signResult.authenticator,
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
    const movement = getMovementClient();

    // Step 1: Generate the transaction payload that will be executed by the multisig
    // Using multisigAddress parameter creates a TransactionPayloadMultiSig
    const multisigPayload = await generateTransactionPayload({
      multisigAddress: MULTISIG_ADDRESS,
      function: functionName,
      functionArguments: functionArguments,
      movementConfig: movement.config,
    } as any);

    // Step 2: Extract the BCS-encoded payload bytes
    // The multiSig.transaction_payload contains the entry function to execute
    const payloadBytes = (multisigPayload as any).multiSig?.transaction_payload?.bcsToBytes();
    if (!payloadBytes) {
      throw new Error('Failed to generate payload bytes');
    }

    // Step 3: Call create_transaction with the payload bytes
    const transaction = await movement.transaction.build.simple({
      sender: account.address,
      data: {
        function: `0x1::multisig_account::create_transaction`,
        functionArguments: [
          MULTISIG_ADDRESS,
          Array.from(payloadBytes), // vector<u8>
        ],
      },
    });

    // Sign with correct format for Movement adapter
    const signResult = await signTransaction({ transactionOrPayload: transaction });

    const committedTransaction = await movement.transaction.submit.simple({
      transaction,
      senderAuthenticator: signResult.authenticator,
    });

    await movement.waitForTransaction({
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
// Builds and submits a multisig execution transaction
export async function executeMultisigTransaction(
  account: any,
  signTransaction: any,
  sequenceNumber: number
): Promise<string> {
  // First verify this is the next transaction to execute
  const lastResolved = await getLastResolvedSequenceNumber();
  const nextToExecute = lastResolved + 1;

  if (sequenceNumber !== nextToExecute) {
    throw new Error(
      `Cannot execute transaction #${sequenceNumber}. ` +
      `Transaction #${nextToExecute} must be executed first.`
    );
  }

  // Check if transaction has enough approvals
  const canExecute = await canExecuteMultisigTransaction(sequenceNumber);
  if (!canExecute) {
    const threshold = await getMultisigThreshold();
    const tx = await getMultisigTransaction(sequenceNumber);
    const currentApprovals = tx?.yesVotes?.length || 0;
    throw new Error(
      `Transaction #${sequenceNumber} needs ${threshold} approvals but only has ${currentApprovals}.`
    );
  }

  try {
    const movement = getMovementClient();
    const senderAddress = AccountAddress.from(account.address.toString());

    // Build a reference transaction to get proper gas settings
    const refTransaction = await movement.transaction.build.simple({
      sender: senderAddress,
      data: {
        function: `0x1::multisig_account::approve_transaction`,
        functionArguments: [MULTISIG_ADDRESS, sequenceNumber],
      },
    });

    // Build the multisig execution payload
    const multisigAddress = AccountAddress.from(MULTISIG_ADDRESS);
    const multisigPayload = new TransactionPayloadMultiSig(
      new MultiSig(multisigAddress)
    );

    // Get fresh account info
    const accountInfo = await movement.account.getAccountInfo({ accountAddress: senderAddress });
    const chainIdResult = await movement.getChainId();

    // Access the raw transaction properties
    const refRaw = refTransaction.rawTransaction;

    // Build a new raw transaction with the multisig payload
    const rawTxn = new RawTransaction(
      senderAddress,
      BigInt(accountInfo.sequence_number),
      multisigPayload,
      refRaw.max_gas_amount,
      refRaw.gas_unit_price,
      refRaw.expiration_timestamp_secs,
      new ChainId(chainIdResult)
    );

    // Create a proper SimpleTransaction-like object
    // Clone the reference transaction structure but replace the rawTransaction
    const transaction = Object.create(Object.getPrototypeOf(refTransaction));
    Object.assign(transaction, refTransaction);
    transaction.rawTransaction = rawTxn;

    // Sign using wallet adapter - note the expected argument format
    const signResult = await signTransaction({ transactionOrPayload: transaction });

    console.log('Sign result:', signResult);
    console.log('Raw transaction bytes length:', signResult.rawTransaction?.length);
    console.log('Authenticator:', signResult.authenticator);

    // The wallet adapter returns:
    // - rawTransaction: the raw transaction bytes (not signed)
    // - authenticator: the signature/authenticator
    // We need to combine them into a SignedTransaction

    // Deserialize the raw transaction bytes back to RawTransaction
    const deserializer = new Deserializer(signResult.rawTransaction);
    const deserializedRawTxn = RawTransaction.deserialize(deserializer);

    // Create a SignedTransaction combining raw transaction and authenticator
    const signedTxn = new SignedTransaction(deserializedRawTxn, signResult.authenticator);

    // Serialize the signed transaction to BCS bytes
    const signedTxnBytes = signedTxn.bcsToBytes();
    console.log('Signed transaction bytes length:', signedTxnBytes.length);

    // Submit using postBCSTransaction API
    const fullnodeUrl = process.env.NEXT_PUBLIC_FULLNODE_URL;
    if (!fullnodeUrl) {
      throw new Error('FULLNODE_URL not configured');
    }

    // Remove trailing /v1 if present to avoid double path
    const baseUrl = fullnodeUrl.replace(/\/v1\/?$/, '');

    // Submit the signed transaction bytes directly to the API
    // Create a new Uint8Array to ensure it's a proper ArrayBuffer
    const bodyBytes = new Uint8Array(signedTxnBytes);
    const response = await fetch(`${baseUrl}/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x.aptos.signed_transaction+bcs',
      },
      body: bodyBytes as unknown as BodyInit,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Submit error:', errorText);
      throw new Error(`Transaction submission failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Submit result:', result);

    // Wait for transaction
    await movement.waitForTransaction({
      transactionHash: result.hash,
    });

    console.log('Multisig transaction executed:', result.hash);
    return result.hash;
  } catch (error: any) {
    console.error('Error executing multisig transaction:', error);
    // Parse common errors
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('SEQUENCE_NUMBER')) {
      throw new Error('Transaction order error. Refresh and try again.');
    }
    if (errorMsg.includes('NOT_ENOUGH_APPROVALS')) {
      throw new Error('Not enough approvals to execute this transaction.');
    }
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
    const aptos = getMovementClient();
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
    const aptos = getMovementClient();
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
