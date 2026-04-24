import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {AuthError, Session, SupabaseClient, User} from '@supabase/supabase-js';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {getSupabaseClient} from '@site/src/lib/supabase';

type AuthResult = {
  error: AuthError | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recoveryMode: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordRecovery: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type Props = {
  readonly children: ReactNode;
};

export function AuthProvider({children}: Props): React.ReactElement {
  const {siteConfig} = useDocusaurusContext();
  const customFields = (siteConfig.customFields ?? {}) as {
    supabaseUrl?: string;
    supabasePublishableKey?: string;
  };

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [recoveryMode, setRecoveryMode] = useState<boolean>(false);

  const clientRef = useRef<SupabaseClient | null>(null);

  const getClient = useCallback((): SupabaseClient => {
    if (!clientRef.current) {
      clientRef.current = getSupabaseClient({
        supabaseUrl: customFields.supabaseUrl,
        supabasePublishableKey: customFields.supabasePublishableKey,
      });
    }
    return clientRef.current;
  }, [customFields.supabaseUrl, customFields.supabasePublishableKey]);

  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) {
      return undefined;
    }

    let cancelled = false;
    const client = getClient();

    client.auth
      .getSession()
      .then(({data}) => {
        if (cancelled) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setLoading(false);
      });

    const {data: subscription} = client.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
      }
      if (event === 'SIGNED_OUT') {
        setRecoveryMode(false);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [getClient]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      const client = getClient();
      const {error} = await client.auth.signInWithPassword({email, password});
      return {error};
    },
    [getClient],
  );

  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    const client = getClient();
    await client.auth.signOut();
    setRecoveryMode(false);
  }, [getClient]);

  const sendPasswordRecovery = useCallback<AuthContextValue['sendPasswordRecovery']>(
    async (email) => {
      const client = getClient();
      const redirectTo =
        ExecutionEnvironment.canUseDOM && typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : undefined;
      const {error} = await client.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return {error};
    },
    [getClient],
  );

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(
    async (newPassword) => {
      const client = getClient();
      const {error} = await client.auth.updateUser({password: newPassword});
      return {error};
    },
    [getClient],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      recoveryMode,
      signIn,
      signOut,
      sendPasswordRecovery,
      updatePassword,
    }),
    [session, loading, recoveryMode, signIn, signOut, sendPasswordRecovery, updatePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return ctx;
}
