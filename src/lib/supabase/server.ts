/**
 * Cliente Supabase para codigo que corre en el edge runtime de Vercel
 * (middleware.ts). Usa Web API estandar (Request/Response), no APIs de
 * Next.js como next/headers, para ser compatible con un setup Docusaurus
 * puro sin Next.js wrapper.
 *
 * En el edge runtime de Vercel, process.env SI esta disponible, asi que
 * aqui leemos SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY directamente.
 */
import {createServerClient, type CookieOptions} from '@supabase/ssr';

interface CreateEdgeClientParams {
  request: Request;
  response: Response;
}

/**
 * Crea un cliente Supabase para el runtime edge de Vercel.
 *
 * Lee cookies del Request entrante y escribe cookies actualizadas en el
 * Response (necesario para auto-refresh de tokens expirados).
 *
 * IMPORTANTE: si el token se refresca durante esta request, las nuevas
 * cookies ya quedan en el response que se devuelve al browser.
 */
export function createEdgeSupabaseClient({
  request,
  response,
}: CreateEdgeClientParams) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY env vars in edge runtime.',
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookies(request.headers.get('cookie'));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({name, value, options}) => {
          response.headers.append(
            'Set-Cookie',
            serializeCookie(name, value, options),
          );
        });
      },
    },
  });
}

/**
 * Parser de cookies desde el header `Cookie` de una Request.
 * Retorna array de {name, value} compatible con @supabase/ssr.
 */
function parseCookies(
  cookieHeader: string | null,
): Array<{name: string; value: string}> {
  if (!cookieHeader) return [];

  return cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx < 0) return {name: pair, value: ''};
      const name = pair.slice(0, eqIdx).trim();
      const value = decodeURIComponent(pair.slice(eqIdx + 1).trim());
      return {name, value};
    });
}

/**
 * Serializa un cookie segun RFC 6265 con las opciones que @supabase/ssr
 * espera poder configurar (Path, MaxAge, Domain, Secure, HttpOnly, SameSite).
 */
function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.path) parts.push(`Path=${options.path}`);
  else parts.push('Path=/');
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) {
    const sameSiteValue =
      typeof options.sameSite === 'boolean'
        ? options.sameSite
          ? 'Strict'
          : 'Lax'
        : capitalize(options.sameSite);
    parts.push(`SameSite=${sameSiteValue}`);
  }

  return parts.join('; ');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
