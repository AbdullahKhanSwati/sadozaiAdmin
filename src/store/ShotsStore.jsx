import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  initialBookings, initialFinance, initialMembers, initialStaff, initialTables, initialTiers,
  generateMemberId,
} from '../data/shotsData.js';

/**
 * In a real production setup, the tiers + members + bookings would live behind a backend
 * and the staff app would share the same source. For this UI panel, all writes are kept
 * in-memory (one source of truth per session); a localStorage persistence layer can be
 * dropped in here without changing call sites.
 */

const ShotsContext = createContext(null);

export function ShotsProvider({ children }) {
  const [tables,   setTables]   = useState(initialTables);
  const [members,  setMembers]  = useState(initialMembers);
  const [bookings, setBookings] = useState(initialBookings);
  const [finance,  setFinance]  = useState(initialFinance);
  const [staff,    setStaff]    = useState(initialStaff);
  const [tiers,    setTiers]    = useState(initialTiers);

  const counters = useRef({
    table:   Math.max(...initialTables.map((t) => t.id),  0) + 1,
    booking: Math.max(...initialBookings.map((b) => b.id), 1000) + 1,
    finance: Math.max(...initialFinance.map((f) => f.id),  1000) + 1,
    staff:   Math.max(...initialStaff.map((s) => s.id),    100) + 1,
  });

  // Tables ===================================================================
  const addTable = useCallback((data) => {
    const t = {
      id: counters.current.table++,
      number: data.number ?? (tables.length ? Math.max(...tables.map((x) => x.number)) + 1 : 1),
      type: 'Pool',
      location: 'Main Hall',
      status: 'Available',
      condition: 'Excellent',
      memberRate: 400,
      nonMemberRate: 600,
      openTime: '11:00',
      closeTime: '23:00',
      lastCleaned: new Date().toISOString().slice(0, 10),
      ...data,
    };
    setTables((arr) => [...arr, t]);
    return t;
  }, [tables]);

  const updateTable = useCallback((id, patch) => {
    setTables((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTable = useCallback((id) => {
    setTables((arr) => arr.filter((t) => t.id !== id));
  }, []);

  // Members ==================================================================
  const addMember = useCallback((data) => {
    const existingIds = members.map((m) => m.id);
    const id = data.id || generateMemberId(data.cnic, existingIds);
    const m = {
      id,
      joinDate: new Date().toISOString().slice(0, 10),
      status: 'Active',
      visits: 0,
      totalSpent: 0,
      ...data,
    };
    setMembers((arr) => [...arr, m]);
    return m;
  }, [members]);

  const updateMember = useCallback((id, patch) => {
    setMembers((arr) => arr.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const deleteMember = useCallback((id) => {
    setMembers((arr) => arr.filter((m) => m.id !== id));
  }, []);

  // Bookings =================================================================
  const addBooking = useCallback((data) => {
    const b = {
      id: counters.current.booking++,
      status: 'Active',
      ...data,
    };
    if (!b.memberName && b.members) {
      b.memberName = b.members.map((m) => m.name).join(', ');
    }
    setBookings((arr) => [...arr, b]);
    return b;
  }, []);

  const updateBooking = useCallback((id, patch) => {
    setBookings((arr) => arr.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const deleteBooking = useCallback((id) => {
    setBookings((arr) => arr.filter((b) => b.id !== id));
  }, []);

  // Finance ==================================================================
  const addFinanceEntry = useCallback((data) => {
    const f = {
      id: counters.current.finance++,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      type: 'In',
      ...data,
    };
    setFinance((arr) => [...arr, f]);
    return f;
  }, []);

  // Staff ====================================================================
  const addStaff = useCallback((data) => {
    const s = { id: counters.current.staff++, status: 'Active', ...data };
    setStaff((arr) => [...arr, s]);
    return s;
  }, []);

  const updateStaff = useCallback((id, patch) => {
    setStaff((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const deleteStaff = useCallback((id) => {
    setStaff((arr) => arr.filter((s) => s.id !== id));
  }, []);

  // Tiers ====================================================================
  const addTier = useCallback((data) => {
    const id = data.id || `tier-${Date.now()}`;
    const t = {
      id,
      tier: data.tier,
      monthly: Number(data.monthly) || 0,
      color: data.color || '#E53E3E',
      icon: data.icon || 'shield',
      perks: data.perks || [],
    };
    setTiers((arr) => [...arr, t]);
    return t;
  }, []);

  const updateTier = useCallback((id, patch) => {
    setTiers((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTier = useCallback((id) => {
    setTiers((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({
    tables, members, bookings, finance, staff, tiers,
    addTable, updateTable, deleteTable,
    addMember, updateMember, deleteMember,
    addBooking, updateBooking, deleteBooking,
    addFinanceEntry,
    addStaff, updateStaff, deleteStaff,
    addTier, updateTier, deleteTier,
  }), [
    tables, members, bookings, finance, staff, tiers,
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
