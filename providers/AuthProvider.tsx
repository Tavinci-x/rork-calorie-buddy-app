import { useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const signUp = useCallback(async (_email: string, _password: string) => {
    console.log('[auth] Auth disabled - skipping sign up');
    return null;
  }, []);

  const signIn = useCallback(async (_email: string, _password: string) => {
    console.log('[auth] Auth disabled - skipping sign in');
    return null;
  }, []);

  const signOut = useCallback(async () => {
    console.log('[auth] Auth disabled - skipping sign out');
  }, []);

  return {
    session: null,
    user: null,
    isLoading: false,
    isAuthenticated: false,
    signUp,
    signIn,
    signOut,
    isSigningUp: false,
    isSigningIn: false,
    isSigningOut: false,
    signUpError: null,
    signInError: null,
  };
});
