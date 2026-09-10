import React, { useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api, type AuthMeResponse } from '../lib/api';
import { AuthContext, type AuthContextType } from './auth-context';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [backendUser, setBackendUser] = useState<AuthMeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthenticationState = useCallback(async (): Promise<void> => {
    setSession(null);
    setUser(null);
    setBackendUser(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // The local auth state is already cleared; Supabase cleanup is best-effort.
    }
  }, []);

  const fetchBackendIdentity = useCallback(async (token: string): Promise<AuthMeResponse | null> => {
    try {
      return await api.getAuthMe(token);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null);
        setUser(null);
        setBackendUser(null);
        setIsLoading(false);
        return;
      }

      setSession(newSession);
      setUser(newSession.user);

      if (newSession.access_token) {
        fetchBackendIdentity(newSession.access_token).then(async (identity) => {
          if (!isMounted) return;

          if (!identity) {
            await clearAuthenticationState();
          } else {
            setBackendUser(identity);
          }
          setIsLoading(false);
        });
      } else {
        setBackendUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuthenticationState, fetchBackendIdentity]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; role?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        setIsLoading(false);
        return { success: false, error: error?.message || 'Authentication failed' };
      }

      setSession(data.session);
      setUser(data.user);

      // Verify identity and authoritative role with FastAPI backend.
      const identity = await fetchBackendIdentity(data.session.access_token);
      if (!identity) {
        await clearAuthenticationState();
        setIsLoading(false);
        return {
          success: false,
          error: 'Your account could not be authorized for AccessibleCare. Please contact the hospital administrator.',
        };
      }

      setBackendUser(identity);
      setIsLoading(false);
      return { success: true, role: identity.role };
    } catch (err: unknown) {
      await clearAuthenticationState();
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      return { success: false, error: message };
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    } finally {
      setSession(null);
      setUser(null);
      setBackendUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!session?.access_token) return;

    const identity = await fetchBackendIdentity(session.access_token);
    if (identity) {
      setBackendUser(identity);
    } else {
      await clearAuthenticationState();
    }
  };

  const value: AuthContextType = {
    session,
    user,
    backendUser,
    role: backendUser?.role ?? null,
    isLoading,
    isAuthenticated: !!session && !!backendUser,
    signIn,
    signOut,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
