import React, { useState } from 'react';
import { Play, Search, Bell, Shield, Crown, User as UserIcon, LogOut, Menu, X, Check, Film, Tv, Bookmark, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenSearch: () => void;
  onOpenPaywall: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenSearch,
  onOpenPaywall
}) => {
  const {
    user,
    isAdmin,
    isPremium,
    notifications,
    unreadNotificationCount,
    logout,
    switchDemoRole,
    markNotificationAsRead
  } = useAuth();
  const { showToast } = useToast();

  const [isScrolled, setIsScrolled] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Film },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'series', label: 'TV Shows', icon: Tv },
    { id: 'watchlist', label: 'My List', icon: Bookmark },
  ];

  return (
    <nav
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#000000]/95 backdrop-blur-md border-b border-[#262626] shadow-xl py-3'
          : 'bg-gradient-to-b from-[#000000]/95 via-[#000000]/70 to-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-8">
          <button
            id="nav-brand-logo"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-md bg-[#E50914] flex items-center justify-center shadow-lg shadow-[#E50914]/40 group-hover:scale-105 transition-transform text-white font-black text-lg">
              N
            </div>
            <span className="text-2xl font-black tracking-tighter text-[#E50914] font-syne uppercase">
              NOVA<span className="text-white">STREAM</span>
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => onNavigate(item.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  currentTab === item.id
                    ? 'text-white bg-[#1f1f1f] shadow-sm border border-[#333333]'
                    : 'text-[#A1A1AA] hover:text-white hover:bg-[#141414]'
                }`}
              >
                {item.label}
              </button>
            ))}

            {isAdmin && (
              <button
                id="nav-link-admin"
                onClick={() => onNavigate('admin')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'admin'
                    ? 'text-[#E50914] bg-[#E50914]/15 border border-[#E50914]/40'
                    : 'text-[#A1A1AA] hover:text-[#E50914] hover:bg-[#141414]'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#E50914]" />
                Admin Hub
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Switcher for evaluation */}
          <div className="hidden xl:flex items-center bg-[#141414] border border-[#262626] rounded-full p-0.5 text-xs">
            <button
              onClick={() => {
                switchDemoRole('admin');
                showToast('Switched to Admin Role (Full Admin Hub & Settings)', 'info');
              }}
              className={`px-2.5 py-1 rounded-full font-bold text-[11px] tracking-wide transition-all cursor-pointer ${
                isAdmin ? 'bg-[#E50914] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
              }`}
              title="Switch to Administrator session"
            >
              Admin
            </button>
            <button
              onClick={() => {
                switchDemoRole('premium');
                showToast('Switched to Premium Customer (VIP Subscriber, Active)', 'info');
              }}
              className={`px-2.5 py-1 rounded-full font-bold text-[11px] tracking-wide transition-all cursor-pointer ${
                !isAdmin && isPremium ? 'bg-[#E50914] text-white shadow-sm' : 'text-[#A1A1AA] hover:text-white'
              }`}
              title="Switch to Normal Premium Customer"
            >
              Premium
            </button>
            <button
              onClick={() => {
                switchDemoRole('free');
                showToast('Switched to Free Viewer Role (Standard Catalog)', 'info');
              }}
              className={`px-2.5 py-1 rounded-full font-bold text-[11px] tracking-wide transition-all cursor-pointer ${
                !isAdmin && user?.plan === 'free' ? 'bg-[#262626] text-white' : 'text-[#A1A1AA] hover:text-white'
              }`}
              title="Switch to Free Viewer session"
            >
              Free
            </button>
            <button
              onClick={() => {
                switchDemoRole('expired');
                showToast('Switched to Expired User (Lapsed Subscription)', 'info');
              }}
              className={`px-2.5 py-1 rounded-full font-bold text-[11px] tracking-wide transition-all cursor-pointer ${
                !isAdmin && user?.subscriptionStatus === 'expired' ? 'bg-[#71717A] text-white' : 'text-[#A1A1AA] hover:text-white'
              }`}
              title="Switch to Expired Customer session"
            >
              Expired
            </button>
          </div>

          {/* Search Trigger */}
          <button
            id="nav-search-button"
            onClick={onOpenSearch}
            className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#141414] transition-colors cursor-pointer"
            aria-label="Search movies and series"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Premium Plan Button */}
          {!isPremium ? (
            <button
              id="nav-premium-upgrade-btn"
              onClick={onOpenPaywall}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold tracking-wider shadow-md shadow-[#E50914]/25 transition-all hover:scale-105 cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5 fill-current" />
              <span>₦2,500/mo</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('premium')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#E50914]/15 border border-[#E50914]/40 text-red-400 text-xs font-bold tracking-wide cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
              <span>Premium VIP</span>
            </button>
          )}

          {/* Notifications Popover */}
          <div className="relative">
            <button
              id="nav-notifications-btn"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#141414] transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#E50914] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                id="notifications-popover"
                className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="p-4 border-b border-[#262626] flex items-center justify-between bg-[#1f1f1f]">
                  <span className="font-bold text-sm text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#E50914]" />
                    Notifications
                  </span>
                  <span className="text-xs text-[#A1A1AA]">{notifications.length} total</span>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-[#262626]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-[#A1A1AA] text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif.id}
                        className={`p-3.5 transition-colors hover:bg-[#1f1f1f] ${
                          !notif.isRead ? 'bg-[#1a1a1a]' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-white">{notif.title}</h4>
                          {!notif.isRead && (
                            <button
                              onClick={() => markNotificationAsRead(notif.id)}
                              className="text-[#A1A1AA] hover:text-white p-0.5 cursor-pointer"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5 text-[#E50914]" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">{notif.message}</p>
                        <span className="text-[10px] text-zinc-500 mt-2 block">
                          {new Date(notif.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              id="nav-user-avatar-btn"
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#E50914] transition-all cursor-pointer"
            >
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop'}
                alt={user?.displayName || 'User Avatar'}
                className="w-8 h-8 rounded-full object-cover border border-[#262626]"
              />
            </button>

            {showUserMenu && (
              <div
                id="user-dropdown-menu"
                className="absolute right-0 mt-3 w-64 bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="px-3 py-2 border-b border-[#262626] mb-1 bg-[#1f1f1f] rounded-xl">
                  <p className="text-sm font-bold text-white truncate">{user?.displayName || 'Viewer'}</p>
                  <p className="text-xs text-[#A1A1AA] truncate">{user?.email}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPremium ? 'bg-[#E50914]/20 text-red-400 border border-[#E50914]/40' : 'bg-[#262626] text-[#A1A1AA]'
                    }`}>
                      {isPremium ? 'PREMIUM (₦2,500/mo)' : 'FREE PLAN'}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40">
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>

                <button
                  id="user-menu-profile"
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-[#A1A1AA]" />
                  Account & Subscriptions
                </button>

                <button
                  id="user-menu-watchlist"
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('watchlist');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white hover:bg-[#1f1f1f] transition-colors cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 text-[#A1A1AA]" />
                  My Watchlist
                </button>

                {isAdmin && (
                  <button
                    id="user-menu-admin"
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('admin');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#E50914] hover:bg-[#E50914]/15 transition-colors cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-[#E50914]" />
                    Admin Control Hub
                  </button>
                )}

                <button
                  id="user-menu-premium"
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate('premium');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-[#E50914]/15 transition-colors cursor-pointer"
                >
                  <Crown className="w-4 h-4 text-[#E50914]" />
                  Manage Premium Plan
                </button>

                <div className="border-t border-[#262626] my-1"></div>

                <button
                  id="user-menu-logout"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                    showToast('Signed out of NovaStream', 'info');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#E50914] hover:bg-[#E50914]/15 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            id="mobile-nav-toggle"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#141414] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {showMobileMenu && (
        <div
          id="mobile-drawer"
          className="md:hidden bg-[#141414] border-b border-[#262626] px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200 shadow-2xl"
        >
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setShowMobileMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold tracking-wide cursor-pointer ${
                currentTab === item.id
                  ? 'bg-[#E50914] text-white'
                  : 'text-[#A1A1AA] hover:bg-[#1f1f1f] hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}

          {isAdmin && (
            <button
              onClick={() => {
                onNavigate('admin');
                setShowMobileMenu(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40'
                  : 'text-[#E50914] hover:bg-[#1f1f1f]'
              }`}
            >
              <Shield className="w-5 h-5 text-[#E50914]" />
              Admin Hub
            </button>
          )}

          <div className="pt-2 border-t border-[#262626] flex items-center justify-between">
            <button
              onClick={() => {
                onNavigate('premium');
                setShowMobileMenu(false);
              }}
              className="flex items-center gap-2 text-xs font-bold text-[#E50914] bg-[#E50914]/15 px-3 py-2 rounded-lg border border-[#E50914]/40 cursor-pointer"
            >
              <Crown className="w-4 h-4" />
              Premium ₦2,500/mo
            </button>

            <button
              onClick={() => {
                switchDemoRole(isAdmin ? 'user' : 'admin');
                setShowMobileMenu(false);
                showToast(`Switched to ${isAdmin ? 'Viewer' : 'Admin'} Mode`, 'info');
              }}
              className="text-xs font-semibold text-[#A1A1AA] bg-[#1f1f1f] px-3 py-2 rounded-lg border border-[#262626] cursor-pointer"
            >
              Toggle ({isAdmin ? 'Admin' : 'User'})
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
