import React, { useState, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { AdminAction, Charity, Launch, Donation, SiteBanner } from '../types.ts';
import { useToast } from '../context/ToastContext.tsx';
import { AnnouncementBanner } from '../components/AnnouncementBanner.tsx';
import { 
  ShieldCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Flame, 
  AlertTriangle, 
  Check,
  CheckCircle, 
  Coins, 
  Eye, 
  ExternalLink,
  Link2,
  LogOut,
  RefreshCw,
  EyeOff,
  History,
  Megaphone,
  X
} from 'lucide-react';

const isValidSolanaCa = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    new PublicKey(trimmed);
    return true;
  } catch {
    return false;
  }
};

const isValidHttpUrl = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

interface AdminPageProps {
  charities: Charity[];
  launches: Launch[];
  donations: Donation[];
  banner?: SiteBanner;
  onBannerUpdated?: (banner: SiteBanner) => void;
  adminToken: string;
  onAdminTokenChange: (token: string) => void;
  onRefreshData: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  charities,
  launches,
  donations,
  banner,
  onBannerUpdated,
  adminToken,
  onAdminTokenChange,
  onRefreshData,
}) => {
  const { toast } = useToast();

  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    if (adminToken) return;
    fetch('/api/admin/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.setupRequired === 'boolean') {
          setSetupRequired(data.setupRequired);
        }
      })
      .catch(() => {});
  }, [adminToken]);

  // Active Admin Sub-tab
  const [adminTab, setAdminTab] = useState<'charities' | 'launches' | 'donations' | 'banner' | 'failures' | 'audit'>('charities');

  // Top Announcement Banner & CA state
  const [bannerForm, setBannerForm] = useState<SiteBanner>({
    text: banner?.text ?? 'CA dropping soon',
    ca_address: banner?.ca_address ?? '',
    ca_url: banner?.ca_url ?? '',
    enabled: banner?.enabled ?? true,
  });
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  useEffect(() => {
    if (banner) {
      setBannerForm({
        text: banner.text,
        ca_address: banner.ca_address ?? '',
        ca_url: banner.ca_url ?? '',
        enabled: banner.enabled,
      });
    }
  }, [banner]);

  // Audit failures from server
  const [failures, setFailures] = useState<Array<{ id: string; type: string; details: string; timestamp: string }>>([]);

  // Admin activity log, and every launch including hidden ones
  const [auditActions, setAuditActions] = useState<AdminAction[]>([]);
  const [adminLaunches, setAdminLaunches] = useState<Launch[] | null>(null);

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

  // Load the admin-only launch list (hidden coins included) and the audit trail.
  useEffect(() => {
    if (!adminToken) return;
    const headers = { Authorization: `Bearer ${adminToken}` };
    fetch('/api/admin/audit', { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.actions)) setAuditActions(data.actions);
      })
      .catch(() => {});

    fetch('/api/admin/launches', { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.launches)) setAdminLaunches(data.launches);
      })
      .catch(() => {});
  }, [adminToken, launches]);

  const readJsonSafe = async (res: Response): Promise<Record<string, any> | null> => {
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as Record<string, any>;
    } catch {
      return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const endpoint = setupRequired ? '/api/admin/setup' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: adminIdentifier, password: adminPassword }),
      });
      const data = await readJsonSafe(res);
      if (!data) {
        throw new Error(`Unexpected response from auth server (${res.status}). Make sure the backend API is running.`);
      }
      if (data.setupRequired) {
        setSetupRequired(true);
      }
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      setAdminPassword('');
      setSetupRequired(false);
      onAdminTokenChange(data.token);
      onRefreshData();
      if (setupRequired) {
        toast('Admin access claimed and signed in', 'success');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    onAdminTokenChange('');
  };

  /** Expired or forged sessions drop the token instead of looping on errors. */
  const handleUnauthorized = (status: number) => {
    if (status === 401 || status === 403) {
      handleLogout();
      toast('Your admin session ended. Please sign in again.', 'error');
      return true;
    }
    return false;
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
      } else if (!handleUnauthorized(res.status)) {
        const d = await res.json();
        toast(d.error || 'Server error', 'error');
      }
    } catch (err) {
      toast('Failed to toggle featured status', 'error');
    }
  };

  // Hide a coin from the public directory (or restore it)
  const toggleUnlisted = async (launch: Launch) => {
    try {
      const res = await fetch(`/api/admin/launches/${launch.mint}/unlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ unlisted: !launch.is_unlisted }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdminLaunches((prev) =>
          prev ? prev.map((l) => (l.mint === launch.mint ? { ...l, is_unlisted: data.is_unlisted } : l)) : prev,
        );
        onRefreshData();
        toast(data.is_unlisted ? 'Coin hidden from the directory' : 'Coin restored to the directory', 'success');
      } else if (!handleUnauthorized(res.status)) {
        const d = await res.json();
        toast(d.error || 'Server error', 'error');
      }
    } catch (err) {
      toast('Failed to update the launch visibility', 'error');
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
      } else if (!handleUnauthorized(res.status)) {
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
      } else if (!handleUnauthorized(res.status)) {
        const d = await res.json();
        toast(d.error || 'Server error', 'error');
      }
    } catch (err) {
      toast('Failed to delete charity', 'error');
    }
  };

  // Save Announcement Banner & Linked CA
  const saveBannerPayload = async (payload: SiteBanner, successMessage: string) => {
    const trimmedCa = (payload.ca_address ?? '').trim();
    const trimmedUrl = (payload.ca_url ?? '').trim();

    if (trimmedCa && !isValidSolanaCa(trimmedCa)) {
      toast('Enter a valid Solana contract address (CA)', 'error');
      return;
    }
    if (trimmedUrl && !isValidHttpUrl(trimmedUrl)) {
      toast('CA link URL must start with https:// or http://', 'error');
      return;
    }

    setIsSavingBanner(true);
    try {
      const res = await fetch('/api/admin/banner', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...payload,
          ca_address: trimmedCa,
          ca_url: trimmedUrl,
        }),
      });
      const data = await readJsonSafe(res);
      if (!res.ok) {
        if (!handleUnauthorized(res.status)) {
          toast(data?.error || `Could not update banner (${res.status})`, 'error');
        }
        return;
      }
      if (data?.banner) {
        setBannerForm({
          text: data.banner.text,
          ca_address: data.banner.ca_address ?? '',
          ca_url: data.banner.ca_url ?? '',
          enabled: data.banner.enabled,
        });
        onBannerUpdated?.(data.banner);
      }
      onRefreshData();
      toast(successMessage, 'success');
    } catch {
      toast('Failed to save announcement banner', 'error');
    } finally {
      setIsSavingBanner(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveBannerPayload(bannerForm, 'Banner & CA link updated');
  };

  const handleLinkLaunchCa = async (launch: Launch) => {
    const nextText =
      !bannerForm.text.trim() || bannerForm.text.trim().toLowerCase() === 'ca dropping soon'
        ? `Official $${launch.symbol} CA is live`
        : bannerForm.text.trim();
    await saveBannerPayload(
      {
        text: nextText,
        ca_address: launch.mint,
        ca_url: `https://pump.fun/coin/${launch.mint}`,
        enabled: true,
      },
      `Linked $${launch.symbol} CA to top banner`,
    );
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

      const d = await readJsonSafe(res);
      if (!res.ok) {
        if (handleUnauthorized(res.status)) {
          setShowCharityModal(false);
          return;
        }
        throw new Error(d?.error || `Failed to save charity (${res.status})`);
      }

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

        <h2 className="text-2xl font-semibold text-ink">
          {setupRequired ? 'Claim Admin Access' : 'CatPad Admin Portal'}
        </h2>
        <p className="text-xs text-muted mt-1 mb-6">
          {setupRequired
            ? 'No environment secrets are set on this host yet. Set your initial admin username and password once to lock and activate the portal.'
            : 'Server-side role checked administration. Add shelters, view launches, edit the banner, and monitor donations.'}
        </p>

        {loginError && (
          <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/40 text-accent text-xs">
            {loginError}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">
              Admin Identifier
            </label>
            <input
              type="text"
              required
              minLength={setupRequired ? 3 : 1}
              placeholder="Enter admin identifier"
              autoComplete="username"
              value={adminIdentifier}
              onChange={(e) => setAdminIdentifier(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line-strong text-sm text-ink placeholder:text-muted focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted block mb-1">
              Admin Password
            </label>
            <input
              type="password"
              required
              minLength={setupRequired ? 8 : 1}
              autoComplete={setupRequired ? 'new-password' : 'current-password'}
              placeholder={setupRequired ? 'Choose password (min 8 chars)' : 'Enter admin password'}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line-strong text-sm text-ink placeholder:text-muted focus:border-accent outline-none font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-page border border-line text-[11px] text-muted leading-relaxed">
            {setupRequired ? (
              <>
                Plug-and-play setup: your password is salted &amp; hashed on the server and locks once claimed. Set{' '}
                <code className="font-mono text-ink">ADMIN_USERNAME</code> and{' '}
                <code className="font-mono text-ink">ADMIN_SECRET_KEY</code> in env/Secrets anytime to override.
              </>
            ) : (
              <>
                Sessions stay in memory for 8 hours. Set{' '}
                <code className="font-mono text-ink">ADMIN_USERNAME</code> and{' '}
                <code className="font-mono text-ink">ADMIN_SECRET_KEY</code> in{' '}
                <code className="font-mono text-ink">.env</code> or your hosting Secrets to manage via env.
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-page font-bold text-sm transition disabled:opacity-50 cursor-pointer"
          >
            {isLoggingIn
              ? 'Verifying with Server...'
              : setupRequired
                ? 'Claim & Open Admin Dashboard'
                : 'Access Admin Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  // AUTHENTICATED ADMIN DASHBOARD
  const launchRows = adminLaunches ?? launches;
  const totalDonationAmount = donations.reduce((sum, d) => sum + Number(d.amount_sol), 0);

  return (
    <div className="space-y-8 text-left animate-fadeIn">
      {/* Header & Logout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl bg-card border border-line">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold text-ink">CatPad Admin Dashboard</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-mono border border-accent/40 font-bold">
              Server-Role Verified
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Add and edit partner shelters, feature memecoins, review donation records, and inspect audit failures.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefreshData}
            className="p-2 rounded-xl bg-surface hover:bg-card-hover text-muted hover:text-ink transition"
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
          <span className="text-xl font-bold font-mono text-accent">{launchRows.length} Tokens</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-line">
          <span className="text-muted text-xs block font-mono">SHELTERS LISTED</span>
          <span className="text-xl font-bold font-mono text-accent">{charities.length} Shelters</span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-line">
          <span className="text-muted text-xs block font-mono">AUDIT FAILURES</span>
          <span className="text-xl font-bold font-mono text-accent">{failures.length} Records</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-line gap-4 text-xs font-bold">
        <button
          onClick={() => setAdminTab('charities')}
          className={`pb-3 transition ${
            adminTab === 'charities' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'
          }`}
        >
          Shelters ({charities.length})
        </button>
        <button
          onClick={() => setAdminTab('launches')}
          className={`pb-3 transition ${
            adminTab === 'launches' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'
          }`}
        >
          Launches ({launchRows.length})
        </button>
        <button
          onClick={() => setAdminTab('donations')}
          className={`pb-3 transition ${
            adminTab === 'donations' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'
          }`}
        >
          Donations ({donations.length})
        </button>
        <button
          onClick={() => setAdminTab('banner')}
          className={`pb-3 transition ${
            adminTab === 'banner' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'
          }`}
        >
          Banner & CA
        </button>
        <button
          onClick={() => setAdminTab('failures')}
          className={`pb-3 transition ${
            adminTab === 'failures' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'
          }`}
        >
          Failures Log ({failures.length})
        </button>
        <button
          onClick={() => setAdminTab('audit')}
          className={`pb-3 transition ${
            adminTab === 'audit' ? 'text-accent border-b-2 border-accent' : 'text-muted hover:text-ink'
          }`}
        >
          Admin Log ({auditActions.length})
        </button>
      </div>

      {/* TAB 1: CHARITIES MANAGEMENT */}
      {adminTab === 'charities' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-ink">Registered shelters</h3>
            <button
              onClick={openAddCharity}
              className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-page font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-page" />
              <span>Add shelter</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-card">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface text-muted uppercase font-mono border-b border-line">
                <tr>
                  <th className="py-3 px-4">Shelter</th>
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
                          <span className="font-bold text-ink block">{c.name}</span>
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
                        className="p-1.5 rounded-lg bg-surface hover:bg-card-hover text-muted hover:text-ink"
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
            <h3 className="text-lg font-bold text-ink">Launched Memecoins</h3>
            <span className="text-xs text-muted font-mono">{launchRows.length} tokens</span>
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
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4 text-right">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {launchRows.map((l) => (
                  <tr key={l.id} className="hover:bg-card-hover transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <img src={l.image_url} alt="" className="w-7 h-7 rounded-lg object-cover" />
                        <div>
                          <span className="font-bold text-ink block">{l.name}</span>
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
                      {l.bonding_curve_progress === null ? '—' : `${l.bonding_curve_progress.toFixed(1)}%`}
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
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleUnlisted(l)}
                        className={`px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1 ${
                          l.is_unlisted
                            ? 'bg-accent/10 text-accent border border-accent/40'
                            : 'bg-surface text-muted'
                        }`}
                        title={l.is_unlisted ? 'Restore to the public directory' : 'Hide from the public directory'}
                      >
                        <EyeOff className="w-3 h-3" />
                        <span>{l.is_unlisted ? 'Hidden' : 'Listed'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => void handleLinkLaunchCa(l)}
                          disabled={isSavingBanner}
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold transition ${
                            banner?.ca_address === l.mint
                              ? 'border border-accent/40 bg-accent/10 text-accent'
                              : 'bg-surface text-ink hover:bg-card-hover'
                          }`}
                          title="Link this coin's CA to the site banner"
                        >
                          {banner?.ca_address === l.mint ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Linked</span>
                            </>
                          ) : (
                            <>
                              <Link2 className="w-3 h-3" />
                              <span>Link CA</span>
                            </>
                          )}
                        </button>
                        <a
                          href={`https://pump.fun/coin/${l.mint}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline inline-flex items-center space-x-1 font-mono"
                        >
                          <span>pump.fun</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
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
          <h3 className="text-lg font-bold text-ink">On-Chain Donation Records</h3>
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
                      <td className="py-3 px-4 font-bold text-ink">
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

      {/* TAB 4: ANNOUNCEMENT BANNER & LINKED CA */}
      {adminTab === 'banner' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-accent" />
                <span>Top Banner &amp; Linked CA</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Link your official Contract Address (CA) and destination URL in the sitewide top banner.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-card">
            <div className="border-b border-line bg-surface px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-muted">
              Live preview
            </div>
            {bannerForm.enabled && bannerForm.text.trim() ? (
              <AnnouncementBanner banner={bannerForm} />
            ) : (
              <div className="px-4 py-3 text-center text-xs text-muted">
                Banner is currently hidden.
              </div>
            )}
          </div>

          <form onSubmit={handleSaveBanner} className="space-y-4 rounded-xl border border-line bg-card p-5 text-xs">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-page px-4 py-3">
              <div>
                <span className="block font-semibold text-ink">Show top banner</span>
                <span className="block text-[11px] text-muted">
                  Toggle visibility for all visitors across the site.
                </span>
              </div>
              <input
                type="checkbox"
                checked={bannerForm.enabled}
                onChange={(e) => setBannerForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="h-4 w-4 accent-ink"
              />
            </label>

            {launchRows.length > 0 && (
              <div>
                <label htmlFor="quick-link-launch" className="mb-1 block font-semibold text-muted">
                  Quick-fill from a launched coin
                </label>
                <select
                  id="quick-link-launch"
                  defaultValue=""
                  onChange={(e) => {
                    const selected = launchRows.find((l) => l.mint === e.target.value);
                    if (!selected) return;
                    setBannerForm((prev) => ({
                      ...prev,
                      text:
                        !prev.text.trim() || prev.text.trim().toLowerCase() === 'ca dropping soon'
                          ? `Official $${selected.symbol} CA is live`
                          : prev.text,
                      ca_address: selected.mint,
                      ca_url: `https://pump.fun/coin/${selected.mint}`,
                      enabled: true,
                    }));
                  }}
                  className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-xs text-ink outline-none focus:border-ink"
                >
                  <option value="">Choose a coin to pre-fill its CA &amp; Pump.fun link...</option>
                  {launchRows.map((l) => (
                    <option key={l.id} value={l.mint}>
                      {l.name} (${l.symbol}) — {l.mint.slice(0, 6)}...{l.mint.slice(-6)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block font-semibold text-muted">
                Banner message *
              </label>
              <input
                type="text"
                maxLength={160}
                placeholder="CA dropping soon"
                value={bannerForm.text}
                onChange={(e) => setBannerForm((prev) => ({ ...prev, text: e.target.value }))}
                className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-semibold text-muted">
                  Contract address (CA)
                </label>
                {bannerForm.ca_address?.trim() && (
                  <button
                    type="button"
                    onClick={() => setBannerForm((prev) => ({ ...prev, ca_address: '', ca_url: '' }))}
                    className="text-[11px] font-medium text-muted hover:text-ink"
                  >
                    Clear CA
                  </button>
                )}
              </div>
              <input
                type="text"
                maxLength={64}
                placeholder="Paste Solana mint / CA (shows a copyable badge)"
                value={bannerForm.ca_address ?? ''}
                onChange={(e) => setBannerForm((prev) => ({ ...prev, ca_address: e.target.value }))}
                className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-ink"
              />
              {bannerForm.ca_address?.trim() && !isValidSolanaCa(bannerForm.ca_address) && (
                <p className="mt-1 text-[11px] text-accent">
                  Enter a valid Base58 Solana contract address.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block font-semibold text-muted">
                Link CA to URL — optional
              </label>
              <input
                type="url"
                maxLength={300}
                placeholder="https://pump.fun/coin/..."
                value={bannerForm.ca_url ?? ''}
                onChange={(e) => setBannerForm((prev) => ({ ...prev, ca_url: e.target.value }))}
                className="w-full rounded-xl border border-line-strong bg-card px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-ink"
              />
              {bannerForm.ca_url?.trim() && !isValidHttpUrl(bannerForm.ca_url) && (
                <p className="mt-1 text-[11px] text-accent">
                  URL must start with https:// or http://.
                </p>
              )}

              {bannerForm.ca_address?.trim() && isValidSolanaCa(bannerForm.ca_address) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted">Quick link:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setBannerForm((prev) => ({
                        ...prev,
                        ca_url: `https://pump.fun/coin/${(prev.ca_address ?? '').trim()}`,
                      }))
                    }
                    className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-line-strong"
                  >
                    Pump.fun
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBannerForm((prev) => ({
                        ...prev,
                        ca_url: `https://dexscreener.com/solana/${(prev.ca_address ?? '').trim()}`,
                      }))
                    }
                    className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-line-strong"
                  >
                    DexScreener
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setBannerForm((prev) => ({
                        ...prev,
                        ca_url: `https://solscan.io/token/${(prev.ca_address ?? '').trim()}`,
                      }))
                    }
                    className="rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink transition hover:border-line-strong"
                  >
                    Solscan
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  setBannerForm({
                    text: 'CA dropping soon',
                    ca_address: '',
                    ca_url: '',
                    enabled: true,
                  })
                }
                className="rounded-xl border border-line bg-surface px-3.5 py-2 font-semibold text-muted transition hover:text-ink"
              >
                Reset to &ldquo;CA dropping soon&rdquo;
              </button>

              <button
                type="submit"
                disabled={isSavingBanner}
                className="rounded-xl bg-accent px-5 py-2.5 font-bold text-page transition hover:bg-accent-hover disabled:opacity-50"
              >
                {isSavingBanner ? 'Saving...' : 'Save banner & CA'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: ADMIN ACTIVITY */}
      {adminTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink flex items-center space-x-2">
              <History className="w-4 h-4 text-accent" />
              <span>Admin activity</span>
            </h3>
            <span className="text-xs text-muted font-mono">{auditActions.length} recent</span>
          </div>

          {auditActions.length > 0 ? (
            <div className="space-y-2">
              {auditActions.map((a) => (
                <div key={a.id} className="p-3.5 rounded-xl bg-card border border-line text-xs">
                  <div className="flex justify-between font-mono text-[11px] text-ink">
                    <span>{a.action}</span>
                    <span className="text-muted text-[10px]">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-muted">
                    {a.details}
                    <span className="ml-2 font-mono text-[10px] text-muted">{a.target}</span>
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center rounded-lg bg-surface border border-line text-muted text-xs">
              No admin actions recorded yet.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT FAILURES */}
      {adminTab === 'failures' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink flex items-center space-x-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-card border border-line-strong rounded-xl p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowCharityModal(false)}
              className="absolute top-5 right-5 p-2 text-muted hover:text-ink rounded-xl hover:bg-card-hover transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-ink mb-4">
              {editingCharity ? 'Edit shelter' : 'Add a cat shelter'}
            </h3>

            {charityFormError && (
              <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/40 text-accent text-xs">
                {charityFormError}
              </div>
            )}

            <form onSubmit={handleSaveCharity} className="space-y-3.5 text-xs">
              <div>
                                  <label className="font-semibold text-muted block mb-1">Shelter name *</label>
                <input
                  type="text"
                  placeholder="e.g. Austin Pets Alive!"
                  value={charityForm.name}
                  onChange={(e) => setCharityForm({ ...charityForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-ink outline-none"
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
                    className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-ink outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-muted block mb-1">Official Website *</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={charityForm.website}
                    onChange={(e) => setCharityForm({ ...charityForm, website: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-ink outline-none"
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
                  className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-ink outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-muted block mb-1">Mission / Description *</label>
                <textarea
                  rows={3}
                  placeholder="Describe rescue work, medical programs, TNR..."
                  value={charityForm.description}
                  onChange={(e) => setCharityForm({ ...charityForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-ink outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-muted block mb-1">Avatar / Logo URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={charityForm.avatar_url}
                  onChange={(e) => setCharityForm({ ...charityForm, avatar_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-card border border-line-strong text-ink outline-none"
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
                  className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-page font-bold text-xs"
                >
                  {editingCharity ? 'Save changes' : 'Add shelter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
