// Munchies catalog seed data (Items / Categories / Modifiers / Discounts).
// UI-only: the MunchiesStore loads this once, then persists edits to
// localStorage. Field names mirror the Loyverse "Create item" screens.

// Loyverse-style POS colour palette (grey is the default swatch).
export const POS_COLORS = [
  '#BDBDBD', // grey (default)
  '#F44336', // red
  '#E91E63', // pink
  '#FF9800', // orange
  '#CDDC39', // lime
  '#4CAF50', // green
  '#2196F3', // blue
  '#9C27B0', // purple
];

export const POS_SHAPES = ['square', 'circle', 'scalloped', 'hexagon'];

export const SOLD_BY = ['Each', 'Weight/Volume'];

// ---- Categories ----------------------------------------------------------
export const seedCategories = [
  { id: 'c1',  name: '1 Burgers',         color: '#F44336', count: 13 },
  { id: 'c19', name: '1.9 Fried Chicken', color: '#BDBDBD', count: 3 },
  { id: 'c2',  name: '2 Fries',           color: '#BDBDBD', count: 7 },
  { id: 'c22', name: '2.2 Drinks',        color: '#BDBDBD', count: 5 },
  { id: 'c25', name: '2.5 Sauces',        color: '#BDBDBD', count: 4 },
  { id: 'c3',  name: '3 Finger Food',     color: '#BDBDBD', count: 10 },
  { id: 'c4',  name: '4 Pizza',           color: '#BDBDBD', count: 4 },
  { id: 'c5',  name: '5 Paratha Rolls',   color: '#BDBDBD', count: 5 },
  { id: 'c6',  name: '6 Kebabs',          color: '#BDBDBD', count: 4 },
];

// ---- Modifiers -----------------------------------------------------------
export const seedModifiers = [
  { id: 'm1', name: 'Single/Double Burger', options: [{ name: 'Single', price: 0 }, { name: 'Double', price: 200 }] },
  { id: 'm2', name: 'Salad/ Cheese', options: [{ name: 'Add Cheese', price: 50 }, { name: 'No Salad', price: 0 }] },
  { id: 'm3', name: 'Burger Sauce - Special', options: [{ name: 'No Sauce', price: 0 }, { name: 'Ketchup', price: 0 }, { name: 'Mayo', price: 0 }, { name: 'Special Sauce', price: 0 }] },
  { id: 'm4', name: 'Meal', options: [{ name: 'Meal With Fries + Coke', price: 200 }, { name: 'Meal With Fries + Sprite', price: 200 }, { name: 'Meal With Fries + Pepsi', price: 200 }, { name: 'Meal With Fries + Miranda', price: 200 }] },
  { id: 'm5', name: 'Milkshake', options: [{ name: 'Vanilla', price: 0 }, { name: 'Strawberry', price: 0 }, { name: 'Blueberry', price: 0 }, { name: 'Chocolate', price: 0 }, { name: 'Oreo', price: 0 }] },
];

// ---- Discounts -----------------------------------------------------------
// type: 'percent' (value %) | 'amount' (value Rs). value null → asked at sale.
export const seedDiscounts = [
  { id: 'd1', name: 'Managers Discount', type: 'amount', value: null },
  { id: 'd2', name: 'Family Discount', type: 'percent', value: 30 },
  { id: 'd3', name: 'Staff Food', type: 'percent', value: 100 },
  { id: 'd4', name: 'Residents Discount', type: 'percent', value: 10 },
];

// ---- Items ---------------------------------------------------------------
// Each item: code, name, categoryId, price, cost, sku, color, shape,
// availableForSale, soldBy, composite, trackStock, modifiers (ids).
const mk = (id, code, name, categoryId, price, sku) => ({
  id, code, name, categoryId, price, cost: 0, sku: String(sku),
  barcode: '', availableForSale: true, soldBy: 'Each',
  composite: false, trackStock: false, modifiers: [],
  color: '#BDBDBD', shape: 'square',
});

