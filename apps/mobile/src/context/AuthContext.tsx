import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { capture, identify, reset } from '@/lib/analytics';
import { captureError } from '@/lib/sentry';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  signIn: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Load the persisted session from AsyncStorage on startup
    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (!mountedRef.current) return;
      if (error) captureError(error, { source: 'AuthContext.getSession' });
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mountedRef.current) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        // Ensure loading is cleared even if getSession raced with this event
        setLoading(false);

        if (event === 'SIGNED_IN' && newSession?.user) {
          // Detect auth provider from the session to avoid hardcoding 'email'
          const provider = newSession.user.app_metadata?.provider ?? 'email';
          // Only identify on email/password sign-in.
          // Apple sign-in identifies in appleAuth.ts to avoid duplicate calls.
          if (provider !== 'apple') {
            identify(newSession.user.id, { email: newSession.user.email });
            capture('user_logged_in', { auth_method: provider });
          }
        }

        if (event === 'SIGNED_OUT') {
          reset();
        }
      },
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    capture('user_signed_out');
    const { error } = await supabase.auth.signOut();
    if (error) {
      captureError(error, { source: 'AuthContext.signOut' });
      // Still clear local state so the user can re-authenticate
      setSession(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
