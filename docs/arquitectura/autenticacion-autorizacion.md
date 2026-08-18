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

## Alta de administradores

Hay **dos caminos** para que exista una cuenta de administrador. Los dos crean la fila en `admins` con rol `CHANNEL_AGENT`: **no existe selector de rol de negocio en ninguna pantalla**, el rol se fija una sola vez al alta. Lo que cambia es cuándo se crea esa fila y si la membresía de canal viene incluida.

| Camino | Cómo empieza | Cuándo se crea la fila en `admins` | Membresía de canal |
|--------|--------------|------------------------------------|--------------------|
| **Self-signup** | Formulario de registro (`supabase.auth.signUp`, con `name` obligatorio en `options.data`) | En el acto, por trigger de base de datos | Aparte, al crear o vincularse a un canal |
| **Invitación por correo** | Botón *Invite members* en **Configuración → Team** | Al aceptar la invitación y fijar contraseña | Incluida, con los privilegios definidos al invitar |

### Trigger `insert_admin_for_new_authentication()`

Se dispara `AFTER INSERT ON auth.users` y crea la fila en `public.admins` con `role = 'CHANNEL_AGENT'`, tomando `name` y `avatar_url` de `raw_user_meta_data`.

Como la invitación también da de alta un `auth.users` **antes** de que la persona acepte, la función lleva una guarda: **si `raw_user_meta_data->>'name'` es `NULL`, retorna sin insertar nada**. Ese es el discriminador real entre los dos caminos — el self-signup siempre manda `name` (campo obligatorio del formulario), la invitación nunca manda metadata. En el camino de invitación, el alta queda diferida a la aceptación, para que rol y privilegios se apliquen recién entonces.

### Tabla `channel_invitations`

Las invitaciones viven en su propia tabla channel-scoped:

| Columna | Notas |
|---------|-------|
| `channel_id` | FK a `channels`; una fila por canal invitado |
| `email` | Correo del invitado |
| `role` | Hoy siempre `CHANNEL_AGENT` (no hay selector de rol en la UI) |
| `privileges` | JSONB con los privilegios elegidos al invitar; se copian a `admins_by_channels` al aceptar |
| `invited_by` | FK a `admins` |
| `auth_user_id` | Id del `auth.users` creado por la invitación |
| `status` | `pending` / `accepted` / `revoked` |
| `expires_at` | `created_at` + 24 h |
| `accepted_at` | Se completa al aceptar |

`expired` **no es un estado guardado**: nada lo escribe. Una invitación `pending` vencida se detecta comparando `expires_at` contra el momento de lectura, tanto en el router como en la tabla de la UI.

**RLS**: solo hay políticas de `SELECT` — los miembros del canal ven las invitaciones de sus canales y un `SUPER_ADMIN` las ve todas. Toda escritura pasa por el cliente de `SUPABASE_SERVICE_ROLE_KEY` desde el router (mismo criterio que `carrier_external_ids`).

### Router tRPC `invitations`

`invite`, `resend`, `revoke` y `listPending` están gateados por el **mismo privilegio que protege la pantalla** (`can_create_or_modify_agents`, vía `resolvePageAccess("settings_team")`). `accept` no lleva gate: quien acepta todavía no tiene ninguna membresía.

- **`invite({channel_id, email, privileges})`** — un único flujo desde el formulario. Si el correo **ya existe** en `admins`, se limita a vincularlo al canal (comportamiento previo intacto, incluido el error si ya es miembro) y los privilegios del formulario se ignoran. Si no existe, envía la invitación con `supabase.auth.admin.inviteUserByEmail` apuntando a `/auth/callback?next=/auth/accept-invite`, y guarda la fila con el `auth_user_id` devuelto.
- **`resend({invitation_id})`** — reenvía el correo y refresca `expires_at` en **todas** las filas `pending` que compartan ese `auth_user_id`.
- **`revoke({invitation_id})`** — marca esa fila `revoked`. Solo borra el usuario de Auth si no queda ninguna otra fila `pending` con el mismo `auth_user_id`.
- **`listPending({channel_id})`** — invitaciones `pending` de ese canal (vencidas o no); nunca expone las de otros canales.
- **`accept()`** — sin input. Resuelve de una sola vez todas las filas `pending` no vencidas de `auth_user_id = ctx.userId`: crea la fila en `admins` (`CHANNEL_AGENT`) y una membresía en `admins_by_channels` por invitación, con los privilegios de cada una, y las marca `accepted`.

#### Multi-canal

Supabase mantiene **un único link de invitación activo por usuario de Auth**, así que reenviar invalidaría el link ya enviado. Por eso las invitaciones se agrupan por `auth_user_id`, no por fila:

- Invitar el mismo correo a un segundo canal mientras el primero sigue pendiente **no vuelve a enviar el correo**: se reusa el `auth_user_id` y el `expires_at` vivos y solo se agrega la fila del canal nuevo. Un solo clic activa ambos canales.
- Revocar un canal no toca al otro; reenviar desde un canal refresca el vencimiento de todos.

### Aceptación de la invitación

La página **`/auth/accept-invite`** es pública (vive bajo el mismo route group `(auth)` que el resto de las pantallas de acceso) y replica el esqueleto de la de recuperación de contraseña: estados `pending` / `ready` / `expired` resueltos con `onAuthStateChange` más un timeout. La persona fija su contraseña (`updateUser`), y solo si eso sale bien se llama `invitations.accept` antes de mandarla a la selección de canal.

Dos detalles que hacen que el camino funcione:

- **Sin enumeración**: token inválido, vencido, revocado o ya usado devuelven todos el **mismo mensaje genérico**, sin distinguir la causa ni revelar si el correo existe. Un error de contraseña (por ejemplo, longitud insuficiente) sí se muestra inline, porque es accionable y no dice nada del link.
- **Excepción en la redirección de auth**: `checkAuthRedirection` deja pasar `/auth/accept-invite` igual que `/auth/reset-password`. El invitado llega con sesión válida pero sin cookie de canal y **sin fila en `admins` todavía**; sin esa excepción se lo mandaría a la selección de canal, que consulta `admins` y fallaría.

### Configuración fuera del repo

El correo se envía con el **SMTP propio** configurado en Supabase (*Authentication → SMTP Settings*) y usa la plantilla personalizada de *Email Templates → Invite user*: nada de esto vive en el repositorio.

:::warning Vigencia real del enlace
El `expires_at` de 24 h es una regla **de aplicación**. La vida del link que emite Supabase la fija el ajuste global **Email OTP expiration** de Supabase Auth, que afecta por igual a invitaciones, magic links y recuperación de contraseña. Si ese valor está por debajo de 24 h, el enlace muere antes de lo que dice la tabla, y la invitación hay que reenviarla.
:::

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
- `/auth/callback`: intercambia el `code` de los enlaces de un solo uso (invitación, recuperación) por sesión y redirige al `next` recibido.
- `/auth/accept-invite`: página pública donde el invitado fija contraseña y activa sus canales (ver [Alta de administradores](#alta-de-administradores)).

### Shield API (Externa)

- `/api/shield/v1/auth/authorize`: Autorización de clientes
- `/api/shield/ia/v1/auth/validator`: Validación de tokens
- `/api/shield/integrations/v1/auth/authorize`: Autorización de integraciones
