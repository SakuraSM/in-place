import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './providers/AuthContext';
import ProtectedRoute from '../widgets/layout/ProtectedRoute';
import AppLayout from '../widgets/layout/AppLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import HomePage from '../features/inventory/pages/HomePage';
import ItemDetailPage from '../features/inventory/pages/ItemDetailPage';
import SearchPage from '../features/inventory/pages/SearchPage';
import ScanPage from '../features/inventory/pages/ScanPage';
import ProfilePage from '../features/profile/pages/ProfilePage';
import AiSettingsPage from '../features/profile/pages/AiSettingsPage';
import SecurityPage from '../features/profile/pages/SecurityPage';
import DataManagementPage from '../features/profile/pages/DataManagementPage';
import CategoriesPage from '../features/inventory/pages/CategoriesPage';
import TagsPage from '../features/tags/pages/TagsPage';
import ScrollToTop from '../shared/ui/ScrollToTop';
import ContainerDetailPage from '../features/inventory/pages/ContainerDetailPage';
import LocationTreePage from '../features/inventory/pages/LocationTreePage';
import ActivityPage from '../features/activity/pages/ActivityPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <HomePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/item/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ItemDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/container/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ContainerDetailPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/overview"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SearchPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <LocationTreePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ActivityPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/search" element={<Navigate to="/overview" replace />} />
            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ScanPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <ProfilePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/ai"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <AiSettingsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/security"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <SecurityPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/data"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DataManagementPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CategoriesPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tags"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TagsPage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/notes" element={<Navigate to="/tags" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
