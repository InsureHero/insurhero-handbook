import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

type SupabaseConfig = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (!ExecutionEnvironment.canUseDOM) {
    throw new Error('Supabase client can only be used in the browser.');
  }

  if (cachedClient) {
    return cachedClient;
  }

  const {supabaseUrl, supabasePublishableKey} = config;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are defined in .env.',
    );
  }

  cachedClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'insurehero-handbook.auth',
      flowType: 'pkce',
    },
  });

  return cachedClient;
}
