import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, BarChart3, ShoppingBasket, Contact, Users,
  Settings as SettingsIcon, HelpCircle, LogOut, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// ---- Nav model -----------------------------------------------------------
const B = '/munchies';

const REPORT_CHILDREN = [
  { to: `${B}/reports/sales-summary`,  label: 'Sales summary' },
  { to: `${B}/reports/sales-by-item`,  label: 'Sales by item' },
  { to: `${B}/reports/sales-by-category`, label: 'Sales by category' },
  { to: `${B}/reports/sales-by-employee`, label: 'Sales by employee' },
  { to: `${B}/reports/receipts`,       label: 'Receipts' },
  { to: `${B}/reports/sales-by-modifier`, label: 'Sales by modifier' },
  { to: `${B}/reports/discounts`,      label: 'Discounts' },
  { to: `${B}/reports/taxes`,          label: 'Taxes' },
];

const ITEM_CHILDREN = [
  { to: `${B}/items/list`,       label: 'Item list' },
  { to: `${B}/items/categories`, label: 'Categories' },
  { to: `${B}/items/modifiers`,  label: 'Modifiers' },
  { to: `${B}/items/discounts`,  label: 'Discounts' },
];

const EMPLOYEE_CHILDREN = [
  { to: `${B}/employees/list`,   label: 'Employee list' },
  { to: `${B}/employees/access`, label: 'Access rights' },
];

const NAV = [
  { id: 'reports',   label: 'Reports',   icon: BarChart3,      color: '#43A047', base: `${B}/reports`,   children: REPORT_CHILDREN },
  { id: 'items',     label: 'Items',     icon: ShoppingBasket, color: '#EC407A', base: `${B}/items`,     children: ITEM_CHILDREN },
  { id: 'employees', label: 'Employees', icon: Contact,        color: '#00897B', base: `${B}/employees`, children: EMPLOYEE_CHILDREN },
  { id: 'customers', label: 'Customers', icon: Users,          color: '#3F51B5', to: `${B}/customers` },
  { id: 'settings',  label: 'Settings',  icon: SettingsIcon,   color: '#607D8B', to: `${B}/settings` },
];

// Human page title from the current path (used in the green header).
function titleFor(pathname) {
  if (pathname.startsWith(`${B}/account`)) return 'Account';
  // Item create/edit sub-routes.
  if (pathname.startsWith(`${B}/items/new`)) return 'Create item';
  if (pathname.startsWith(`${B}/items/categories/new`)) return 'Create category';
  if (pathname.startsWith(`${B}/items/categories/`)) return 'Edit category';
  if (pathname.startsWith(`${B}/items/modifiers/new`)) return 'Create modifier';
  if (pathname.startsWith(`${B}/items/modifiers/`)) return 'Edit modifier';
  if (pathname.startsWith(`${B}/items/discounts/new`)) return 'Create discount';
  if (pathname.startsWith(`${B}/items/discounts/`)) return 'Edit discount';
  if (pathname.startsWith(`${B}/items/list`)) return 'Item list';
  if (/\/items\/[^/]+$/.test(pathname) && !pathname.endsWith('/list')) {
    // /items/<id> that isn't a known sub-list → edit item
    const tail = pathname.split('/').pop();
    if (!['categories', 'modifiers', 'discounts'].includes(tail)) return 'Edit item';
  }

  // Customers.
  if (pathname.startsWith(`${B}/customers/new`)) return 'Create customer';
  if (/\/customers\/[^/]+$/.test(pathname)) return 'Edit customer';
  if (pathname.startsWith(`${B}/customers`)) return 'Customer base';

  // Employees create/edit sub-routes.
  if (pathname.startsWith(`${B}/employees/new`)) return 'Create employee';
  if (pathname.startsWith(`${B}/employees/access/new`)) return 'Create role';
  if (pathname.startsWith(`${B}/employees/access/`)) return 'Edit role';
  if (pathname.startsWith(`${B}/employees/list`)) return 'Employee list';
  if (/\/employees\/[^/]+$/.test(pathname)) {
    const tail = pathname.split('/').pop();
    if (!['access', 'list'].includes(tail)) return 'Edit employee';
  }
  for (const group of NAV.filter((n) => n.children)) {
    const child = group.children.find((c) => pathname.startsWith(c.to));
    if (child) return child.label;
  }
  const top = NAV.find((n) => n.to && pathname.startsWith(n.to));
  if (top) return top.label;
  return 'Reports';
}

