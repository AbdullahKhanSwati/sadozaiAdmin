import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { supabaseMunchies } from '../lib/supabaseMunchies.js';
import { businesses as localBusinesses } from '../data/businesses.js';

const AuthContext = createContext(null);

const isAdminRole = (role) => ['admin', 'owner'].includes((role || '').toLowerCase());

// Map a Shots `businesses` DB row → the camelCase shape the UI expects.
function mapBusiness(row) {
  if (!row) return null;
  return {
    id: row.id, name: row.name, type: row.type, tag: row.tag, emoji: row.emoji,
    accent: row.accent, accentDark: row.accent_dark, available: row.available,
    summary: row.summary, defaultEmail: row.default_email, defaultPassword: row.default_password,
  };
}

const munchiesBusiness = () => localBusinesses.find((b) => b.id === 'munchies') || { id: 'munchies', name: 'Munchies' };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const reqRef = useRef(0); // guards against out-of-order async refreshes

  // Read the Munchies profile (holds the access role).
  const fetchMunchiesProfile = async (userId) => {
    const { data } = await supabaseMunchies.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    return data || null;
  };

  const munchiesSession = (user, profile) => ({
    user,
    email: user.email,
    profile,
    businessId: 'munchies',
    business: munchiesBusiness(),
    role: profile?.role || 'admin',
    at: Date.now(),
  });

  const buildShotsSession = async (user) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
    const businessId = profile?.business_id || 'shots';
    const { data: businessRow } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle();
    return {
      user, email: user.email, profile: profile || null,
      businessId, business: mapBusiness(businessRow), role: profile?.role, at: Date.now(),
    };
  };

  // Determine the active session: Munchies (admin only) wins, else Shots.
  const refresh = async () => {
    const token = ++reqRef.current;
    setLoading(true);

    const { data: m } = await supabaseMunchies.auth.getSession();
    if (m.session?.user) {
      const prof = await fetchMunchiesProfile(m.session.user.id);
      if (prof && isAdminRole(prof.role)) {
        if (token === reqRef.current) { setSession(munchiesSession(m.session.user, prof)); setLoading(false); }
        return;
      }
      // Staff (or missing profile) may not use the admin panel.
      await supabaseMunchies.auth.signOut();
    }

    const { data: s } = await supabase.auth.getSession();
    if (s.session?.user) {
      const built = await buildShotsSession(s.session.user);
      // Only admins/owners may use the admin panel — refuse a restored staff session.
      if (!isAdminRole(built.role)) {
        await supabase.auth.signOut();
        if (token === reqRef.current) { setSession(null); setLoading(false); }
        return;
      }
      if (token === reqRef.current) { setSession(built); setLoading(false); }
      return;
    }

    if (token === reqRef.current) { setSession(null); setLoading(false); }
  };

  useEffect(() => {
    refresh();
    const { data: subM } = supabaseMunchies.auth.onAuthStateChange(() => refresh());
    const { data: subS } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      subM.subscription.unsubscribe();
      subS.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      // Sign in. Munchies authenticates against its own project and requires an
      // admin role (staff are refused — they can only use the Munchies app).
      login: async (email, password, businessId) => {
        if (businessId === 'munchies') {
          const { data, error } = await supabaseMunchies.auth.signInWithPassword({ email, password });
          if (error) throw error;
          const prof = await fetchMunchiesProfile(data.user.id);
          if (!prof || !isAdminRole(prof.role)) {
            await supabaseMunchies.auth.signOut();
            throw new Error('This is a staff account. Staff can only use the Munchies app, not the admin panel.');
          }
          setSession(munchiesSession(data.user, prof));
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Shots admin panel is admin-only. Staff accounts can sign in to the
        // mobile app but must be refused here.
        const { data: prof } = await supabase.from('profiles').select('role').eq('user_id', data.user.id).maybeSingle();
        if (!prof || !isAdminRole(prof.role)) {
          await supabase.auth.signOut();
          throw new Error('This is a staff account. Staff can only use the Shots app, not the admin panel.');
        }
      },
      logout: async () => {
        if (session?.businessId === 'munchies') await supabaseMunchies.auth.signOut();
        else await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
