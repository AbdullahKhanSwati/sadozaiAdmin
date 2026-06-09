import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../context/AuthContext.jsx';
import { generateMemberId } from '../data/shotsData.js';

/**
 * Live data store backed by Supabase.
 *
 * The exported API (state arrays + add/update/delete fns) and the *field names*
 * are kept 1:1 with the original in-memory store, so none of the pages/dialogs
 * needed to change. Snake_case DB columns are mapped to the camelCase fields the
 * UI uses via the row<->payload mappers below.
 */

const ShotsContext = createContext(null);

// ---------------------------------------------------------------------------
// Key maps  (UI field  ->  DB column).  Used for both reads (reverse) & writes.
// ---------------------------------------------------------------------------
const TABLE_KEYS = {
  number: 'number', type: 'type', location: 'location', status: 'status',
  condition: 'condition', lastCleaned: 'last_cleaned', memberRate: 'member_rate',
  nonMemberRate: 'non_member_rate', openTime: 'open_time', closeTime: 'close_time',
  occupiedUntil: 'occupied_until', occupiedBy: 'occupied_by',
};
const MEMBER_KEYS = {
  name: 'name', type: 'type', cnic: 'cnic', joinDate: 'join_date',
  expiryDate: 'expiry_date', status: 'status', phone: 'phone', email: 'email',
  visits: 'visits', totalSpent: 'total_spent', photo: 'photo', cnicImage: 'cnic_image',
};
const BOOKING_KEYS = {
  tableId: 'table_id', tableNumber: 'table_number', date: 'date', start: 'start_time',
  end: 'end_time', intervals: 'intervals', status: 'status', amount: 'amount',
  subtotal: 'subtotal', players: 'players', isMember: 'is_member', memberId: 'member_id',
  memberName: 'member_name', memberType: 'member_type', members: 'members', discount: 'discount',
};
const FINANCE_KEYS = {
  date: 'date', time: 'time', type: 'type', category: 'category',
  amount: 'amount', description: 'description', table: 'table_ref',
};
const STAFF_KEYS = {
  name: 'name', role: 'role', email: 'email', phone: 'phone',
  status: 'status', joinedAt: 'joined_at', salary: 'salary',
};
const TIER_KEYS = {
  tier: 'tier', monthly: 'monthly', color: 'color', icon: 'icon', perks: 'perks',
};

// Build a DB row (snake_case) from a (possibly partial) UI object.
function toRow(obj, keymap) {
  const out = {};
  for (const k of Object.keys(obj || {})) {
    if (k in keymap) out[keymap[k]] = obj[k];
  }
  return out;
}
// Build a UI object (camelCase) from a DB row, always carrying `id`.
function fromRow(row, keymap) {
  const out = { id: row.id };
  for (const [uiKey, col] of Object.entries(keymap)) out[uiKey] = row[col];
  return out;
}

const rowToTable = (r) => fromRow(r, TABLE_KEYS);
const rowToMember = (r) => fromRow(r, MEMBER_KEYS);
const rowToBooking = (r) => fromRow(r, BOOKING_KEYS);
const rowToFinance = (r) => fromRow(r, FINANCE_KEYS);
const rowToStaff = (r) => fromRow(r, STAFF_KEYS);
const rowToTier = (r) => fromRow(r, TIER_KEYS);

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

