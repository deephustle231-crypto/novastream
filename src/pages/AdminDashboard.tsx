import React, { useState, useEffect } from 'react';
import {
  Shield,
  DollarSign,
  Users,
  Film,
  Tv,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  Play,
  Search,
  ExternalLink,
  Lock,
  Activity,
  History,
  Radio,
  Sparkles,
  Settings,
  HelpCircle,
  X,
  Sliders,
  Crown,
  UserCheck,
  UserX,
  Layers,
  Eye,
  ArrowRight,
  LockOpen,
  Terminal,
  Zap
} from 'lucide-react';
import { Movie, Series, User, SubscriptionRecord, PaymentRecord, ValidationLog, AuditLog, PlaybackErrorLog, InternetArchiveSearchResult, RightsStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface AdminDashboardProps {
  onOpenPaywall?: () => void;
  onNavigateTab?: (tab: any) => void;
  onPlayMedia?: (media: Movie | Series) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenPaywall,
  onNavigateTab,
  onPlayMedia
}) => {
  const { user, isPremium, isAdmin, switchDemoRole, simulateSessionContext } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'metrics' | 'movies' | 'series' | 'validation' | 'ia-import' | 'rights' | 'subscribers' | 'logs' | 'simulator'>('metrics');

  // Custom Simulator Form State
  const [customPlan, setCustomPlan] = useState<'free' | 'premium'>(user?.plan || 'premium');
  const [customStatus, setCustomStatus] = useState<'active' | 'expired' | 'inactive' | 'past_due'>(user?.subscriptionStatus || 'active');
  const [customRole, setCustomRole] = useState<'user' | 'admin'>(user?.role || 'admin');
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync custom state with user when user changes
  useEffect(() => {
    if (user) {
      setCustomPlan(user.plan || 'free');
      setCustomStatus(user.subscriptionStatus || 'inactive');
      setCustomRole(user.role || 'user');
    }
  }, [user]);

  // Dashboard Data State
  const [metrics, setMetrics] = useState<any>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [subscribers, setSubscribers] = useState<SubscriptionRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [playbackErrors, setPlaybackErrors] = useState<PlaybackErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // IA Search State
  const [iaQuery, setIaQuery] = useState('');
  const [iaResults, setIaResults] = useState<InternetArchiveSearchResult[]>([]);
  const [isSearchingIa, setIsSearchingIa] = useState(false);

  // Movie Form State (for Add/Edit modal)
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [movieForm, setMovieForm] = useState({
    title: '',
    year: 2024,
    description: '',
    poster: '',
    backdrop: '',
    genres: 'Sci-Fi, Cyberpunk',
    runtime: 15,
    rating: 'PG-13',
    videoUrl: '',
    subtitleUrl: '',
    source: 'Open Source Archive',
    licenceInfo: 'Creative Commons Attribution 4.0'
  });

  // Load Admin Data
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        metricsRes,
        moviesRes,
        seriesRes,
        subsRes,
        paysRes,
        valRes,
        logsRes,
        errorsRes
      ] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/movies'),
        fetch('/api/series'),
        fetch('/api/admin/subscribers'),
        fetch('/api/admin/payments'),
        fetch('/api/admin/media-validation-logs'),
        fetch('/api/admin/audit-logs'),
        fetch('/api/admin/playback-errors')
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (moviesRes.ok) setMovies(await moviesRes.json());
      if (seriesRes.ok) setSeries(await seriesRes.json());
      if (subsRes.ok) setSubscribers(await subsRes.json());
      if (paysRes.ok) setPayments(await paysRes.json());
      if (valRes.ok) setValidationLogs(await valRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      if (errorsRes.ok) setPlaybackErrors(await errorsRes.json());
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Batch Validate All Media
  const handleValidateAll = async () => {
    showToast('Starting background catalogue validation...', 'info');
    try {
      const res = await fetch('/api/admin/validate-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Validation complete: ${data.validCount} valid / ${data.total} total streams`, 'success');
        loadDashboardData();
      }
    } catch (err) {
      showToast('Validation failed', 'error');
    }
  };

  // Search Internet Archive
  const handleSearchIA = async () => {
    setIsSearchingIa(true);
    try {
      const res = await fetch(`/api/admin/ia/search?q=${encodeURIComponent(iaQuery)}&year=2002`);
      if (res.ok) {
        const data = await res.json();
        setIaResults(data);
      }
    } catch (err) {
      showToast('Internet Archive search failed', 'error');
    } finally {
      setIsSearchingIa(false);
    }
  };

  // Import from IA
  const handleImportIA = async (item: InternetArchiveSearchResult) => {
    showToast(`Importing and validating ${item.title}...`, 'info');
    try {
      const res = await fetch('/api/admin/ia/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        showToast(`Successfully imported: ${item.title}`, 'success');
        loadDashboardData();
      } else {
        showToast('Import failed', 'error');
      }
    } catch (err) {
      showToast('Import error', 'error');
    }
  };

  // Save / Update Movie
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...movieForm,
        genres: movieForm.genres.split(',').map(g => g.trim()).filter(Boolean),
        runtime: Number(movieForm.runtime),
        year: Number(movieForm.year)
      };

      const url = editingMovie ? `/api/movies/${editingMovie.id}` : '/api/movies';
      const method = editingMovie ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast(editingMovie ? 'Movie updated' : 'Movie added to catalog', 'success');
        setShowMovieModal(false);
        setEditingMovie(null);
        loadDashboardData();
      } else {
        showToast('Failed to save movie', 'error');
      }
    } catch (err) {
      showToast('Error saving movie', 'error');
    }
  };

  // Delete Movie
  const handleDeleteMovie = async (id: string, title: string) => {
    if (!window.confirm(`Delete ${title} from catalogue?`)) return;
    try {
      const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Deleted ${title}`, 'info');
        loadDashboardData();
      }
    } catch (err) {
      showToast('Error deleting movie', 'error');
    }
  };

  // Review Rights
  const handleUpdateRights = async (id: string, status: RightsStatus) => {
    try {
      const res = await fetch(`/api/admin/rights-review/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rightsStatus: status })
      });
      if (res.ok) {
        showToast(`Rights updated to ${status}`, 'success');
        loadDashboardData();
      }
    } catch (err) {
      showToast('Error updating rights', 'error');
    }
  };

  // CSV Export Trigger
  const handleExportCSV = () => {
    window.location.href = '/api/admin/export/csv';
    showToast('Financial CSV export generated', 'success');
  };

  // Google Sheets Export
  const handleSyncSheets = async () => {
    showToast('Syncing with Google Sheets...', 'info');
    try {
      const res = await fetch('/api/admin/export/sheets', { method: 'POST' });
      const data = await res.json();
      if (data.configured) {
        showToast(data.message, 'success');
      } else {
        showToast(data.message, 'info');
      }
    } catch (err) {
      showToast('Sheets sync error', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 space-y-8 text-white">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30">
              <Shield className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-serif-display font-black text-white">
              NovaStream Admin Hub
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 font-medium">
            Real MRR financials, Paystack subscriptions, media verification engine, and Internet Archive imports.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadDashboardData}
            className="p-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-white border border-[#333333] transition-colors cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-white border border-[#333333] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handleSyncSheets}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-white border border-[#333333] text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Google Sheets
          </button>
        </div>
      </div>

      {/* Dev QA Session Context & Switcher Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#141414] border-2 border-[#E50914]/40 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-[#E50914] text-white">
              <Sliders className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#E50914]">
                  Session Context Simulator (Dev-Menu)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isAdmin ? 'bg-[#E50914] text-white' : isPremium ? 'bg-red-900 text-white' : user?.subscriptionStatus === 'expired' ? 'bg-zinc-800 text-red-300' : 'bg-[#262626] text-white'
                }`}>
                  {isAdmin ? 'Admin' : isPremium ? 'Premium VIP' : user?.subscriptionStatus === 'expired' ? 'Expired User' : 'Free User'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  isPremium || isAdmin ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50 font-bold' : 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30 font-bold'
                }`}>
                  {isPremium || isAdmin ? '✓ 4K Streams Unlocked' : '🔒 VIP Paywall Active'}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Current Session: <strong className="text-white">{user?.email || 'Anonymous'}</strong> ({user?.displayName || 'Viewer'})
              </p>
            </div>
          </div>

          {/* Quick Context Switch Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                switchDemoRole('admin');
                showToast('Switched to Admin Role (deephustle231@gmail.com)', 'info');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isAdmin
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] text-[#A1A1AA] hover:text-white border border-[#333333]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
            <button
              onClick={() => {
                switchDemoRole('premium');
                showToast('Switched to Premium User (subscriber@novastream.tv - Active VIP)', 'info');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isAdmin && isPremium
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] text-[#A1A1AA] hover:text-white border border-[#333333]'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              Premium User
            </button>
            <button
              onClick={() => {
                switchDemoRole('free');
                showToast('Switched to Free User (viewer@novastream.tv - Gated VIP)', 'info');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isAdmin && user?.plan === 'free'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] text-[#A1A1AA] hover:text-white border border-[#333333]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Free User
            </button>
            <button
              onClick={() => {
                switchDemoRole('expired');
                showToast('Switched to Expired User (expired@novastream.tv - Lapsed VIP)', 'info');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                !isAdmin && user?.subscriptionStatus === 'expired'
                  ? 'bg-[#E50914] text-white shadow-sm'
                  : 'bg-[#1f1f1f] text-[#A1A1AA] hover:text-white border border-[#333333]'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              Expired User
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-950/60 text-emerald-400 hover:bg-emerald-950 border border-emerald-700/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Access Lab
            </button>
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-[#262626]">
        {[
          { id: 'metrics', label: 'Financials & MRR', icon: DollarSign },
          { id: 'simulator', label: 'Dev Access Simulator', icon: Sliders },
          { id: 'movies', label: 'Movies Catalog', icon: Film },
          { id: 'series', label: 'TV Shows', icon: Tv },
          { id: 'validation', label: 'Media Validator', icon: Radio },
          { id: 'ia-import', label: 'Internet Archive', icon: Sparkles },
          { id: 'rights', label: 'Rights Review', icon: Shield },
          { id: 'subscribers', label: 'Subscribers & Payments', icon: Users },
          { id: 'logs', label: 'Audit Logs & Telemetry', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/20'
                : 'bg-[#141414] text-[#A1A1AA] hover:text-white hover:bg-[#1f1f1f] border border-[#262626]'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB 1: FINANCIALS & REAL MRR --- */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-8 animate-in fade-in">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Real MRR */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider">
                <span>Monthly Recurring (MRR)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono">
                ₦{metrics.mrr.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                Calculated: {metrics.activeSubscribersCount} active subscribers × ₦2,500/mo
              </p>
            </div>

            {/* Total Active Subscribers */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider">
                <span>Active VIP Subscribers</span>
                <Users className="w-4 h-4 text-[#E50914]" />
              </div>
              <div className="text-3xl font-black text-white font-mono">
                {metrics.activeSubscribersCount}
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                {metrics.totalUsers} registered users total
              </p>
            </div>

            {/* Validation Rate */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider">
                <span>Media Stream Health</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {metrics.validationRate}%
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                {movies.filter(m => m.mediaValidationStatus === 'VALID').length} of {movies.length} titles verified playable
              </p>
            </div>

            {/* Total Revenue */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider">
                <span>Total Collected Revenue</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-white font-mono">
                ₦{metrics.totalRevenue.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#A1A1AA]">
                Processed via Paystack Gateway
              </p>
            </div>
          </div>

          {/* Recent Paystack Transactions Feed */}
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 space-y-4 shadow-sm">
            <h3 className="text-base font-serif-display font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#E50914]" />
              Live Paystack Transactions Audit
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#262626] text-[#A1A1AA] uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Subscriber</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {payments.slice(0, 5).map(p => (
                    <tr key={p.id} className="hover:bg-[#1f1f1f] transition-colors">
                      <td className="py-3 px-3 text-[#A1A1AA]">
                        {new Date(p.paymentDate).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-white font-semibold">
                        {p.userEmail}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#A1A1AA]">
                        {p.reference}
                      </td>
                      <td className="py-3 px-3 font-bold text-white font-mono">
                        ₦{p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/50 text-[10px] font-bold">
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: MOVIES CATALOG MANAGER --- */}
      {activeTab === 'movies' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif-display font-bold text-white">
              Movies Catalogue ({movies.length} titles)
            </h3>
            <button
              onClick={() => {
                setEditingMovie(null);
                setMovieForm({
                  title: '',
                  year: 2024,
                  description: '',
                  poster: '',
                  backdrop: '',
                  genres: 'Sci-Fi, Action',
                  runtime: 15,
                  rating: 'PG-13',
                  videoUrl: '',
                  subtitleUrl: '',
                  source: 'Internet Archive',
                  licenceInfo: 'Creative Commons Attribution 4.0'
                });
                setShowMovieModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold shadow-md shadow-[#E50914]/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Movie
            </button>
          </div>

          <div className="overflow-x-auto bg-[#141414] border border-[#262626] rounded-3xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[#A1A1AA] uppercase tracking-wider bg-[#1f1f1f] font-bold">
                  <th className="py-3 px-4">Poster</th>
                  <th className="py-3 px-4">Title & Year</th>
                  <th className="py-3 px-4">Genres</th>
                  <th className="py-3 px-4">Stream Health</th>
                  <th className="py-3 px-4">Licence Info</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {movies.map(m => (
                  <tr key={m.id} className="hover:bg-[#1f1f1f] transition-colors">
                    <td className="py-3 px-4">
                      <img
                        src={m.poster}
                        alt={m.title}
                        className="w-9 h-12 rounded object-cover bg-[#1f1f1f]"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {m.title} <span className="text-[#A1A1AA] font-normal">({m.year})</span>
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA]">
                      {m.genres.join(', ')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        m.mediaValidationStatus === 'VALID'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                          : 'bg-amber-950 text-amber-400 border border-amber-700/50'
                      }`}>
                        {m.mediaValidationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] truncate max-w-xs">
                      {m.licenceInfo}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingMovie(m);
                          setMovieForm({
                            title: m.title,
                            year: m.year,
                            description: m.description,
                            poster: m.poster,
                            backdrop: m.backdrop,
                            genres: m.genres.join(', '),
                            runtime: m.runtime,
                            rating: m.rating,
                            videoUrl: m.videoUrl,
                            subtitleUrl: m.subtitleUrl || '',
                            source: m.source,
                            licenceInfo: m.licenceInfo
                          });
                          setShowMovieModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#262626] text-white border border-[#333333] cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMovie(m.id, m.title)}
                        className="p-1.5 rounded-lg bg-[#E50914]/20 hover:bg-[#E50914]/40 text-[#E50914] border border-[#E50914]/30 cursor-pointer"
                        title="Delete"
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

      {/* --- TAB 3: SERIES & EPISODES --- */}
      {activeTab === 'series' && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="text-lg font-serif-display font-bold text-white">
            TV Shows & Episodic Series ({series.length} series)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {series.map(s => (
              <div key={s.id} className="p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-4 shadow-sm">
                <div className="flex items-start gap-4">
                  <img src={s.poster} alt={s.title} className="w-16 h-24 object-cover rounded-xl bg-[#1f1f1f]" />
                  <div className="space-y-1">
                    <h4 className="font-serif-display font-bold text-white text-base">{s.title}</h4>
                    <p className="text-xs text-[#A1A1AA]">{s.year} • {s.seasons?.length || 1} Seasons</p>
                    <p className="text-xs text-[#A1A1AA] line-clamp-2">{s.description}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#262626]">
                  <span className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">Episodes</span>
                  {s.seasons?.[0]?.episodes.slice(0, 3).map(ep => (
                    <div key={ep.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#1f1f1f] border border-[#333333]">
                      <span className="text-white font-medium">{ep.episodeNumber}. {ep.title}</span>
                      <span className="text-[#A1A1AA] font-mono">{ep.runtime}m</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 4: MEDIA VALIDATION ENGINE --- */}
      {activeTab === 'validation' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-serif-display font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#E50914]" />
                Automated Media Stream Validation
              </h3>
              <p className="text-xs text-[#A1A1AA] mt-1 font-medium">
                Validates HTTP status codes, CORS headers, Content-Type video/mp4, and Byte-Range seeking support.
              </p>
            </div>
            <button
              onClick={handleValidateAll}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold shadow-md shadow-[#E50914]/20 transition-all self-start cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Validate All Catalogue Streams
            </button>
          </div>

          <div className="overflow-x-auto bg-[#141414] border border-[#262626] rounded-3xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[#A1A1AA] uppercase tracking-wider bg-[#1f1f1f] font-bold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">HTTP Code</th>
                  <th className="py-3 px-4">Byte-Range Seek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {validationLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#1f1f1f] transition-colors">
                    <td className="py-3 px-4 text-[#A1A1AA] font-mono">
                      {new Date(log.testedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {log.mediaTitle}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        log.status === 'VALID'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                          : 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-white">
                      {log.latencyMs}ms
                    </td>
                    <td className="py-3 px-4 font-mono text-white">
                      {log.httpStatus || 200}
                    </td>
                    <td className="py-3 px-4">
                      {log.rangeRequestsSupported ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Supported
                        </span>
                      ) : (
                        <span className="text-[#A1A1AA]">Standard</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 5: INTERNET ARCHIVE IMPORTER --- */}
      {activeTab === 'ia-import' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-6 rounded-3xl bg-[#141414] border border-[#262626] space-y-4 shadow-sm">
            <h3 className="text-lg font-serif-display font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#E50914]" />
              Internet Archive Legal Importer (2002+ Open Masters)
            </h3>
            <p className="text-xs text-[#A1A1AA] font-medium">
              Query open collections directly with automatic Creative Commons rights verification and media file discovery.
            </p>

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search archive titles (e.g., animation, open cinema, space, sci-fi)..."
                value={iaQuery}
                onChange={(e) => setIaQuery(e.target.value)}
                className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#E50914]"
              />
              <button
                onClick={handleSearchIA}
                disabled={isSearchingIa}
                className="px-6 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-xs shadow-md shadow-[#E50914]/20 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                {isSearchingIa ? 'Searching IA...' : 'Search Archive'}
              </button>
            </div>
          </div>

          {iaResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {iaResults.map(item => (
                <div key={item.identifier} className="p-4 rounded-2xl bg-[#141414] border border-[#262626] flex items-start gap-4 shadow-sm">
                  <img src={item.posterUrl} alt={item.title} className="w-16 h-24 object-cover rounded-lg bg-[#1f1f1f]" />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-serif-display font-bold text-white text-sm">{item.title} ({item.year || 'Archive'})</h4>
                    <p className="text-xs text-[#A1A1AA] line-clamp-2">{item.description}</p>
                    <div className="text-[11px] text-red-400 font-medium pt-1">
                      Licence: {item.rights || item.licenseurl || 'Public Domain'}
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => handleImportIA(item)}
                        className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                      >
                        1-Click Pre-Validate & Import
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 6: RIGHTS & LICENSE REVIEW --- */}
      {activeTab === 'rights' && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="text-lg font-serif-display font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#E50914]" />
            Rights & Licensing Queue
          </h3>

          <div className="overflow-x-auto bg-[#141414] border border-[#262626] rounded-3xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[#A1A1AA] uppercase tracking-wider bg-[#1f1f1f] font-bold">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Rights Status</th>
                  <th className="py-3 px-4">Licence Disclosure</th>
                  <th className="py-3 px-4">Source Archive</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {movies.map(m => (
                  <tr key={m.id} className="hover:bg-[#1f1f1f] transition-colors">
                    <td className="py-3 px-4 font-bold text-white">
                      {m.title}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        m.rightsStatus === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                          : m.rightsStatus === 'NEEDS_REVIEW'
                          ? 'bg-amber-950 text-amber-400 border border-amber-700/50'
                          : 'bg-red-950 text-red-400 border border-red-700/50'
                      }`}>
                        {m.rightsStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA]">
                      {m.licenceInfo}
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA]">
                      {m.source}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleUpdateRights(m.id, 'VERIFIED')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-700/50 hover:bg-emerald-900 cursor-pointer font-semibold"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => handleUpdateRights(m.id, 'REJECTED')}
                        className="px-2.5 py-1 rounded-lg bg-red-950 text-red-400 border border-red-700/50 hover:bg-red-900 cursor-pointer font-semibold"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 7: SUBSCRIBERS & PAYMENTS --- */}
      {activeTab === 'subscribers' && (
        <div className="space-y-6 animate-in fade-in">
          <h3 className="text-lg font-serif-display font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#E50914]" />
            Active Subscriptions ({subscribers.length} total records)
          </h3>

          <div className="overflow-x-auto bg-[#141414] border border-[#262626] rounded-3xl shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#262626] text-[#A1A1AA] uppercase tracking-wider bg-[#1f1f1f] font-bold">
                  <th className="py-3 px-4">User Email</th>
                  <th className="py-3 px-4">Plan Tier</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Monthly Fee</th>
                  <th className="py-3 px-4">Expiration Date</th>
                  <th className="py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {subscribers.map(sub => (
                  <tr key={sub.id} className="hover:bg-[#1f1f1f] transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      {sub.userEmail}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#E50914]">
                      {sub.plan.toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/50 text-[10px] font-bold">
                        {sub.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      ₦{sub.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] font-mono">
                      {new Date(sub.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-[#A1A1AA] font-mono">
                      {sub.reference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 8: AUDIT LOGS & CLIENT TELEMETRY --- */}
      {activeTab === 'logs' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Audit Logs */}
            <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-serif-display font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#E50914]" />
                Administrative & Security Audit Trail
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-[#1f1f1f] border border-[#333333] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#E50914]">{log.action}</span>
                      <span className="text-[10px] text-[#A1A1AA] font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-zinc-200">{log.details}</p>
                    <div className="text-[10px] text-[#A1A1AA]">Actor: {log.actorEmail}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Playback Error Telemetry */}
            <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-base font-serif-display font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-amber-400" />
                Playback Telemetry Reports
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {playbackErrors.length === 0 ? (
                  <div className="text-center py-12 text-[#71717A] text-xs">
                    No playback errors logged by active stream viewers.
                  </div>
                ) : (
                  playbackErrors.map(err => (
                    <div key={err.id} className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-red-400">{err.mediaTitle}</span>
                        <span className="text-[10px] text-[#A1A1AA]">{new Date(err.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-zinc-200">{err.errorMessage}</p>
                      <div className="text-[10px] text-[#A1A1AA]">At {err.playbackTime}s</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB: DEV SESSION & ACCESS CONTROL SIMULATOR --- */}
      {activeTab === 'simulator' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Simulator Header & Active State Badge */}
          <div className="p-6 rounded-3xl bg-[#141414] border border-[#262626] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                  <Sliders className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-serif-display font-bold text-white">
                  Access Controls & Subscription-Gating QA Lab
                </h2>
              </div>
              <p className="text-xs text-[#A1A1AA] max-w-2xl">
                Switch or mutate the current session between <strong>Free User</strong>, <strong>Premium User</strong>, <strong>Expired User</strong>, and <strong>Administrator</strong> to test Paystack paywalls, 4K media access, and subscription enforcement without real payments.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-[#333333] text-xs space-y-1.5 min-w-[240px]">
              <div className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">Active Session Status</div>
              <div className="font-bold text-white">{user?.email || 'Anonymous'}</div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-[#262626] font-mono text-[10px] font-bold uppercase text-white">
                  {user?.plan || 'free'}
                </span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase ${
                  user?.subscriptionStatus === 'active'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/50'
                    : user?.subscriptionStatus === 'expired'
                      ? 'bg-red-950 text-red-400 border border-red-700/50'
                      : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {user?.subscriptionStatus || 'inactive'}
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-md bg-[#E50914] text-white font-mono text-[10px] font-bold">
                    ADMIN
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Pre-Configured Test Personas */}
          <div className="space-y-4">
            <h3 className="text-base font-serif-display font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#E50914]" />
              Preset Test Personas (1-Click Switch)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Persona 1: Free User */}
              <div className={`p-5 rounded-3xl bg-[#141414] border transition-all flex flex-col justify-between space-y-4 ${
                !isAdmin && user?.plan === 'free' ? 'border-2 border-white shadow-md' : 'border-[#262626]'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-[#1f1f1f] text-white">
                      <UserCheck className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#1f1f1f] text-white border border-[#333333]">
                      Free Standard
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Free User</h4>
                  <div className="text-[11px] font-mono text-[#A1A1AA]">viewer@novastream.tv</div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    Standard catalogue streaming. Paywall popup is triggered when attempting to play exclusive 4K movies or full TV series episodes.
                  </p>
                </div>
                <button
                  onClick={() => {
                    switchDemoRole('free');
                    showToast('Switched session to Free User (viewer@novastream.tv)', 'info');
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    !isAdmin && user?.plan === 'free'
                      ? 'bg-white text-black'
                      : 'bg-[#1f1f1f] hover:bg-[#262626] text-white border border-[#333333]'
                  }`}
                >
                  {!isAdmin && user?.plan === 'free' ? '✓ Active Session' : 'Switch to Free User'}
                </button>
              </div>

              {/* Persona 2: Premium User */}
              <div className={`p-5 rounded-3xl bg-[#141414] border transition-all flex flex-col justify-between space-y-4 ${
                !isAdmin && isPremium ? 'border-2 border-[#E50914] shadow-md' : 'border-[#262626]'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-[#E50914]/20 text-[#E50914]">
                      <Crown className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E50914] text-white">
                      Active VIP
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Premium User</h4>
                  <div className="text-[11px] font-mono text-[#A1A1AA]">subscriber@novastream.tv</div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    Active ₦2,500/mo subscriber. All 4K streams and episodic series play seamlessly without paywalls or ad interruptions.
                  </p>
                </div>
                <button
                  onClick={() => {
                    switchDemoRole('premium');
                    showToast('Switched session to Premium User (subscriber@novastream.tv)', 'info');
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    !isAdmin && isPremium
                      ? 'bg-[#E50914] text-white'
                      : 'bg-[#1f1f1f] hover:bg-[#262626] text-white border border-[#333333]'
                  }`}
                >
                  {!isAdmin && isPremium ? '✓ Active Session' : 'Switch to Premium User'}
                </button>
              </div>

              {/* Persona 3: Expired User */}
              <div className={`p-5 rounded-3xl bg-[#141414] border transition-all flex flex-col justify-between space-y-4 ${
                !isAdmin && user?.subscriptionStatus === 'expired' ? 'border-2 border-red-500 shadow-md' : 'border-[#262626]'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-red-950 text-red-400 border border-red-700/50">
                      <UserX className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-700/50">
                      Lapsed VIP
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Expired User</h4>
                  <div className="text-[11px] font-mono text-[#A1A1AA]">expired@novastream.tv</div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    Past subscriber whose billing period has ended. 4K streams trigger the paywall modal, and the Profile tab displays an expired renewal notice.
                  </p>
                </div>
                <button
                  onClick={() => {
                    switchDemoRole('expired');
                    showToast('Switched session to Expired User (expired@novastream.tv)', 'info');
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    !isAdmin && user?.subscriptionStatus === 'expired'
                      ? 'bg-red-900 text-white'
                      : 'bg-[#1f1f1f] hover:bg-[#262626] text-white border border-[#333333]'
                  }`}
                >
                  {!isAdmin && user?.subscriptionStatus === 'expired' ? '✓ Active Session' : 'Switch to Expired User'}
                </button>
              </div>

              {/* Persona 4: Administrator */}
              <div className={`p-5 rounded-3xl bg-[#141414] border transition-all flex flex-col justify-between space-y-4 ${
                isAdmin ? 'border-2 border-[#E50914] shadow-md' : 'border-[#262626]'
              }`}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-[#E50914]/20 text-[#E50914]">
                      <Shield className="w-5 h-5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E50914] text-white">
                      Super Admin
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">Administrator</h4>
                  <div className="text-[11px] font-mono text-[#A1A1AA]">deephustle231@gmail.com</div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    Master administrator account. Full access to real MRR financials, Paystack logs, media validation engine, telemetry, and catalog curation.
                  </p>
                </div>
                <button
                  onClick={() => {
                    switchDemoRole('admin');
                    showToast('Switched session to Administrator (deephustle231@gmail.com)', 'info');
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isAdmin
                      ? 'bg-[#E50914] text-white'
                      : 'bg-[#1f1f1f] hover:bg-[#262626] text-white border border-[#333333]'
                  }`}
                >
                  {isAdmin ? '✓ Active Session' : 'Switch to Administrator'}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: In-Place Custom Context Mutator */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#141414] border border-[#262626] space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif-display font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                In-Place Session Context Mutator (Dynamic State Override)
              </h3>
              <span className="text-[11px] text-[#A1A1AA]">
                Overrides active session variables without logging out
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Plan Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-white">Plan Tier:</label>
                <select
                  value={customPlan}
                  onChange={(e) => setCustomPlan(e.target.value as any)}
                  className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-[#E50914]"
                >
                  <option value="free">Free (Standard Plan)</option>
                  <option value="premium">Premium (VIP Plan)</option>
                </select>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-white">Subscription Status:</label>
                <select
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value as any)}
                  className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-[#E50914]"
                >
                  <option value="active">Active (Valid VIP)</option>
                  <option value="expired">Expired (Lapsed Period)</option>
                  <option value="inactive">Inactive (Never Subscribed)</option>
                  <option value="past_due">Past Due (Payment Pending)</option>
                </select>
              </div>

              {/* Role Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-white">User Role:</label>
                <select
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value as any)}
                  className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none focus:border-[#E50914]"
                >
                  <option value="user">Standard User / Customer</option>
                  <option value="admin">Administrator (Admin Hub Access)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isSimulating}
                onClick={async () => {
                  setIsSimulating(true);
                  const success = await simulateSessionContext({
                    plan: customPlan,
                    subscriptionStatus: customStatus,
                    role: customRole
                  });
                  setIsSimulating(false);
                  if (success) {
                    showToast(`Session updated: ${customPlan.toUpperCase()} (${customStatus.toUpperCase()})`, 'success');
                  } else {
                    showToast('Failed to apply custom session override', 'error');
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-900/40 transition-all cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSimulating ? 'Applying...' : 'Apply Simulation to Current Session'}
              </button>
            </div>
          </div>

          {/* Section 3: Live Access Control Rules Matrix */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#141414] border border-[#262626] space-y-4 shadow-sm overflow-x-auto">
            <h3 className="text-base font-serif-display font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#E50914]" />
              Live Access Control Rules Matrix
            </h3>

            <table className="w-full text-left text-xs border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-[#262626] text-[#A1A1AA]">
                  <th className="py-3 px-3 font-bold uppercase tracking-wider">Feature / Capability</th>
                  <th className={`py-3 px-3 font-bold uppercase tracking-wider ${!isAdmin && user?.plan === 'free' ? 'bg-[#1f1f1f] rounded-t-lg text-white' : ''}`}>Free User</th>
                  <th className={`py-3 px-3 font-bold uppercase tracking-wider ${!isAdmin && isPremium ? 'bg-[#E50914]/20 rounded-t-lg text-[#E50914]' : ''}`}>Premium User</th>
                  <th className={`py-3 px-3 font-bold uppercase tracking-wider ${!isAdmin && user?.subscriptionStatus === 'expired' ? 'bg-red-950/40 rounded-t-lg text-red-300' : ''}`}>Expired User</th>
                  <th className={`py-3 px-3 font-bold uppercase tracking-wider ${isAdmin ? 'bg-[#E50914]/20 rounded-t-lg text-[#E50914]' : ''}`}>Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-zinc-300">
                <tr>
                  <td className="py-3 px-3 font-semibold">Standard Catalog Movies (CC/Archive)</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${!isAdmin && user?.plan === 'free' ? 'bg-[#1f1f1f]' : ''}`}>✓ Unrestricted</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${!isAdmin && isPremium ? 'bg-[#E50914]/10' : ''}`}>✓ Unrestricted</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${!isAdmin && user?.subscriptionStatus === 'expired' ? 'bg-red-950/20' : ''}`}>✓ Unrestricted</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${isAdmin ? 'bg-[#E50914]/10' : ''}`}>✓ Unrestricted</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Exclusive 4K / VIP Originals</td>
                  <td className={`py-3 px-3 text-[#E50914] font-bold ${!isAdmin && user?.plan === 'free' ? 'bg-[#1f1f1f]' : ''}`}>🔒 Paywall Modal</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${!isAdmin && isPremium ? 'bg-[#E50914]/10' : ''}`}>✓ 4K Stream Plays</td>
                  <td className={`py-3 px-3 text-[#E50914] font-bold ${!isAdmin && user?.subscriptionStatus === 'expired' ? 'bg-red-950/20' : ''}`}>🔒 Paywall Modal</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${isAdmin ? 'bg-[#E50914]/10' : ''}`}>✓ Master Access</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">TV Shows (All Seasons & Episodes)</td>
                  <td className={`py-3 px-3 text-[#A1A1AA] font-medium ${!isAdmin && user?.plan === 'free' ? 'bg-[#1f1f1f]' : ''}`}>⚠️ Pilot Only (E01)</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${!isAdmin && isPremium ? 'bg-[#E50914]/10' : ''}`}>✓ All Episodes</td>
                  <td className={`py-3 px-3 text-[#A1A1AA] font-medium ${!isAdmin && user?.subscriptionStatus === 'expired' ? 'bg-red-950/20' : ''}`}>⚠️ Pilot Only (E01)</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${isAdmin ? 'bg-[#E50914]/10' : ''}`}>✓ All Episodes</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Account Profile Status & Card</td>
                  <td className={`py-3 px-3 ${!isAdmin && user?.plan === 'free' ? 'bg-[#1f1f1f]' : ''}`}>Standard Free Badge</td>
                  <td className={`py-3 px-3 text-[#E50914] font-bold ${!isAdmin && isPremium ? 'bg-[#E50914]/10' : ''}`}>👑 VIP Active Badge</td>
                  <td className={`py-3 px-3 text-red-400 font-bold ${!isAdmin && user?.subscriptionStatus === 'expired' ? 'bg-red-950/20' : ''}`}>⚠️ Renewal Alert</td>
                  <td className={`py-3 px-3 text-[#E50914] font-bold ${isAdmin ? 'bg-[#E50914]/10' : ''}`}>🛡️ Admin Badge</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 font-semibold">Admin Hub & Management</td>
                  <td className={`py-3 px-3 text-zinc-500 font-bold ${!isAdmin && user?.plan === 'free' ? 'bg-[#1f1f1f]' : ''}`}>🚫 Hidden</td>
                  <td className={`py-3 px-3 text-zinc-500 font-bold ${!isAdmin && isPremium ? 'bg-[#E50914]/10' : ''}`}>🚫 Hidden</td>
                  <td className={`py-3 px-3 text-zinc-500 font-bold ${!isAdmin && user?.subscriptionStatus === 'expired' ? 'bg-red-950/20' : ''}`}>🚫 Hidden</td>
                  <td className={`py-3 px-3 text-emerald-400 font-bold ${isAdmin ? 'bg-[#E50914]/10' : ''}`}>✓ Full CRUD Hub</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: Direct Test Scenario Actions */}
          <div className="space-y-4">
            <h3 className="text-base font-serif-display font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E50914]" />
              Quick Action Triggers (Test Gated Features)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Test VIP Movie */}
              <button
                onClick={() => {
                  const vipMovie = movies.find(m => m.isPremium) || movies[0];
                  if (vipMovie && onPlayMedia) {
                    onPlayMedia(vipMovie);
                  } else {
                    showToast('Testing VIP movie playback flow', 'info');
                  }
                }}
                className="p-4 rounded-2xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#E50914]/40 text-left transition-all hover:scale-[1.02] cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Play className="w-5 h-5 text-[#E50914]" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E50914]/20 text-[#E50914]">
                    VIP Gate Test
                  </span>
                </div>
                <div className="font-bold text-xs text-white">Test 4K VIP Video Gate</div>
                <p className="text-[11px] text-[#A1A1AA]">
                  Plays Tears of Steel. Paywall appears for Free & Expired; Stream plays for VIP & Admin.
                </p>
              </button>

              {/* Test Paystack Modal */}
              <button
                onClick={() => {
                  if (onOpenPaywall) onOpenPaywall();
                  else showToast('Opening Paystack checkout modal', 'info');
                }}
                className="p-4 rounded-2xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] hover:border-[#E50914]/40 text-left transition-all hover:scale-[1.02] cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Crown className="w-5 h-5 text-[#E50914]" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#E50914]/20 text-[#E50914]">
                    Checkout Test
                  </span>
                </div>
                <div className="font-bold text-xs text-white">Launch Paystack Modal</div>
                <p className="text-[11px] text-[#A1A1AA]">
                  Directly tests the ₦2,500/mo subscription upgrade flow and simulated checkout.
                </p>
              </button>

              {/* Inspect Profile */}
              <button
                onClick={() => {
                  if (onNavigateTab) onNavigateTab('profile');
                  else showToast('Navigating to user profile view', 'info');
                }}
                className="p-4 rounded-2xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] hover:border-emerald-500/40 text-left transition-all hover:scale-[1.02] cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Eye className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                    UI Audit
                  </span>
                </div>
                <div className="font-bold text-xs text-white">Inspect Account Profile</div>
                <p className="text-[11px] text-[#A1A1AA]">
                  Inspects billing status, expiration date notices, and renewal alerts in user profile.
                </p>
              </button>

              {/* Test Free Movie */}
              <button
                onClick={() => {
                  const freeMovie = movies.find(m => !m.isPremium) || movies[0];
                  if (freeMovie && onPlayMedia) {
                    onPlayMedia(freeMovie);
                  } else {
                    showToast('Testing free movie playback flow', 'info');
                  }
                }}
                className="p-4 rounded-2xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] hover:border-emerald-500/40 text-left transition-all hover:scale-[1.02] cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                    Open Access
                  </span>
                </div>
                <div className="font-bold text-xs text-white">Test Free Catalog Stream</div>
                <p className="text-[11px] text-[#A1A1AA]">
                  Plays Big Buck Bunny (public domain) to confirm unhindered open access for all users.
                </p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movie Create / Edit Modal */}
      {showMovieModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-serif-display font-bold text-white">
                {editingMovie ? 'Edit Cinema Title' : 'Add New Movie to Catalogue'}
              </h3>
              <button
                onClick={() => setShowMovieModal(false)}
                className="p-1 text-[#A1A1AA] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovie} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-semibold">Title</label>
                  <input
                    type="text"
                    required
                    value={movieForm.title}
                    onChange={(e) => setMovieForm({ ...movieForm, title: e.target.value })}
                    className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-semibold">Release Year</label>
                  <input
                    type="number"
                    required
                    value={movieForm.year}
                    onChange={(e) => setMovieForm({ ...movieForm, year: Number(e.target.value) })}
                    className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[#A1A1AA] font-semibold">Synopsis / Description</label>
                <textarea
                  rows={3}
                  required
                  value={movieForm.description}
                  onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                  className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-semibold">Video Stream URL (.mp4 / stream)</label>
                  <input
                    type="url"
                    required
                    value={movieForm.videoUrl}
                    onChange={(e) => setMovieForm({ ...movieForm, videoUrl: e.target.value })}
                    className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-semibold">Subtitle Track URL (.vtt)</label>
                  <input
                    type="url"
                    value={movieForm.subtitleUrl}
                    onChange={(e) => setMovieForm({ ...movieForm, subtitleUrl: e.target.value })}
                    className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-semibold">Poster Image URL</label>
                  <input
                    type="url"
                    required
                    value={movieForm.poster}
                    onChange={(e) => setMovieForm({ ...movieForm, poster: e.target.value })}
                    className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-semibold">Genres (comma separated)</label>
                  <input
                    type="text"
                    required
                    value={movieForm.genres}
                    onChange={(e) => setMovieForm({ ...movieForm, genres: e.target.value })}
                    className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-semibold">Licence Info</label>
                  <input
                    type="text"
                    required
                    value={movieForm.licenceInfo}
                    onChange={(e) => setMovieForm({ ...movieForm, licenceInfo: e.target.value })}
                    className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[#A1A1AA] font-semibold">Runtime (Minutes)</label>
                  <input
                    type="number"
                    required
                    value={movieForm.runtime}
                    onChange={(e) => setMovieForm({ ...movieForm, runtime: Number(e.target.value) })}
                    className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#E50914]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowMovieModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1f1f1f] hover:bg-[#262626] text-white font-semibold cursor-pointer border border-[#333333]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold shadow-md shadow-[#E50914]/20 cursor-pointer"
                >
                  Save to Catalogue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
