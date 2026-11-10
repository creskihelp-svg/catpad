import React, { useState, useEffect } from 'react';
import { Charity, Launch, Donation, AdminSession } from '../types.ts';
import { useToast } from '../context/ToastContext.tsx';
import { 
  ShieldCheck, 
  Lock, 
  Plus, 
  Edit3, 
  Trash2, 
  Flame, 
  AlertTriangle, 
  CheckCircle, 
  Coins, 
  Eye, 
  ExternalLink,
  LogOut,
  RefreshCw,
  X
} from 'lucide-react';

interface AdminPageProps {
  charities: Charity[];
  launches: Launch[];
  donations: Donation[];
  onRefreshData: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  charities,
  launches,
  donations,
  onRefreshData,
}) => {
  const { toast } = useToast();

  const [adminToken, setAdminToken] = useState<string>(() => {
    return localStorage.getItem('catpad_admin_token') || '';
  });
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Sub-tab
  const [adminTab, setAdminTab] = useState<'charities' | 'launches' | 'donations' | 'failures'>('charities');

  // Audit failures from server
  const [failures, setFailures] = useState<Array<{ id: string; type: string; details: string; timestamp: string }>>([]);

  // Charity Add/Edit Modal
  const [showCharityModal, setShowCharityModal] = useState(false);
  const [editingCharity, setEditingCharity] = useState<Charity | null>(null);
  const [charityForm, setCharityForm] = useState({
    name: '',
    ein_tax_id: '',
    website: '',
    wallet_address: '',
    description: '',
    avatar_url: '',
  });
  const [charityFormError, setCharityFormError] = useState('');

  // Fetch failure audit logs if authenticated
  useEffect(() => {
    if (!adminToken) return;
    fetch('/api/admin/failures', {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.failures) setFailures(data.failures);
      })
      .catch(() => {});
  }, [adminToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      setAdminToken(data.token);
      localStorage.setItem('catpad_admin_token', data.token);
      onRefreshData();
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAdminToken('');
    localStorage.removeItem('catpad_admin_token');
  };

  // Toggle Featured status
  const toggleFeatured = async (mint: string) => {
    try {
      const res = await fetch(`/api/admin/launches/${mint}/toggle-featured`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        onRefreshData();
      } else {
        const d = await res.json();
        toast(d.error || 'Server error', 'error');
      }
    } catch (err) {
      toast('Failed to toggle featured status', 'error');
    }
  };

  // Toggle Charity Verification
  const toggleCharityVerification = async (charity: Charity) => {
    try {
      const res = await fetch(`/api/admin/charities/${charity.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ is_verified: !charity.is_verified }),
      });
      if (res.ok) {
        onRefreshData();
      } else {
        const d = await res.json();
        toast(d.error || 'Server error', 'error');
      }
    } catch (err) {
      toast('Failed to update charity verification', 'error');
    }
  };

  // Delete Charity
  const deleteCharity = async (id: string) => {
    if (!confirm('Are you sure you want to remove this charity?')) return;
    try {
      const res = await fetch(`/api/admin/charities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        onRefreshData();
      } else {
        const d = await res.json();
        toast(d.error || 'Server error', 'error');
      }
    } catch (err) {
      toast('Failed to delete charity', 'error');
    }
  };

  // Save Charity (Create or Update)
  const handleSaveCharity = async (e: React.FormEvent) => {
    e.preventDefault();
    setCharityFormError('');

    if (!charityForm.name || !charityForm.website || !charityForm.wallet_address || !charityForm.description) {
      setCharityFormError('Please fill in all mandatory fields');
      return;
    }

    try {
      const endpoint = editingCharity
        ? `/api/admin/charities/${editingCharity.id}`
        : '/api/admin/charities';
      const method = editingCharity ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(charityForm),
      });

      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to save charity');

      setShowCharityModal(false);
      setEditingCharity(null);
      setCharityForm({
        name: '',
        ein_tax_id: '',
        website: '',
        wallet_address: '',
        description: '',
        avatar_url: '',
      });
      onRefreshData();
    } catch (err: any) {
      setCharityFormError(err.message || 'Error saving charity');
    }
  };

  const openAddCharity = () => {
    setEditingCharity(null);
    setCharityForm({
      name: '',
      ein_tax_id: '',
      website: '',
      wallet_address: '',
      description: '',
      avatar_url: '',
    });
    setCharityFormError('');
    setShowCharityModal(true);
  };

  const openEditCharity = (c: Charity) => {
    setEditingCharity(c);
    setCharityForm({
      name: c.name,
      ein_tax_id: c.ein_tax_id || '',
      website: c.website,
      wallet_address: c.wallet_address,
      description: c.description,
      avatar_url: c.avatar_url,
    });
    setCharityFormError('');
    setShowCharityModal(true);
  };

  // IF NOT AUTHENTICATED: SHOW SECURE LOGIN
  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-xl bg-card border border-line text-left shadow-2xl animate-fadeIn">
        <div className="w-12 h-12 rounded-lg bg-accent/10 border border-accent/40 flex items-center justify-center text-accent mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-semibold text-white">CatPad Admin Portal</h2>
        <p className="text-xs text-muted mt-1 mb-6">
          Server-side role checked administration. Manage charities, view launches, and monitor on-chain donations.
        </p>

        {loginError && (
          <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/40 text-accent text-xs">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">
              Admin Email / Identifier
            </label>
            <input
              type="text"
              placeholder="admin@catpad.fun"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line-strong text-sm text-white placeholder:text-muted focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted block mb-1">
              Admin Passphrase / Secret Key
            </label>
            <input
              type="password"
              placeholder="Enter admin secret key"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line-strong text-sm text-white placeholder:text-muted focus:border-accent outline-none font-mono"
            />
          </div>

          {import.meta.env.DEV && (
            <div className="p-3 rounded-xl bg-black border border-line text-[11px] text-muted leading-relaxed font-mono">
              Default dev secret: <code className="text-accent">catpad-admin-key-2026</code>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold text-sm  transition disabled:opacity-50 cursor-pointer"
          >
            {isLoggingIn ? 'Verifying with Server...' : 'Access Admin Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  const totalDonationAmount = donations.reduce((sum, d) => sum + Number(d.amount_sol), 0);

  return (
    <div className="space-y-8 text-left animate-fadeIn">
      {/* Header & Logout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl bg-card border border-line">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold text-white">CatPad Admin Dashboard</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono border border-accent/40 font-bold">
              Server-Role Verified
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Manage partner charities, feature memecoins, review donation records, and inspect audit failures.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshData}
            className="p-2 rounded-xl bg-surface hover:bg-card-hover text-muted hover:text-white transition"
            title="Refresh Server State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent border border-accent/40 text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-card border border-line">
          <span className="text-muted text-xs block font-mono">TOTAL DONATIONS</span>
          <span className="text-xl font-bold font-mono text-accent">{totalDonationAmount.toFixed(2)} SOL</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-line">
          <span className="text-muted text-xs block font-mono">TOKEN LAUNCHES</span>
          <span className="text-xl font-bold font-mono text-accent">{launches.length} Tokens</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-line">
          <span className="text-muted text-xs block font-mono">CHARITIES LISTED</span>
          <span className="text-xl font-bold font-mono text-accent">{charities.length} Non-Profits</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-line">
          <span className="text-muted text-xs block font-mono">AUDIT FAILURES</span>
          <span className="text-xl font-bold font-mono text-accent">{failures.length} Records</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 text-xs font-bold">
        <button
          onClick={() => setAdminTab('charities')}
          className={`pb-3 transition ${
            adminTab === 'charities' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-white'
          }`}
        >
          Charities ({charities.length})
        </button>
        <button
          onClick={() => setAdminTab('launches')}
          className={`pb-3 transition ${
            adminTab === 'launches' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-white'
          }`}
        >
          Launches ({launches.length})
        </button>
        <button
          onClick={() => setAdminTab('donations')}
          className={`pb-3 transition ${
            adminTab === 'donations' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-white'
          }`}
        >
          Donations ({donations.length})
        </button>
        <button
          onClick={() => setAdminTab('failures')}
          className={`pb-3 transition ${
            adminTab === 'failures' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-white'
          }`}
        >
          Failures Log ({failures.length})
        </button>
      </div>

      {/* TAB 1: CHARITIES MANAGEMENT */}
      {adminTab === 'charities' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Registered Rescues</h3>
            <button
              onClick={openAddCharity}
              className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>Add New Charity</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface text-muted uppercase font-mono border-b border-line">
                <tr>
                  <th className="py-3 px-4">Charity</th>
                  <th className="py-3 px-4">Solana Wallet</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Total Raised</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {charities.map((c) => (
                  <tr key={c.id} className="hover:bg-card-hover transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <img src={c.avatar_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <span className="font-bold text-white block">{c.name}</span>
                          <span className="text-[10px] text-muted">{c.ein_tax_id ? `EIN: ${c.ein_tax_id}` : c.website}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted">
                      {c.wallet_address.slice(0, 6)}...{c.wallet_address.slice(-6)}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleCharityVerification(c)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          c.is_verified
                            ? 'bg-accent/10 text-accent border border-accent/40'
                            : 'bg-surface text-muted'
                        }`}
                      >
                        {c.is_verified ? 'Verified' : 'Unverified'}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-accent">
                      {Number(c.total_donations_sol).toFixed(2)} SOL
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditCharity(c)}
                        className="p-1.5 rounded-lg bg-surface hover:bg-card-hover text-muted hover:text-white"
                        title="Edit Charity"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCharity(c.id)}
                        className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent"
                        title="Delete Charity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LAUNCHES MANAGEMENT */}
      {adminTab === 'launches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Launched Memecoins</h3>
            <span className="text-xs text-muted font-mono">{launches.length} tokens active</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface text-muted uppercase font-mono border-b border-line">
                <tr>
                  <th className="py-3 px-4">Token</th>
                  <th className="py-3 px-4">Mint Address</th>
                  <th className="py-3 px-4">Charity Share</th>
                  <th className="py-3 px-4">Bonding Curve</th>
                  <th className="py-3 px-4">Featured</th>
                  <th className="py-3 px-4 text-right">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {launches.map((l) => (
                  <tr key={l.id} className="hover:bg-card-hover transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <img src={l.image_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                        <div>
                          <span className="font-bold text-white block">{l.name}</span>
                          <span className="text-[10px] font-mono text-accent">${l.symbol}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-muted">
                      {l.mint.slice(0, 6)}...{l.mint.slice(-6)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-accent">
                      {l.donation_bps / 100}% ({l.donation_bps} BPS)
                    </td>
                    <td className="py-3 px-4 font-mono text-muted">
                      {l.bonding_curve_progress.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleFeatured(l.mint)}
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 ${
                          l.is_featured
                            ? 'bg-accent/10 text-accent border border-accent/40'
                            : 'bg-surface text-muted'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>{l.is_featured ? 'Featured' : 'Standard'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`https://pump.fun/coin/${l.mint}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline flex items-center justify-end space-x-1 font-mono"
                      >
                        <span>pump.fun</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DONATIONS RECORD */}
      {adminTab === 'donations' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">On-Chain Donation Records</h3>
          <div className="overflow-x-auto rounded-lg border border-line bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface text-muted uppercase font-mono border-b border-line">
                <tr>
                  <th className="py-3 px-4">Charity Beneficiary</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Tx Signature</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {donations.map((d) => {
                  const charity = charities.find((c) => c.id === d.charity_id);
                  return (
                    <tr key={d.id} className="hover:bg-card-hover transition">
                      <td className="py-3 px-4 font-bold text-white">
                        {charity?.name || 'Charity Wallet'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-accent">
                        {Number(d.amount_sol).toFixed(3)} SOL
                      </td>
                      <td className="py-3 px-4 capitalize font-mono text-muted">
                        {d.distribution_type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted truncate max-w-[150px]">
                        {d.tx_signature}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-mono">
                          Confirmed
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT FAILURES */}
      {adminTab === 'failures' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-accent" />
              <span>Failed Transaction Audit Log</span>
            </h3>
            <span className="text-xs text-muted font-mono">{failures.length} recorded</span>
          </div>

          {failures.length > 0 ? (
            <div className="space-y-2">
              {failures.map((f) => (
                <div key={f.id} className="p-3.5 rounded-xl bg-card border border-accent/40 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-accent font-bold">
                    <span>{f.type}</span>
                    <span className="text-muted text-[10px]">{new Date(f.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-muted">{f.details}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center rounded-lg bg-surface border border-line text-muted text-xs">
              Zero transaction verification failures recorded. All on-chain calls healthy.
            </div>
          )}
        </div>
      )}

      {/* CHARITY ADD/EDIT MODAL */}
      {showCharityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-card border border-line-strong rounded-xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowCharityModal(false)}
              className="absolute top-5 right-5 p-2 text-muted hover:text-white rounded-xl hover:bg-card-hover transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-4">
              {editingCharity ? 'Edit Charity' : 'Add Verified Feline Charity'}
            </h3>

            {charityFormError && (
              <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/40 text-accent text-xs">
                {charityFormError}
              </div>
            )}

            <form onSubmit={handleSaveCharity} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-muted block mb-1">Charity Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Austin Pets Alive!"
                  value={charityForm.name}
                  onChange={(e) => setCharityForm({ ...charityForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-muted block mb-1">501(c)(3) EIN Tax ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 12-3456789"
                    value={charityForm.ein_tax_id}
                    onChange={(e) => setCharityForm({ ...charityForm, ein_tax_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-white outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted block mb-1">Official Website *</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={charityForm.website}
                    onChange={(e) => setCharityForm({ ...charityForm, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-muted block mb-1">Solana Receiving Wallet Address *</label>
                <input
                  type="text"
                  placeholder="Public key (Base58)..."
                  value={charityForm.wallet_address}
                  onChange={(e) => setCharityForm({ ...charityForm, wallet_address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-muted block mb-1">Mission / Description *</label>
                <textarea
                  rows={3}
                  placeholder="Describe rescue work, medical programs, TNR..."
                  value={charityForm.description}
                  onChange={(e) => setCharityForm({ ...charityForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-white outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-muted block mb-1">Avatar / Logo URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={charityForm.avatar_url}
                  onChange={(e) => setCharityForm({ ...charityForm, avatar_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-white outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCharityModal(false)}
                  className="px-4 py-2 rounded-xl bg-surface text-muted text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-black font-bold text-xs"
                >
                  {editingCharity ? 'Save Changes' : 'Create Charity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
