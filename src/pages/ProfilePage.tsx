import React, { useState, useEffect } from 'react';
import { User as UserIcon, Crown, Shield, CreditCard, Clock, CheckCircle2, AlertTriangle, LogOut, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PaymentRecord, WatchProgress } from '../types';

interface ProfilePageProps {
  onOpenPaywall: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenPaywall }) => {
  const { user, isPremium, isAdmin, updateProfile, logout, refreshUserData } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [watchProgress, setWatchProgress] = useState<WatchProgress[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName);
      setAvatar(user.avatar);
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const [payRes, progRes] = await Promise.all([
        fetch('/api/payments/my-history'),
        fetch('/api/watch-progress')
      ]);
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(payData);
      }
      if (progRes.ok) {
        const progData = await progRes.json();
        setWatchProgress(progData);
      }
    } catch (err) {
      console.error('Failed to load user profile data:', err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    const ok = await updateProfile(displayName, avatar);
    setIsUpdating(false);
    if (ok) {
      showToast('Profile updated successfully', 'success');
    } else {
      showToast('Failed to update profile', 'error');
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your Premium subscription? You will retain access until the end of your current billing cycle.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await refreshUserData();
        showToast('Subscription cancelled successfully', 'info');
      } else {
        showToast(data.error || 'Failed to cancel subscription', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error cancelling subscription', 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 space-y-10 text-white">
      {/* Header */}
      <div className="border-b border-[#262626] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif-display font-black text-white flex items-center gap-3">
            <UserIcon className="w-8 h-8 text-[#E50914]" />
            Account & Subscriptions
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1 font-medium">
            Manage your credentials, VIP membership, and Paystack billing history.
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-white border border-[#333333] text-xs font-semibold self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-[#E50914]" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="flex items-center gap-4">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop'}
                alt={user?.displayName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#333333] shadow-sm"
              />
              <div className="space-y-1">
                <h3 className="font-serif-display font-bold text-white text-lg truncate">{user?.displayName}</h3>
                <p className="text-xs text-[#A1A1AA] truncate">{user?.email}</p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isPremium ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40' : 'bg-[#1f1f1f] text-[#A1A1AA] border border-[#333333]'
                  }`}>
                    {isPremium ? 'PREMIUM VIP' : 'FREE VIEWER'}
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">
                      ADMIN
                    </span>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4 border-t border-[#262626]">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A1A1AA]">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A1A1AA]">Avatar Image URL</label>
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full bg-[#1f1f1f] border border-[#333333] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#E50914]"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Subscription & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Status Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider block">
                  Current Plan
                </span>
                <h3 className="text-2xl font-serif-display font-black text-white flex items-center gap-2 mt-1">
                  {isPremium ? (
                    <>
                      <Crown className="w-6 h-6 text-[#E50914] fill-[#E50914]" />
                      NovaStream Premium VIP
                    </>
                  ) : (
                    'Free Standard Plan'
                  )}
                </h3>
              </div>

              {isPremium ? (
                <div className="text-right">
                  <span className="text-2xl font-bold text-white font-mono">₦2,500</span>
                  <span className="text-xs text-[#A1A1AA]"> / month</span>
                </div>
              ) : (
                <button
                  onClick={onOpenPaywall}
                  className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-xs shadow-md shadow-[#E50914]/20 transition-all hover:scale-105 cursor-pointer"
                >
                  Upgrade to Premium (₦2,500/mo)
                </button>
              )}
            </div>

            {/* Expired Subscription Alert */}
            {user?.subscriptionStatus === 'expired' && (
              <div className="p-4 rounded-2xl bg-red-950/80 border border-red-700/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-red-300 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-[#E50914]" />
                    Subscription Expired & Inactive
                  </span>
                  <span className="text-red-300 font-mono text-[11px] font-semibold">
                    Lapsed {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : 'recently'}
                  </span>
                </div>
                <p className="text-xs text-zinc-300">
                  Your VIP benefits are currently suspended. Re-activate your subscription to resume streaming exclusive 4K titles and episodic series.
                </p>
                <div className="pt-2 border-t border-red-700/40 flex justify-end">
                  <button
                    onClick={onOpenPaywall}
                    className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                  >
                    Re-Activate VIP (₦2,500/mo)
                  </button>
                </div>
              </div>
            )}

            {isPremium && (
              <div className="p-4 rounded-2xl bg-[#1f1f1f] border border-[#262626] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A1A1AA]">Subscription Status:</span>
                  <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {user?.subscriptionStatus || 'Active'}
                  </span>
                </div>
                {user?.subscriptionExpiresAt && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#A1A1AA]">Current Billing Period Ends:</span>
                    <span className="text-white font-mono font-medium">
                      {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#262626] flex justify-end">
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isCancelling || user?.subscriptionStatus === 'cancelled'}
                    className="text-xs text-[#E50914] hover:text-[#b80710] font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {user?.subscriptionStatus === 'cancelled' ? 'Subscription Cancelled' : 'Cancel Subscription'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment History Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-lg font-serif-display font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#E50914]" />
              Paystack Billing & Receipts
            </h3>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-[#71717A] text-xs">
                No past transactions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#262626] text-[#A1A1AA] uppercase tracking-wider font-bold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Reference</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262626]">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-[#1f1f1f] transition-colors">
                        <td className="py-3 px-3 text-white">
                          {new Date(p.paymentDate).toLocaleDateString()}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
