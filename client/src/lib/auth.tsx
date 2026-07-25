import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api, tokenStore } from './api';

export type Role = 'admin' | 'pharmacist' | 'cashier';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Auto-logout after 30 minutes of inactivity. The deadline is persisted so it
// also applies across page reloads and closing/reopening the browser.
const IDLE_LIMIT_MS = 30 * 60 * 1000;
const EXPIRY_KEY = 'pharmacy_session_expiry';

function extendSession() {
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + IDLE_LIMIT_MS));
}
function clearSession() {
  localStorage.removeItem(EXPIRY_KEY);
}
function sessionExpired(): boolean {
  const raw = localStorage.getItem(EXPIRY_KEY);
  return raw !== null && Date.now() > Number(raw);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    clearSession();
    setUser(null);
    window.location.href = '/';
  }, []);

  useEffect(() => {
    (async () => {
      if (!tokenStore.access && !tokenStore.refresh) {
        setLoading(false);
        return;
      }
      // A stored session that has already gone idle for 30+ min is dead.
      if (sessionExpired()) {
        tokenStore.clear();
        clearSession();
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        extendSession();
      } catch {
        tokenStore.clear();
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // While logged in, treat user activity as keeping the session alive, and
  // check periodically whether the 30-minute idle deadline has passed.
  useEffect(() => {
    if (!user) return;

    let lastBump = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastBump > 5000) {
        lastBump = now;
        extendSession();
      }
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const interval = window.setInterval(() => {
      if (sessionExpired()) logout();
    }, 15000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(interval);
    };
  }, [user, logout]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStore.set(data.accessToken, data.refreshToken);
    extendSession();
    setUser(data.user);
  };

  // Admin can do everything; otherwise role must be in the list.
  const can = (...roles: Role[]) =>
    !!user && (user.role === 'admin' || roles.includes(user.role));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
