import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronsLeft, ChevronsRight, Grid3X3, LayoutDashboard,
  LogOut, Menu, Receipt, Settings as SettingsIcon,
  Users, X, Calendar, Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/admin/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/admin/tables',      label: 'Tables',       icon: Grid3X3 },
  { to: '/admin/bookings',    label: 'Bookings',     icon: Calendar },
  { to: '/admin/memberships', label: 'Memberships',  icon: Users },
  { to: '/admin/expenses',    label: 'Expenses',     icon: Receipt },
  { to: '/admin/staff',       label: 'Staff',        icon: Briefcase },
  { to: '/admin/settings',    label: 'Settings',     icon: SettingsIcon },
];

export default function AdminLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const pageTitle =
    navItems.find((n) => location.pathname.startsWith(n.to))?.label ||
    (location.pathname.includes('memberships/') ? 'Member' : 'Admin');

  return (
    <div className="min-h-screen flex bg-slate-50 text-ink-800">
      {/* Sidebar — desktop */}
      <aside
        className={[
          'hidden lg:flex flex-col bg-white border-r border-slate-200 sticky top-0 h-screen transition-all',
          collapsed ? 'w-[76px]' : 'w-[252px]',
        ].join(' ')}
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapse={() => setCollapsed((s) => !s)}
          onLogout={handleLogout}
          session={session}
        />
      </aside>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-slate-200 lg:hidden animate-slide-up">
            <SidebarContent
              collapsed={false}
              onClose={() => setMobileOpen(false)}
              onLogout={handleLogout}
              session={session}
            />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-200">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-ink-400 font-semibold">
                {session?.business?.name || 'Shots'} · Admin
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold leading-tight truncate">{pageTitle}</h1>
            </div>

            <div className="flex-1" />

            <div className="hidden sm:flex items-center gap-3 pl-3 ml-1 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center font-bold text-white text-sm shadow-brand">
                {(session?.email?.[0] || 'A').toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold">Admin</div>
                <div className="text-[11px] text-ink-500 truncate max-w-[160px]">{session?.email}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Outlet */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ collapsed, onCollapse, onClose, onLogout, session }) {
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={['flex items-center gap-3 px-4 h-16 border-b border-slate-100', collapsed && 'justify-center px-2'].join(' ')}>
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-brand shrink-0">
          <img src="/logo-192.png" alt="Shots" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-extrabold tracking-wider truncate">{session?.business?.name || 'Shots'}</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">Admin Console</div>
          </div>
        )}
        {!collapsed && onClose && (
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {!collapsed && (
          <div className="px-2 text-[10px] uppercase tracking-widest text-ink-400 font-bold mb-2">Workspace</div>
        )}
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/admin/dashboard'}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                    isActive
                      ? 'bg-brand-gradient text-white shadow-brand'
                      : 'text-ink-700 hover:bg-slate-100',
                    collapsed && 'justify-center px-2',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={['w-[18px] h-[18px] shrink-0', !isActive && 'text-ink-500 group-hover:text-ink-700'].join(' ')} />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer actions */}
      <div className={['border-t border-slate-100 p-3', collapsed && 'px-2'].join(' ')}>
        <button
          onClick={onLogout}
          className={[
            'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition',
            collapsed && 'justify-center px-2',
          ].join(' ')}
        >
          <LogOut className="w-[18px] h-[18px]" />
          {!collapsed && <span>Sign out</span>}
        </button>

        {onCollapse && (
          <button
            onClick={onCollapse}
            className={[
              'mt-1 flex items-center gap-3 w-full rounded-xl px-3 py-2 text-xs font-semibold text-ink-500 hover:bg-slate-100 transition',
              collapsed && 'justify-center px-2',
            ].join(' ')}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
      </div>
    </div>
  );
}
