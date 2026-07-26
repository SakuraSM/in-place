import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest, setStoredAuthToken, getStoredAuthToken, ApiError } from '../../shared/api/client';
import type { AuthSession, AuthUser } from '@inplace/domain';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = await getStoredAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest<{ user: AuthUser }>('/v1/auth/me');
        setSession({ token });
        setUser(response.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await setStoredAuthToken(null);
        }
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const refreshUser = useCallback(async () => {
    const response = await apiRequest<{ user: AuthUser }>('/v1/auth/me');
    setUser(response.user);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: AuthUser }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    await setStoredAuthToken(response.token);
    setSession({ token: response.token });
    setUser(response.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: AuthUser }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    await setStoredAuthToken(response.token);
    setSession({ token: response.token });
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    await setStoredAuthToken(null);
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
    setCurrentUser: setUser,
  }), [loading, refreshUser, session, signIn, signOut, signUp, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
