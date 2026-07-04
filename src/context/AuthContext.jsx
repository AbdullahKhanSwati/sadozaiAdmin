import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { businesses as localBusinesses } from '../data/businesses.js';

const AuthContext = createContext(null);

// Static "demo" sign-in (no Supabase) — used for businesses flagged `demo: true`
// in data/businesses.js, e.g. Munchies. Persisted so a refresh keeps you in.
const DEMO_KEY = 'sadozai.demoSession';

function findDemoBusiness(email, password) {
  const e = (email || '').trim().toLowerCase();
  return localBusinesses.find(
    (b) => b.demo && b.available &&
      (b.defaultEmail || '').toLowerCase() === e &&
      b.defaultPassword === password
  );
}

function demoSessionFor(b, email) {
  return {
    user: null,
    email: email || b.defaultEmail,
    profile: null,
    businessId: b.id,
    business: { ...b },
    demo: true,
    at: Date.now(),
  };
}

// Map a `businesses` DB row → the camelCase shape the UI already expects.
function mapBusiness(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    tag: row.tag,
    emoji: row.emoji,
    accent: row.accent,
    accentDark: row.accent_dark,
    available: row.available,
    summary: row.summary,
    defaultEmail: row.default_email,
    defaultPassword: row.default_password,
  };
}

export function AuthProvider({ children }) {
  // session shape kept identical to what AdminLayout/Settings read:
  //   { business, email, user, profile, businessId, at }
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore a persisted demo session (e.g. Munchies) before hitting Supabase.
  const [demoSession, setDemoSession] = useState(() => {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let active = true;

    // A demo session short-circuits Supabase entirely.
    if (demoSession) {
      setLoading(false);
      return () => { active = false; };
    }

    async function bootstrap(authSession) {
      if (!authSession?.user) {
        if (active) {
          setSession(null);
          setLoading(false);
        }
        return;
      }

      const user = authSession.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const businessId = profile?.business_id || 'shots';

      const { data: businessRow } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (!active) return;
      setSession({
        user,
        email: user.email,
        profile: profile || null,
        businessId,
        business: mapBusiness(businessRow),
        at: Date.now(),
      });
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => bootstrap(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => bootstrap(s));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [demoSession]);

  // The effective session: a demo session (Munchies) wins over Supabase.
  const activeSession = demoSession || session;

  const value = useMemo(
    () => ({
      session: activeSession,
      loading,
      // Sign in. Static-credential ("demo") businesses like Munchies are matched
      // locally and never touch Supabase; everything else uses Supabase auth.
      login: async (email, password) => {
        const demoBiz = findDemoBusiness(email, password);
        if (demoBiz) {
          const ds = demoSessionFor(demoBiz, email);
          try { localStorage.setItem(DEMO_KEY, JSON.stringify(ds)); } catch { /* ignore */ }
          setDemoSession(ds);
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      logout: async () => {
        if (demoSession) {
          try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
          setDemoSession(null);
          return;
        }
        await supabase.auth.signOut();
        setSession(null);
      },
    }),
    [activeSession, demoSession, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
