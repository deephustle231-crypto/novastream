import React from 'react';
import { Crown, Check, X, ShieldCheck, Sparkles, Zap, Film, Award, HeartHandshake } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PremiumPageProps {
  onOpenPaywall: () => void;
}

export const PremiumPage: React.FC<PremiumPageProps> = ({ onOpenPaywall }) => {
  const { isPremium, user } = useAuth();

  const comparisonFeatures = [
    { title: 'Public Domain & CC Catalog Access', free: 'Standard', premium: 'Unlimited High-Fidelity' },
    { title: 'Stream Resolution Quality', free: '720p HD', premium: '4K Ultra HD & 1080p 60fps' },
    { title: 'Advertisements / Interruptions', free: 'Occasional Notice', premium: '100% Zero Ads' },
    { title: 'Episodic TV Shows & Multi-Seasons', free: 'Pilot Episodes Only', premium: 'Full Seasons & Bonus Content' },
    { title: 'Multi-Device Watch Progress Sync', free: 'Single Browser Only', premium: 'Cloud Synced Across All Devices' },
    { title: 'Priority High-Bandwidth Server Route', free: 'Standard', premium: 'Dedicated Multi-Mirror CDN' },
    { title: 'Download Offline Trackers', free: false, premium: true },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 space-y-12 text-white">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-red-400 text-xs font-bold uppercase tracking-wider shadow-sm">
          <Crown className="w-4 h-4 fill-current" />
          <span>NOVASTREAM CINEMA VIP ACCESS</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-black text-white tracking-tight leading-tight">
          Experience Pure Cinema in <span className="text-[#E50914]">4K Ultra HD</span>
        </h1>
        <p className="text-base sm:text-lg text-[#A1A1AA] leading-relaxed font-normal">
          Upgrade to NovaStream Premium for just <span className="text-white font-bold font-mono">₦2,500/month</span> with seamless Paystack processing, zero interruptions, and unlimited verified streams.
        </p>

        <div className="pt-4">
          {!isPremium ? (
            <button
              id="premium-page-cta-btn"
              onClick={onOpenPaywall}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-base shadow-xl shadow-[#E50914]/25 transition-all hover:scale-105 cursor-pointer"
            >
              <Crown className="w-5 h-5 fill-current" />
              Subscribe Now for ₦2,500/month
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 font-bold text-sm">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span>You are an active Premium VIP Subscriber</span>
            </div>
          )}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 sm:p-8 border-b border-[#262626]">
          <h2 className="text-xl sm:text-2xl font-serif-display font-bold text-white">
            Plan Comparison
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A1AA] mt-1 font-medium">
            Transparent breakdown of Free Viewer vs Premium VIP memberships.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] bg-[#1a1a1a] text-xs uppercase tracking-wider text-[#A1A1AA]">
                <th className="py-4 px-6 font-bold">Feature</th>
                <th className="py-4 px-6 font-bold">Free Viewer</th>
                <th className="py-4 px-6 font-bold text-[#E50914]">Premium VIP (₦2,500/mo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] text-sm">
              {comparisonFeatures.map((feat, idx) => (
                <tr key={idx} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-4 px-6 font-semibold text-white">
                    {feat.title}
                  </td>
                  <td className="py-4 px-6 text-[#A1A1AA]">
                    {typeof feat.free === 'boolean' ? (
                      feat.free ? <Check className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-zinc-600" />
                    ) : (
                      feat.free
                    )}
                  </td>
                  <td className="py-4 px-6 text-[#E50914] font-bold">
                    {typeof feat.premium === 'boolean' ? (
                      feat.premium ? <Check className="w-5 h-5 text-emerald-400" /> : <X className="w-5 h-5 text-zinc-600" />
                    ) : (
                      <span className="flex items-center gap-1.5 text-red-400">
                        <Sparkles className="w-4 h-4 text-[#E50914] shrink-0" />
                        {feat.premium}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-2 shadow-sm">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#E50914]" />
            How does Paystack billing work?
          </h3>
          <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed font-normal">
            Your monthly fee of ₦2,500 is processed securely through Paystack. You can pay with bank cards, bank transfer, or USSD with instant activation and confirmation.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-2 shadow-sm">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Can I cancel anytime?
          </h3>
          <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed font-normal">
            Yes! There are no long-term contracts. You can cancel your subscription anytime directly in your account dashboard with a single click.
          </p>
        </div>
      </div>
    </div>
  );
};
