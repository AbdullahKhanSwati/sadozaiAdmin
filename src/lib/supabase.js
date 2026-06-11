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
 * Create an app login (auth.users row) for a staff member.
 *
 * We sign the new user up through a SEPARATE, non-persistent Supabase client so
 * the admin's own session is never replaced/cleared. A DB trigger
 * (handle_new_user) automatically creates the matching `profiles` row — that is
 * what ties the login to the business and lets them sign in on the mobile app.
 *
 * Returns { user, alreadyExisted }.
 *  - Throws on a real failure (weak password, invalid email, etc.)
 *  - If the email is already registered, resolves with alreadyExisted: true so
 *    the caller can still save the staff record.
 *
 * NOTE: "Confirm email" must be turned OFF in Supabase → Authentication →
 * Providers → Email, otherwise the staff member can't sign in until they
 * confirm. For an internal staff tool you want it off.
 */
export async function createStaffLogin({ email, password, name }) {
  const tmp = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-staff-signup', // isolated from the admin session
    },
  });

  const { data, error } = await tmp.auth.signUp({
    email: (email || '').trim(),
    password,
    options: { data: { name: name || 'Staff' } },
  });

  if (error) {
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('user already')) {
      return { user: null, alreadyExisted: true };
    }
    throw error;
  }
  return { user: data.user, alreadyExisted: false };
}

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
