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

El sistema maneja cuatro roles de dashboard:

- **`SUPER_ADMIN`**: operador de InsureHero, transversal a todos los canales
- **`CHANNEL_AGENT`**: operador de un canal
- **`INSURER_USER`**: operador de una aseguradora
- **`BROKER_USER`**: operador de un broker

El rol define el punto de partida; lo que cada persona puede hacer dentro de un canal lo afinan los **privilegios granulares**.

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
| Operación | `can_view_batch_jobs`, `can_view_risk_items_example` |

Cómo se aplican:

- **Visibilidad de páginas**: cada página del dashboard declara el privilegio (y, si aplica, los roles) que exige; las que el admin no puede abrir **no se pintan en la navegación** (ver la sección *Navegación dinámica por permisos*, más abajo).
- **Acciones puntuales**: privilegios específicos gatean operaciones concretas. Por ejemplo, **`can_download_risk_items`** habilita la **exportación / descarga de risk items** en el backoffice.
- Los privilegios del admin en sesión llegan al cliente con `trpc.admins.selectById` — junto con `trpc.channels.select` para los flags del canal activo — y se asignan desde la gestión de agentes / usuarios.

#### Fuente única: el registro de privilegios

El catálogo de privilegios y el registro de páginas viven en un solo módulo (`types/privileges.registry.ts`):

- **`PRIVILEGE_CATALOG`** — una entrada por privilegio con su clave, su etiqueta y el **grupo** al que pertenece (`view`, `create`, `edit`, `download`, `admin`). De ahí derivan el tipo `Privileges`, las opciones de los cinco selects de asignación (`FormPrivileges*Select`) y el JSON legible de privilegios.
- **`PAGE_ACCESS_REGISTRY`** — una entrada por página o acción gateada, con el privilegio que exige y, si aplica, los roles permitidos (`allowedRoles`) o denegados (`deniedRoles`). De ahí derivan `PageName` y `pageAccessMap`.

Añadir un privilegio nuevo se hace **en ese módulo**: el tipo, el select de su grupo y el mapa de páginas lo recogen solos.

El catálogo lleva además las banderas de convención:

| Bandera | Qué significa |
|---------|---------------|
| `superAdminOptOut` | El `SUPER_ADMIN` lo tiene salvo que esté explícitamente en `false`. Hoy solo lo lleva `can_view_batch_jobs`. |
| `brokerChannelDenied` | Se niega a un `BROKER_USER` cuando el canal activo es de tipo broker, aunque su fila lo conceda. |
| `superAdminOnlyOption` | Solo un `SUPER_ADMIN` puede asignarlo desde la UI de administración (`can_modify_channel_settings`). |

#### De qué fila se leen los privilegios

- **`SUPER_ADMIN`** → el blob global `admins.privileges`.
- **Resto de roles** → la fila de `admins_by_channels` del **canal activo**. Esa fila es la prueba de pertenencia al canal, así que un privilegio del blob global nunca concede acceso cross-tenant.
- El valor se **normaliza siempre** antes de evaluarlo: en base puede venir como array vacío y el cliente sintetiza `"{}"` cuando no hay fila de canal. Ambas formas se leen como "sin privilegios concedidos", no como "todo oculto".

Excepción: **`can_view_risk_items_example`** se resuelve desde la fila de canal para todos los roles, `SUPER_ADMIN` incluido, porque se activa por canal desde la gestión de equipo.

#### El resolver compartido

`resolvePageAccess(page, context)` (`utils/pageAccess.utils.ts`) es una función pura — rol, privilegios ya resueltos y si el canal activo es broker — y es la **única** que decide. Evalúa en este orden:

1. `deniedRoles` gana sobre todo, incluido el bypass de super-admin.
2. Si hay `allowedRoles` declarados, el rol debe pertenecer a la lista.
3. Página sin privilegio declarado → concedida.
4. `brokerChannelDenied` + `BROKER_USER` + canal broker → denegada.
5. `SUPER_ADMIN` → concedida, salvo `superAdminOptOut` con `false` explícito.
6. Resto de roles → concedida solo si el privilegio está en `true`.

En servidor lo consume **`canAccess(page)`** (`utils/role.utils.ts`), que arma el contexto y delega. En cliente lo consumen el filtrado del menú, las pestañas de settings y los permisos de acción (botón de descarga de risk items, pestaña de eventos del detalle). La capa Experience **consume la decisión, no la reimplementa**: cliente y servidor no pueden divergir.

### Navegación dinámica por permisos

Las tres superficies de navegación del dashboard se construyen con el mismo resolver, de modo que no muestran opciones que al abrirlas devuelven 403 ni ocultan páginas a las que el usuario sí tiene acceso:

- **Menú lateral (`AsideMenu`)** — cada ítem declara la página que exige y el filtrado es **recursivo**. Los subítems **no heredan** el requisito del padre: si el padre se oculta caen sus hijos con él, pero cada hijo gatea con su propia clave (Event History con `can_view_events`, Skills con `can_create_or_modify_skills`, Email Creation con `can_view_emails_templates`). Un grupo que se queda sin hijos visibles desaparece si no tiene destino propio navegable; si tiene enlace propio queda como ítem simple.
- **Enlace de settings en el Navbar** — solo se pinta si el usuario tiene **alguna** pestaña de settings accesible.
- **Pestañas de settings** — cada pestaña declara su predicado y los flags del canal (`is_broker`, `allow_ia`) se suman al privilegio. `/settings` redirige a la **primera pestaña accesible** en el orden Channel → Integration → AI Agent → Team, y responde `Custom403` si no hay ninguna; en ese caso el layout tampoco pinta la barra. La pestaña Logs está marcada como *soon* y nunca cuenta como destino.

Detalles a tener presentes:

- **Ocultar el enlace es usabilidad, no seguridad.** El gate de servidor se mantiene como defensa en profundidad: navegar por URL a una página sin privilegio sigue devolviendo `Custom403`.
- Después de filtrar, una segunda pasada — **presentación pura, sin conocer roles ni privilegios** — reubica los encabezados de sección y los separadores en el primer ítem superviviente de su tramo, y los descarta si el tramo entero quedó oculto. Así ningún ítem queda bajo un encabezado ajeno.
- El filtrado **no depende de textos traducidos**: cambiar el idioma de la UI no altera qué opciones se ven.
- Las pantallas de plataforma (Products, Variants, Coverages, Coverage Types, Insurers, Channels, Admins by Channel) se gatean **por rol `SUPER_ADMIN`**, no por privilegio: ningún privilegio de canal las concede.
- Overview (`/`) y las vistas de Analytics no declaran requisito y siguen visibles para todos los roles cuyo menú las genera.
- Mientras el admin o los canales están cargando, el menú muestra su estado de carga en vez de un menú parcial que después cambiaría.

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
