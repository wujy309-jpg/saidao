import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  request,
  setAuth,
  clearAuth,
  takePendingProfile,
  clearPendingProfile,
  onAuthExpired,
  resetAuthExpired,
} from './api';
import type { LoginData, User, UserProfile, AccountDTO } from '../types';

interface AuthState {
  user: User | null;
  /** 返回是否应用了游客暂存画像(用于决定登录后是否直接生成推荐) */
  login: (username: string, password: string) => Promise<boolean>;
  register: (payload: Record<string, unknown>) => Promise<void>;
  logout: () => void;
  /**
   * 局部更新登录用户并同步 localStorage。
   * 改昵称/头像后必须调用，否则顶栏还显示旧昵称，看起来像「保存失败」。
   */
  updateUser: (patch: Partial<User>) => void;
  /** 从服务端拉取最新账号信息（换设备/多标签页时对齐展示名与头像） */
  refreshUser: () => Promise<void>;
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

  // 接口层判定登录态失效（token 过期/被拒）时，同步清掉内存中的用户，
  // 否则顶部仍显示着缓存在 localStorage 的用户名，看起来像「已登录但页面卡住」
  useEffect(() => onAuthExpired(() => setUser(null)), []);

  // 头像上线前登录的用户，localStorage 里的用户对象没有 avatarUrl 字段。
  // 这类老登录态要补拉一次账号信息，否则他们得重新登录才能看到自己的头像。
  // 用「字段不存在」而不是「值为空」判断：值为 null 代表服务端已确认是默认头像，不必再问。
  useEffect(() => {
    const stored = readStoredUser();
    if (stored && stored.avatarUrl === undefined) {
      void refreshUser().catch(() => undefined);
    }
    // 只在挂载时补一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const data = await request<LoginData>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    setAuth(data.token, JSON.stringify(data.user));
    resetAuthExpired();
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

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem('currentUser', JSON.stringify(next));
      return next;
    });
  };

  const refreshUser = async () => {
    const me = await request<AccountDTO>('/api/account/me');
    if (!me) return;
    updateUser({
      name: me.name,
      avatarUrl: me.avatarUrl ?? null,
      reputation: me.reputation ?? undefined,
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
