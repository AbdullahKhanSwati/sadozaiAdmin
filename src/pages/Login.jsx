import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Building2, Eye, EyeOff, Lock, Mail, Shield, Sparkles, Check, AlertCircle,
} from 'lucide-react';
import { businesses } from '../data/businesses.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedId, setSelectedId] = useState(businesses[0].id);
  const [email, setEmail] = useState(businesses[0].defaultEmail || '');
  const [password, setPassword] = useState(businesses[0].defaultPassword || '');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selected = businesses.find((b) => b.id === selectedId);

  const pick = (b) => {
    setSelectedId(b.id);
    setError('');
    if (b.available) {
      setEmail(b.defaultEmail || '');
      setPassword(b.defaultPassword || '');
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selected.available) {
      setError(`${selected.name} admin console is coming soon.`);
      return;
    }
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password, selectedId);
      // HomeRedirect routes to the correct admin (Shots or Munchies) once the
      // session's business resolves.
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Sign in failed. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-ink-900 text-white overflow-hidden relative">
      {/* Background ambient */}
      <div className="absolute inset-0 bg-brand-dark opacity-95" />
      <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-brand-500/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full bg-brand-900/60 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,107,107,0.15),transparent_60%)]" />

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* LEFT — Business picker */}
        <div className="flex-1 px-6 sm:px-10 lg:px-16 py-10 lg:py-16 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-brand-gradient flex items-center justify-center shadow-brand">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-extrabold tracking-[3px]">SADOZAI</div>
              <div className="text-[11px] uppercase tracking-widest text-white/60">Admin Console</div>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-semibold mb-5">
              <Sparkles className="w-3.5 h-3.5 text-brand-300" />
              Unified business control center
            </div>
            <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight">
              Choose a business to <span className="text-brand-300">manage</span>.
            </h1>
            <p className="text-white/70 mt-3 text-sm lg:text-base">
              Pick one of your businesses below to sign in to its admin dashboard.
              Shots and Munchies panels are enabled in this release.
            </p>
          </div>

          {/* Business cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {businesses.map((b) => {
              const active = selectedId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => pick(b)}
                  className={[
                    'group text-left rounded-2xl p-4 border transition relative overflow-hidden',
                    active
                      ? 'bg-white/10 border-white/30 ring-2 ring-brand-400/70 shadow-pop'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: `${b.accent}30`, border: `1px solid ${b.accent}55` }}
                    >
                      <span>{b.emoji}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-bold truncate">{b.name}</div>
                        {b.available ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                            LIVE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-400/25">
                            SOON
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-white/60 mt-0.5">{b.type}</div>
                      <div className="text-[11px] text-white/45 mt-1 truncate">{b.summary}</div>
                    </div>
                    <div
                      className={[
                        'w-6 h-6 rounded-full flex items-center justify-center border shrink-0 transition',
                        active
                          ? 'bg-brand-500 border-brand-500 text-white shadow-brand'
                          : 'border-white/25 text-transparent',
                      ].join(' ')}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-10 text-xs text-white/40">
            © {new Date().getFullYear()} Sadozai Businesses. All rights reserved.
          </div>
        </div>

        {/* RIGHT — Login card */}
        <div className="w-full lg:w-[480px] xl:w-[520px] px-6 sm:px-10 py-10 lg:py-16 lg:pl-0">
          <form
            onSubmit={handleSubmit}
            className="bg-white text-ink-800 rounded-3xl shadow-pop p-7 lg:p-9 animate-slide-up backdrop-blur"
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: `${selected.accent}1A`, border: `1px solid ${selected.accent}33` }}
              >
                {selected.emoji}
              </div>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-widest text-ink-500">Signing in to</div>
                <div className="font-extrabold truncate">{selected.name} Admin</div>
              </div>
            </div>

            <h2 className="text-2xl font-extrabold mt-5">Welcome back</h2>
            <p className="text-sm text-ink-500 mt-1">
              Sign in to access reports, members, bookings & finance for {selected.name}.
            </p>

            {!selected.available && (
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-2.5 text-xs font-medium text-amber-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>The {selected.name} admin console is not enabled yet. Switch to Shots to continue.</span>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@shots.com"
                    className="input pl-10"
                    autoComplete="email"
                    disabled={!selected.available}
                  />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10 pr-10"
                    autoComplete="current-password"
                    disabled={!selected.available}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
                  />
                  <span className="text-ink-600 font-semibold">Remember me</span>
                </label>
                <button type="button" className="text-brand-600 font-bold hover:text-brand-700">
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selected.available}
                className="btn-primary w-full py-3 mt-1"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <>
                    Sign in to {selected.name}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {selected.available && selected.defaultEmail && (
                <div className="text-[11px] text-ink-400 text-center">
                  Demo creds:&nbsp;
                  <span className="font-mono text-ink-600">{selected.defaultEmail}</span> /{' '}
                  <span className="font-mono text-ink-600">{selected.defaultPassword}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 mt-7 pt-4 flex items-center gap-2 text-[11px] text-ink-400">
              <Building2 className="w-3.5 h-3.5" />
              <span>Multi-tenant console · v1.0</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
