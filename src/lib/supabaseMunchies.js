import { createClient } from '@supabase/supabase-js';

// Munchies uses its OWN Supabase project (separate from Shots), so it gets its
// own client + isolated session storage key. Env vars carry the MUNCHIES suffix.
const url = import.meta.env.VITE_SUPABASE_URL_MUNCHIES;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_MUNCHIES;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error('Missing VITE_SUPABASE_URL_MUNCHIES or VITE_SUPABASE_ANON_KEY_MUNCHIES in .env');
}

export const supabaseMunchies = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'sb-munchies', // isolated from the Shots session
  },
});

/**
 * Create an app login (auth.users row) for a Munchies employee, WITHOUT
 * disturbing the admin's own session. Uses a throwaway non-persistent client.
 *
 * The handle_new_user DB trigger creates the matching `profiles` row and sets
 * its role from the `role` metadata ('admin' | 'staff'). Admins can access the
 * admin panel + app; staff can access the app only.
 *
 * Returns { user, alreadyExisted }.
 */
export async function createMunchiesLogin({ email, password, name, role }) {
  const tmp = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-munchies-signup',
    },
  });

  const { data, error } = await tmp.auth.signUp({
    email: (email || '').trim(),
    password,
    options: { data: { name: name || 'Employee', role: role || 'staff' } },
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

// Admin-only: set a staff member's app-login password (via guarded RPC).
export async function adminSetStaffPassword(email, password) {
  const { error } = await supabaseMunchies.rpc('admin_set_staff_password', {
    target_email: email, new_password: password,
  });
  if (error) throw error;
}

// Admin-only: set a staff member's access role ('admin' | 'staff').
export async function adminSetStaffRole(email, role) {
  const { error } = await supabaseMunchies.rpc('admin_set_staff_role', {
    target_email: email, new_role: role,
  });
  if (error) throw error;
}

// Delete the caller's own account (Account → Delete).
export async function deleteOwnAccount() {
  const { error } = await supabaseMunchies.rpc('delete_own_account');
  if (error) throw error;
}

// Admin-only: delete a staff member's app login by email.
export async function adminDeleteStaff(email) {
  const { error } = await supabaseMunchies.rpc('admin_delete_staff', { target_email: email });
  if (error) throw error;
}

// Upload an item image to the public `item-images` bucket; returns a public URL.
export async function uploadItemImage(file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseMunchies.storage.from('item-images').upload(path, file, {
    cacheControl: '3600', upsert: true, contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabaseMunchies.storage.from('item-images').getPublicUrl(path);
  return data.publicUrl;
}
