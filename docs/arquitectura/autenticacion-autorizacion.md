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
| Risk items | `can_view_risk_items`, `can_create_risk_items`, `can_edit_risk_items`, `can_view_events`, **`can_download_risk_items`**, **`can_view_risk_items_example`** |
| Pólizas / paquetes | `can_view_policies`, `can_create_policies`, `can_edit_policies`, `can_view_packages` |
| Workflows / acciones | `can_view_workflows`, `can_create_workflows`, `can_edit_workflows`, `can_view_actions`, … |
| Plantillas de email | `can_view_emails_templates`, `can_create_emails_templates`, `can_edit_emails_templates` |
| Ajustes de canal / skills | `can_modify_channel_settings`, `can_create_or_modify_skills` |

Cómo se aplican:

- **Visibilidad de páginas**: un mapa privilegio→página (`pageAccessMap`) decide qué secciones del dashboard ve el admin; las que no tiene habilitadas se ocultan.
- **Acciones puntuales**: privilegios específicos gatean operaciones concretas. Por ejemplo, **`can_download_risk_items`** habilita la **exportación / descarga de risk items** en el backoffice, y **`can_view_risk_items_example`** (etiquetado *Generate Risk Item Example* en la vista de roles, dentro de los privilegios de tipo *view*) muestra el botón **"Generate Example"** en `/risk-items` — ver [Risk item](./risk-item.md).
- **Bypass de super-admin**: un **`SUPER_ADMIN`** salta la comprobación de privilegios (y de canal) — ve y puede todo, sin depender de la lista. **Excepción**: hay privilegios con *opt-out* explícito (**`can_view_batch_jobs`** y **`can_view_risk_items_example`**), donde un `false` guardado le quita la capacidad también al `SUPER_ADMIN`; si el flag está ausente, la conserva.
- **De dónde se lee cada privilegio**: para roles distintos de `SUPER_ADMIN` siempre se resuelve desde la fila de `admins_by_channels` del canal activo (esa fila es la prueba de pertenencia); un `SUPER_ADMIN` los resuelve desde su blob global (`admins.privileges`). **`can_view_risk_items_example`** es la excepción: se resuelve desde la fila del canal para **todos** los roles, porque solo se edita desde la pantalla de equipo del canal (`/settings/team/{id}/update`) y de otro modo ese cambio no tendría efecto para un `SUPER_ADMIN`.
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
