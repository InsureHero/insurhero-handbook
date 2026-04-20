# InsureHero Core Knowledge Base

> Documento consolidado de inteligencia técnica del ecosistema InsureHero.
> Generado a partir del escaneo profundo del repositorio de documentación (Docusaurus).
> Última actualización: 2026-04-14.

---

## Arquitectura de un Vistazo

### Pila Tecnológica

| Capa | Tecnología | Detalle |
|------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | Server/Client Components, Middleware, SSR |
| **API Interna** | tRPC (~35 routers) | Contratos TypeScript end-to-end con Zod |
| **API Externa** | Shield (REST) | Familia `/api/shield` con JWT versionado por rama |
| **Base de Datos** | Supabase (PostgreSQL) | RLS, Edge Functions, pg_cron, Storage |
| **Autenticación** | Supabase Auth + JWT custom | Sesión dashboard + tokens Shield/Post-sales |
| **Monorepo** | Turborepo + Yarn | `apps/next`, `packages/{types,utils,builders}` |
| **Pagos** | Silice (gateway) + Reef (widget) | Tokenización y cobro con tarjeta |
| **Colas/Retry** | Upstash QStash | Reintentos diferidos de emisiones fallidas |
| **Notificaciones** | Resend (email), Discord (webhook) | Alertas y reportes diarios |

### Estructura del Monorepo

```
insureHero/
├── apps/
│   └── next/
│       ├── src/app/              # App Router + API routes
│       ├── src/components/       # React components
│       ├── src/trpc/             # tRPC routers (~35)
│       ├── src/integrations/     # Adapters, orchestrator, registry
│       └── supabase/             # Migrations, Edge Functions
├── packages/
│   ├── types/                    # TypeScript generated types
│   ├── utils/                    # Validation helpers, constants
│   └── builders/                 # Testing builders
└── turbo.json
```

### Flujo de Datos Principal

```
Partners/Canales → Shield API → Core (Supabase) → Orchestrator → Adapters → APIs Externas
                                     ↑                                          ↓
                              tRPC (Dashboard)                          integration_emissions
                                     ↑                                          ↓
                              React Frontend                     Discord/Email (alertas)
```

### Jerarquía de Producto (5 Niveles)

```
Canal → Producto → Paquete → Variante → Cobertura
```

| Nivel | Campos Clave | Notas |
|-------|-------------|-------|
| **Canal** | `currency_id`, `country_id` (INMUTABLES), `timezone` (IANA), `api_key`, `email` | Base multi-tenant; timezone afecta reportes/skills |
| **Producto** | `code` (único), `pricing`, `features`, `lifecycle`, `overrides` (JSONB) | Catálogo de lo vendible |
| **Paquete** | `pricing_rules` (`pricing_type`: one_time/recurring), `sales_integration_slug`, `post_sales_integration_slug` | Enlaza variantes vía `packages_variants`; slug define qué adapter usar |
| **Variante** | `gross_price` (expresión evaluable), `taxes[]`, `markup[]`, `subject_schema`, `claim_schema` | `subject_schema` define campos requeridos del asegurado; `gross_price` se evalúa dinámicamente |
| **Cobertura** | `insurer_id` (FK), `insurer_coverage_number` (requerido, único por aseguradora), `type`, `metadata` | Sin precio propio (eso va en Variante) |

### Cálculo de Precio

1. Evaluar `gross_price` con valores de `subject_schema` (ej: `"500 + (vehicle_value * 0.02)"`)
2. Aplicar `taxes[]` (array de `{name, rate/value, type}`)
3. Aplicar `markup[]` (array de `{name, gross_price}`)
4. Resultado: `total_gross_price` para la póliza

---

## Integraciones (Adapters)

### Patrón de Adaptadores

```
                    ┌─────────────────────────┐
                    │   InsuranceAdapter       │
                    │   (contrato común)       │
                    │   emit(StandardRiskItem) │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
     PhoenixAdapter       AmaAdapter       [Futuro]
     slug: PHOENIX        slug: AMA
```

- **Contrato**: `integrations/contracts/insurance-adapter.contract.ts`
- **Registry**: `integrations/registry.ts` → `{ PHOENIX: PhoenixAdapter, AMA: AmaAdapter }`
- **Configuración**: Tabla `integrations` en Supabase (`channel_id`, `slug`, `auth_config` JSON)

