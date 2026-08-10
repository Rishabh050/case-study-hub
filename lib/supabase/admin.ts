import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      'SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is missing in environment variables.'
    );
  }

  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceRoleKey || 'placeholder-service-role-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
