import { createContext, useContext, useState, type ReactNode } from 'react';
import { request, setAuth, clearAuth, takePendingProfile, clearPendingProfile } from './api';
import type { LoginData, User, UserProfile } from './types';

interface AuthState {
  user: User | null;
  /** 返回是否应用了游客暂存画像(用于决定登录后是否直接生成推荐) */
  login: (username: string, password: string) => Promise<boolean>;
  register: (payload: Record<string, unknown>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('currentUser');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);

  const login = async (username: string, password: string): Promise<boolean> => {
    const data = await request<LoginData>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    setAuth(data.token, JSON.stringify(data.user));
    setUser(data.user);
    // 游客问卷获客钩子:登录后自动保存问卷画像
    const pending = takePendingProfile() as UserProfile | null;
    if (pending) {
      try {
        await request<UserProfile>('/api/profile', { method: 'PUT', body: pending });
        clearPendingProfile();
        return true;
      } catch {
        // 保存失败不阻塞登录,后续问卷流程会再次引导
      }
    }
    return false;
  };

  const register = async (payload: Record<string, unknown>) => {
    await request<User>('/api/auth/register', { method: 'POST', body: payload });
  };

  const logout = () => {
    clearAuth();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