export default function MunchiesLayout() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false); // icons-only by default
  const [openId, setOpenId] = useState('reports'); // which accordion group is open
  const [flyoutId, setFlyoutId] = useState(null);   // which group flyout is open (collapsed rail)

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-ink-800">
      {/* Full-width green header, above the sidebar */}
      <header className="h-14 bg-mun-600 text-white flex items-center px-4 gap-3 shadow-md shrink-0 z-30">
        <button onClick={() => setExpanded((s) => !s)} className="p-2 -ml-2 rounded hover:bg-white/15 transition" aria-label="Toggle menu">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-medium tracking-wide">{titleFor(location.pathname)}</h1>
      </header>

      {/* Row: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar
          expanded={expanded}
          openId={openId}
          setOpenId={setOpenId}
          flyoutId={flyoutId}
          setFlyoutId={setFlyoutId}
          pathname={location.pathname}
          session={session}
          onLogout={handleLogout}
        />
        <main className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ---- Sidebar -------------------------------------------------------------
function Sidebar({ expanded, openId, setOpenId, flyoutId, setFlyoutId, pathname, session, onLogout }) {
  const flyoutRef = useRef(null);
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!flyoutId) return;
    const onDoc = (e) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target)) setFlyoutId(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [flyoutId, setFlyoutId]);

  const email = session?.email || 'munchiesdoberan@gmail.com';

  return (
    <aside className={['relative bg-white border-r border-slate-200 shrink-0 transition-all duration-200 flex flex-col', expanded ? 'w-[248px]' : 'w-[64px]'].join(' ')}>
      {/* Owner / profile — opens Account / Sign out menu */}
      <div className="relative border-b border-slate-100">
        {profileOpen && <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />}
        <button
          onClick={() => setProfileOpen((o) => !o)}
          className={['flex items-center gap-3 h-16 w-full transition hover:bg-slate-50', expanded ? 'px-4' : 'justify-center px-0'].join(' ')}
        >
          <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold">{(email[0] || 'O').toUpperCase()}</span>
          </div>
          {expanded && (
            <div className="min-w-0 flex-1 text-left">
              <div className="text-sm font-semibold text-ink-800 leading-tight">Owner</div>
              <div className="text-[11px] text-ink-400 truncate">{email}</div>
            </div>
          )}
          {expanded && <ChevronDown className="w-4 h-4 text-ink-400 shrink-0" />}
        </button>

        {profileOpen && (
          <div className={['absolute z-50 bg-white rounded-md border border-slate-200 shadow-pop py-1 w-44 animate-fade-in', expanded ? 'left-4 top-[60px]' : 'left-full top-2 ml-1'].join(' ')}>
            <button onClick={() => { setProfileOpen(false); navigate('/munchies/account'); }} className="block w-full text-left px-4 py-2.5 text-sm text-ink-700 hover:bg-slate-50">
              Account
            </button>
            <button onClick={() => { setProfileOpen(false); onLogout(); }} className="block w-full text-left px-4 py-2.5 text-sm text-ink-700 hover:bg-slate-50">
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-visible">
        {NAV.map((item) =>
          item.children ? (
            <GroupItem
              key={item.id}
              item={item}
              expanded={expanded}
              open={openId === item.id}
              setOpen={(v) => setOpenId(v ? item.id : null)}
              active={pathname.startsWith(item.base)}
              flyoutOpen={flyoutId === item.id}
              setFlyout={(v) => setFlyoutId(v ? item.id : null)}
              flyoutRef={flyoutId === item.id ? flyoutRef : null}
            />
          ) : (
            <LeafItem key={item.id} item={item} expanded={expanded} />
          )
        )}
      </nav>

      {/* Footer: Help + Sign out */}
      <div className="border-t border-slate-100 py-2">
        <RailButton icon={HelpCircle} label="Help" expanded={expanded} color="#2196F3" onClick={() => {}} />
        <RailButton icon={LogOut} label="Sign out" expanded={expanded} danger onClick={onLogout} />
      </div>
    </aside>
  );
}

