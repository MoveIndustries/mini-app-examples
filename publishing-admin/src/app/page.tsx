'use client';

import { AdminManagement } from '@/components/AdminManagement';
import { AppCard } from '@/components/AppCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ToastContainer, showToast } from '@/components/Toast';
import { TreasuryManagement } from '@/components/TreasuryManagement';
import { WalletButton } from '@/components/WalletButton';
import {
  approveMultisigTransaction,
  canExecuteMultisigTransaction,
  executeMultisigTransaction,
  getAllApps,
  getMultisigOwners,
  getMultisigThreshold,
  getPendingChange,
  getPendingMultisigTransactions,
  getStats,
  hasPendingChange,
  isMultisigSigner,
  MultisigTransaction,
  proposeApproveApp,
  proposeApproveRejectedApp,
  proposeApproveUpdate,
  proposeRejectApp,
  proposeRevertToPending,
  rejectMultisigTransaction,
} from '@/lib/aptos';
import { AppMetadata, AppStatus } from '@/types/app';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useEffect, useState } from 'react';

type TabType = 'all' | 'pending' | 'approved' | 'rejected' | 'updates' | 'proposals';

export default function Dashboard() {
  const { account, signTransaction } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [apps, setApps] = useState<AppMetadata[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<Set<number>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<number, any>>(new Map());
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [processingApp, setProcessingApp] = useState<number | null>(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  // Multisig state
  const [multisigProposals, setMultisigProposals] = useState<MultisigTransaction[]>([]);
  const [multisigThreshold, setMultisigThreshold] = useState(0);
  const [multisigOwners, setMultisigOwners] = useState<string[]>([]);
  const [processingProposal, setProcessingProposal] = useState<number | null>(null);

  // Check if connected wallet is a multisig signer
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!account?.address) {
        setUserIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }
      setCheckingAdmin(true);
      try {
        const isSigner = await isMultisigSigner(account.address);
        setUserIsAdmin(isSigner);
        if (isSigner) {
          // Also fetch multisig info
          const [threshold, owners] = await Promise.all([
            getMultisigThreshold(),
            getMultisigOwners(),
          ]);
          setMultisigThreshold(threshold);
          setMultisigOwners(owners);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setUserIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    };
    checkAdminStatus();
  }, [account?.address]);

  useEffect(() => {
    // Only load data if user is logged in AND is an admin
    if (account?.address && userIsAdmin) {
      loadData();
    } else {
      setLoading(false);
      setApps([]);
      setStats({ total: 0, approved: 0, pending: 0 });
      setPendingUpdates(new Set());
      setPendingChanges(new Map());
    }
  }, [account?.address, userIsAdmin]); // Reload when wallet connects/disconnects or admin status changes

  const loadData = async () => {
    // Double-check admin status before making RPC calls
    if (!account?.address || !userIsAdmin) {
      return;
    }

    setLoading(true);
    try {
      const [allApps, registryStats, proposals] = await Promise.all([
        getAllApps(account.address),
        getStats(),
        getPendingMultisigTransactions(),
      ]);

      console.log('Loaded apps:', allApps);
      console.log('Apps count:', allApps.length);
      console.log('Stats:', registryStats);
      console.log('Pending multisig proposals:', proposals);

      allApps.forEach((app, index) => {
        console.log(`App ${index}:`, {
          name: app.name,
          status: app.status,
          developer: app.developer_address
        });
      });

      setApps(allApps);
      setStats(registryStats);
      setMultisigProposals(proposals);

      // Check for pending updates and fetch change details
      const updates = new Set<number>();
      const changes = new Map<number, any>();
      await Promise.all(
        allApps.map(async (app) => {
          if (app.app_id !== undefined) {
            const hasPending = await hasPendingChange(app.app_id);
            if (hasPending) {
              updates.add(app.app_id);
              const change = await getPendingChange(app.app_id);
              if (change) {
                changes.set(app.app_id, change);
              }
            }
          }
        })
      );
      setPendingUpdates(updates);
      setPendingChanges(changes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Propose approval (creates multisig proposal)
  const handleApprove = async (appId: number) => {
    if (!userIsAdmin || !account || !signTransaction) return;

    setProcessingApp(appId);
    try {
      const success = await proposeApproveApp(account, signTransaction, appId);
      if (success) {
        await loadData();
        showToast('Approval proposal created! Other signers need to approve.', 'success');
      } else {
        showToast('Failed to create approval proposal', 'error');
      }
    } catch (error) {
      console.error('Error creating approval proposal:', error);
      showToast('Error creating approval proposal', 'error');
    } finally {
      setProcessingApp(null);
    }
  };

  // Propose rejection (creates multisig proposal)
  const handleReject = async (appId: number, reason: string) => {
    if (!userIsAdmin || !account || !signTransaction) return;

    setProcessingApp(appId);
    try {
      const success = await proposeRejectApp(account, signTransaction, appId, reason);
      if (success) {
        await loadData();
        showToast('Rejection proposal created! Other signers need to approve.', 'success');
      } else {
        showToast('Failed to create rejection proposal', 'error');
      }
    } catch (error) {
      console.error('Error creating rejection proposal:', error);
      showToast('Error creating rejection proposal', 'error');
    } finally {
      setProcessingApp(null);
    }
  };

  // Propose update approval (creates multisig proposal)
  const handleApproveUpdate = async (appId: number) => {
    if (!userIsAdmin || !account || !signTransaction) return;

    setProcessingApp(appId);
    try {
      const success = await proposeApproveUpdate(account, signTransaction, appId);
      if (success) {
        await loadData();
        showToast('Update approval proposal created!', 'success');
      } else {
        showToast('Failed to create update approval proposal', 'error');
      }
    } catch (error) {
      console.error('Error creating update approval proposal:', error);
      showToast('Error creating update approval proposal', 'error');
    } finally {
      setProcessingApp(null);
    }
  };

  // Propose approval of rejected app (creates multisig proposal)
  const handleApproveRejected = async (appId: number) => {
    if (!userIsAdmin || !account || !signTransaction) return;

    setProcessingApp(appId);
    try {
      const success = await proposeApproveRejectedApp(account, signTransaction, appId);
      if (success) {
        await loadData();
        showToast('Approval proposal for rejected app created!', 'success');
      } else {
        showToast('Failed to create approval proposal', 'error');
      }
    } catch (error) {
      console.error('Error creating approval proposal:', error);
      showToast('Error creating approval proposal', 'error');
    } finally {
      setProcessingApp(null);
    }
  };

  // Propose revert to pending (creates multisig proposal)
  const handleRevertToPending = async (appId: number) => {
    if (!userIsAdmin || !account || !signTransaction) return;

    setProcessingApp(appId);
    try {
      const success = await proposeRevertToPending(account, signTransaction, appId);
      if (success) {
        await loadData();
        showToast('Revert to pending proposal created!', 'success');
      } else {
        showToast('Failed to create revert proposal', 'error');
      }
    } catch (error) {
      console.error('Error creating revert proposal:', error);
      showToast('Error creating revert proposal', 'error');
    } finally {
      setProcessingApp(null);
    }
  };

  // Approve a pending multisig proposal
  const handleApproveProposal = async (sequenceNumber: number) => {
    if (!userIsAdmin || !account || !signTransaction) return;

    setProcessingProposal(sequenceNumber);
    try {
      const success = await approveMultisigTransaction(account, signTransaction, sequenceNumber);
      if (success) {
        await loadData();
        showToast('Proposal approved!', 'success');
      } else {
        showToast('Failed to approve proposal', 'error');
      }
    } catch (error) {
      console.error('Error approving proposal:', error);
      showToast('Error approving proposal', 'error');
    } finally {
      setProcessingProposal(null);
    }
  };

  // Reject a pending multisig proposal
  const handleRejectProposal = async (sequenceNumber: number) => {
    if (!userIsAdmin || !account || !signTransaction) return;

    setProcessingProposal(sequenceNumber);
    try {
      const success = await rejectMultisigTransaction(account, signTransaction, sequenceNumber);
      if (success) {
        await loadData();
        showToast('Proposal rejected!', 'success');
      } else {
        showToast('Failed to reject proposal', 'error');
      }
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      showToast('Error rejecting proposal', 'error');
    } finally {
      setProcessingProposal(null);
    }
  };

  // Execute an approved multisig proposal
  const handleExecuteProposal = async () => {
    if (!userIsAdmin || !account || !signTransaction) return;

    setProcessingProposal(-1); // Use -1 to indicate execution in progress
    try {
      const success = await executeMultisigTransaction(account, signTransaction);
      if (success) {
        await loadData();
        showToast('Proposal executed successfully!', 'success');
      } else {
        showToast('Failed to execute proposal', 'error');
      }
    } catch (error) {
      console.error('Error executing proposal:', error);
      showToast('Error executing proposal', 'error');
    } finally {
      setProcessingProposal(null);
    }
  };

  const filteredApps = apps.filter((app) => {
    let shouldInclude = false;
    switch (activeTab) {
      case 'pending':
        shouldInclude = app.status === AppStatus.PENDING;
        console.log(`App ${app.name}: status=${app.status}, PENDING=${AppStatus.PENDING}, included=${shouldInclude}`);
        return shouldInclude;
      case 'approved':
        shouldInclude = app.status === AppStatus.APPROVED;
        return shouldInclude;
      case 'rejected':
        shouldInclude = app.status === AppStatus.REJECTED;
        return shouldInclude;
      case 'updates':
        shouldInclude = app.app_id !== undefined && pendingUpdates.has(app.app_id);
        return shouldInclude;
      case 'all':
      default:
        return true;
    }
  });

  console.log(`Active tab: ${activeTab}, Total apps: ${apps.length}, Filtered: ${filteredApps.length}`);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'proposals', label: 'Proposals', count: multisigProposals.length },
    { key: 'all', label: 'All Apps', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'approved', label: 'Approved', count: stats.approved },
    { key: 'rejected', label: 'Rejected', count: stats.total - stats.approved - stats.pending },
    { key: 'updates', label: 'Updates', count: pendingUpdates.size },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <ToastContainer />
      {/* Clean Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Movement Publishing Admin
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Multisig governance for mini app submissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <WalletButton />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!account ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect your admin wallet to access the dashboard
            </p>
            <div className="max-w-md mx-auto mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                ⚠️ Important: Configure Your Wallet
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                Make sure your wallet is configured for <strong>Movement Network Mainnet</strong> before connecting.
              </p>
            </div>
          </div>
        ) : checkingAdmin ? (
          <div className="text-center py-20">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">Checking admin status...</p>
          </div>
        ) : !userIsAdmin ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔐</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Not a Multisig Signer
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Your wallet is not a signer of the admin multisig.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 font-mono mb-4">
              {account.address}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Contact an existing multisig signer to be added.
            </p>
          </div>
        ) : (
          <>
            {/* Admin Management */}
            <AdminManagement
              account={account}
              signTransaction={signTransaction}
              currentUserAddress={account.address}
              isAdmin={userIsAdmin}
            />

            {/* Treasury & Fee Management */}
            <TreasuryManagement
              account={account}
              signTransaction={signTransaction}
              isAdmin={userIsAdmin}
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <StatCard label="Proposals" value={multisigProposals.length} icon="📋" color="blue" />
              <StatCard label="Total Apps" value={stats.total} icon="📱" />
              <StatCard label="Pending Review" value={stats.pending} icon="⏳" color="orange" />
              <StatCard label="Approved" value={stats.approved} icon="✅" color="green" />
              <StatCard label="Updates" value={pendingUpdates.size} icon="🔄" color="blue" />
            </div>

            {/* Clean Tabs */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 mb-6 overflow-hidden">
              <nav className="flex overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                      ${activeTab === tab.key
                        ? 'border-guild-green-500 text-guild-green-600 dark:text-guild-green-400 bg-guild-green-50 dark:bg-guild-green-950'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                      }
                    `}
                  >
                    <span className="flex items-center gap-2">
                      {tab.label}
                      {tab.count !== undefined && (
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${activeTab === tab.key
                            ? 'bg-guild-green-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                          {tab.count}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content based on active tab */}
            {loading ? (
              <div className="text-center py-20">
                <div className="animate-spin text-4xl mb-4">⏳</div>
                <p className="text-gray-600 dark:text-gray-400">Loading...</p>
              </div>
            ) : activeTab === 'proposals' ? (
              /* Multisig Proposals Tab */
              multisigProposals.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No pending proposals
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Create proposals by reviewing apps in the other tabs
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Multisig Info Banner */}
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">🔐</div>
                      <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                          Multisig Governance
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          {multisigThreshold} of {multisigOwners.length} signatures required to execute proposals
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Proposals List */}
                  <div className="grid grid-cols-1 gap-4">
                    {multisigProposals.map((proposal) => (
                      <ProposalCard
                        key={proposal.sequence_number}
                        proposal={proposal}
                        threshold={multisigThreshold}
                        currentUserAddress={account?.address || ''}
                        onApprove={() => handleApproveProposal(Number(proposal.sequence_number))}
                        onReject={() => handleRejectProposal(Number(proposal.sequence_number))}
                        onExecute={handleExecuteProposal}
                        isProcessing={processingProposal === Number(proposal.sequence_number) || processingProposal === -1}
                      />
                    ))}
                  </div>
                </div>
              )
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No apps found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {activeTab === 'pending'
                    ? 'No apps pending review'
                    : activeTab === 'updates'
                      ? 'No pending updates'
                      : 'No apps in this category'}
                </p>
              </div>
            ) : (
              /* Apps Grid */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredApps.map((app) => (
                  <AppCard
                    key={app.app_id ?? app.developer_address}
                    app={app}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onApproveUpdate={handleApproveUpdate}
                    onApproveRejected={handleApproveRejected}
                    onRevertToPending={handleRevertToPending}
                    hasPendingUpdate={app.app_id !== undefined && pendingUpdates.has(app.app_id)}
                    pendingChange={app.app_id !== undefined ? pendingChanges.get(app.app_id) : null}
                    isAdmin={userIsAdmin}
                    isProcessing={app.app_id !== undefined && processingApp === app.app_id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color = 'gray',
}: {
  label: string;
  value: number;
  icon: string;
  color?: 'gray' | 'orange' | 'green' | 'blue';
}) {
  const colorClasses = {
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      border: 'border-gray-200 dark:border-gray-700',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-950',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    },
  };

  const styles = colorClasses[color];

  return (
    <div className={`rounded-lg p-5 border ${styles.bg} ${styles.text} ${styles.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-3xl opacity-70">{icon}</div>
      </div>
    </div>
  );
}

// Proposal Card Component for Multisig Proposals
function ProposalCard({
  proposal,
  threshold,
  currentUserAddress,
  onApprove,
  onReject,
  onExecute,
  isProcessing,
}: {
  proposal: MultisigTransaction;
  threshold: number;
  currentUserAddress: string;
  onApprove: () => void;
  onReject: () => void;
  onExecute: () => void;
  isProcessing: boolean;
}) {
  const yesVotes = proposal.votes?.yes?.length || 0;
  const noVotes = proposal.votes?.no?.length || 0;
  const canExecute = yesVotes >= threshold;

  // Parse the function name from the payload
  const functionName = proposal.payload?.function || 'Unknown Function';
  const functionParts = functionName.split('::');
  const shortFunctionName = functionParts.length >= 3 ? functionParts[2] : functionName;

  // Determine action type for display
  const getActionLabel = (funcName: string) => {
    if (funcName.includes('approve_app')) return { label: 'Approve App', color: 'green', icon: '✅' };
    if (funcName.includes('reject_app')) return { label: 'Reject App', color: 'red', icon: '❌' };
    if (funcName.includes('approve_update')) return { label: 'Approve Update', color: 'blue', icon: '🔄' };
    if (funcName.includes('approve_rejected')) return { label: 'Approve Rejected App', color: 'green', icon: '♻️' };
    if (funcName.includes('revert_to_pending')) return { label: 'Revert to Pending', color: 'orange', icon: '⏪' };
    if (funcName.includes('add_owner')) return { label: 'Add Admin', color: 'purple', icon: '👤' };
    if (funcName.includes('remove_owner')) return { label: 'Remove Admin', color: 'red', icon: '🚫' };
    if (funcName.includes('update_treasury')) return { label: 'Update Treasury', color: 'yellow', icon: '💰' };
    if (funcName.includes('update_submit_fee')) return { label: 'Update Fee', color: 'yellow', icon: '💵' };
    return { label: shortFunctionName, color: 'gray', icon: '📝' };
  };

  const actionInfo = getActionLabel(functionName);

  // Check if current user has already voted
  const normalizeAddr = (addr: string) => addr.toLowerCase().replace(/^0x0*/, '0x');
  const normalizedCurrentUser = normalizeAddr(currentUserAddress);
  const hasVotedYes = proposal.votes?.yes?.some(v => normalizeAddr(v) === normalizedCurrentUser) || false;
  const hasVotedNo = proposal.votes?.no?.some(v => normalizeAddr(v) === normalizedCurrentUser) || false;
  const hasVoted = hasVotedYes || hasVotedNo;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{actionInfo.icon}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {actionInfo.label}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Proposal #{proposal.sequence_number}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          canExecute
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
        }`}>
          {canExecute ? 'Ready to Execute' : `${yesVotes}/${threshold} Approvals`}
        </div>
      </div>

      {/* Arguments */}
      {proposal.payload?.arguments && proposal.payload.arguments.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Arguments:</p>
          <div className="space-y-1">
            {proposal.payload.arguments.map((arg, i) => (
              <code key={i} className="block text-xs text-gray-700 dark:text-gray-300 font-mono break-all">
                {arg}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Votes */}
      <div className="mb-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 dark:text-green-400">
            ✓ {yesVotes} approved
          </span>
          <span className="text-red-600 dark:text-red-400">
            ✗ {noVotes} rejected
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${Math.min((yesVotes / threshold) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Creator and time */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        <p>Created by: {proposal.creator?.slice(0, 8)}...{proposal.creator?.slice(-6)}</p>
        <p>Created: {new Date(Number(proposal.creation_time_secs) * 1000).toLocaleString()}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        {hasVoted ? (
          <div className="flex-1 text-center py-2 text-sm text-gray-500 dark:text-gray-400">
            {hasVotedYes ? '✓ You approved this proposal' : '✗ You rejected this proposal'}
          </div>
        ) : (
          <>
            <button
              onClick={onReject}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Reject'}
            </button>
            <button
              onClick={onApprove}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Approve'}
            </button>
          </>
        )}
        {canExecute && (
          <button
            onClick={onExecute}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Executing...' : 'Execute'}
          </button>
        )}
      </div>
    </div>
  );
}
