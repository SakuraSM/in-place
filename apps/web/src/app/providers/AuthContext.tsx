import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest, setStoredAuthToken, getStoredAuthToken, ApiError } from '../../shared/api/client';
import type { AuthSession, AuthUser } from '@inplace/domain';

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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

  const refreshUser = async () => {
    const response = await apiRequest<{ user: AuthUser }>('/v1/auth/me');
    setUser(response.user);
  };

  const signIn = async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: AuthUser }>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    await setStoredAuthToken(response.token);
    setSession({ token: response.token });
    setUser(response.user);
  };

  const signUp = async (email: string, password: string) => {
    const response = await apiRequest<{ token: string; user: AuthUser }>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    await setStoredAuthToken(response.token);
    setSession({ token: response.token });
    setUser(response.user);
  };

  const signOut = async () => {
    await setStoredAuthToken(null);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, refreshUser, setCurrentUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
