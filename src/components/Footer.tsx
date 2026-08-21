import React from 'react';
import { ShieldCheck, Film } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="main-footer" className="bg-[#000000] border-t border-[#262626] text-[#A1A1AA] text-xs py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#E50914] flex items-center justify-center text-white">
                <Film className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-white font-syne text-base tracking-wider">
                NOVA<span className="text-[#E50914]">STREAM</span>
              </span>
            </div>
            <p className="text-[#A1A1AA] leading-relaxed text-xs max-w-md">
              NovaStream is a modern cinematic streaming platform exclusively cataloging verified open-source, Creative Commons (CC-BY, CC0), and public domain masterworks with multi-mirror server playback and Paystack billing.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Legal & Open Archive Verified Catalogue</span>
            </div>
          </div>

          {/* Legal Compliance */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Licensing & Rights
            </h4>
            <ul className="space-y-1.5 text-[#A1A1AA]">
              <li>Creative Commons Attribution 3.0 & 4.0</li>
              <li>Public Domain Dedication (CC0)</li>
              <li>Internet Archive Open Collections</li>
              <li>Blender Open Movies Initiative</li>
              <li>Digital Millennium Rights Compliance</li>
            </ul>
          </div>

          {/* Platform & Billing */}
          <div className="space-y-2">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
              Platform & Subscriptions
            </h4>
            <ul className="space-y-1.5 text-[#A1A1AA]">
              <li>VIP Plan: ₦2,500 / month</li>
              <li>Secured by Paystack Gateway</li>
              <li>Multi-Server Mirror Switching Engine</li>
              <li>4K Ultra HD & 1080p Playback</li>
              <li>Zero Advertisements & Multi-Device Sync</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#262626] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <p>© {new Date().getFullYear()} NovaStream Cinema Platform. All Rights Reserved.</p>
          <div className="flex items-center gap-1 text-[#A1A1AA]">
            <span>Crafted for high-fidelity cinema streaming</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