### Phoenix (MIA)

| Aspecto | Detalle |
|---------|---------|
| **Slug** | `PHOENIX` |
| **Líneas** | `MIA_TRAVEL`, `MIA_HEALTH`, `MIA_HOME`, `MIA_LIFESTYLE` |
| **Clientes** | `PhoenixTravelClient`, `PhoenixHealthClient`, etc. (dedicado por línea) |
| **Mappers** | `mapToPhoenixTravelContract`, etc. — traducen `StandardRiskItem` al contrato Phoenix |
| **Autenticación** | Credenciales en `auth_config` de tabla `integrations` |
| **Destino** | Constante `PHOENIX_TARGET_DESTINATION` (ej: `NACIONAL`), configurable por entorno |
| **Documentos** | Normalización de tipos (ej: `PASSPORT → PASAPORTE`) vía mapas de constantes |
| **Código** | `apps/next/src/integrations/adapters/phoenix/` |

**Flujo de emisión Phoenix:**
1. Lee `auth_config` de Supabase
2. Resuelve variante de producto → elige cliente por línea
3. Mapea risk item al contrato Phoenix
4. Emite, retorna resultado al orchestrator
5. Dispatch persiste en `integration_emissions`, actualiza `risk_items.metadata`

### AMA (MAPFRE / MIA Assistance)

| Aspecto | Detalle |
|---------|---------|
| **Slug** | `AMA` |
| **Autenticación** | OAuth2 client credentials vía `AmaClient` (`AMA_AUTH_URL`) |
| **Handler** | `AMA_HANDLER` (ej: `INSUREHERO`) — identificador del integrador ante AMA |
| **Titular** | Constantes `AMA_HOLDER_TYPE`, `AMA_POLICY_HOLDER` alineadas con modelo AMA |
| **Beneficiarios** | Mapeo explícito `mapBeneficiariesToAma` desde risk item |
| **Código** | `apps/next/src/integrations/adapters/ama/` |

**Variables de entorno AMA:**

| Variable | Rol |
|----------|-----|
| `AMA_BASE_URL` | Endpoint del backend AMA |
| `AMA_AUTH_URL` | URL OAuth2 para token de servicio |
| `AMA_COUNTRY_ID` | Identificador de país (típicamente `MX`) |
| `AMA_HANDLER` | Identificador del integrador (ej: `INSUREHERO`) |

### Trazabilidad: Estados de `integration_emissions`

| Estado | Significado | Acción Automática |
|--------|------------|-------------------|
| `SUCCESS` | Emisión aceptada por adapter; `external_id` y respuesta guardados | Ninguna |
| `FAILED` | Error retryable (red, 5xx, etc.) | Discord alert + reintento vía QStash si `QSTASH_TOKEN` existe |
| `ABANDONED` | Error no retryable | Discord alert; sin reintento automático |

**Campos de `integration_emissions`:**
- `error_history` — historial de todos los intentos de error
- `next_retry_at` — próximo reintento programado
- `request_attempts` — contador de reintentos
- `risk_item_id` — FK al risk item

**Lógica de decisión:** `isRetryableError` en `dispatch/route.ts` define qué errores pueden volver a la cola.

### Orchestrator (`orchestrateInsuranceEmission`)

**Ubicación:** `integrations/orchestrator/engine.ts`

**Secuencia de dispatch (`POST /api/integrations/dispatch`):**
1. Recibe risk item record (auth: service role)
2. Lee `sales_integration_slug` del paquete; si no hay → `skipped`
3. Construye `StandardRiskItem` desde el record
4. Llama `orchestrateInsuranceEmission(riskItem, { provider })`
5. Persiste resultado en `integration_emissions` (SUCCESS/FAILED/ABANDONED)
6. Notifica Discord en fallos retryables y abandonados
7. Si fallo retryable + `QSTASH_TOKEN` → encola retry a `/api/integrations/retry`
8. Actualiza `risk_items.metadata.integration` (state, externalId, emissionId, error)

**Superficies del orchestrator:**

| Ruta | Auth | Uso |
|------|------|-----|
| `POST /api/integrations/dispatch` | Service role | Emisión inicial (sales) |
| `POST /api/integrations/retry` | Service role | Reintento explícito |
| `POST /api/integrations/post-sales` | JWT post-sales | Re-emisión post cambio de beneficiarios |

---

## Shield API & Auth

