/**
 * Middleware Edge de Vercel — proteccion de contenido.
 *
 * Este archivo corre en el edge de Vercel para CADA request al handbook.
 * Valida que exista una cookie de sesion Supabase (sb-*) valida antes de
 * servir cualquier archivo estatico (HTML, JSON, etc.).
 *
 * Politica estricta: solo deja pasar sin auth:
 *   - Rutas publicas explicitas: /login, /reset-password, /auth/callback
 *   - Assets minimos necesarios para renderizar la pagina de login:
 *     JS, CSS, imagenes, fuentes, favicon
 *
 * TODO LO DEMAS (incluido HTML y JSON) requiere cookie sb-* valida.
 */
import {createEdgeSupabaseClient} from './src/lib/supabase/server';

// Rutas publicas que nunca requieren autenticacion.
// Mantener esta lista CORTA y EXPLICITA.
const PUBLIC_PATHS = new Set<string>([
  '/login',
  '/reset-password',
  '/auth/callback',
]);

// Extensiones de archivos que se sirven sin auth.
// EXCLUIDO intencionalmente: .html, .json, .xml, .txt — el contenido de los
// docs vive en esos formatos, y el indice del buscador (search-index-*.json)
// expone el texto completo de todos los docs si no esta protegido.
const PUBLIC_EXTENSIONS = new Set<string>([
  '.js',
  '.mjs',
  '.css',
  '.ico',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.avif',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.map',
]);

export const config = {
  // Aplica a toda ruta, excepto activos internos de Vercel.
  matcher: ['/((?!_vercel).*)'],
};

/**
 * Crea un Response que indica a Vercel "deja pasar esta request al
 * siguiente handler" (sirve el archivo estatico).
 */
function passthrough(): Response {
  return new Response(null, {
    status: 200,
    headers: {'x-middleware-next': '1'},
  });
}

/**
 * Extrae la extension de un pathname (ej: "/img/logo.svg" → ".svg").
 * Retorna string vacio si no hay extension.
 */
function getExtension(pathname: string): string {
  const lastDot = pathname.lastIndexOf('.');
  if (lastDot < 0) return '';
  const lastSlash = pathname.lastIndexOf('/');
  // Si el punto esta antes del ultimo slash, no es extension de archivo
  if (lastDot < lastSlash) return '';
  return pathname.slice(lastDot).toLowerCase();
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  // Normalizar trailing slashes para matching consistente
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  // 1. Assets estaticos con extension permitida: pasar sin check.
  //    JS y CSS son necesarios para que la pagina de login renderice.
  const ext = getExtension(pathname);
  if (ext && PUBLIC_EXTENSIONS.has(ext)) {
    return passthrough();
  }

  // 2. Rutas publicas explicitas: pasar sin check.
  if (PUBLIC_PATHS.has(pathname)) {
    return passthrough();
  }

  // 3. Todo lo demas: requiere sesion valida.
  const response = passthrough();

  const supabase = createEdgeSupabaseClient({request, response});

  // getUser() es la forma RECOMENDADA por Supabase para server-side validation.
  // A diferencia de getSession(), valida el JWT contra el servidor de Supabase
  // y detecta tokens expirados/revocados.
  const {
    data: {user},
    error,
  } = await supabase.auth.getUser();

  // Sin usuario o error de validacion → redirigir a /login.
  if (!user || error) {
    const loginUrl = new URL('/login', url.origin);
    // Preservar destino para redirect post-login.
    if (pathname !== '/login') {
      loginUrl.searchParams.set('redirectTo', pathname + url.search);
    }
    return Response.redirect(loginUrl.toString(), 307);
  }

  // Usuario valido → dejar pasar, con cookies actualizadas si aplica.
  return response;
}
