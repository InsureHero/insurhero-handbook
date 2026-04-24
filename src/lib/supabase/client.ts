/**
 * Cliente Supabase para codigo que corre en el browser (Client Components,
 * hooks, event handlers del lado cliente).
 *
 * Este cliente usa cookies como storage de sesion (no localStorage).
 * Internamente delega en document.cookie, que luego el middleware edge
 * puede leer para validar autenticacion antes de servir contenido.
 *
 * En Docusaurus las env vars no estan disponibles via process.env en el
 * browser — llegan a traves de siteConfig.customFields. Por eso este
 * factory acepta url y anonKey como parametros.
 */
import {createBrowserClient} from '@supabase/ssr';
import type {SupabaseClient} from '@supabase/supabase-js';

let browserClient: SupabaseClient | undefined;

interface BrowserClientConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Devuelve un singleton del cliente browser de Supabase con cookie storage.
 * Lanza error si se llama fuera del browser.
 */
export function getSupabaseBrowserClient(
  config: BrowserClientConfig,
): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error(
      'getSupabaseBrowserClient() solo puede llamarse en el browser. ' +
        'Usa createEdgeSupabaseClient() en contextos server/edge.',
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
    );
  }

  return browserClient;
}