### Principio General

Todas las rutas `/api/shield` (excepto `authorize`) requieren `Authorization: Bearer <token>`.

### 3 Niveles de Acceso

| Rama | Secret JWT | Flujo de Auth | Payload del Token |
|------|-----------|---------------|-------------------|
| **v1, v2** (Standard) | `AUTH_SECRET` | `GET .../v1/auth/authorize` con header `x-api-key` → JWT (`sub` = channel_id) | `channel_id` |
| **ia/v1, ia/v2** (IA) | `AUTH_IA_SECRET` | `GET .../ia/v1/auth/authorize` + `.../auth/validator` | `IAPayload`: channel context + IA keys |
| **integrations/v1, v2** | `AUTH_INTEGRATION_SECRET` | `GET .../integrations/v1/auth/authorize` + `.../auth/validator` | `IntegrationPayload`: webhooks, insurer_id, etc. |

### Middleware

`shieldAuth.middleware.ts` — Valida Bearer, extrae payload y rellena headers internos (`x-channel-id`, `x-ai-api-key`, etc.).

### Errores Comunes

| Situación | Respuesta |
|-----------|-----------|
| Bearer ausente o malformado | 400 / "Missing bearer token" |
| JWT expirado | 401 / "Access token expired" |
| Secret incorrecto para la rama | 401 / "Invalid access token" |

### Inventario de Rutas Shield (resumen)

**Autenticación:**
| Ruta | Namespaces |
|------|-----------|
| `.../auth/authorize` | `v1`, `ia/v1`, `integrations/v1` |
| `.../auth/validator` | `ia/v1`, `integrations/v1` |

**Risk Items:**
| Recurso | Namespaces |
|---------|-----------|
| `.../risk-items` (list/create) | `v1`, `ia/v1`, `ia/v2`, `integrations/v1` |
| `.../risk-items/[riskItemId]` | `v1`, `ia/v1`, `ia/v2`, `integrations/v1` |
| `.../risk-items/[id]/variants` | `v1`, `ia/v1` |
| `.../risk-items/[id]/events` | `v1`, `ia/v1` |
| `.../risk-items/[id]/assets` | `v1`, `ia/v1` |
| `.../risk-items/[id]/cancel` | `v1`, `ia/v1` |
| `.../risk-items/[id]/rescissions` | `v1`, `ia/v1` |

**Claims:**
| Recurso | Namespaces |
|---------|-----------|
| `.../claims` | `v1`, `ia/v1`, `ia/v2`, `integrations/v1`, `integrations/v2` |
| `.../claims/[claimId]` | `v1`, `ia/v1`, `ia/v2`, `integrations/v1`, `integrations/v2` |
| `.../claims/[id]/workflow` | `v1`, `ia/v1`, `ia/v2`, `integrations/v2`, `v2` |
| `.../claims/[id]/events` | `v1`, `integrations/v1` |
| `.../claims/[id]/assets` | `v1`, `ia/v1`, `ia/v2`, `integrations/v2`, `v2` |

**Policies y Catálogo:**
| Recurso | Namespaces |
|---------|-----------|
| `.../policies`, `.../policies/[policyNumber]` | `v1`, `ia/v1`, `ia/v2` |
| `.../policies/[n]/versions` | `v1`, `ia/v1` |
| `.../policies/[n]/subject-schema` | `v1`, `ia/v1` |
| `.../packages`, `.../products`, `.../coverages`, `.../variants` | `v1`, `ia/v1` |
| `.../subscriptions` | `v1`, `ia/v1` |

**Users:**
| Recurso | Namespaces |
|---------|-----------|
| `.../users` | `v1`, `ia/v1`, `ia/v2` |
| `.../users/[userId]` | `v1`, `ia/v1` |
| `.../users/by-email/[userEmail]` | `v1`, `ia/v1`, `integrations/v1` |
| `.../users/[id]/otp`, `.../verify-otp` | `v1`, `ia/v1` |
| `.../users/[id]/risk-items`, `.../claims` | `v1`, `ia/v1` |

**Integrations y Orders:**
| Recurso | Namespaces |
|---------|-----------|
| `.../integrations/webhooks` | `v1`, `ia/v1` |
| `.../orders/[riskItemId]` | `integrations/v1` |

### Mapa Completo de Superficies HTTP

