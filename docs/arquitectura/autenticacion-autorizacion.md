# Autenticación y Autorización

InsureHero utiliza Supabase Auth para la gestión de autenticación y autorización.

## Flujo de Autenticación

### Autenticación de Usuarios

1. **Login**: Los usuarios se autentican con **email + contraseña** a través de Supabase Auth. El **social login (Google/OAuth) está deshabilitado** por política de seguridad: el único método de acceso al dashboard es email/contraseña.
2. **Sesión**: Se mantiene una sesión JWT
3. **Middleware**: Next.js middleware valida la sesión en cada request

### Autenticación de API Externa (Shield API)

La API Shield utiliza un sistema de autenticación basado en tokens:

- **Authorization Header**: Token de API en el header `Authorization`
- **Validación**: Middleware valida el token antes de procesar requests
- **Blacklist**: Algunos endpoints están excluidos de autenticación (ej: `/api/shield/v1/auth`)

Referencia detallada (tokens por rama, namespaces, ejemplos): [Shield (API nativa)](../api-reference/shield/intro.md).

## Alta de usuarios del dashboard

Solo hay **dos caminos** que crean una fila en `auth.users`:

| Camino | Punto de entrada | Cuándo se crea la fila en `admins` |
|--------|------------------|------------------------------------|
| **Self-signup** | Formulario de registro (email + contraseña + nombre) | En el acto, vía trigger de Postgres |
| **Invitación por correo** | Botón *Invite members* en `/settings/team` | Recién cuando la persona acepta la invitación |

El trigger `insert_admin_for_new_authentication()` (`AFTER INSERT ON auth.users`) distingue ambos casos por **`raw_user_meta_data->>'name'`**: el self-signup siempre lo manda (es campo obligatorio del formulario), la invitación nunca. Si llega nulo, el trigger no inserta nada y el alta queda diferida al procedimiento de aceptación. En el self-signup el comportamiento es el de siempre: se crea el `admins` con `role = 'CHANNEL_AGENT'`.

### Invitación por correo

La pantalla de Team expone **un solo flujo**: el formulario pide email y privilegios (el mismo selector de privilegios que se usa para editar agentes) y siempre llama a `trpc.invitations.invite`, que decide internamente qué hacer:

- **El email ya existe en `admins`** → se vincula al canal (`admins_by_channels`), igual que antes. Los privilegios del formulario se ignoran en este camino. Si ya era miembro de ese canal, devuelve el error de siempre (`Member already exists in the channel.`).
- **El email no existe** → se registra la invitación y Supabase envía el correo con `inviteUserByEmail`. El SMTP propio y la plantilla *Invite user* están configurados en el proyecto de Supabase, no en el repo.

`invite`, `resend`, `revoke` y `listPending` están gateados por **`can_create_or_modify_agents`** (el mismo privilegio que da acceso a la página). `accept` no lleva gate: quien acepta todavía no tiene ninguna membresía. Toda escritura de invitaciones pasa por el cliente de **service role**, porque la persona invitada no puede insertarse a sí misma en `admins` / `admins_by_channels` bajo RLS.

### Tabla `channel_invitations`

Tabla channel-scoped con RLS de **solo lectura**: los miembros de un canal ven las invitaciones de ese canal y un `SUPER_ADMIN` las ve todas. No hay policies de INSERT/UPDATE/DELETE — las escrituras van por service role.

| Columna | Notas |
|---------|-------|
| `channel_id` | Canal al que se invita |
| `email` | Destinatario |
| `role` | Fijo en `CHANNEL_AGENT` (no hay selector de rol al invitar) |
| `privileges` | JSONB, se aplica al aceptar |
| `invited_by` | Admin que invitó |
| `auth_user_id` | Usuario de `auth.users` creado por la invitación |
| `status` | `pending`, `accepted` o `revoked` |
| `expires_at` | `created_at` + 24 h |
| `accepted_at` | Sello de aceptación |

**No existe un estado `expired`**: nada lo escribe. Una invitación `pending` vencida se detecta comparando `expires_at` con el momento de la lectura, tanto en el router como en la tabla de invitaciones pendientes del dashboard (que la muestra como *Expired*).

### Invitaciones multi-canal

Supabase mantiene **un único link de invitación activo por usuario de Auth**, así que las operaciones se razonan sobre el `auth_user_id` compartido por email, no sobre una fila suelta:

- **Invitar el mismo email a un segundo canal** mientras el primero sigue pendiente: no se reenvía el correo (invalidaría el link vivo). Se agrega la fila del canal nuevo reusando el mismo `auth_user_id` y `expires_at`; un solo click activa ambos canales.
- **Reenviar**: se vuelve a llamar `inviteUserByEmail` y se refresca `expires_at` en **todas** las filas pendientes de ese `auth_user_id`, no solo en la que pidió el reenvío.
- **Revocar**: marca esa fila como `revoked`. El usuario de `auth.users` solo se borra si no queda ninguna otra fila `pending` con el mismo `auth_user_id`.
- **Listado**: `listPending` devuelve únicamente las invitaciones pendientes **de ese canal**, aunque compartan email o `auth_user_id` con otras.

