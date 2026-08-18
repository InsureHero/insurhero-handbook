# Corporate Benefits Portal

El **Corporate Benefits Portal** es una app propia del monorepo (`apps/corporate-benefits-portal`) pensada para **empleados de empresa cliente**: desde ahí una compañía consulta su catálogo de beneficios, su saldo prepago y su presupuesto anual.

No es un módulo del dashboard interno. Es una superficie separada que:

- corre sobre el **mismo proyecto Supabase** que `apps/next` (mismo `auth.users`, mismo `auth.uid()`),
- tiene su **propio cliente Supabase** (`@supabase/ssr`) y no importa código de `apps/next` (las apps no se importan entre sí; solo `packages/`),
- se apoya en el modelo multi-tenant por **`channel_id`**: una empresa del portal **es** un canal de InsureHero.

## Modelo de datos

Las tablas del portal viven en el mismo esquema `public` con prefijo **`corporate_`** y **no duplican el catálogo core**: se montan como *overlay* sobre `packages`, `coverages` y `channels`.

### Categorías de servicio (dominio core)

`service_categories` es un catálogo **global** (sin `channel_id`) que permite agrupar los paquetes por tipo de servicio en el portal:

| Columna | Notas |
|---|---|
| `id` | uuid |
| `name` | único; es la clave de resolución lógica (no se hardcodean UUIDs, que varían entre ambientes) |
| `sort_order` | orden de presentación |
| `is_active` | activa/inactiva |

Filas iniciales: **Viajes** (1), **Salud** (2), **Hogar** (3), **Otros** (99). RLS: lectura para cualquier usuario `authenticated`; las escrituras van por service role.

Cada paquete apunta a una categoría vía `packages.category_id` — ver el nivel **Paquete** en [Estructura Jerárquica de Productos](./estructura-jerarquica-productos.md).

### Tablas del portal

| Tabla | Qué guarda | Unicidad |
|---|---|---|
| `corporate_companies` | Config de la empresa: `name`, `city`, `logo_initials`, `brand_color`, `logo_url`, `annual_budget`, `settings` (JSONB) | **1:1 con el canal** (`channel_id` UNIQUE) |
| `corporate_products` | Overlay comercial del paquete IH: `billing_model`, `price`, `price_unit`, `duration_days`, `display` (JSONB), `is_active` | `(channel_id, package_id)` |
| `corporate_wallets` | Saldo prepago por paquete: `fund_balance` (fondo) y `days_balance` (bolsa de días) | `(channel_id, package_id)` |
| `corporate_wallet_movements` | Ledger **append-only** de movimientos de wallet | — |

Notas de diseño:

- **La moneda no se guarda en estas tablas**: se resuelve por el canal (`channels.currency_id`). `annual_budget` y `price` son importes sin moneda propia.
- **Las coberturas se leen del core** (`coverages` del paquete). `corporate_products` sólo agrega la capa comercial del portal.
- `billing_model` admite `day_pass`, `subscription` y `one_off`; `price_unit` admite `day`, `month` y `once`. `duration_days` sólo aplica al pago único.
- **Sólo los productos prepago tienen wallet**: suscripción y pago único no crean fila en `corporate_wallets`.

### Wallet: caché + ledger

`corporate_wallets` es un **caché de lectura rápida**; la fuente auditable del saldo es el ledger `corporate_wallet_movements`:

| Columna | Notas |
|---|---|
| `wallet_id`, `channel_id` | el canal va denormalizado para RLS y consultas |
| `instrument` | `fund` \| `days` — qué instrumento mueve |
| `amount` | **con signo**: `+` recarga/compra, `−` consumo/expiración |
| `billed_amount` | lo que se facturará; sólo en compras (consumo/expiración → `NULL`) |
| `balance_after` | saldo del instrumento **inmediatamente después** de aplicar el movimiento |
| `expires_at` | sólo créditos con vigencia |
| `movement_type` | `purchase` \| `recharge` \| `consumption` \| `expiration` \| `adjustment` |
| `reference_type` / `reference_id` | `activation` \| `risk_item` y el id apuntado |
| `created_by` | admin que ejecutó; **nullable** (la expiración automática no la ejecuta nadie) |

