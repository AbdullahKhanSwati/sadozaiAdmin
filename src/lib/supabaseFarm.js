import { createClient } from '@supabase/supabase-js';

// Farm uses its OWN Supabase project (separate from Shots), so it gets its
// own client + isolated session storage key. Env vars carry the FARM suffix.
// Falls back to the Farm project the app uses (the anon key is public — it is
// shipped inside the app too), so a deploy without the env vars still works.
const url = import.meta.env.VITE_SUPABASE_URL_FARM || 'https://cvvgvmxjfvtanuoytbjk.supabase.co';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY_FARM
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dmd2bXhqZnZ0YW51b3l0YmprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNDQ5NTQsImV4cCI6MjEwNTgyMDk1NH0.ROrxIklVMZCn6UctrW6CKtYUUnqi30NzdCPpuI69PnQ';

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error('Missing VITE_SUPABASE_URL_FARM or VITE_SUPABASE_ANON_KEY_FARM in .env');
}

export const supabaseFarm = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: 'sb-farm', // isolated from the Shots session
  },
});

/**
 * Create an app login (auth.users row) for a Farm employee, WITHOUT
 * disturbing the admin's own session. Uses a throwaway non-persistent client.
 *
 * The handle_new_user DB trigger creates the matching `profiles` row and sets
 * its role from the `role` metadata ('admin' | 'staff'). Admins can access the
 * admin panel + app; staff can access the app only.
 *
 * Returns { user, alreadyExisted }.
 */
export async function createFarmLogin({ email, password, name, role }) {
  const tmp = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-farm-signup',
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
  const { error } = await supabaseFarm.rpc('admin_set_staff_password', {
    target_email: email, new_password: password,
  });
  if (error) throw error;
}

// Admin-only: set a staff member's access role ('admin' | 'staff').
export async function adminSetStaffRole(email, role) {
  const { error } = await supabaseFarm.rpc('admin_set_staff_role', {
    target_email: email, new_role: role,
  });
  if (error) throw error;
}

// Delete the caller's own account (Account → Delete).
export async function deleteOwnAccount() {
  const { error } = await supabaseFarm.rpc('delete_own_account');
  if (error) throw error;
}

// Admin-only: delete a staff member's app login by email.
export async function adminDeleteStaff(email) {
  const { error } = await supabaseFarm.rpc('admin_delete_staff', { target_email: email });
  if (error) throw error;
}

// Upload an item image to the public `item-images` bucket; returns a public URL.
export async function uploadItemImage(file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabaseFarm.storage.from('item-images').upload(path, file, {
    cacheControl: '3600', upsert: true, contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabaseFarm.storage.from('item-images').getPublicUrl(path);
  return data.publicUrl;
}
