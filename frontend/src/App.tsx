import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AppLayout } from '@/components/layout/app-layout';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuthStore } from '@/stores/auth';
import { useEffect } from 'react';

// Pages
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard';
import { AppsPage } from '@/pages/apps';
import { DeployPage } from '@/pages/deploy';
import { AppDetailPage } from '@/pages/app-detail';
import { AppDeploymentsPage } from '@/pages/app-deployments';
import { AppEnvPage } from '@/pages/app-env';
import { AppDomainsPage } from '@/pages/app-domains';
import { AppLogsPage } from '@/pages/app-logs';
import { AppTerminalPage } from '@/pages/app-terminal';
import { AppSettingsPage } from '@/pages/app-settings';
import { DomainsPage } from '@/pages/domains';
import { DatabasesPage } from '@/pages/databases';
import { SettingsPage } from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <AuthGuard>
            <AppLayout />
          </AuthGuard>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/apps" element={<AppsPage />} />
        <Route path="/apps/new" element={<DeployPage />} />
        <Route path="/apps/:slug" element={<AppDetailPage />} />
        <Route path="/apps/:slug/deployments" element={<AppDeploymentsPage />} />
        <Route path="/apps/:slug/env" element={<AppEnvPage />} />
        <Route path="/apps/:slug/domains" element={<AppDomainsPage />} />
        <Route path="/apps/:slug/logs" element={<AppLogsPage />} />
        <Route path="/apps/:slug/terminal" element={<AppTerminalPage />} />
        <Route path="/apps/:slug/settings" element={<AppSettingsPage />} />
        <Route path="/domains" element={<DomainsPage />} />
        <Route path="/databases" element={<DatabasesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #3f3f46',
            color: '#fafafa',
          },
        }}
      />
    </QueryClientProvider>
  );
}
