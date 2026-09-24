import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surface a clear message in dev if env vars are missing.
  // eslint-disable-next-line no-console
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Resolve a viewable URL for a stored image reference.
 *  - already a full URL (e.g. member-photos public URL) → returned as-is
 *  - a Storage object path in a private bucket → a temporary signed URL
 */
export async function signedUrl(bucket, pathOrUrl, expiresIn = 3600) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(pathOrUrl, expiresIn);
  if (error) { console.error('signedUrl', error); return null; }
  return data?.signedUrl || null;
}

// Staff logins are created / deleted server-side by admin_create_staff() and
// admin_delete_staff() (supabase/shots_migration_staff_logins.sql) — see
// createStaffLogin / removeStaffLogin in store/ShotsStore.jsx.

/**
 * Upload a File to a Storage bucket and return a usable reference.
 *  - 'member-photos' (public bucket)  → returns a public URL (works as <img src>)
 *  - other (private) buckets          → returns the stored object path
 */
export async function uploadToBucket(bucket, file, prefix = '') {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  if (bucket === 'member-photos') {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  return path;
}