| Prefijo | Propósito |
|---------|----------|
| `/api/trpc` | API interna typed (tRPC) — sesión Supabase |
| `/api/shield/v1`, `/v2` | REST estable para integraciones (Standard) |
| `/api/shield/ia/v1`, `/ia/v2` | Flujos IA/automatización |
| `/api/shield/integrations/v1`, `/v2` | Partners e integraciones B2B |
| `/api/postsales/v1` | Portal titular: OTP → JWT → CRUD risk items |
| `/api/payments/silice` | Token y config de widget de pago |
| `/api/integrations` | dispatch, retry, post-sales (orchestrator) |
| `/api/processPayment` | Procesamiento de pagos (orders, subscriptions) |
| `/api/workflows` | Evaluación de workflows de claims |
| `/api/executeClientWebhooks` | Entrega a webhooks de clientes |
| `/api/mails/v1` | Emails relacionados con claims |
| `/api/addons/v1` | Generación de PDFs |
| `/api/skills` | Gestión de skills |
| `/api/auth/callback` | OAuth callback |

### Ejemplo de Uso Shield v1

```bash
# Paso 1: Obtener token
curl -sS -X GET "https://DOMINIO/api/shield/v1/auth/authorize" \
  -H "x-api-key: TU_CHANNEL_API_KEY"

# Paso 2: Usar token (ej: listar risk items)
curl -sS -G "https://DOMINIO/api/shield/v1/risk-items" \
  -H "Authorization: Bearer <jwt>" \
  --data-urlencode "from=0" \
  --data-urlencode "to=50"

# Crear risk item
curl -sS -X POST "https://DOMINIO/api/shield/v1/risk-items" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"package_uid":"...","policy_uid":"...", ...}'
```

---

## Contratos de Datos

### StandardRiskItem

Modelo canónico serializado del core hacia el orchestrator. Formato normalizado consumido por todos los adapters.

**Ubicación del contrato:** `integrations/contracts/insurance-adapter.contract.ts`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `uid` | string | Referencia externa estable para trazas y logs |
| `package_id` | UUID | Enlaza con config de integración (`sales_integration_slug` / `post_sales_integration_slug`) |
| `insured_subject` | object | Datos del sujeto asegurado para mappers |
| `beneficiaries` | array | Array de beneficiarios (con flag `isHolder` para titular) |
| `authorized_claimants` | array | Usuarios autorizados para reclamos |
| `metadata.integration` | object | Estado de integración, IDs externos, errores, historial de reintentos |

### subject_schema (JSONB en Variante)

Define campos requeridos del sujeto asegurado. Se usa para validar datos al crear póliza y para evaluar precios dinámicos.

```json
{
  "age": { "type": "number", "required": true, "label": "Edad del conductor" },
  "vehicle_value": { "type": "number", "required": true, "label": "Valor del vehículo" },
  "vehicle_year": { "type": "number", "required": true, "label": "Año del vehículo" },
  "license_years": { "type": "number", "required": false, "label": "Años con licencia" }
}
```

### claim_schema (JSONB en Variante)

Define campos requeridos para la presentación de un reclamo.

```json
{
  "incident_date": { "type": "date", "required": true, "label": "Fecha del incidente" },
  "incident_description": { "type": "text", "required": true, "label": "Descripción del incidente" },
  "damage_amount": { "type": "number", "required": true, "label": "Monto del daño" }
}
```

### Validación Zod

Presente en toda la API:
- **tRPC:** Cada procedimiento `.input(z.object({...}))` especifica schema Zod
- **Post-sales:** Body validado con Zod (ej: `{ "email": z.string(), "otp": z.string() }`)
- **Shield:** `ShieldResponse` con errores coherentes 4xx/422

---

## Gestión de Beneficiarios (Vidanta)

### Modelo de Beneficiarios

El risk item combina tres tipos de personas:

| Tipo | Descripción | Flag |
|------|------------|------|
| **Titular** | Holder de la póliza | `isHolder: true` en array de beneficiaries |
| **Beneficiarios** | Personas cubiertas por el seguro | Entries en `beneficiaries[]` |
| **Authorized Claimants** | Quienes pueden reclamar o actuar en post-venta | Entries en `authorized_claimants[]` |

### Reglas de Validación

