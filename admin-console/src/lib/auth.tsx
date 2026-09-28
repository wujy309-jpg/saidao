import { createContext, useContext, useState, type ReactNode } from 'react';
import { clearAuth, getStoredUser, request, setAuth } from './api';
import type { AdminUser } from './types';

interface AuthState {
  user: AdminUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  login: async () => {},
  logout: () => {},
});

interface LoginResponse {
  token: string;
  user: { id: number; username: string; name: string; role: string };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const stored = getStoredUser<AdminUser>();
    if (stored && stored.role === 'ADMIN') return stored;
    clearAuth();
    return null;
  });

  const login = async (username: string, password: string) => {
    const data = await request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
      skipAuthRedirect: true,
    });
    if (data.user.role !== 'ADMIN') {
      throw new Error('该账号不是管理员，无法进入运营后台');
    }
    setAuth(data.token, data.user);
    setUser(data.user);
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
