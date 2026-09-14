import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseMunchies as sb } from '../lib/supabaseMunchies.js';
import { computeReports } from '../data/munchiesReports.js';
import { sortNatural, sortByOrder, sortItemsByMenu } from '../lib/naturalSort.js';

// Live catalog store for the Munchies admin, backed by the Munchies Supabase
// project. The exported API (state arrays + save/delete fns + helpers) is kept
// identical to the old localStorage store so none of the pages changed.
// Snake_case DB columns are mapped to the camelCase fields the UI uses.

const MunchiesContext = createContext(null);

// ---- UI field  ->  DB column maps ----------------------------------------
const CATEGORY_KEYS = { name: 'name', color: 'color', sortOrder: 'sort_order', createdAt: 'created_at' };
const MODIFIER_KEYS = { name: 'name', options: 'options', sortOrder: 'sort_order', createdAt: 'created_at' };
const ITEM_KEYS = {
  code: 'code', name: 'name', categoryId: 'category_id', price: 'price', cost: 'cost',
  sku: 'sku', barcode: 'barcode', description: 'description', availableForSale: 'available_for_sale',
  soldBy: 'sold_by', composite: 'composite', trackStock: 'track_stock', color: 'color',
  shape: 'shape', modifiers: 'modifiers', image: 'image', variants: 'variants',
};
const DISCOUNT_KEYS = { name: 'name', type: 'type', value: 'value' };
const ROLE_KEYS = { name: 'name', access: 'access', color: 'color', system: 'system' };
const EMPLOYEE_KEYS = { name: 'name', email: 'email', phone: 'phone', roleId: 'role_id', userId: 'user_id' };
const CUSTOMER_KEYS = {
  name: 'name', email: 'email', phone: 'phone', address: 'address', city: 'city', region: 'region',
  postalCode: 'postal_code', country: 'country', note: 'note', firstVisit: 'first_visit',
  lastVisit: 'last_visit', visits: 'visits', spent: 'spent', points: 'points',
};
const SETTINGS_KEYS = {
  businessName: 'business_name', currency: 'currency', usePaise: 'use_paise',
  timezone: 'timezone', features: 'features', receipt: 'receipt', dining: 'dining', printers: 'printers',
};

// Read-only columns are never sent back (created_at is DB-managed).
const READ_ONLY = new Set(['created_at']);
const toRow = (obj, map) => {
  const out = {};
  for (const k of Object.keys(obj || {})) if (k in map && !READ_ONLY.has(map[k])) out[map[k]] = obj[k];
  return out;
};
const fromRow = (row, map) => {
  const out = { id: row.id };
  for (const [ui, col] of Object.entries(map)) out[ui] = row[col];
  return out;
};

const ENTITIES = [
  ['categories', 'categories', CATEGORY_KEYS, 'sort_order'],
  ['modifiers', 'modifiers', MODIFIER_KEYS, 'sort_order'],
  ['items', 'items', ITEM_KEYS, 'code'],
  ['discounts', 'discounts', DISCOUNT_KEYS, 'created_at'],
  ['roles', 'roles', ROLE_KEYS, 'created_at'],
  ['employees', 'employees', EMPLOYEE_KEYS, 'created_at'],
  ['customers', 'customers', CUSTOMER_KEYS, 'created_at'],
];
const MAP_BY_STATE = Object.fromEntries(ENTITIES.map(([s, , m]) => [s, m]));
const TABLE_BY_STATE = Object.fromEntries(ENTITIES.map(([s, t]) => [s, t]));

// Every list the UI shows comes out of the store already in its display order:
//   categories → natural menu order ("1 Burgers, 1.1 …, 1.10 …, 2 Fries")
//   items      → grouped by that category order, then by item code (like the app's Sales screen)
//   modifiers  → the manual order set by drag-and-drop (sort_order)
// so pages and dropdowns never have to sort for themselves.
const ORDERED = {
  categories: (arr) => sortNatural(arr, (c) => c.name),
  items: (arr, cats) => sortItemsByMenu(arr, cats || []),
  modifiers: (arr) => sortByOrder(arr),
};
const ordered = (stateKey, arr, cats) => (ORDERED[stateKey] ? ORDERED[stateKey](arr, cats) : arr);
// Replace one list in the state, re-ordered; a category change re-orders items too.
const withOrdered = (s, stateKey, arr) => {
  const next = { ...s, [stateKey]: ordered(stateKey, arr, s.categories) };
  if (stateKey === 'categories') next.items = ordered('items', s.items, next.categories);
  return next;
};
const sortedExpenseCategories = (rows) => sortNatural(rows, (c) => c.name);