- **Acceso post-venta:** RPC `postsales_risk_item_ids_by_holder_email` retorna IDs de risk items activos donde el email es beneficiario con `isHolder = true`
- **Autorización:** Debe existir row en `authorized_claimants` con `risk_item_id` + `email` del titular. Si no → 401 "access denied"
- **RPC de validación:** `assertPostSalesRiskItemAccess` valida acceso del beneficiario

### Mapeo de Campos y Convenciones

| Convención | Ejemplo |
|-----------|---------|
| **Componentes** | PascalCase: `UserProfile.tsx` |
| **Utilities** | camelCase: `formatDate.ts` |
| **Types** | PascalCase: `UserType.ts` |
| **Constants** | UPPER_SNAKE_CASE: `MAX_RETRIES` |

### Mapeo a Adapters

- **Phoenix:** Normalización de tipos de documento (ej: `PASSPORT → PASAPORTE`) vía mapas de constantes
- **AMA:** `mapBeneficiariesToAma` — mapeo explícito a DTOs de AMA; constantes `AMA_HOLDER_TYPE`, `AMA_POLICY_HOLDER`

### Flujo Post-Venta (Assistance Landing — Vidanta)

**Canal Vidanta** usa una landing page (Next.js 15, repo `landing-next`, separado del monorepo) para que el titular complete viajeros y confirme datos.

**Stack de la Landing:**

| Pieza | Detalle |
|-------|---------|
| Framework | Next.js 15 con App Router |
| UI | Tailwind CSS + shadcn components |
| Data Fetching | TanStack Query |
| i18n | EN / ES (`LanguageContext.tsx`, `translations.ts`) |
| Notificaciones | Sonner (toasts) |

**Flujo completo OTP → Sincronización:**

```
1. Titular ingresa email en landing
      │
      ▼
2. POST /api/postsales/v1/auth/otp/request
   → Valida risk items activos (RPC postsales_risk_item_ids_by_holder_email)
   → Persiste OTP en tabla postsales_otp
   → Envía código vía Resend
      │
      ▼
3. POST /api/postsales/v1/auth/otp/verify
   → Valida código + control de intentos (anti brute-force)
   → Emite JWT post-sales (POSTSALES_JWT_SECRET, issuer: insurehero-postsales)
      │
      ▼
4. Landing almacena JWT como shield_access_token en sessionStorage
      │
      ▼
5. Flujo guiado: OTP → Trip Summary → Add Travelers → Confirmation
      │
      ▼
6. GET /api/postsales/v1/me/risk-items (listar risk items del titular)
      │
      ▼
7. PATCH /risk-items/[riskItemId]/beneficiaries (gestionar beneficiarios)
      │
      ▼
8. POST /api/integrations/post-sales
   → Mismo JWT post-sales en Authorization
   → Lee post_sales_integration_slug del paquete
   → Orchestrator re-emite (PHOENIX/AMA) con beneficiarios actualizados
   → Si no hay integración configurada → responde skipped
```

**Endpoints Post-sales:**

| Método | Ruta (prefijo `/api/postsales/v1`) | Descripción |
|--------|-----------------------------------|-------------|
| POST | `/auth/otp/request` | Solicitar OTP al email |
| POST | `/auth/otp/verify` | Verificar OTP y obtener JWT |
| GET | `/me/risk-items` | Listar risk items del titular |
| GET, PATCH | `/risk-items/[riskItemId]` | Detalle y updates permitidos |
| GET, PATCH | `/risk-items/[riskItemId]/beneficiaries` | Gestión de beneficiarios |
| GET | `/risk-items/[riskItemId]/variants` | Variantes asociadas |

**Variables de entorno Post-sales:**

| Variable | Uso |
|----------|-----|
| `POSTSALES_JWT_SECRET` | Secret HS256 para firmar/verificar JWT (obligatorio en producción) |
| `POSTSALES_JWT_EXPIRATION` | Duración del token (ej: `1h`, `24h`); default `1h` |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL del backend InsureHero (para la landing) |

---

## tRPC API (Dashboard Interno)

### Endpoint Único

`POST /api/trpc` — Contrato TypeScript entre React client y Next.js server.

### Procedimientos

| Tipo | Descripción |
|------|------------|
| `publicProcedure` | Monta Supabase client con cookies, sin auth requerida |
| `userProcedure` / `protectedProcedure` | Middleware requiere sesión activa (UNAUTHORIZED si no) |

### Routers Principales

