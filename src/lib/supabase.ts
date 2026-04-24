/**
 * @deprecated Este archivo existe temporalmente para compatibilidad durante
 * la migracion de auth client-side (localStorage) a cookie-based (SSR).
 *
 * Nuevo codigo debe importar directamente desde `@site/src/lib/supabase/`:
 *   import {getSupabaseBrowserClient} from '@site/src/lib/supabase/client';
 *
 * Este archivo sera eliminado en el Prompt 2/3 (refactor de AuthContext).
 */
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@supabase/supabase-js';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

type SupabaseConfig = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

let cachedClient: SupabaseClient | null = null;

/**
 * @deprecated Usar getSupabaseBrowserClient de '@site/src/lib/supabase/client'.
 * Mantiene la firma original para que AuthContext.tsx siga funcionando sin cambios.
 */
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