export function MunchiesProvider({ children }) {
  const [state, setState] = useState({
    categories: [], modifiers: [], items: [], discounts: [], roles: [], employees: [], customers: [],
  });
  const stateRef = useRef(state);
  stateRef.current = state;
  const [settings, setSettings] = useState(null);
  const [salesRows, setSalesRows] = useState({ receipts: [], lines: [] }); // raw for reports
  const [expenses, setExpenses] = useState([]);            // raw rows — reports + Expenses page
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [ready, setReady] = useState(false);

  const reloadEntity = useCallback(async (stateKey) => {
    const [, table, , order] = ENTITIES.find(([s]) => s === stateKey);
    const { data } = await sb.from(table).select('*').order(order, { ascending: true, nullsFirst: true });
    setState((s) => withOrdered(s, stateKey, (data || []).map((r) => fromRow(r, MAP_BY_STATE[stateKey]))));
  }, []);

  const reloadSales = useCallback(async () => {
    const [rc, rl] = await Promise.all([
      sb.from('receipts').select('*'),
      sb.from('receipt_lines').select('*'),
    ]);
    setSalesRows({ receipts: rc.data || [], lines: rl.data || [] });
  }, []);

  const reloadExpenses = useCallback(async () => {
    const { data } = await sb.from('expenses').select('*')
      .order('spent_on', { ascending: false }).order('created_at', { ascending: false });
    setExpenses(data || []);
  }, []);

  const reloadExpenseCategories = useCallback(async () => {
    const { data } = await sb.from('expense_categories').select('*')
      .order('sort_order', { ascending: true, nullsFirst: true }).order('name', { ascending: true });
    setExpenseCategories(sortedExpenseCategories(data || []));
  }, []);

  // Initial load.
  useEffect(() => {
    let active = true;
    (async () => {
      const results = await Promise.all(
        ENTITIES.map(([, table, , order]) => sb.from(table).select('*').order(order, { ascending: true, nullsFirst: true }))
      );
      const s = await sb.from('business_settings').select('*').eq('id', 1).maybeSingle();
      const [rc, rl] = await Promise.all([sb.from('receipts').select('*'), sb.from('receipt_lines').select('*')]);
      if (!active) return;
      await Promise.all([reloadExpenses(), reloadExpenseCategories()]);

      const next = {};
      // categories come first in ENTITIES, so items can be grouped by them.
      ENTITIES.forEach(([stateKey, , map], i) => {
        next[stateKey] = ordered(stateKey, (results[i].data || []).map((r) => fromRow(r, map)), next.categories);
        if (results[i].error) console.error(`load ${stateKey}`, results[i].error);
      });
      setState(next);
      if (s.data) setSettings(fromRow(s.data, SETTINGS_KEYS));
      setSalesRows({ receipts: rc.data || [], lines: rl.data || [] });
      setReady(true);
    })();
    return () => { active = false; };
  }, [reloadExpenses, reloadExpenseCategories]);

  // Realtime: keep catalog + sales in sync with changes from the app/other tabs.
  useEffect(() => {
    const channel = sb.channel('munchies-admin-rt');
    ENTITIES.forEach(([stateKey, table]) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => reloadEntity(stateKey));
    });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => reloadSales());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'receipt_lines' }, () => reloadSales());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => reloadExpenses());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, () => reloadExpenseCategories());
    channel.subscribe();
    return () => { sb.removeChannel(channel); };
  }, [reloadEntity, reloadSales, reloadExpenses, reloadExpenseCategories]);

  // Generic optimistic upsert: no id → insert (DB generates id); id → update.
  // On any DB error we re-sync that entity from the server (self-healing), and
  // re-throw so callers that await can surface a message.
  const makeSave = useCallback((stateKey) => async (obj) => {
    const table = TABLE_BY_STATE[stateKey];
    const map = MAP_BY_STATE[stateKey];
    if (obj.id) {
      setState((s) => withOrdered(s, stateKey, s[stateKey].map((x) => (x.id === obj.id ? { ...x, ...obj } : x))));
      const { data, error } = await sb.from(table).update(toRow(obj, map)).eq('id', obj.id).select().single();
      if (error) { console.error(`update ${stateKey}`, error); await reloadEntity(stateKey); throw error; }
      setState((s) => withOrdered(s, stateKey, s[stateKey].map((x) => (x.id === obj.id ? fromRow(data, map) : x))));
      return obj.id;
    }
    const tempId = `tmp_${Math.random().toString(36).slice(2, 9)}`;
    const row = toRow(obj, map);
    // A brand-new modifier goes to the bottom of the manual order.
    if (stateKey === 'modifiers' && row.sort_order == null) {
      row.sort_order = (stateRef.current.modifiers.reduce((m, x) => Math.max(m, Number(x.sortOrder) || 0), 0) || 0) + 1;
    }
    setState((s) => withOrdered(s, stateKey, [...s[stateKey], { ...obj, id: tempId, sortOrder: row.sort_order ?? obj.sortOrder }]));
    const { data, error } = await sb.from(table).insert(row).select().single();
    if (error) {
      console.error(`insert ${stateKey}`, error);
      setState((s) => ({ ...s, [stateKey]: s[stateKey].filter((x) => x.id !== tempId) }));
      throw error;
    }
    const saved = fromRow(data, map);
    setState((s) => withOrdered(s, stateKey, s[stateKey].map((x) => (x.id === tempId ? saved : x))));
    return saved.id;
  }, [reloadEntity]);

  // ---- Modifier ordering (admin drag-and-drop → app) ------------------------
  // Persists position = index for the whole list in one call so the app, the
  // item form and the reports all show modifiers in this order.
  const reorderModifiers = useCallback(async (ids) => {
    const byId = Object.fromEntries(stateRef.current.modifiers.map((m) => [m.id, m]));
    const next = ids.map((id, i) => ({ ...byId[id], sortOrder: i + 1 })).filter((m) => m.id);
    setState((s) => ({ ...s, modifiers: next }));
    const { error } = await sb.rpc('munchies_reorder_modifiers', { p_ids: ids });
    if (error) {
      // Older DB without the RPC: fall back to one update per row.
      const results = await Promise.all(ids.map((id, i) => sb.from('modifiers').update({ sort_order: i + 1 }).eq('id', id)));
      const failed = results.find((r) => r.error);
      if (failed) { console.error('reorderModifiers', failed.error); await reloadEntity('modifiers'); throw failed.error; }
    }
  }, [reloadEntity]);

  const makeDelete = useCallback((stateKey) => async (id) => {
    setState((s) => withOrdered(s, stateKey, s[stateKey].filter((x) => x.id !== id)));
    const { error } = await sb.from(TABLE_BY_STATE[stateKey]).delete().eq('id', id);
    if (error) { console.error(`delete ${stateKey}`, error); await reloadEntity(stateKey); throw error; }
  }, [reloadEntity]);

  const makeDeleteMany = useCallback((stateKey) => async (ids) => {
    setState((s) => withOrdered(s, stateKey, s[stateKey].filter((x) => !ids.includes(x.id))));
    const { error } = await sb.from(TABLE_BY_STATE[stateKey]).delete().in('id', ids);
    if (error) { console.error(`deleteMany ${stateKey}`, error); await reloadEntity(stateKey); throw error; }
  }, [reloadEntity]);

  const saveSettings = useCallback(async (patch) => {
    setSettings((s) => ({ ...(s || {}), ...patch }));
    const row = { id: 1, ...toRow(patch, SETTINGS_KEYS), updated_at: new Date().toISOString() };
    const { error } = await sb.from('business_settings').upsert(row, { onConflict: 'id' });
    if (error) console.error('saveSettings', error);
  }, []);

  // ---- Order cancellation ---------------------------------------------------
  // The receipt is kept for the audit trail and simply flagged, so every report
  // can exclude it while the order itself stays visible/restorable.
  const setReceiptStatus = useCallback(async (id, status, reason) => {
    const patch = status === 'cancelled'
      ? { status: 'cancelled', cancelled_at: new Date().toISOString(), cancel_reason: reason || null }
      : { status: 'completed', cancelled_at: null, cancel_reason: null };
    setSalesRows((s) => ({ ...s, receipts: s.receipts.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
    const { error } = await sb.from('receipts').update(patch).eq('id', id);
    if (error) { console.error('setReceiptStatus', error); await reloadSales(); throw error; }
  }, [reloadSales]);

  const cancelReceipt = useCallback((id, reason) => setReceiptStatus(id, 'cancelled', reason), [setReceiptStatus]);
  const restoreReceipt = useCallback((id) => setReceiptStatus(id, 'completed'), [setReceiptStatus]);

  // ---- Expense categories ---------------------------------------------------
  const addExpenseCategory = useCallback(async (name) => {
    const clean = String(name || '').trim();
    if (!clean) throw new Error('Enter a category name.');
    const nextOrder = (expenseCategories.reduce((m, c) => Math.max(m, c.sort_order || 0), 0) || 0) + 1;
    const { error } = await sb.from('expense_categories').insert({ name: clean, sort_order: nextOrder });
    if (error) throw new Error(error.code === '23505' ? `"${clean}" already exists.` : error.message);
    await reloadExpenseCategories();
  }, [expenseCategories, reloadExpenseCategories]);

  // Renaming also rewrites the text on existing expenses so history stays grouped.
  const updateExpenseCategory = useCallback(async (id, name) => {
    const clean = String(name || '').trim();
    if (!clean) throw new Error('Enter a category name.');
    const prev = expenseCategories.find((c) => c.id === id);
    const { error } = await sb.from('expense_categories').update({ name: clean }).eq('id', id);
    if (error) throw new Error(error.code === '23505' ? `"${clean}" already exists.` : error.message);
    if (prev?.name && prev.name !== clean) {
      await sb.from('expenses').update({ category: clean }).eq('category', prev.name);
      await reloadExpenses();
    }
    await reloadExpenseCategories();
  }, [expenseCategories, reloadExpenseCategories, reloadExpenses]);

  const deleteExpenseCategory = useCallback(async (id) => {
    const { error } = await sb.from('expense_categories').delete().eq('id', id);
    if (error) throw error;
    await reloadExpenseCategories();
  }, [reloadExpenseCategories]);

  const reports = useMemo(() => computeReports({
    receipts: salesRows.receipts,
    lines: salesRows.lines,
    items: state.items,
    categories: state.categories,
    modifiers: state.modifiers,
    employees: state.employees,
    customers: state.customers,
    expenses,
  }), [salesRows, state.items, state.categories, state.modifiers, state.employees, state.customers, expenses]);

  const value = useMemo(() => ({
    ...state,
    settings,
    reports,
    salesRows,
    ready,
    // expenses + their categories
    expenses, expenseCategories, reloadExpenses, reloadExpenseCategories,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    // orders
    cancelReceipt, restoreReceipt, reloadSales,
    // items
    saveItem: makeSave('items'), deleteItem: makeDelete('items'), deleteItems: makeDeleteMany('items'),
    // categories
    saveCategory: makeSave('categories'), deleteCategory: makeDelete('categories'), deleteCategories: makeDeleteMany('categories'),
    // modifiers
    saveModifier: makeSave('modifiers'), deleteModifier: makeDelete('modifiers'), deleteModifiers: makeDeleteMany('modifiers'),
    reorderModifiers,
    // discounts
    saveDiscount: makeSave('discounts'), deleteDiscount: makeDelete('discounts'), deleteDiscounts: makeDeleteMany('discounts'),
    // employees
    saveEmployee: makeSave('employees'), deleteEmployee: makeDelete('employees'), deleteEmployees: makeDeleteMany('employees'),
    // roles
    saveRole: makeSave('roles'), deleteRole: makeDelete('roles'), deleteRoles: makeDeleteMany('roles'),
    // customers
    saveCustomer: makeSave('customers'), deleteCustomer: makeDelete('customers'), deleteCustomers: makeDeleteMany('customers'),
    // settings
    saveSettings,
    // helpers
    categoryName: (id) => state.categories.find((c) => c.id === id)?.name || 'No category',
    itemCount: (categoryId) => state.items.filter((i) => i.categoryId === categoryId).length,
    roleName: (id) => state.roles.find((r) => r.id === id)?.name || '—',
    role: (id) => state.roles.find((r) => r.id === id) || null,
    employeeCount: (roleId) => state.employees.filter((e) => e.roleId === roleId).length,
  }), [
    state, settings, reports, salesRows, ready, makeSave, makeDelete, makeDeleteMany, saveSettings, reorderModifiers,
    expenses, expenseCategories, reloadExpenses, reloadExpenseCategories,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    cancelReceipt, restoreReceipt, reloadSales,
  ]);

  return <MunchiesContext.Provider value={value}>{children}</MunchiesContext.Provider>;
}

export function useMunchies() {
  const ctx = useContext(MunchiesContext);
  if (!ctx) throw new Error('useMunchies must be used inside <MunchiesProvider>');
  return ctx;
}

// Reports scoped to a date range ({ start, end } ISO days, or key 'all').
// Every report page uses this so the picker in its toolbar drives the numbers.
export function useReports(range) {
  const { salesRows, items, categories, modifiers, employees, customers, expenses } = useMunchies();
  return useMemo(() => computeReports({
    receipts: salesRows.receipts, lines: salesRows.lines,
    items, categories, modifiers, employees, customers, expenses, range,
  }), [salesRows, items, categories, modifiers, employees, customers, expenses, range]);
}
