import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AuthMeResponse } from '../lib/api';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  backendUser: AuthMeResponse | null;
  role: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
