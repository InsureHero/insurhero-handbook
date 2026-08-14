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

El sistema maneja cuatro roles de operador:

- **`SUPER_ADMIN`**: operador de InsureHero, transversal a todos los canales
- **`CHANNEL_AGENT`**: operador de un canal
- **`INSURER_USER`**: operador de una aseguradora
- **`BROKER_USER`**: operador de un bróker

El rol **no decide el acceso por sí solo**: elige qué componente monta cada pantalla y actúa como filtro previo en el registro de páginas (ver más abajo). El acceso efectivo lo resuelven los privilegios.

### Privilegios granulares (por admin y canal)

Además del rol, cada administrador tiene un conjunto de **privilegios granulares** definidos **por canal**: se guardan como un JSONB en la columna **`admins_by_channels.privileges`**. Así, la misma persona puede tener capacidades distintas en cada canal al que pertenece.

Los privilegios son **flags booleanos** agrupados por dominio funcional del dashboard:

| Dominio | Ejemplos de privilegios |
|---------|-------------------------|
| Usuarios / grupos / agentes | `can_view_users`, `can_create_users`, `can_edit_users`, `can_view_agents`, `can_create_or_modify_agents` |
| Reclamos | `can_view_all_claims`, `can_create_claims`, `can_edit_claims` |
| Risk items | `can_view_risk_items`, `can_create_risk_items`, `can_edit_risk_items`, `can_view_events`, **`can_download_risk_items`**, `can_view_risk_items_example` |
| Órdenes | `can_view_orders` |
| Analítica | `can_view_analytics` |
| Pólizas / paquetes | `can_view_policies`, `can_create_policies`, `can_edit_policies`, `can_view_packages` |
| Workflows / acciones | `can_view_workflows`, `can_create_workflows`, `can_edit_workflows`, `can_view_actions`, … |
| Plantillas de email | `can_view_emails_templates`, `can_create_emails_templates`, `can_edit_emails_templates` |
| Ajustes de canal / skills | `can_modify_channel_settings`, `can_create_or_modify_skills` |

#### Fuente única de verdad

El catálogo de privilegios y el registro de páginas (`PAGE_ACCESS_REGISTRY`) viven juntos en un único módulo. De ahí derivan el tipo `Privileges`, la resolución de acceso y las opciones de los selects de asignación de permisos: **agregar una clave es tocar un solo archivo**, y el formulario de permisos la ofrece sin cambiar ningún componente.

Cómo se aplican:

- **Visibilidad de páginas**: cada entrada del registro asocia una página con su privilegio (`analytics` → `can_view_analytics`, `orders` → `can_view_orders`, …) y, opcionalmente, con gates de rol (`allowedRoles` / `deniedRoles`).
- **Gate de servidor**: la página llama a `canAccess(page)` y devuelve `Custom403` si la resolución da `false`. No es solo cosmética: entrar escribiendo la URL también recibe 403.
- **Filtrado del menú lateral**: los items del menú declaran la misma página en su campo `access` y se resuelven con la misma función, así que el menú nunca muestra algo que la página vaya a rechazar.
- **Acciones puntuales**: privilegios específicos gatean operaciones concretas. Por ejemplo, **`can_download_risk_items`** habilita la **exportación / descarga de risk items** en el backoffice.
- Los privilegios del admin en sesión se cargan en el cliente (procedimiento tRPC `agents.selectAgentLoggedIn`) y se asignan desde la gestión de agentes/usuarios.

#### Orden de resolución

Para una página dada, en este orden:

1. **Gates de rol**: si el rol está en `deniedRoles`, o hay `allowedRoles` y el rol no está, deniega. Ningún privilegio ni convención de ausencia puede saltárselos. Ejemplos: `analytics` deniega a `INSURER_USER`; `agents` solo admite `SUPER_ADMIN`.
2. **Página sin privilegio declarado**: concede (el gate de rol ya decidió).
3. **`brokerChannelDenied`**: deniega a un `BROKER_USER` cuando el canal activo es de tipo bróker, aunque la clave esté en `true`. Lo llevan, entre otras, `can_view_analytics`, `can_view_orders`, `can_view_risk_items`, `can_view_groups` y `can_view_packages`.
4. **`absenceGrants`**: si la clave falta, concede **a cualquier rol**; solo un `false` explícito quita el acceso, super admin incluido.
5. **`SUPER_ADMIN`**: concede, salvo que la clave declare `superAdminOptOut` y esté en `false` explícito.
6. **Resto de roles**: concede solo con la clave en `true`.

**Bypass de super-admin, con dos matices.** Un `SUPER_ADMIN` sigue viendo y pudiendo todo por defecto, pero (a) resuelve sus privilegios desde el blob global `admins.privileges`, no desde la fila del canal, y (b) las claves con `absenceGrants` o `superAdminOptOut` le restan acceso si están en `false` explícito.

**Convenciones de ausencia declaradas hoy**:

| Clave | Convención | Efecto |
|---|---|---|
| `can_view_analytics` | `absenceGrants` | La ausencia concede a todo rol. Un agente de canal sin la clave en su fila ve y abre analítica |
| `can_view_batch_jobs` | `superAdminOptOut` | La ausencia concede al `SUPER_ADMIN`; el resto necesita `true` |
| `can_view_risk_items_example` | `superAdminOptOut` | Igual, pero se resuelve **siempre desde la fila del canal**, super admin incluido, porque es lo que escribe `/settings/team/[agentId]/update` |

**Analítica y órdenes**:

- **Una sola clave para toda la analítica**: `can_view_analytics` gatea las cinco páginas `analytics/*` — `/analytics` y las cuatro sub-analíticas (claims, risk items, orders, subscriptions), que son las que aparecen en el menú. No hay granularidad por sub-analítica. El **Overview del dashboard (`/`) no se gatea**: sigue visible y accesible para los cuatro roles, y es el destino post-login.
- **`/orders` y el detalle de orden gatean con `can_view_orders`**, independiente de `can_view_risk_items`: conceder o retirar risk items ya no arrastra órdenes.

#### Formularios de asignación de permisos

Los cinco multi-selects del formulario de permisos se derivan del catálogo (grupo y etiqueta incluidos), no de prefijos de string. Una clave concedida por ausencia entra **preseleccionada** cuando la convención aplica al rol del admin editado, así que **guardar un admin sin tocar ningún checkbox no le quita acceso**.

El guardado materializa siempre las 35 claves del catálogo: una fila que tenía menos claves sale con todas, y desmarcar una casilla es la única forma de escribir un `false` explícito. Lo que se preserva es el **acceso efectivo**, no el JSON literal.

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
