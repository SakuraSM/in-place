import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './providers/AuthContext';
import ProtectedRoute from '../widgets/layout/ProtectedRoute';
import AppLayout from '../widgets/layout/AppLayout';
import ScrollToTop from '../shared/ui/ScrollToTop';

const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const HomePage = lazy(() => import('../features/inventory/pages/HomePage'));
const ItemDetailPage = lazy(() => import('../features/inventory/pages/ItemDetailPage'));
const SearchPage = lazy(() => import('../features/inventory/pages/SearchPage'));
const ScanPage = lazy(() => import('../features/inventory/pages/ScanPage'));
const ProfilePage = lazy(() => import('../features/profile/pages/ProfilePage'));
const AiSettingsPage = lazy(() => import('../features/profile/pages/AiSettingsPage'));
const SecurityPage = lazy(() => import('../features/profile/pages/SecurityPage'));
const DataManagementPage = lazy(() => import('../features/profile/pages/DataManagementPage'));
const CategoriesPage = lazy(() => import('../features/inventory/pages/CategoriesPage'));
const TagsPage = lazy(() => import('../features/tags/pages/TagsPage'));
const ContainerDetailPage = lazy(() => import('../features/inventory/pages/ContainerDetailPage'));
const LocationTreePage = lazy(() => import('../features/inventory/pages/LocationTreePage'));
const ActivityPage = lazy(() => import('../features/activity/pages/ActivityPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),
      staleTime: 1000 * 60 * 5,
    },
  },
});

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm font-medium text-slate-500">
      正在加载页面…
    </div>
  );
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<ProtectedPage><HomePage /></ProtectedPage>} />
              <Route path="/item/:id" element={<ProtectedPage><ItemDetailPage /></ProtectedPage>} />
              <Route path="/container/:id" element={<ProtectedPage><ContainerDetailPage /></ProtectedPage>} />
              <Route path="/overview" element={<ProtectedPage><SearchPage /></ProtectedPage>} />
              <Route path="/locations" element={<ProtectedPage><LocationTreePage /></ProtectedPage>} />
              <Route path="/activity" element={<ProtectedPage><ActivityPage /></ProtectedPage>} />
              <Route path="/search" element={<Navigate to="/overview" replace />} />
              <Route path="/scan" element={<ProtectedPage><ScanPage /></ProtectedPage>} />
              <Route path="/profile" element={<ProtectedPage><ProfilePage /></ProtectedPage>} />
              <Route path="/profile/ai" element={<ProtectedPage><AiSettingsPage /></ProtectedPage>} />
              <Route path="/profile/security" element={<ProtectedPage><SecurityPage /></ProtectedPage>} />
              <Route path="/profile/data" element={<ProtectedPage><DataManagementPage /></ProtectedPage>} />
              <Route path="/categories" element={<ProtectedPage><CategoriesPage /></ProtectedPage>} />
              <Route path="/tags" element={<ProtectedPage><TagsPage /></ProtectedPage>} />
              <Route path="/notes" element={<Navigate to="/tags" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
