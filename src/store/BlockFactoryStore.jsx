import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseBlockFactory as sb } from '../lib/supabaseBlockFactory.js';
import { computeReports } from '../data/blockFactoryReports.js';

// Live catalog store for the Block Factory admin, backed by the Block Factory Supabase
// project. The exported API (state arrays + save/delete fns + helpers) is kept
// identical to the old localStorage store so none of the pages changed.
// Snake_case DB columns are mapped to the camelCase fields the UI uses.

const BlockFactoryContext = createContext(null);

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

export function BlockFactoryProvider({ children }) {
  const [state, setState] = useState({
    categories: [], modifiers: [], items: [], discounts: [], roles: [], employees: [], customers: [],
  });
  const [settings, setSettings] = useState(null);
  const [salesRows, setSalesRows] = useState({ receipts: [], lines: [] }); // raw for reports
  const [expenses, setExpenses] = useState([]);            // raw rows — reports + Expenses page
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]); // receivables ledger
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

  const reloadExpenses = useCallback(async () => {
    const { data } = await sb.from('expenses').select('*')
      .order('spent_on', { ascending: false }).order('created_at', { ascending: false });
    setExpenses(data || []);
  }, []);

  // Walk-in payments made against a customer's account (money collected outside
  // a sale). Cash taken at the till lives on receipts.paid instead.
  const reloadCustomerPayments = useCallback(async () => {
    const { data, error } = await sb.from('customer_payments').select('*')
      .order('paid_on', { ascending: false }).order('created_at', { ascending: false });
    if (error) { console.error('load customer_payments', error); return; }
    setCustomerPayments(data || []);
  }, []);

  const reloadExpenseCategories = useCallback(async () => {
    const { data } = await sb.from('expense_categories').select('*')
      .order('sort_order', { ascending: true, nullsFirst: true }).order('name', { ascending: true });
    setExpenseCategories(data || []);
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
      await Promise.all([reloadExpenses(), reloadExpenseCategories(), reloadCustomerPayments()]);

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
  }, [reloadExpenses, reloadExpenseCategories, reloadCustomerPayments]);

  // Realtime: keep catalog + sales in sync with changes from the app/other tabs.
  useEffect(() => {
    const channel = sb.channel('block-factory-admin-rt');
    ENTITIES.forEach(([stateKey, table]) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => reloadEntity(stateKey));
    });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'receipts' }, () => reloadSales());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'receipt_lines' }, () => reloadSales());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => reloadExpenses());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'expense_categories' }, () => reloadExpenseCategories());
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'customer_payments' }, () => reloadCustomerPayments());
    channel.subscribe();
    return () => { sb.removeChannel(channel); };
  }, [reloadEntity, reloadSales, reloadExpenses, reloadExpenseCategories, reloadCustomerPayments]);

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

  // ---- Customer receivables -------------------------------------------------
  // A customer's account is: everything billed on live (non-cancelled) receipts,
  // less what they paid at the till on those receipts, less any walk-in payments
  // recorded against the account. Mirrors the app's math exactly.
  const customerBalances = useMemo(() => {
    const m = {};
    const bucket = (id) => (m[id] = m[id] || { billed: 0, paid: 0, balance: 0 });
    salesRows.receipts.forEach((r) => {
      if (!r.customer_id) return;
      if ((r.status || 'completed') === 'cancelled') return;
      const b = bucket(r.customer_id);
      b.billed += Number(r.total) || 0;
      b.paid += Number(r.paid) || 0;
    });
    const cancelledIds = new Set(
      salesRows.receipts.filter((r) => (r.status || 'completed') === 'cancelled').map((r) => r.id)
    );
    customerPayments.forEach((p) => {
      if (!p.customer_id) return;
      // Money applied to a voided bill drops out with it.
      if (p.receipt_id && cancelledIds.has(p.receipt_id)) return;
      bucket(p.customer_id).paid += Number(p.amount) || 0;
    });
    Object.values(m).forEach((b) => { b.balance = b.billed - b.paid; });
    return m;
  }, [salesRows.receipts, customerPayments]);

  const customerBalance = useCallback(
    (id) => customerBalances[id] || { billed: 0, paid: 0, balance: 0 },
    [customerBalances]
  );

  const paymentsForCustomer = useCallback(
    (id) => customerPayments.filter((p) => p.customer_id === id),
    [customerPayments]
  );

  const totalOutstanding = useMemo(
    () => Object.values(customerBalances).reduce((s, b) => s + Math.max(0, b.balance), 0),
    [customerBalances]
  );

  // Outstanding balance on a single bill: total − till payment − payments
  // already applied to it.
  const receiptBalance = useCallback((receiptId) => {
    const r = salesRows.receipts.find((x) => x.id === receiptId);
    if (!r) return { total: 0, paid: 0, balance: 0 };
    const applied = customerPayments
      .filter((p) => p.receipt_id === receiptId)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const paid = (Number(r.paid) || 0) + applied;
    const total = Number(r.total) || 0;
    return {
      total,
      paid,
      balance: (r.status || 'completed') === 'cancelled' ? 0 : Math.max(0, total - paid),
    };
  }, [salesRows.receipts, customerPayments]);

  // Bills a customer still owes on, oldest first.
  const openBillsForCustomer = useCallback((customerId) => (
    salesRows.receipts
      .filter((r) => r.customer_id === customerId && (r.status || 'completed') !== 'cancelled')
      .map((r) => ({
        id: r.id,
        no: r.number || r.id,
        billRef: r.bill_ref || '',
        saleDate: r.sale_date || String(r.created_at || '').slice(0, 10),
        ...receiptBalance(r.id),
      }))
      .filter((r) => r.balance > 0)
      .sort((a, b) => String(a.saleDate).localeCompare(String(b.saleDate)))
  ), [salesRows.receipts, receiptBalance]);

  const paymentsForReceipt = useCallback(
    (receiptId) => customerPayments.filter((p) => p.receipt_id === receiptId),
    [customerPayments]
  );

  // Record a payment. It always clears a SPECIFIC bill, on a date you choose,
  // and never banks more than that bill actually owes (no advance credit).
  const addCustomerPayment = useCallback(async ({ customerId, receiptId, amount, note, paidOn }) => {
    if (!customerId) throw new Error('Pick a customer.');
    if (!receiptId) throw new Error('Pick which bill this payment is for.');
    const owed = receiptBalance(receiptId).balance;
    const amt = Math.min(Math.max(0, Math.round(Number(amount) || 0)), owed);
    if (amt <= 0) throw new Error('Enter an amount greater than zero (and no more than the bill’s balance).');
    const { error } = await sb.from('customer_payments').insert({
      customer_id: customerId,
      receipt_id: receiptId,
      amount: amt,
      note: (note || '').trim() || null,
      paid_on: paidOn || new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;
    await reloadCustomerPayments();
    return amt;
  }, [receiptBalance, reloadCustomerPayments]);

  const deleteCustomerPayment = useCallback(async (id) => {
    const { error } = await sb.from('customer_payments').delete().eq('id', id);
    if (error) throw error;
    await reloadCustomerPayments();
  }, [reloadCustomerPayments]);

  const reports = useMemo(() => computeReports({
    receipts: salesRows.receipts,
    lines: salesRows.lines,
    items: state.items,
    categories: state.categories,
    employees: state.employees,
    customers: state.customers,
    expenses,
    customerPayments,
  }), [salesRows, state.items, state.categories, state.employees, state.customers, expenses, customerPayments]);

  const value = useMemo(() => ({
    ...state,
    settings,
    reports,
    ready,
    // expenses + their categories
    expenses, expenseCategories, reloadExpenses, reloadExpenseCategories,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    // customer receivables
    customerPayments, customerBalances, customerBalance, paymentsForCustomer,
    totalOutstanding, addCustomerPayment, deleteCustomerPayment, reloadCustomerPayments,
    receiptBalance, paymentsForReceipt, openBillsForCustomer,
    // orders
    cancelReceipt, restoreReceipt, reloadSales,
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
  }), [
    state, settings, reports, ready, makeSave, makeDelete, makeDeleteMany, saveSettings,
    expenses, expenseCategories, reloadExpenses, reloadExpenseCategories,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
    customerPayments, customerBalances, customerBalance, paymentsForCustomer,
    totalOutstanding, addCustomerPayment, deleteCustomerPayment, reloadCustomerPayments,
    receiptBalance, paymentsForReceipt, openBillsForCustomer,
    cancelReceipt, restoreReceipt, reloadSales,
  ]);

  return <BlockFactoryContext.Provider value={value}>{children}</BlockFactoryContext.Provider>;
}

export function useBlockFactory() {
  const ctx = useContext(BlockFactoryContext);
  if (!ctx) throw new Error('useBlockFactory must be used inside <BlockFactoryProvider>');
  return ctx;
}
