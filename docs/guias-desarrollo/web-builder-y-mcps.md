# Web builder y servidores MCP

:::note Herramienta interna / POC
El **web builder** (maker de frontales) es una herramienta interna en fase de POC: solo la usan admins con rol `SUPER_ADMIN`. Los dos servidores MCP de `packages/mcps/*` son la vía por la que un agente de IA accede a la lógica de negocio de InsureHero **sin tocar la base de datos**.
:::

El **web builder** (`apps/web-builder`) es un generador de webs por IA: el admin describe un frontal (landing / funnel de venta al cliente final) y cada prompt corre **Claude Code dentro de un sandbox E2B**, que escribe el proyecto y lo sirve como preview. Para que la web generada opere sobre InsureHero, el agente se apoya en servidores **MCP** que hablan con la **Shield API**.

Regla de arquitectura que atraviesa todo: **la web generada consume la API de InsureHero y nunca se conecta a su base**. El aislamiento por `channel_id`, la validación y la auditoría viven en la capa de API; si una operación no existe como endpoint, no se replica en la web.

## Piezas

| Pieza | Workspace | Qué hace |
|-------|-----------|----------|
| Web builder | `apps/web-builder` | UI de chat + preview del sandbox E2B. Toolchain propio (Next 16 / React 19), fuera del toolchain de la raíz. Puerto dev 5000 (`yarn start:web-builder`). |
| MCP de acciones | `packages/mcps/insurehero` (`insurehero-mcp`) | **Ejecuta** operaciones contra Shield API (catálogo, cobros, altas). |
| MCP de documentación | `packages/mcps/web-builder` (`insurehero-web-builder-mcp`) | **No ejecuta nada**: devuelve la documentación para que el agente *implemente* esas operaciones en la web que construye. |
| Tabla `sandboxes` | `apps/next/supabase/migrations` | Persiste la relación admin ↔ sandbox E2B para listar y reanudar chats. |

## MCP de acciones (`packages/mcps/insurehero`)

Siete tools que **delegan** en Shield API: mandan el body y devuelven la respuesta, sin reimplementar reglas de negocio (Shield revalida todo y su `details` vuelve textual al agente).

| Tool | Endpoint |
|------|----------|
| `list_products` | `GET /api/shield/v1/products` |
| `list_policies` | `GET /api/shield/v1/policies` |
| `list_packages` | `GET /api/shield/v1/packages` |
| `get_policy_subject_schema` | `GET /api/shield/v1/policies/{policyNumber}/subject-schema` |
| `list_orders` | `GET /api/shield/v1/orders` |
| `create_policy` | `POST /api/shield/ia/v2/policies` |
| `create_risk_item` | `POST /api/shield/v1/risk-items` |

Comportamiento relevante:

- **`channel_id` no es parámetro de ninguna tool.** El canal sale de la credencial (`channels.api_key`): el middleware de Shield lo deriva del token, así que no hay superficie para cruzar tenants desde el prompt.
- **Dos caches de token**, una por scope: `/api/shield/v1/**` y `/api/shield/ia/**` se firman con secretos distintos (`AUTH_SECRET` / `AUTH_IA_SECRET`). Un 401 descarta el token cacheado, re-autoriza y reintenta **una** vez.
- `create_policy` crea un **borrador**: la respuesta indica que todavía no sirve para `create_risk_item` (`usable_for_risk_items: false`).
- Validaciones locales que cortan antes de llamar a Shield: rango de paginación mayor a 100, rango de fechas de orders mayor a 6 meses, filtro por variante con un solo parámetro.

### Configuración y transportes

| Variable | Uso |
|----------|-----|
| `SHIELD_BASE_URL` | Obligatoria. Base de la app que sirve Shield. |
| `SHIELD_API_KEY` | api_key del canal. Obligatoria en stdio; opcional en HTTP (ver modos). |
| `SHIELD_AI_API_KEY` | Opcional. Solo la necesita `create_policy` (ruta `/ia`); sin ella las otras seis tools funcionan. |

Las variables se leen del entorno del proceso y, como respaldo, del `.env` del paquete (el entorno gana).

- **stdio** (`start:stdio`): la credencial sale de `SHIELD_API_KEY`; sin ella el servidor no arranca.
- **HTTP** (`start:http`, puerto por defecto `3400`, path `/mcp`), en dos modos:
  - **Multi-tenant** (sin `SHIELD_API_KEY`): el bearer de cada request **es** la api_key del canal. Un mismo proceso sirve a varios canales. `MCP_AUTH_TOKEN` es incompatible con este modo (el servidor no arranca si ambos están presentes).
  - **Single-tenant** (con `SHIELD_API_KEY`): el canal lo fija el entorno y el bearer es un gate compartido (`MCP_AUTH_TOKEN`). Si el servidor es alcanzable desde afuera sin `MCP_AUTH_TOKEN`, **no arranca**.
- Guardas HTTP: allowlist de `Host` y `Origin` (`MCP_ALLOWED_HOSTS`, `MCP_ALLOWED_ORIGINS`; por defecto solo localhost, contra DNS rebinding) → 403; path distinto al configurado → 404; `/health` responde el estado sin auth.