| Categoría | Routers |
|-----------|---------|
| **Catálogo** | `channels`, `products`, `packages`, `variants`, `coverages` |
| **Risk & Orders** | `riskItems`, `policies`, `orders`, `subscriptions` |
| **Integrations** | `integrations`, `integrationEmissions`, `integration` |
| **Claims & Workflows** | `claims`, `workflows` |
| **Admin** | `skills`, `users`, `admins`, `emailTemplates` |

### Ejemplo de Uso

```typescript
// Query: emisiones por risk item
const { data } = trpc.integrationEmissions.selectByRiskItemId.useQuery({
  risk_item_id: 'uuid'
});

// Mutation: retry de emisiones
const retry = trpc.integrationEmissions.retryEmissions.useMutation();
await retry.mutateAsync({ emission_ids: ['uuid-1', 'uuid-2'] });

// Mutation: sync beneficiarios
const sync = trpc.integrationEmissions.syncBeneficiaries.useMutation();
await sync.mutateAsync({ risk_item_id: 'uuid', provider: 'PHOENIX' });
```

---

## Risk Item: Objeto Central

### Qué Es

El objeto operativo central después de la definición de catálogo. Una instancia de negocio vivo (a diferencia de producto = "lo que se puede vender").

### Datos que Agrega

| Dimensión | Contenido |
|-----------|----------|
| **Contexto del canal** | currency, country, timezone |
| **Selección comercial** | package + variantes + integration slugs |
| **Personas** | titular, beneficiarios, authorized_claimants |
| **Metadata de integración** | estado, IDs externos, errores, reintentos |
| **Identidad estable** | `uid` para trazabilidad |

### Ciclo de Vida

1. **Creación/evolución** desde ventas/integraciones
2. **Pago** (Silice/Reef con `riskItemId`, `channelId` en metadata)
3. **Emisión externa** vía dispatch → orchestrator
4. **Post-venta** vía `/api/postsales/v1/...` con OTP+JWT
5. **Claims** vía rutas Shield

### Dónde Se Expone

| Superficie | Rutas |
|-----------|-------|
| Shield | `.../risk-items`, `.../risk-items/[riskItemId]` |
| tRPC | Router `riskItems` |
| Post-sales | `/api/postsales/v1/me/risk-items` |
| Integrations | dispatch, post-sales, retry |

---

## Workflows, Skills y Notificaciones

### Dos Conceptos Distintos

| Concepto | Qué es | Ejemplo |
|----------|--------|---------|
| **Workflow de Claims** | Secuencia de estados y transiciones sobre claims | `.../claims/[id]/workflow` en Shield |
| **Skills de Administración** | Tags de capacidad asignados a admins/canales | `notification.integration.error` → reporte diario |

### Claim Workflows

- **Shield:** `.../claims`, `.../claims/[claimId]`, `.../claims/[id]/workflow`
- **Automatización:** `/api/workflows` (evaluación), `/api/executeClientWebhooks` (delivery)
- **Emails:** `/api/mails/v1` (emails de claims)

### Skill: `notification.integration.error`

**Edge Function:** `daily-emission-dispatcher` (Supabase Edge)

1. Descubre pares `(channel_id, skill_key)` donde el canal tiene skill registrado
2. Resuelve destinatarios: admins cuyo skill set incluye la key
3. Construye reporte vía `SKILLS_REGISTRY[skillKey].build(supabase, channelId, ...)`
4. Si no hay errores en el período → omite envío
5. Envía email vía Resend (HTML + CSV adjunto opcional en base64)
6. Sender: `channels.email`

**pg_cron:** Ejecuta cada hora (`0 * * * *`), llama Edge Function vía `pg_net` HTTP POST.

### Discord (Near Real-Time)

- `src/utils/notifications/integrationEmission.ts`
- Se dispara en emisiones FAILED/ABANDONED
- Depende de `INTEGRATIONS_DISCORD_WEBHOOK_URL`

---

## Pagos: Silice y Reef

| Aspecto | Detalle |
|---------|---------|
| **Silice** | Gateway — endpoint `/api/payments/silice` para token + config |
| **Reef** | Widget embebido para experiencia de pago con tarjeta |
| **Config** | `buildReefConfig` construye payload: amounts, currency, `ordenId`, `merchantMap`, `procesadorId`, metadata (`riskItemId`, `channelId`) |
| **Ciclo** | Frontend pide token → configura Reef → callbacks + `/api/processPayment` completa el ciclo |
| **Código** | `apps/next/src/lib/reefWidget.ts`, `src/components/pay/`, `src/app/api/payments/` |