### Página de aceptación

`/auth/accept-invite` es pública (vive en el mismo route group que login y reset de contraseña) y sigue el mismo esqueleto de estados `pending` / `ready` / `expired` que la página de reset de contraseña. Al enviar el formulario fija la contraseña (`updateUser`) y, si eso funciona, llama `trpc.invitations.accept`, que **resuelve de una sola vez todas las invitaciones pendientes** de esa persona: crea la fila en `admins` (`CHANNEL_AGENT`) y una membresía por canal con los privilegios de cada invitación; luego redirige a la selección de canal.

Dos particularidades del flujo, ambas distintas del reset de contraseña:

- **El link de invitación es implicit flow** (`#access_token=…`), no PKCE: `inviteUserByEmail` corre en el servidor y no puede generar el `code_verifier` que PKCE exige en el navegador. Por eso la página parsea el hash a mano y establece la sesión con `setSession`, en lugar de apoyarse en la detección automática del cliente de Supabase (que rechazaría el token en silencio).
- **La redirección post-login tiene un carve-out** para esta ruta: la persona invitada llega con sesión válida pero sin cookie de canal y sin fila en `admins`, así que no se la puede mandar a la selección de canal antes de aceptar.

Ante **cualquier** fallo (token inválido, vencido, revocado o ya usado) la página muestra un único mensaje genérico, para que una página pública no permita deducir si un correo existe.

:::caution Caducidad real del link
`channel_invitations.expires_at` son 24 h a nivel aplicación, pero el link que emite Supabase caduca según el ajuste global **Email OTP expiration** del proyecto (Authentication → Settings), que también afecta al magic link y al recovery de contraseña. Si ese valor está por debajo de 24 h, manda el de Supabase: el link muere antes de lo que dice la tabla.
:::

## Autorización

### Row Level Security (RLS)

Supabase RLS se utiliza para:

- Controlar acceso a nivel de fila en la base de datos
- Políticas basadas en roles de usuario
- Seguridad a nivel de base de datos

### Roles y Permisos

El sistema maneja diferentes roles:

- **Admin**: Acceso completo al sistema
- **Agent**: Acceso limitado a funcionalidades específicas
- **User**: Usuario final con acceso básico

### Privilegios granulares (por admin y canal)

Además del rol, cada administrador tiene un conjunto de **privilegios granulares** definidos **por canal**: se guardan como un JSONB en la columna **`admins_by_channels.privileges`**. Así, la misma persona puede tener capacidades distintas en cada canal al que pertenece.

Los privilegios son **flags booleanos** agrupados por dominio funcional del dashboard:

| Dominio | Ejemplos de privilegios |
|---------|-------------------------|
| Usuarios / grupos / agentes | `can_view_users`, `can_create_users`, `can_edit_users`, `can_view_agents`, `can_create_or_modify_agents` |
| Reclamos | `can_view_all_claims`, `can_create_claims`, `can_edit_claims` |
| Risk items | `can_view_risk_items`, `can_create_risk_items`, `can_edit_risk_items`, `can_view_events`, **`can_download_risk_items`** |
| Pólizas / paquetes | `can_view_policies`, `can_create_policies`, `can_edit_policies`, `can_view_packages` |
| Workflows / acciones | `can_view_workflows`, `can_create_workflows`, `can_edit_workflows`, `can_view_actions`, … |
| Plantillas de email | `can_view_emails_templates`, `can_create_emails_templates`, `can_edit_emails_templates` |
| Ajustes de canal / skills | `can_modify_channel_settings`, `can_create_or_modify_skills` |

Cómo se aplican:

- **Visibilidad de páginas**: un mapa privilegio→página (`pageAccessMap`) decide qué secciones del dashboard ve el admin; las que no tiene habilitadas se ocultan.
- **Acciones puntuales**: privilegios específicos gatean operaciones concretas. Por ejemplo, **`can_download_risk_items`** habilita la **exportación / descarga de risk items** en el backoffice.
- **Bypass de super-admin**: un **`SUPER_ADMIN`** salta la comprobación de privilegios (y de canal) — ve y puede todo, sin depender de la lista.
- Los privilegios del admin en sesión se cargan en el cliente (procedimiento tRPC `agents.selectAgentLoggedIn`) y se asignan desde la gestión de agentes/usuarios.

## Middleware

El middleware de Next.js maneja:

1. **Common Middleware**: Validaciones generales
2. **Supabase Middleware**: Validación de sesión Supabase
3. **Shield Auth Middleware**: Validación de tokens API
4. **CORS Middleware**: Configuración de CORS

## Endpoints de Autenticación

### Dashboard (Interno)

- Autenticación por **email + contraseña**, gestionada por Supabase Auth.
- **Sin callback de OAuth**: el social login está deshabilitado y el proveedor Google está apagado en todos los ambientes.

### Shield API (Externa)

- `/api/shield/v1/auth/authorize`: Autorización de clientes
- `/api/shield/ia/v1/auth/validator`: Validación de tokens
- `/api/shield/integrations/v1/auth/authorize`: Autorización de integraciones