function LeafItem({ item, expanded }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={item.label}
      className={({ isActive }) =>
        [
          'flex items-center gap-4 h-12 text-sm font-medium transition relative',
          expanded ? 'px-5' : 'justify-center px-0',
          isActive ? 'text-mun-700 bg-mun-50 font-semibold' : 'text-ink-600 hover:bg-slate-50',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-mun-600" />}
          <Icon className="w-6 h-6 shrink-0" style={{ color: item.color }} />
          {expanded && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

// Expandable group — accordion when the rail is expanded, flyout when collapsed.
function GroupItem({ item, expanded, open, setOpen, active, flyoutOpen, setFlyout, flyoutRef }) {
  const Icon = item.icon;
  const rowBase = 'flex items-center gap-4 h-12 text-sm font-medium transition relative w-full cursor-pointer';
  const rowTone = active ? 'text-mun-700 bg-mun-50 font-semibold' : 'text-ink-600 hover:bg-slate-50';

  return (
    <div className="relative">
      <button
        onClick={() => (expanded ? setOpen(!open) : setFlyout(!flyoutOpen))}
        title={item.label}
        className={[rowBase, expanded ? 'px-5' : 'justify-center px-0', rowTone].join(' ')}
      >
        {active && <span className="absolute left-0 top-0 bottom-0 w-1 bg-mun-600" />}
        <Icon className="w-6 h-6 shrink-0" style={{ color: item.color }} />
        {expanded && (
          <>
            <span className="truncate flex-1 text-left">{item.label}</span>
            <ChevronDown className={['w-4 h-4 text-ink-400 transition-transform', open && 'rotate-180'].join(' ')} />
          </>
        )}
      </button>

      {/* Expanded → inline accordion */}
      {expanded && open && (
        <div className="pb-1">
          {item.children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              className={({ isActive }) =>
                ['block pl-14 pr-4 py-2 text-[13px] transition', isActive ? 'text-mun-700 font-semibold bg-mun-50' : 'text-ink-500 hover:bg-slate-50'].join(' ')
              }
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Collapsed → flyout popover */}
      {!expanded && flyoutOpen && (
        <div ref={flyoutRef} className="absolute left-full top-0 ml-1 w-56 bg-white rounded-md border border-slate-200 shadow-pop z-50 py-1 animate-fade-in">
          <div className="px-4 py-2 text-[11px] uppercase tracking-widest text-ink-400 font-bold border-b border-slate-100">{item.label}</div>
          {item.children.map((c) => (
            <NavLink
              key={c.to}
              to={c.to}
              onClick={() => setFlyout(false)}
              className={({ isActive }) =>
                ['block px-4 py-2.5 text-sm transition', isActive ? 'text-mun-700 font-semibold bg-mun-50' : 'text-ink-600 hover:bg-slate-50'].join(' ')
              }
            >
              {c.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function RailButton({ icon: Icon, label, expanded, onClick, danger, color }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={[
        'flex items-center gap-4 h-11 w-full text-sm font-medium transition',
        expanded ? 'px-5' : 'justify-center px-0',
        danger ? 'text-rose-500 hover:bg-rose-50' : 'text-ink-600 hover:bg-slate-50',
      ].join(' ')}
    >
      <Icon className={['w-6 h-6 shrink-0', danger && 'text-rose-500'].filter(Boolean).join(' ')} style={color ? { color } : undefined} />
      {expanded && <span className="truncate">{label}</span>}
    </button>
  );
}