export function ShotsProvider({ children }) {
  const { session } = useAuth();
  const businessId = session?.businessId || null;

  const [tables, setTables] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [finance, setFinance] = useState([]);
  const [staff, setStaff] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [ready, setReady] = useState(false);

  // Initial load whenever the signed-in business changes.
  useEffect(() => {
    if (!businessId) {
      setTables([]); setMembers([]); setBookings([]);
      setFinance([]); setStaff([]); setTiers([]); setReady(false);
      return;
    }
    let active = true;
    (async () => {
      const [t, m, b, f, s, ti] = await Promise.all([
        supabase.from('pool_tables').select('*').order('number', { ascending: true }),
        supabase.from('members').select('*').order('created_at', { ascending: true }),
        supabase.from('bookings').select('*').order('date', { ascending: true }),
        supabase.from('transactions').select('*').order('date', { ascending: true }),
        supabase.from('staff').select('*').order('created_at', { ascending: true }),
        supabase.from('tiers').select('*').order('created_at', { ascending: true }),
      ]);
      if (!active) return;
      setTables((t.data || []).map(rowToTable));
      setMembers((m.data || []).map(rowToMember));
      setBookings((b.data || []).map(rowToBooking));
      setFinance((f.data || []).map(rowToFinance));
      setStaff((s.data || []).map(rowToStaff));
      setTiers((ti.data || []).map(rowToTier));
      setReady(true);
    })();
    return () => { active = false; };
  }, [businessId]);

  // ---- Tables --------------------------------------------------------------
  const addTable = useCallback(async (data) => {
    const row = { ...toRow(data, TABLE_KEYS), business_id: businessId };
    const { data: inserted, error } = await supabase.from('pool_tables').insert(row).select().single();
    if (error) { console.error('addTable', error); return null; }
    const t = rowToTable(inserted);
    setTables((arr) => [...arr, t]);
    return t;
  }, [businessId]);

  const updateTable = useCallback(async (id, patch) => {
    const { data: updated, error } = await supabase
      .from('pool_tables').update(toRow(patch, TABLE_KEYS)).eq('id', id).select().single();
    if (error) { console.error('updateTable', error); return; }
    setTables((arr) => arr.map((t) => (t.id === id ? rowToTable(updated) : t)));
  }, []);

  const deleteTable = useCallback(async (id) => {
    const { error } = await supabase.from('pool_tables').delete().eq('id', id);
    if (error) { console.error('deleteTable', error); return; }
    setTables((arr) => arr.filter((t) => t.id !== id));
  }, []);

  // ---- Members -------------------------------------------------------------
  const addMember = useCallback(async (data) => {
    const id = data.id || generateMemberId(data.cnic, members.map((m) => m.id));
    const row = { ...toRow(data, MEMBER_KEYS), id, business_id: businessId };
    const { data: inserted, error } = await supabase.from('members').insert(row).select().single();
    if (error) { console.error('addMember', error); return null; }
    const m = rowToMember(inserted);
    setMembers((arr) => [...arr, m]);
    return m;
  }, [businessId, members]);

  const updateMember = useCallback(async (id, patch) => {
    const { data: updated, error } = await supabase
      .from('members').update(toRow(patch, MEMBER_KEYS)).eq('id', id).select().single();
    if (error) { console.error('updateMember', error); return; }
    setMembers((arr) => arr.map((m) => (m.id === id ? rowToMember(updated) : m)));
  }, []);

  const deleteMember = useCallback(async (id) => {
    const { error } = await supabase.from('members').delete().eq('id', id);
    if (error) { console.error('deleteMember', error); return; }
    setMembers((arr) => arr.filter((m) => m.id !== id));
  }, []);

  // ---- Bookings ------------------------------------------------------------
  const addBooking = useCallback(async (data) => {
    const payload = { ...data };
    if (!payload.memberName && payload.members) {
      payload.memberName = payload.members.map((m) => m.name).join(', ');
    }
    const row = { ...toRow(payload, BOOKING_KEYS), business_id: businessId };
    if (row.status == null) row.status = 'Active';
    const { data: inserted, error } = await supabase.from('bookings').insert(row).select().single();
    if (error) { console.error('addBooking', error); return null; }
    const b = rowToBooking(inserted);
    setBookings((arr) => [...arr, b]);
    return b;
  }, [businessId]);

  const updateBooking = useCallback(async (id, patch) => {
    const { data: updated, error } = await supabase
      .from('bookings').update(toRow(patch, BOOKING_KEYS)).eq('id', id).select().single();
    if (error) { console.error('updateBooking', error); return; }
    setBookings((arr) => arr.map((b) => (b.id === id ? rowToBooking(updated) : b)));
  }, []);

  const deleteBooking = useCallback(async (id) => {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) { console.error('deleteBooking', error); return; }
    setBookings((arr) => arr.filter((b) => b.id !== id));
  }, []);

  // ---- Finance / transactions ---------------------------------------------
  const addFinanceEntry = useCallback(async (data) => {
    const withDefaults = {
      type: 'In',
      date: data.date || todayStr(),
      time: data.time || nowTime(),
      ...data,
    };
    const row = { ...toRow(withDefaults, FINANCE_KEYS), business_id: businessId };
    const { data: inserted, error } = await supabase.from('transactions').insert(row).select().single();
    if (error) { console.error('addFinanceEntry', error); return null; }
    const f = rowToFinance(inserted);
    setFinance((arr) => [...arr, f]);
    return f;
  }, [businessId]);

  // ---- Staff ---------------------------------------------------------------
  const addStaff = useCallback(async (data) => {
    const row = { status: 'Active', ...toRow(data, STAFF_KEYS), business_id: businessId };
    const { data: inserted, error } = await supabase.from('staff').insert(row).select().single();
    if (error) { console.error('addStaff', error); return null; }
    const s = rowToStaff(inserted);
    setStaff((arr) => [...arr, s]);
    return s;
  }, [businessId]);

  const updateStaff = useCallback(async (id, patch) => {
    const { data: updated, error } = await supabase
      .from('staff').update(toRow(patch, STAFF_KEYS)).eq('id', id).select().single();
    if (error) { console.error('updateStaff', error); return; }
    setStaff((arr) => arr.map((s) => (s.id === id ? rowToStaff(updated) : s)));
  }, []);

  const deleteStaff = useCallback(async (id) => {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) { console.error('deleteStaff', error); return; }
    setStaff((arr) => arr.filter((s) => s.id !== id));
  }, []);

  // ---- Tiers ---------------------------------------------------------------
  const addTier = useCallback(async (data) => {
    const row = {
      tier: data.tier,
      monthly: Number(data.monthly) || 0,
      color: data.color || '#E53E3E',
      icon: data.icon || 'shield',
      perks: data.perks || [],
      business_id: businessId,
    };
    const { data: inserted, error } = await supabase.from('tiers').insert(row).select().single();
    if (error) { console.error('addTier', error); return null; }
    const t = rowToTier(inserted);
    setTiers((arr) => [...arr, t]);
    return t;
  }, [businessId]);

  const updateTier = useCallback(async (id, patch) => {
    const { data: updated, error } = await supabase
      .from('tiers').update(toRow(patch, TIER_KEYS)).eq('id', id).select().single();
    if (error) { console.error('updateTier', error); return; }
    setTiers((arr) => arr.map((t) => (t.id === id ? rowToTier(updated) : t)));
  }, []);

  const deleteTier = useCallback(async (id) => {
    const { error } = await supabase.from('tiers').delete().eq('id', id);
    if (error) { console.error('deleteTier', error); return; }
    setTiers((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({
    tables, members, bookings, finance, staff, tiers, ready,
    addTable, updateTable, deleteTable,
    addMember, updateMember, deleteMember,
    addBooking, updateBooking, deleteBooking,
    addFinanceEntry,
    addStaff, updateStaff, deleteStaff,
    addTier, updateTier, deleteTier,
  }), [
    tables, members, bookings, finance, staff, tiers, ready,
    addTable, updateTable, deleteTable,
    addMember, updateMember, deleteMember,
    addBooking, updateBooking, deleteBooking,
    addFinanceEntry,
    addStaff, updateStaff, deleteStaff,
    addTier, updateTier, deleteTier,
  ]);

  return <ShotsContext.Provider value={value}>{children}</ShotsContext.Provider>;
}

export function useShots() {
  const ctx = useContext(ShotsContext);
  if (!ctx) throw new Error('useShots must be used inside <ShotsProvider>');
  return ctx;
}
