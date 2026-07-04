import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  seedCategories, seedItems, seedModifiers, seedDiscounts, seedRoles, seedEmployees, seedCustomers,
} from '../data/munchiesCatalog.js';

// Local, UI-only catalog store for the Munchies admin. Seeds from
// munchiesCatalog.js and persists edits to localStorage (no backend yet).

const MunchiesContext = createContext(null);
const KEY = 'munchies.catalog.v1';

const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const DEFAULTS = {
  categories: seedCategories,
  items: seedItems,
  modifiers: seedModifiers,
  discounts: seedDiscounts,
  roles: seedRoles,
  employees: seedEmployees,
  customers: seedCustomers,
};

function loadInitial() {
  try {
    const raw = localStorage.getItem(KEY);
    // Merge in any keys added after the state was first persisted.
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

export function MunchiesProvider({ children }) {
  const [state, setState] = useState(loadInitial);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const value = useMemo(() => {
    const upsert = (key, prefix) => (obj) => {
      if (obj.id) {
        setState((s) => ({ ...s, [key]: s[key].map((x) => (x.id === obj.id ? { ...x, ...obj } : x)) }));
        return obj.id;
      }
      const id = uid(prefix);
      setState((s) => ({ ...s, [key]: [...s[key], { ...obj, id }] }));
      return id;
    };
    const remove = (key) => (id) => setState((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) }));
    const removeMany = (key) => (ids) => setState((s) => ({ ...s, [key]: s[key].filter((x) => !ids.includes(x.id)) }));

    return {
      ...state,
      // items
      saveItem: upsert('items', 'i'),
      deleteItem: remove('items'),
      deleteItems: removeMany('items'),
      // categories
      saveCategory: upsert('categories', 'c'),
      deleteCategory: remove('categories'),
      deleteCategories: removeMany('categories'),
      // modifiers
      saveModifier: upsert('modifiers', 'm'),
      deleteModifier: remove('modifiers'),
      deleteModifiers: removeMany('modifiers'),
      // discounts
      saveDiscount: upsert('discounts', 'd'),
      deleteDiscount: remove('discounts'),
      deleteDiscounts: removeMany('discounts'),
      // employees
      saveEmployee: upsert('employees', 'emp'),
      deleteEmployee: remove('employees'),
      deleteEmployees: removeMany('employees'),
      // roles
      saveRole: upsert('roles', 'r'),
      deleteRole: remove('roles'),
      deleteRoles: removeMany('roles'),
      // customers
      saveCustomer: upsert('customers', 'cu'),
      deleteCustomer: remove('customers'),
      deleteCustomers: removeMany('customers'),
      // helpers
      categoryName: (id) => state.categories.find((c) => c.id === id)?.name || 'No category',
      itemCount: (categoryId) => state.items.filter((i) => i.categoryId === categoryId).length,
      roleName: (id) => state.roles.find((r) => r.id === id)?.name || '—',
      role: (id) => state.roles.find((r) => r.id === id) || null,
      employeeCount: (roleId) => state.employees.filter((e) => e.roleId === roleId).length,
    };
  }, [state]);

  return <MunchiesContext.Provider value={value}>{children}</MunchiesContext.Provider>;
}

export function useMunchies() {
  const ctx = useContext(MunchiesContext);
  if (!ctx) throw new Error('useMunchies must be used inside <MunchiesProvider>');
  return ctx;
}
