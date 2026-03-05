import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log('[auth] Initializing auth listener');
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[auth] Initial session:', s ? 'found' : 'none');
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log('[auth] Auth state changed:', _event, s ? 'session' : 'no session');
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('[auth] Signing up:', email);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('[auth] Signing in:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      console.log('[auth] Signing out');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  });

  const { mutateAsync: signUpAsync } = signUpMutation;
  const { mutateAsync: signInAsync } = signInMutation;
  const { mutateAsync: signOutAsync } = signOutMutation;

  const signUp = useCallback(async (email: string, password: string) => {
    return signUpAsync({ email, password });
  }, [signUpAsync]);

  const signIn = useCallback(async (email: string, password: string) => {
    return signInAsync({ email, password });
  }, [signInAsync]);

  const signOut = useCallback(async () => {
    return signOutAsync();
  }, [signOutAsync]);

  return {
    session,
    user,
    isLoading,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    signUpError: signUpMutation.error?.message ?? null,
    signInError: signInMutation.error?.message ?? null,
  };
});