## MCP de documentación (`packages/mcps/web-builder`)

Tools que **no llaman a la API**: devuelven documentación (markdown + `structuredContent` generados del mismo módulo) para que el agente escriba el código de la web.

| Tool | Qué documenta |
|------|---------------|
| `how_to_list_products` | Listado de productos: endpoint, auth y cómo leer el árbol de productos desde la columna `product` de cada policy. |
| `how_to_create_risk_item` | Alta de risk items: URL absoluta, método, auth, headers, campos del body, respuestas posibles, requisitos por `payment_model` y cómo interpretar el `subject_schema`. |
| `how_to_build_chatbot` | Chatbot que recomienda un producto del catálogo real y puede cerrar la contratación, apoyándose en el MCP de acciones. |

Cada documento incluye las **tres reglas no negociables** (`rules.ts`):

| id | Regla |
|----|-------|
| `api-only` | Toda lectura y escritura pasa por la API del monorepo; prohibido un cliente de Supabase/Postgres contra la base. |
| `no-business-logic` | Si la operación no existe como endpoint, se pide implementarla en la API. |
| `secrets-server-side` | La api_key del canal solo vive en el servidor de la web generada (nunca en `NEXT_PUBLIC_*`, bundle ni localStorage). |

Configuración:

- `SHIELD_BASE_URL` (y opcionalmente `ACTIONS_MCP_URL`) salen **solo** del `.env` del paquete (se crea desde `.env.example`, fuera de git); el entorno del cliente MCP no los puede pisar. Sin `.env` o sin `SHIELD_BASE_URL` el servidor no arranca; una URL sin esquema se normaliza a `http://`.
- Transportes stdio y HTTP desde una sola fábrica de servidor. HTTP por defecto en `127.0.0.1:3300/mcp`, con las mismas guardas de `Host` / `Origin` y bearer opcional (`MCP_AUTH_TOKEN`); escuchar fuera de loopback sin token arranca con aviso por stderr.

## Cómo lo usa el web builder

- El MCP de acciones viaja **dentro de la app**: `apps/web-builder` lo sirve en `/api/mcp` (route handler sobre `insurehero-mcp/http`, modo multi-tenant; requiere `MCP_PATH=/api/mcp`).
- Al crear un sandbox, la app registra ese MCP en Claude Code (`INSUREHERO_WEB_BUILDER_MCP_URL`) con `Authorization: Bearer <channels.api_key>` del **canal elegido en el header**, resuelto en servidor. Cada sandbox opera así contra un tenant concreto.
- El login exige rol `SUPER_ADMIN`; el selector ofrece todos los canales de la plataforma.

## Tabla `sandboxes`

Registra qué sandbox E2B abrió cada admin, contra qué canal, con su nombre y conversación, para **listar** y **reanudar** chats.

| Columna | Tipo | Reglas |
|---------|------|--------|
| `id` | `uuid` | PK |
| `admin_id` | `uuid` | `not null`, FK → `admins(id)` (sin `ON DELETE`) |
| `channel_id` | `uuid` | `not null`, FK → `channels(id)`; se fija al crear y no cambia |
| `sandbox_id` | `text` | `not null`, `unique` — id del sandbox en E2B |
| `name` | `text` | `not null`; se fija al crear el chat |
| `conversation` | `jsonb` | `not null default '[]'` — mensajes (texto y adjuntos; no el código generado) |
| `deployments_history` | `jsonb` | `not null default '[]'` — deploys a Vercel del sandbox |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | mantenido por la app (no hay trigger) |
| `killed_at` | `timestamptz` | nullable; no nulo = cerrado a propósito |

Estado y ciclo de vida:

- **`killed_at` es el único marcador de estado.** Cerrar un sandbox es un `UPDATE killed_at = now()`; las filas no se borran nunca. Una muerte por TTL de E2B **no escribe nada**: la fila sigue listándose como reanudable y el fallo aparece al intentar reanudar (mismo criterio que `channel_invitations`).
- El listado ("mis sandboxes de este canal") filtra por `admin_id` + `channel_id` + `killed_at is null`, ordenado por `created_at desc`. Índice: `(admin_id, channel_id, created_at desc)`.

RLS:

| Operación | Quién |
|-----------|-------|
| SELECT | El propio admin (`admin_id = auth.uid()`) en canales de los que es miembro (`admins_by_channels`); además `SUPER_ADMIN` ve **todas** las filas (soporte). |
| INSERT / UPDATE | El propio admin (`admin_id = auth.uid()`), si es miembro del canal **o** tiene rol `SUPER_ADMIN`. |
| DELETE | Sin policy: un delete de `authenticated` afecta 0 filas. |

Como la policy de soporte da a un `SUPER_ADMIN` lectura sobre todo, la app **no** usa la RLS como filtro: todas sus lecturas filtran explícitamente por `admin_id`, y las rutas de servidor del web builder (`/api/sandbox/**`, `/api/chat` al reusar un sandbox) verifican que el sandbox pertenezca al llamador antes de operar.