`balance_after` se calcula y persiste **en la misma transacción** que actualiza el balance cacheado en `corporate_wallets` (saldo previo ± `amount`), así el histórico permite reconstruir el saldo sin depender del caché.

El ledger es **append-only**: no tiene `updated_at` y sus policies RLS cubren sólo `SELECT` e `INSERT`. RLS deniega por defecto lo no cubierto, así que la ausencia de policies de `UPDATE`/`DELETE` es lo que sostiene el append-only para roles `authenticated`.

## Identidad y autenticación

Los usuarios del portal son una población **distinta** de `admins` (back office interno) y de `public.users` (directorio de beneficiarios, sin login). Tienen tablas propias, reusando la infraestructura de Supabase Auth:

- **`corporate_users`** — identidad del usuario de portal. `id` **es** `auth.users.id` (mismo patrón que `admins`: sin default aleatorio, el alta asigna el uid explícitamente; un id distinto del uid daría un usuario que nunca podría loguear). Campos: `email` (único), `first_name`, `last_name`, `avatar_url`, `is_active`, y `deleted_at` para soft-delete. No lleva `channel_id` ni `role`: el usuario es **multi-canal**.
- **`corporate_users_by_channels`** — junction usuario ↔ canal, con **rol por canal**: `role` es `OWNER` u `OPERATOR`, más `privileges` (JSONB) como override por canal. UNIQUE `(channel_id, user_id)`. La misma persona puede ser `OWNER` en una empresa y `OPERATOR` en otra.

El flujo es el estándar de Supabase Auth: el login del portal llama a `signInWithPassword` con su propio cliente, el middleware de la app refresca la sesión y hace el **gating server-side** (sin sesión válida no se accede a rutas protegidas), y el JWT llega a Postgres, donde `auth.uid()` matchea `corporate_users.id`. El usuario multi-canal elige empresa activa entre las de su junction.

> El **alta/invitación** de usuarios del portal no ocurre por trigger sobre `auth.users`: el trigger existente `insert_admin_for_new_authentication` dispara en todo INSERT y crea filas en `admins`, así que un segundo trigger ciego contaminaría la población interna. Las filas `corporate_users` + junction se crean explícitamente en el flujo de alta.

## RLS y aislamiento por canal

Las 4 tablas `corporate_*` de negocio tienen RLS habilitada y scopeada por `channel_id`. Cada policy de lectura reconoce **dos poblaciones**:

1. **Admin interno de InsureHero** — el canal está en su `admins_by_channels`.
2. **Usuario de portal** — el canal está en su `corporate_users_by_channels` y su `corporate_users.deleted_at` es `NULL` (el soft-delete corta el acceso a todos sus canales).

Más la policy `for all` de **`SUPER_ADMIN`**, que ve y puede todo. En `corporate_wallet_movements` la ampliación aplica tanto al `SELECT` como al `INSERT`.

Consecuencias:

- Un usuario sin fila en la junction **no ve ningún canal** (RLS devuelve vacío); es el comportamiento esperado, no un error.
- Seleccionar un canal que no está en su junction queda **rechazado por RLS**.
- Un `auth.uid()` que sea a la vez admin interno y usuario de portal ve por **ambas vías** (las ramas se combinan con `OR`).

Las tablas de identidad (`corporate_users`, `corporate_users_by_channels`) también tienen RLS: un usuario resuelve su propia identidad y sus membresías, y `SUPER_ADMIN` ve todo.

## Referencias

- [Autenticación y Autorización](./autenticacion-autorizacion.md)
- [Estructura Jerárquica de Productos](./estructura-jerarquica-productos.md)
- [Estructura del Monorepo](./estructura-monorepo.md)
