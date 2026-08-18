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

Hoy existen **dos** caminos que crean una fila en `auth.users`, y ambos terminan en la misma estructura de datos (`admins` + `admins_by_channels`):

| Camino | Punto de entrada | Cuándo se crea el `admins` |
|--------|------------------|----------------------------|
| **Self-signup** | Formulario de registro (`supabase.auth.signUp` con `options.data.name`) | En el mismo INSERT, por trigger |
| **Invitación por correo** | Configuración → **Team** → *Invite members* (`supabase.auth.admin.inviteUserByEmail`) | Recién **al aceptar** la invitación |

### Trigger `insert_admin_for_new_authentication`

Un trigger `AFTER INSERT ON auth.users` crea automáticamente la fila en `admins` con `role = 'CHANNEL_AGENT'`. Como se dispara para **cualquier** alta —incluida la que hace `inviteUserByEmail` al momento de invitar, no al aceptar— la función lleva un guard:

- Si `NEW.raw_user_meta_data->>'name'` es `NULL`, el trigger **no inserta nada** y retorna.
- El self-signup siempre manda `name` (campo obligatorio del formulario), así que sigue funcionando igual que antes.
- La invitación nunca manda metadata, así que el alta de `admins` / `admins_by_channels` queda **diferida** al momento de aceptar.

`raw_user_meta_data->>'name'` es el discriminador porque es el único dato presente en el INSERT original: `auth.users.invited_at` todavía no está seteado cuando corre el trigger `AFTER INSERT`.

### Invitación por correo

El botón *Invite members* de `/settings/team` resuelve un único flujo con dos salidas, decididas en el servidor según el email:

- **El email ya existe en `admins`** → se **vincula** al canal (`admins_by_channels`), comportamiento histórico sin cambios. Si ya es miembro de ese canal, devuelve el error de siempre. Los privilegios cargados en el formulario **se ignoran** en este caso.
- **El email no existe** → se envía una invitación real (link de un solo uso, con **24 h** de vigencia) y se registra en la tabla `channel_invitations`.

La invitación guarda el rol (`CHANNEL_AGENT`, fijo: no hay selector de rol de negocio en la UI) y los **privilegios por canal** elegidos al invitar, con el mismo shape `{ can_...: boolean }` que `admins_by_channels.privileges`. Se aplican recién al aceptar.

El correo lo envía Supabase Auth con el **SMTP propio** y la plantilla *Invite user* configurados en el dashboard de Supabase, no desde el repo.

#### Tabla `channel_invitations`

| Columna | Notas |
|---------|-------|
| `channel_id` | Canal al que se invita (aislamiento multi-tenant) |
| `email` | Destinatario |
| `role` | `CHANNEL_AGENT` en esta iteración |
| `privileges` | JSONB, se copia a `admins_by_channels.privileges` al aceptar |
| `invited_by` | Admin que invitó |
| `auth_user_id` | Fila de `auth.users` creada por el invite |
| `status` | `pending` / `accepted` / `revoked` |
| `expires_at` | `created_at` + 24 h |
| `accepted_at` | Se llena al aceptar |

**No hay estado `expired` persistido**: nada lo escribe (no hay cron que lo marque). Una invitación `pending` vencida se detecta comparando `expires_at` contra el momento de lectura, tanto en el listado de Team como al aceptar.

RLS: solo hay policies de **SELECT** —miembros del canal ven las invitaciones de su canal, `SUPER_ADMIN` ve todas—. Toda escritura pasa por `SUPABASE_SERVICE_ROLE_KEY` desde el servidor (mismo criterio que `carrier_external_ids`).

#### Un solo enlace por persona, varios canales

Supabase mantiene un **único link de invitación activo por `auth.users`**: volver a llamar `inviteUserByEmail` invalida el link ya enviado. Por eso las invitaciones se agrupan por `auth_user_id` compartido:

- Invitar el mismo email a un **segundo canal** mientras la invitación del primero sigue viva **no reenvía el correo**: se agrega la fila del canal nuevo reusando el `auth_user_id` y el `expires_at` existentes.
- **Reenviar** actualiza `expires_at` en **todas** las filas `pending` de ese `auth_user_id`, no solo en la del canal que pidió el reenvío.
- **Revocar** marca solo esa fila como `revoked`; el usuario de Auth se borra únicamente si no queda ninguna otra fila `pending` con el mismo `auth_user_id`.
- **Aceptar** resuelve de una sola vez todas las invitaciones `pending` vigentes de esa persona: crea el `admins` una única vez y una fila de `admins_by_channels` por canal.

#### Página pública de aceptación

El enlace del correo entra por `/auth/callback` (intercambia el `code` por sesión) y redirige a `/auth/accept-invite`, página pública bajo el route group `(auth)` que replica el patrón de *reset password*: estados `pending` / `ready` / `expired`, la persona fija su contraseña (`updateUser`) y, si eso funciona, se resuelven las invitaciones y se la lleva al selector de canales.

El formulario solo pide contraseña: el `name` del `admins` se deriva de la parte local del correo, porque el invite no arrastra metadata de perfil.

Ante cualquier fallo —enlace inválido, vencido, revocado o ya usado— se muestra **un único mensaje genérico**, sin distinguir la causa: la página es pública y no debe permitir deducir si un correo existe.

### Quién puede invitar

Invitar, reenviar, revocar y listar invitaciones pendientes exigen el mismo privilegio que ya gatea la pantalla de Team: **`can_create_or_modify_agents`** (entrada `settings_team` del mapa de acceso a páginas). La aceptación no exige privilegio alguno: la persona invitada todavía no tiene ninguno.

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
- `/auth/callback`: intercambia el `code` de los enlaces de un solo uso (recuperación de contraseña, invitación) por sesión y redirige al destino indicado en `next`.
- `/auth/accept-invite`: página pública donde la persona invitada fija su contraseña y activa sus canales pendientes.

### Shield API (Externa)

- `/api/shield/v1/auth/authorize`: Autorización de clientes
- `/api/shield/ia/v1/auth/validator`: Validación de tokens
- `/api/shield/integrations/v1/auth/authorize`: Autorización de integraciones
