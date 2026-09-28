import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { request } from './lib/api';
import { useAuth } from './lib/auth';
import type { UserProfile } from './lib/types';
import Layout from './components/Layout';
import GuestShell from './components/GuestShell';
import GuestHomePage from './pages/GuestHomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import HomePage from './pages/HomePage';
import AssistantPage from './pages/AssistantPage';
import CompetitionsPage from './pages/CompetitionsPage';
import CompetitionDetailPage from './pages/CompetitionDetailPage';
import CalendarPage from './pages/CalendarPage';
import FavoritesPage from './pages/FavoritesPage';
import PlansPage from './pages/PlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import ReposPage from './pages/ReposPage';
import RepoDetailPage from './pages/RepoDetailPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import ForumPage from './pages/ForumPage';
import ForumPostPage from './pages/ForumPostPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import RechargePage from './pages/RechargePage';

/** 需要登录的壳 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/** 登录后自动跳转画像问卷（管理员豁免；检查进行中不重定向，避免竞态） */
function RequireProfile({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      setProfile({ discipline: 'admin' });
      setChecking(false);
      return;
    }
    let alive = true;
    setChecking(true);
    request<UserProfile>('/api/profile')
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [user, location.pathname]);

  if (profile === undefined) return null;
  const fromOnboarding = Boolean((location.state as { fresh?: boolean } | null)?.fresh);
  if (
    !checking &&
    profile === null &&
    !fromOnboarding &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

/** 已登录访问登录/注册页时直接进主页 */
function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** 游客共享页外壳:未登录用 GuestShell,已登录走主布局(带画像引导) */
function SharedShell() {
  const { user } = useAuth();
  if (!user) return <GuestShell />;
  return (
    <RequireProfile>
      <Layout />
    </RequireProfile>
  );
}

/** 首页:游客看落地页,已登录看推荐 */
function HomeRoute() {
  const { user } = useAuth();
  if (!user) return <GuestShell />;
  return (
    <RequireProfile>
      <Layout />
    </RequireProfile>
  );
}

/** 首页内容按登录态切换 */
function HomeIndex() {
  const { user } = useAuth();
  return user ? <HomePage /> : <GuestHomePage />;
}

/** 画像问卷:游客带落地页头,已登录走主布局 */
function OnboardingRoute() {
  const { user } = useAuth();
  if (!user) return <GuestShell />;
  return (
    <RequireProfile>
      <Layout />
    </RequireProfile>
  );
}

/** 生产部署在后端 context-path /api 下时构建注入 /api；开发模式默认 '/' */
const ROUTER_BASE = import.meta.env.VITE_ROUTER_BASE || '/';

export default function App() {
  return (
    <BrowserRouter basename={ROUTER_BASE}>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <LoginPage />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <RegisterPage />
            </RedirectIfAuthed>
          }
        />

        {/* 游客可访问:首页落地页 */}
        <Route path="/" element={<HomeRoute />}>
          <Route index element={<HomeIndex />} />
        </Route>

        {/* 游客可访问:画像问卷(游客填完引导注册) */}
        <Route path="/onboarding" element={<OnboardingRoute />}>
          <Route index element={<OnboardingPage />} />
        </Route>

        {/* 游客可访问:竞赛库浏览 */}
        <Route element={<SharedShell />}>
          <Route path="/competitions" element={<CompetitionsPage />} />
          <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
        </Route>

        {/* 需要登录 */}
        <Route
          element={
            <RequireAuth>
              <RequireProfile>
                <Layout />
              </RequireProfile>
            </RequireAuth>
          }
        >
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:id" element={<TeamDetailPage />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/posts/:id" element={<ForumPostPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
          <Route path="/repos" element={<ReposPage />} />
          <Route path="/repos/:id" element={<RepoDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/recharge" element={<RechargePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