export const seedItems = [
  mk('i1',  '1.1',   'Crispy Burger',          'c1', 400, 10001),
  mk('i2',  '1.2.1', 'Chicken Chapli Burger',  'c1', 450, 10002),
  mk('i3',  '1.2.2', 'Beef Chapli Burger',     'c1', 470, 10003),
  mk('i4',  '1.3',   'Chicken Tikka Burger',   'c1', 500, 10004),
  mk('i5',  '1.4',   'Jumbo Crispy Burger',    'c1', 520, 10005),
  mk('i6',  '1.5.1', 'Crunchy Burger',         'c1', 550, 10006),
  mk('i7',  '1.5.2', 'Zinger Burger',          'c1', 550, 10007),
  mk('i8',  '1.6',   'Munchies Grilled Burger','c1', 600, 10008),
  mk('i9',  '1.7.1', 'Jumbo Crunchy Burger',   'c1', 650, 10009),
  mk('i10', '1.7.2', 'Jumbo Zinger Burger',    'c1', 650, 10010),
  mk('i11', '1.8.1', 'Mighty Burger',          'c1', 750, 10011),
  mk('i12', '1.8.2', 'Mighty Zinger Burger',   'c1', 800, 10012),
  mk('i13', '1.9.1', 'Fried Chicken (1 pc)',   'c19', 220, 10013),
  mk('i14', '1.9.2', 'Fried Chicken (3 pc)',   'c19', 600, 10014),
  mk('i15', '1.9.3', 'Fried Chicken (6 pc)',   'c19', 1100, 10015),
  mk('i16', '2.1',   'Regular Fries',          'c2', 200, 10016),
  mk('i17', '2.1.2', 'Loaded Fries',           'c2', 350, 10017),
  mk('i18', '2.1.3', 'Masala Fries',           'c2', 250, 10018),
  mk('i19', '2.2.1', 'Soft Drink Regular',     'c22', 120, 10019),
  mk('i20', '2.3.3', 'Large Drink',            'c22', 220, 10020),
  mk('i21', '2.2.4', 'Mineral Water',          'c22', 80, 10021),
  mk('i22', '4.1',   'Small Pizza',            'c4', 850, 10022),
  mk('i23', '4.2',   'Medium Pizza',           'c4', 1200, 10023),
  mk('i24', '4.3',   'Large Pizza',            'c4', 1550, 10024),
];

// Give the burger items the default burger modifier set.
seedItems.forEach((it) => {
  if (it.categoryId === 'c1') it.modifiers = ['m1', 'm2', 'm3', 'm4'];
});

// ---- Employees & roles ---------------------------------------------------
// access: 'both' → Back office + POS (Admin) | 'pos' → Munchies app only (Staff)
export const ROLE_ACCESS = {
  both: 'Back office and POS',
  pos: 'POS',
};

// Only two assignable roles per the business: Admin (both) and Staff (POS only).
// Owner is the account owner and can't be removed.
export const seedRoles = [
  { id: 'r-owner', name: 'Owner', access: 'both', color: '#FB8C00', system: true },
  { id: 'r-admin', name: 'Admin', access: 'both', color: '#8E24AA' },
  { id: 'r-staff', name: 'Staff', access: 'pos',  color: '#00897B' },
];

export const seedEmployees = [
  { id: 'emp-owner', name: 'Owner', email: 'munchiesdoberan@gmail.com', phone: '', roleId: 'r-owner' },
];

// ---- Customers -----------------------------------------------------------
// name '' renders as "Unknown". Visit dates are pre-formatted display strings.
const cust = (id, name, phone, firstVisit, lastVisit, visits, spent) => ({
  id, name, phone, email: '', firstVisit, lastVisit, visits, spent, points: 0,
  address: '', city: '', region: '', postalCode: '', country: '', note: '',
});

export const seedCustomers = [
  cust('cu1', 'Rajpoot',      '03105084474', '02 Dec 2025', '04 Mar 2026 at 20:07', 9, 49870),
  cust('cu2', 'Saleem',       '03075727952', '24 Jan 2026', '11 May 2026 at 19:29', 7, 23830),
  cust('cu3', 'Aqib',         '03230958283', '25 Dec 2025', '14 Jun 2026 at 15:30', 6, 18170),
  cust('cu4', 'Hafiz Waheed', '03035932380', '13 Aug 2025', '13 Aug 2025 at 14:23', 3, 16500),
  cust('cu5', '',             '03706207690', '05 May 2026', '21 May 2026 at 19:24', 2, 15640),
  cust('cu6', '',             '03120894676', '14 May 2026', '23 Jun 2026 at 20:16', 3, 13460),
];

export const COUNTRIES = [
  'Pakistan', 'United States', 'United Kingdom', 'United Arab Emirates',
  'India', 'Canada', 'Australia', 'Saudi Arabia',
];
