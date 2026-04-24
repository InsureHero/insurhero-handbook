/**
 * Entrada publica del modulo supabase.
 *
 * Uso:
 * - En componentes React / hooks del browser:
 *     import {getSupabaseBrowserClient} from '@site/src/lib/supabase';
 * - En middleware edge (middleware.ts):
 *     import {createEdgeSupabaseClient} from '@site/src/lib/supabase';
 */
export {getSupabaseBrowserClient} from './client';
export {createEdgeSupabaseClient} from './server';
