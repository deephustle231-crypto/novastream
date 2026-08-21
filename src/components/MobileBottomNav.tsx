import React from 'react';
import { Home, Film, Tv, Bookmark, Search } from 'lucide-react';
import { motion } from 'motion/react';

interface MobileBottomNavProps {
  currentTab: string;
  onNavigate: (tab: any) => void;
  onOpenSearch: () => void;
  watchlistCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onNavigate,
  onOpenSearch,
  watchlistCount
}) => {
  const navButtons = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'series', label: 'TV Shows', icon: Tv },
    { id: 'watchlist', label: 'My List', icon: Bookmark, badge: watchlistCount },
    { id: 'search', label: 'Search', icon: Search, action: 'search' },
  ];

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        // Ignore devices that block or lack vibration
      }
    }
  };

  const handleTabClick = (btn: (typeof navButtons)[0]) => {
    triggerHaptic();
    if (btn.action === 'search') {
      onOpenSearch();
    } else {
      onNavigate(btn.id);
    }
  };

  return (
    <nav
      id="netflix-mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#121212]/95 backdrop-blur-lg border-t border-[#262626] px-2 py-1.5 pb-safe flex items-center justify-around shadow-2xl select-none"
    >
      {navButtons.map((btn) => {
        const Icon = btn.icon;
        const isActive = currentTab === btn.id && !btn.action;

        return (
          <motion.button
            key={btn.id}
            id={`mobile-tab-${btn.id}`}
            whileTap={{ scale: 0.88 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            onClick={() => handleTabClick(btn)}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-colors cursor-pointer relative ${
              isActive ? 'text-[#E50914]' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            {/* Active Pill Glow Indicator */}
            {isActive && (
              <motion.div
                layoutId="activeMobileTabIndicator"
                className="absolute inset-0 bg-[#E50914]/10 rounded-xl border border-[#E50914]/30"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}

            <div className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={isActive ? { scale: [1, 1.22, 1], y: [0, -2, 0] } : { scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
              </motion.div>

              {typeof btn.badge === 'number' && btn.badge > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                  className="absolute -top-1 -right-2 bg-[#E50914] text-white text-[9px] font-black rounded-full px-1.5 py-0.2 min-w-[14px] text-center shadow-xs"
                >
                  {btn.badge > 99 ? '99+' : btn.badge}
                </motion.span>
              )}
            </div>

            <motion.span
              animate={isActive ? { scale: 1.05, y: -1 } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`text-[10px] tracking-tight mt-1 z-10 ${
                isActive ? 'font-bold text-white' : 'font-medium'
              }`}
            >
              {btn.label}
            </motion.span>
          </motion.button>
        );
      })}
    </nav>
  );
};
