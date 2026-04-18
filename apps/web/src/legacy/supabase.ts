import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isLegacySupabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

const missingSupabaseClient = new Proxy(
  {},
  {
    get() {
      throw new Error(
        'Supabase is not configured. Provide the legacy Supabase environment variables if you still need the compatibility flow.',
      );
    },
  },
) as ReturnType<typeof createClient>;

export const supabase = isLegacySupabaseEnabled
  ? createClient(supabaseUrl, supabaseAnonKey)
  : missingSupabaseClient;
