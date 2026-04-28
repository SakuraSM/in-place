import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthSession, AuthUser } from '@inplace/domain';
import { ApiError } from '@inplace/api-client';
import { secureTokenStorage } from '@/platform/auth/secureTokenStorage';
import { loadPersistedMobileApiBaseUrl, mobileApiClient, saveMobileApiBaseUrl, setMobileApiBaseUrl } from '@/shared/api/mobileClient';

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string, apiBaseUrl: string) => Promise<void>;
  signUp: (email: string, password: string, apiBaseUrl: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setCurrentUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      await loadPersistedMobileApiBaseUrl();
      const token = await secureTokenStorage.get();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await mobileApiClient.request<{ user: AuthUser }>('/v1/auth/me');
        setSession({ token });
        setUser(response.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await secureTokenStorage.set(null);
        }

        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      async signIn(email: string, password: string, apiBaseUrl: string) {
        setMobileApiBaseUrl(apiBaseUrl);
        const response = await mobileApiClient.request<{ token: string; user: AuthUser }>('/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          skipAuth: true,
        });

        await saveMobileApiBaseUrl(apiBaseUrl);
        await secureTokenStorage.set(response.token);
        setSession({ token: response.token });
        setUser(response.user);
      },
      async signUp(email: string, password: string, apiBaseUrl: string) {
        setMobileApiBaseUrl(apiBaseUrl);
        const response = await mobileApiClient.request<{ token: string; user: AuthUser }>('/v1/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          skipAuth: true,
        });

        await saveMobileApiBaseUrl(apiBaseUrl);
        await secureTokenStorage.set(response.token);
        setSession({ token: response.token });
        setUser(response.user);
      },
      async signOut() {
        await secureTokenStorage.set(null);
        setSession(null);
        setUser(null);
      },
      async refreshUser() {
        const response = await mobileApiClient.request<{ user: AuthUser }>('/v1/auth/me');
        setUser(response.user);
      },
      setCurrentUser: setUser,
    }),
    [loading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
