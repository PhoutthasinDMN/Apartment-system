'use client';

import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/src/lib/supabase';

interface AuthValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: { fullName: string; roleCode: string; roleName: string; active: boolean } | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthValue['profile']>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    const userId = session?.user.id;
    if (!client || !userId) return;
    let current = true;
    void client.from('profiles').select('full_name,is_active,roles(code,name)').eq('id', userId).single().then(({ data }) => {
      if (!current || !data) return;
      const raw = data as unknown as { full_name: string; is_active: boolean; roles: { code: string; name: string } | { code: string; name: string }[] | null };
      const role = Array.isArray(raw.roles) ? raw.roles[0] : raw.roles;
      setProfile({ fullName: raw.full_name, active: raw.is_active, roleCode: role?.code ?? 'viewer', roleName: role?.name ?? 'Viewer' });
    });
    return () => { current = false; };
  }, [session?.user.id]);

  const value = useMemo<AuthValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    signIn: async (email, password) => { if (!supabase) throw new Error('not_configured'); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; },
    signOut: async () => { if (supabase) { const { error } = await supabase.auth.signOut(); if (error) throw error; } },
    resetPassword: async (email) => { if (!supabase) throw new Error('not_configured'); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#/reset-password` }); if (error) throw error; },
    updatePassword: async (password) => { if (!supabase) throw new Error('not_configured'); const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; },
  }), [loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
