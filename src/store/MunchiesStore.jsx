import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseMunchies as sb } from '../lib/supabaseMunchies.js';
import { computeReports } from '../data/munchiesReports.js';

// Live catalog store for the Munchies admin, backed by the Munchies Supabase
// project. The exported API (state arrays + save/delete fns + helpers) is kept
// identical to the old localStorage store so none of the pages changed.
// Snake_case DB columns are mapped to the camelCase fields the UI uses.

const MunchiesContext = createContext(null);

// ---- UI field  ->  DB column maps ----------------------------------------
const CATEGORY_KEYS = { name: 'name', color: 'color', sortOrder: 'sort_order' };
const MODIFIER_KEYS = { name: 'name', options: 'options', sortOrder: 'sort_order' };
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

const toRow = (obj, map) => {
  const out = {};
  for (const k of Object.keys(obj || {})) if (k in map) out[map[k]] = obj[k];
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

export function MunchiesProvider({ children }) {
  const [state, setState] = useState({
    categories: [], modifiers: [], items: [], discounts: [], roles: [], employees: [], customers: [],
  });
  const [settings, setSettings] = useState(null);
  const [salesRows, setSalesRows] = useState({ receipts: [], lines: [] }); // raw for reports
  const [ready, setReady] = useState(false);

  const reloadEntity = useCallback(async (stateKey) => {
    const [, table, , order] = ENTITIES.find(([s]) => s === stateKey);
    const { data } = await sb.from(table).select('*').order(order, { ascending: true, nullsFirst: true });
    setState((s) => ({ ...s, [stateKey]: (data || []).map((r) => fromRow(r, MAP_BY_STATE[stateKey])) }));
  }, []);

  const reloadSales = useCallback(async () => {
    const [rc, rl] = await Promise.all([
      sb.from('receipts').select('*'),
      sb.from('receipt_lines').select('*'),
    ]);
    setSalesRows({ receipts: rc.data || [], lines: rl.data || [] });
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

      const next = {};
      ENTITIES.forEach(([stateKey, , map], i) => {
        next[stateKey] = (results[i].data || []).map((r) => fromRow(r, map));
        if (results[i].error) console.error(`load ${stateKey}`, results[i].error);
      });
      setState(next);
      if (s.data) setSettings(fromRow(s.data, SETTINGS_KEYS));
      setSalesRows({ receipts: rc.data || [], lines: rl.data || [] });
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  // Realtime: keep catalog + sales in sync with changes from the app/other tabs.
  useEffect(() => {
    const channel = sb.channel('munchies-admin-rt');
    ENTITIES.forEach(([stateKey, table]) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => reloadEntity(stateKey));
    });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => reloadSales());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'receipt_lines' }, () => reloadSales());
    channel.subscribe();
    return () => { sb.removeChannel(channel); };
  }, [reloadEntity, reloadSales]);

  // Generic optimistic upsert: no id → insert (DB generates id); id → update.
  // On any DB error we re-sync that entity from the server (self-healing), and
  // re-throw so callers that await can surface a message.
  const makeSave = useCallback((stateKey) => async (obj) => {
    const table = TABLE_BY_STATE[stateKey];
    const map = MAP_BY_STATE[stateKey];
    if (obj.id) {
      setState((s) => ({ ...s, [stateKey]: s[stateKey].map((x) => (x.id === obj.id ? { ...x, ...obj } : x)) }));
      const { data, error } = await sb.from(table).update(toRow(obj, map)).eq('id', obj.id).select().single();
      if (error) { console.error(`update ${stateKey}`, error); await reloadEntity(stateKey); throw error; }
      setState((s) => ({ ...s, [stateKey]: s[stateKey].map((x) => (x.id === obj.id ? fromRow(data, map) : x)) }));
      return obj.id;
    }
    const tempId = `tmp_${Math.random().toString(36).slice(2, 9)}`;
    setState((s) => ({ ...s, [stateKey]: [...s[stateKey], { ...obj, id: tempId }] }));
    const { data, error } = await sb.from(table).insert(toRow(obj, map)).select().single();
    if (error) {
      console.error(`insert ${stateKey}`, error);
      setState((s) => ({ ...s, [stateKey]: s[stateKey].filter((x) => x.id !== tempId) }));
      throw error;
    }
    const saved = fromRow(data, map);
    setState((s) => ({ ...s, [stateKey]: s[stateKey].map((x) => (x.id === tempId ? saved : x)) }));
    return saved.id;
  }, [reloadEntity]);

  const makeDelete = useCallback((stateKey) => async (id) => {
    setState((s) => ({ ...s, [stateKey]: s[stateKey].filter((x) => x.id !== id) }));
    const { error } = await sb.from(TABLE_BY_STATE[stateKey]).delete().eq('id', id);
    if (error) { console.error(`delete ${stateKey}`, error); await reloadEntity(stateKey); throw error; }
  }, [reloadEntity]);

  const makeDeleteMany = useCallback((stateKey) => async (ids) => {
    setState((s) => ({ ...s, [stateKey]: s[stateKey].filter((x) => !ids.includes(x.id)) }));
    const { error } = await sb.from(TABLE_BY_STATE[stateKey]).delete().in('id', ids);
    if (error) { console.error(`deleteMany ${stateKey}`, error); await reloadEntity(stateKey); throw error; }
  }, [reloadEntity]);

  const saveSettings = useCallback(async (patch) => {
    setSettings((s) => ({ ...(s || {}), ...patch }));
    const row = { id: 1, ...toRow(patch, SETTINGS_KEYS), updated_at: new Date().toISOString() };
    const { error } = await sb.from('business_settings').upsert(row, { onConflict: 'id' });
    if (error) console.error('saveSettings', error);
  }, []);

  const reports = useMemo(() => computeReports({
    receipts: salesRows.receipts,
    lines: salesRows.lines,
    items: state.items,
    categories: state.categories,
    employees: state.employees,
    customers: state.customers,
  }), [salesRows, state.items, state.categories, state.employees, state.customers]);

  const value = useMemo(() => ({
    ...state,
    settings,
    reports,
    ready,
    // items
    saveItem: makeSave('items'), deleteItem: makeDelete('items'), deleteItems: makeDeleteMany('items'),
    // categories
    saveCategory: makeSave('categories'), deleteCategory: makeDelete('categories'), deleteCategories: makeDeleteMany('categories'),
    // modifiers
    saveModifier: makeSave('modifiers'), deleteModifier: makeDelete('modifiers'), deleteModifiers: makeDeleteMany('modifiers'),
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
  }), [state, settings, reports, ready, makeSave, makeDelete, makeDeleteMany, saveSettings]);

  return <MunchiesContext.Provider value={value}>{children}</MunchiesContext.Provider>;
}

export function useMunchies() {
  const ctx = useContext(MunchiesContext);
  if (!ctx) throw new Error('useMunchies must be used inside <MunchiesProvider>');
  return ctx;
}