---

## Notas Técnicas Críticas

### Variables de Entorno Esenciales

| Variable | Uso | Criticidad |
|----------|-----|-----------|
| `AUTH_SECRET` | JWT Shield v1 | Producción obligatoria |
| `AUTH_IA_SECRET` | JWT Shield IA | Producción obligatoria |
| `AUTH_INTEGRATION_SECRET` | JWT Shield Integrations | Producción obligatoria |
| `POSTSALES_JWT_SECRET` | JWT Post-sales (HS256) | Producción obligatoria |
| `POSTSALES_JWT_EXPIRATION` | Duración JWT post-sales | Default `1h` si no está definida |
| `QSTASH_TOKEN` | Upstash QStash para retry queue | Opcional; sin él no hay retry automático |
| `INTEGRATIONS_DISCORD_WEBHOOK_URL` | Discord webhook para alertas | Opcional |
| `SUPABASE_URL` | URL de Supabase | Obligatoria |
| `SUPABASE_ANON_KEY` | Clave anónima de Supabase | Obligatoria |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role de Supabase | Obligatoria |

### Campos Inmutables

- `channels.currency_id` y `channels.country_id` son **inmutables** post-creación del canal
- Si necesitas diferente moneda/país → crear nuevo canal

### Tablas Clave en Supabase

| Tabla | Propósito |
|-------|----------|
| `channels` | Multi-tenant: currency, country, timezone, api_key, email |
| `products` | Catálogo: code, pricing, features, lifecycle, overrides |
| `packages` | Empaquetado comercial: pricing_rules, integration slugs |
| `packages_variants` | Relación M:N paquete-variante |
| `variants` | Precio y reglas: gross_price, taxes, markup, schemas |
| `coverages` | Tipo de seguro: insurer_id, insurer_coverage_number |
| `products_packages` | Relación M:N producto-paquete |
| `policies` | Contrato emitido: holder, snapshots, total_gross_price |
| `risk_items` | Instancia viva: subject_data, metadata.integration |
| `integration_emissions` | Historial de emisiones: status, external_id, error_history |
| `integrations` | Config de adaptadores: slug, auth_config |
| `claims` | Reclamos: status, events, workflow state |
| `postsales_otp` | OTP post-venta: email, code, attempts, used_at |
| `skills` | Catálogo de habilidades: name, label |
| `admins_by_channels` | Asignación admin-canal: skills[] |
| `authorized_claimants` | Acceso autorizado: risk_item_id, email |

### Convenciones de Código

| Convención | Formato | Ejemplo |
|-----------|---------|---------|
| Componentes React | PascalCase | `UserProfile.tsx` |
| Utilities | camelCase | `formatDate.ts` |
| Types | PascalCase | `UserType.ts` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Commits | Conventional Commits | `feat:`, `fix:`, `docs:`, `refactor:` |

### Comandos de Desarrollo

```bash
yarn install          # Instalar dependencias
yarn compile          # Compilar shared packages
yarn dev              # Desarrollo local
yarn test             # Tests unitarios
yarn test:e2e         # Tests E2E
yarn lint             # Linting
yarn format           # Formatear código
yarn validate         # Validación completa
```

### Requisitos del Entorno

- Node.js >= 18.17.x
- Yarn
- Git
- Supabase CLI (opcional)

---

## Diagramas Disponibles

| Archivo | Contenido |
|---------|----------|
| `arquitectura-plataforma-integraciones.mmd` | Arquitectura principal: partners → core → adapters |
| `dispatch-orquestador.mmd` | Flujo dispatch con retry/QStash |
| `trpc-secuencia.mmd` | Secuencia tRPC: React → Supabase |
| `postsales-otp-flujo.mmd` | Flujo OTP → JWT → CRUD |
| `shield-v1-authorize.mmd` | Auth Shield v1: API key → JWT |
| `landing-vidanta-flujo.mmd` | Flujo Vidanta (holder portal) |
| `api-reference-modelo-global.mmd` | Modelo global de superficies API |

---

> Este documento está optimizado para ser consumido como contexto de entrenamiento para modelos de IA o como referencia técnica rápida del ecosistema InsureHero.
