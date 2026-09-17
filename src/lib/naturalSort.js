// Natural "menu" ordering shared by the admin, the app and the DB
// (public.natural_sort_key in munchies_migration_v4.sql implements the same
// rule server-side):
//
//   1 Burgers < 1.1 Crispy < 1.2.1 Chicken < 1.9 Fried < 1.10 Wraps < 2 Fries < 2.2 Drinks < Specials
//
//   * a leading dotted code is compared number by number (1.9 < 1.10, 1 < 1.1)
//   * the remainder is compared digit-aware and case-insensitively
//   * names with no leading number sort after all numbered ones
//
// Used for categories (by name), items (by "code name") and expense
// categories (by name) everywhere they are listed or offered in a dropdown.

const CODE_RE = /^\s*(\d+(?:\.\d+)*)/;

function parts(text) {
  const s = String(text ?? '').trim();
  const m = s.match(CODE_RE);
  return {
    code: m ? m[1].split('.').map(Number) : null,
    rest: (m ? s.slice(m[0].length) : s).toLowerCase(),
  };
}

// Digit-aware compare of two lowercase strings ("pc 10" after "pc 9").
function compareText(a, b) {
  const ta = a.match(/\d+|\D+/g) || [];
  const tb = b.match(/\d+|\D+/g) || [];
  const n = Math.min(ta.length, tb.length);
  for (let i = 0; i < n; i += 1) {
    const x = ta[i];
    const y = tb[i];
    const xn = /^\d/.test(x);
    const yn = /^\d/.test(y);
    if (xn && yn) {
      const d = Number(x) - Number(y);
      if (d) return d;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return ta.length - tb.length;
}

export function compareNatural(a, b) {
  const A = parts(a);
  const B = parts(b);
  if (A.code && !B.code) return -1;
  if (!A.code && B.code) return 1;
  if (A.code && B.code) {
    const n = Math.min(A.code.length, B.code.length);
    for (let i = 0; i < n; i += 1) {
      const d = A.code[i] - B.code[i];
      if (d) return d;
    }
    if (A.code.length !== B.code.length) return A.code.length - B.code.length;
  }
  return compareText(A.rest, B.rest);
}

// The text an item is ordered by: "1.6 Munchies Grilled Burger".
export const itemSortText = (it) => `${it?.code || ''} ${it?.name || ''}`.trim();

// Returns a NEW array ordered naturally by `textOf(row)`; ties fall back to id
// so the order is stable across renders and devices.
export function sortNatural(rows, textOf = (r) => r?.name) {
  return [...(rows || [])].sort(
    (a, b) => compareNatural(textOf(a), textOf(b)) || String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
  );
}

// Manual ordering (modifiers): sort_order ascending, then creation time.
export function sortByOrder(rows, orderOf = (r) => r?.sortOrder, tieOf = (r) => r?.createdAt || '') {
  return [...(rows || [])].sort((a, b) => {
    const oa = Number(orderOf(a));
    const ob = Number(orderOf(b));
    const ea = Number.isFinite(oa) && oa > 0 ? oa : Number.MAX_SAFE_INTEGER;
    const eb = Number.isFinite(ob) && ob > 0 ? ob : Number.MAX_SAFE_INTEGER;
    if (ea !== eb) return ea - eb;
    return String(tieOf(a)).localeCompare(String(tieOf(b))) || String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

// Menu order for ITEMS: the category's position first (categories in natural
// order, uncategorised items last), then the item's own code/name. This is the
// order the Sales screen's "All items" list and the admin item list use, so
// items read exactly like the category dropdown:
//   [1 Burgers] 1.1 … 1.8.2   [1.9 Fried Chicken] 1.9.1 …   [2 Fries] 2.1 …   [no category] …
export function sortItemsByMenu(items, categories, categoryIdOf = (i) => i?.categoryId) {
  const rank = new Map(sortNatural(categories, (c) => c?.name).map((c, i) => [c.id, i]));
  const rankOf = (it) => {
    const id = categoryIdOf(it);
    return rank.has(id) ? rank.get(id) : Number.MAX_SAFE_INTEGER;
  };
  return [...(items || [])].sort(
    (a, b) => (rankOf(a) - rankOf(b))
      || compareNatural(itemSortText(a), itemSortText(b))
      || String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
  );
}

// Position ordering for the stock checker (sort_order = 1-based position set
// by drag-and-drop in the admin). Rows without a position go last, then by name.
export function sortByPosition(rows, orderOf = (r) => r?.sortOrder, nameOf = (r) => r?.name || '') {
  const pos = (r) => {
    const n = Number(orderOf(r));
    return Number.isFinite(n) && n > 0 ? n : Number.MAX_SAFE_INTEGER;
  };
  return [...(rows || [])].sort(
    (a, b) => (pos(a) - pos(b)) || compareNatural(nameOf(a), nameOf(b)) || String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
  );
}
