import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  activeLlm: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  apiFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeLlm, setActiveLlm] = useState('');
  const [loading, setLoading] = useState(true);

  const apiFetch = useCallback((input: RequestInfo, init?: RequestInit) => {
    return fetch(input, { ...init, credentials: 'include' });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setActiveLlm(data.activeLlm || '');
      } else {
        setUser(null);
        setActiveLlm('');
      }
    } catch {
      setUser(null);
    }
  }, [apiFetch]);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    await refreshUser();
  };

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setActiveLlm('');
  };

  return (
    <AuthContext.Provider value={{ user, activeLlm, loading, login, logout, refreshUser, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
