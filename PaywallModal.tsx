import React, { useState } from 'react';
import { Crown, CheckCircle2, ShieldCheck, Sparkles, X, Loader2, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface PaywallModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({ onClose, onSuccess }) => {
  const { user, refreshUserData } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePaystackCheckout = async () => {
    if (!user) {
      showToast('Please sign in or select a demo profile to continue', 'error');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Initialize Paystack transaction on server
      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callbackUrl: `${window.location.origin}/premium/callback`
        })
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.status || !initData.data) {
        throw new Error(initData.error || initData.message || 'Failed to initialize Paystack session');
      }

      const reference = initData.data.reference;

      // 2. Complete payment verification via server endpoint
      const verifyRes = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.success) {
        setSuccessMode(true);
        await refreshUserData();
        showToast('NovaStream Premium Activated (₦2,500/mo)', 'success');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(verifyData.message || 'Payment verification failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during payment processing');
    } finally {
      setLoading(false);
    }
  };

  const perks = [
    'Unlimited 4K Ultra HD & 1080p Cinema Streaming',
    '100% Ad-Free Cinematic Experience',
    'Multi-Device Real-Time Watch Progress Sync',
    'Unlimited Watchlists & Offline Tracking',
    'Verified Legal Open Archive & CC Masterworks',
    'Cancel Anytime — No Long-Term Contracts'
  ];

  return (
    <div
      id="paywall-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain p-4 touch-pan-y text-white"
    >
      <div
        id="paywall-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg mx-auto my-8 bg-[#141414] border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Glow background accents */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-64 h-64 bg-[#E50914]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#1f1f1f] hover:bg-[#262626] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer border border-[#333333]"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!successMode ? (
          <div className="space-y-6 text-center sm:text-left">
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 fill-current" />
                NOVASTREAM PREMIUM VIP
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif-display font-bold text-white tracking-tight">
                Upgrade to Premium Cinema
              </h2>
              <p className="text-sm text-[#A1A1AA]">
                Direct integration with Paystack secure gateway.
              </p>
            </div>

            {/* Price Box */}
            <div className="p-5 rounded-2xl bg-[#1f1f1f] border border-[#262626] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider block">
                  Monthly Subscription
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                    ₦2,500
                  </span>
                  <span className="text-xs text-[#A1A1AA] font-medium">/ month</span>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#E50914] text-[11px] font-bold">
                  Billed in NGN
                </span>
              </div>
            </div>

            {/* Perks List */}
            <div className="space-y-2.5 text-left">
              {perks.map((perk, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{perk}</span>
                </div>
              ))}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-700/50 text-xs text-red-300 text-left">
                {errorMessage}
              </div>
            )}

            {/* Checkout Action Button */}
            <div className="space-y-3 pt-2">
              <button
                id="paystack-checkout-submit-btn"
                onClick={handlePaystackCheckout}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-sm sm:text-base shadow-xl shadow-[#E50914]/25 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing with Paystack...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ₦2,500 with Paystack</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#A1A1AA]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit Encrypted Paystack Transaction • Instant Access</span>
              </div>
            </div>
          </div>
        ) : (
          /* Success Activation View */
          <div className="text-center py-6 space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-950/80 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-serif-display font-bold text-white">
                Premium Activated!
              </h2>
              <p className="text-sm text-[#A1A1AA] max-w-sm mx-auto">
                Welcome to NovaStream VIP. Your ₦2,500/month plan is active with unlimited 4K streaming.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#1f1f1f] border border-[#262626] text-left text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-[#A1A1AA]">
                <span>Plan:</span>
                <span className="text-emerald-400 font-bold">PREMIUM VIP</span>
              </div>
              <div className="flex justify-between text-[#A1A1AA]">
                <span>Amount:</span>
                <span className="text-white font-bold">₦2,500.00 / mo</span>
              </div>
              <div className="flex justify-between text-[#A1A1AA]">
                <span>Account:</span>
                <span className="text-white truncate">{user?.email}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#E50914] text-white font-bold text-sm hover:bg-[#b80710] transition-colors cursor-pointer"
            >
              Start Watching Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
