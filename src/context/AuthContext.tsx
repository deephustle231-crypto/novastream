import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, NotificationItem } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  login: (email: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (displayName: string, avatar: string) => Promise<boolean>;
  switchDemoRole: (role: 'admin' | 'premium' | 'free' | 'expired' | 'user') => Promise<void>;
  simulateSessionContext: (config: { plan?: 'free' | 'premium'; subscriptionStatus?: 'active' | 'expired' | 'inactive'; role?: 'user' | 'admin' }) => Promise<boolean>;
  markNotificationAsRead: (id: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getCleanToken = (raw: string | null): string | null => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === '[object Object]') {
    return null;
  }
  // Check for ASCII valid characters without CR/LF or control chars
  if (/[\r\n\t\0]/.test(trimmed)) return null;
  return trimmed;
};

const getAuthHeaders = (token: string | null): Record<string, string> => {
  const clean = getCleanToken(token);
  const headers: Record<string, string> = {
    'Accept': 'application/json'
  };
  if (clean) {
    headers['Authorization'] = `Bearer ${clean}`;
  }
  return headers;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return getCleanToken(localStorage.getItem('novastream_token'));
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Fallback: auto-login as admin or demo user on initial load for instant seamless UX
        const demoRes = await fetch('/api/auth/demo-switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ role: 'admin' })
        });
        if (demoRes.ok) {
          const demoData = await demoRes.json();
          setUser(demoData.user);
          const safeToken = getCleanToken(demoData.token);
          setToken(safeToken);
          if (safeToken) {
            localStorage.setItem('novastream_token', safeToken);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load authenticated user session:', err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      // Non-blocking warning instead of unhandled error
      console.warn('Unable to refresh notifications:', err);
    }
  }, [user, token]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const login = async (email: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('novastream_token', data.token);
        return { success: true };
      }
      return { success: false, error: data.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const register = async (email: string, displayName?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName })
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('novastream_token', data.token);
        return { success: true };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('novastream_token');
  };

  const updateProfile = async (displayName: string, avatar: string) => {
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ displayName, avatar })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const switchDemoRole = async (role: 'admin' | 'premium' | 'free' | 'expired' | 'user') => {
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        const safeToken = getCleanToken(data.token);
        setToken(safeToken);
        if (safeToken) {
          localStorage.setItem('novastream_token', safeToken);
        }
      }
    } catch (err) {
      console.warn('Demo switch failed:', err);
    }
  };

  const simulateSessionContext = async (config: {
    plan?: 'free' | 'premium';
    subscriptionStatus?: 'active' | 'expired' | 'inactive';
    role?: 'user' | 'admin';
  }) => {
    try {
      const res = await fetch('/api/admin/dev/simulate-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...getAuthHeaders(token)
        },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.token) {
          const safeToken = getCleanToken(data.token);
          setToken(safeToken);
          if (safeToken) {
            localStorage.setItem('novastream_token', safeToken);
          }
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Session context simulation error:', err);
      return false;
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const refreshUserData = async () => {
    await fetchUser();
  };

  const isPremium = user?.plan === 'premium' && user?.subscriptionStatus === 'active';
  const isAdmin = user?.role === 'admin';
  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isPremium,
        isAdmin,
        notifications,
        unreadNotificationCount,
        login,
        register,
        logout,
        updateProfile,
        switchDemoRole,
        simulateSessionContext,
        markNotificationAsRead,
        refreshUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
