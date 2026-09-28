import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Shell from './components/Shell';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import TransactionsPage from './pages/TransactionsPage';
import PackagesPage from './pages/PackagesPage';
import CardsPage from './pages/CardsPage';
import OrdersPage from './pages/OrdersPage';
import ScenesPage from './pages/ScenesPage';
import SettingsPage from './pages/SettingsPage';
import CompetitionsPage from './pages/CompetitionsPage';
import type { ReactNode } from 'react';

/** 生产挂载 /api/admin/，开发默认 /admin */
const ROUTER_BASE = import.meta.env.VITE_ROUTER_BASE || '/admin';

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
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
            element={
              <RequireAdmin>
                <Shell />
              </RequireAdmin>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/scenes" element={<ScenesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/competitions" element={<CompetitionsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
