# Integraciones (desarrollo)

Esta página describe **cómo está montada hoy la capa de integraciones** en el código de InsureHero: qué módulos existen, qué responsabilidad tiene cada uno y dónde encontrarlos en el monorepo. Está acotada al desarrollo actual; los contratos con terceros pueden evolucionar sin que esta guía los sustituya.

## Objetivo

- Mantener el **core** (productos, risk items, pólizas, reclamos) **agnóstico** del proveedor de aseguradora o pasarela concreta.
- Centralizar llamadas externas en **adaptadores** y un **orquestador** predecible.
- Exponer **APIs REST** por superficies (`/api/shield/...`, postsales, pagos, webhooks) con versionado explícito.

El objeto de dominio que atraviesa adaptadores y dispatch es el **risk item** (serializado como `StandardRiskItem` hacia el orquestador). Resumen: [Risk item](./risk-item.md).

## Ubicación en el repositorio

| Área | Ruta típica (`apps/next`) |
|------|---------------------------|
| Adaptadores de aseguradoras | `src/integrations/adapters/` |
| Contrato común (`InsuranceAdapter`, payloads estándar) | `src/integrations/contracts/` |
| Registro de adaptadores | `src/integrations/registry.ts` |
| Orquestador de emisión externa | `src/integrations/orchestrator/engine.ts` |
| Routers tRPC de integración | `src/trpc/integration*.router.ts`, `integrations.router.ts` |
| Rutas REST públicas / partners | `src/app/api/` (ver [Superficies REST](../api-reference/rest-superficies.md)) |
| Notificaciones y emisiones | `src/utils/notifications/` |
| Pagos (widget Silice / Reef) | `src/lib/reefWidget.ts`, `src/components/pay/`, `src/app/api/payments/` |
| Funciones Supabase (Edge) | `supabase/functions/` (p. ej. `daily-emission-dispatcher`) |
| Skills de notificación + cron | Ver [Notificaciones, skills y Supabase Edge](./notificaciones-skills-supabase.md) |

## Tabla `integrations` (Supabase)

Por canal existen filas que describen **cómo** conectar con cada proveedor externo. Campos relevantes en documentación y soporte:

| Campo | Descripción |
|-------|-------------|
| `channel_id` | A qué canal pertenece la integración (multi-tenant). |
| `slug` | Identificador del proveedor en **mayúsculas** (`PHOENIX`, `AMA`, …); debe coincidir con el **registro** en `registry.ts` y con los slugs referenciados desde el **paquete** (`sales_integration_slug`, `post_sales_integration_slug`). |
| `auth_config` | JSON con credenciales, URLs base, claves de API u otros parámetros que cada **adaptador** lee para autenticarse contra la aseguradora. |

El **orquestador** no interpreta `auth_config` directamente: lo consume el adaptador correspondiente. Más sobre el flujo de emisión: [Orquestador e integraciones](./orquestador-integraciones.md).

## Adaptadores de aseguradoras

Los adaptadores implementan el contrato `InsuranceAdapter` y se seleccionan por **slug en mayúsculas** (`PHOENIX`, `AMA`).

Registro actual (`registry.ts`):

- **PHOENIX** → `integrations/adapters/phoenix` (clientes por línea de negocio: salud, hogar, viaje, estilo de vida, etc.).
- **AMA** → `integrations/adapters/ama`.

Añadir un proveedor nuevo implica:

1. Implementar el adaptador según `integrations/contracts/insurance-adapter.contract.ts`.
2. Registrarlo en `ADAPTERS` en `registry.ts`.
3. Documentar el flujo y variables de entorno en esta sección cuando el contrato esté cerrado.

## Orquestador de emisión

`orchestrateInsuranceEmission` (`orchestrator/engine.ts`):

1. Recibe un `StandardRiskItem` normalizado.
2. Resuelve el adaptador con `getInsuranceAdapter(options.provider)`.
3. Ejecuta `adapter.emit(...)` con el token de acceso si aplica.
4. Devuelve un `OrchestratorResult` con estado `SUCCESS` o `FAILED` y códigos de error estables para el gateway.

El orquestador no sustituye la persistencia en base de datos: cualquier guardado de IDs externos o historial debe hacerse en la capa que invoca al orquestador (routers, jobs, etc.), según el diseño del feature.

**Documentación ampliada** (diagrama de arquitectura, contrato `StandardRiskItem`, dispatch, `integration_emissions`, QStash, tRPC de reintentos): [Orquestador e integraciones](./orquestador-integraciones.md).

## APIs y superficies HTTP

No duplicamos aquí cada endpoint. La referencia estructurada está en:

- [Superficies REST](../api-reference/rest-superficies.md) — mapa de `/api/shield/*`, postsales, pagos, integraciones y webhooks.
- [Shield (API nativa)](../api-reference/shield/intro.md) — convenciones de autenticación y familias de recursos.
- [tRPC API](../api-reference/trpc-api.md) — procedimientos internos del dashboard.

## Pagos (Silice / Reef)

El flujo de cobro usa tokenización vía API (`payments/silice`) y configuración del widget Reef (`buildReefConfig` en `reefWidget.ts`): monto, moneda, metadata de `riskItemId` / `channelId`, etc. Cualquier cambio de contrato con Silice debe reflejarse primero en tipos (`types/payment.types`) y luego en esta documentación.

## Postventa y API Post-sales

El **portal postventa** usa OTP + JWT dedicado (`POSTSALES_JWT_SECRET`) y rutas bajo **`/api/postsales/v1/`** (listado de risk items del titular, detalle, beneficiarios, variantes). Una ruta aparte, **`POST /api/integrations/post-sales`**, reutiliza ese JWT y el campo **`post_sales_integration_slug`** del paquete para disparar el **orquestador** tras cambios en el risk item.

El **front del titular** — **landing page Vidanta** (Next.js) — no está en el monorepo principal; ver [Landing page Vidanta](../guias-desarrollo/landing-page-postventa.md).

Documentación detallada: [API Post-sales](../api-reference/postsales-api.md) y tabla de prefijos en [Superficies REST](../api-reference/rest-superficies.md).

## Skills de notificación y Edge Functions (Supabase)

Los administradores asignan **skills** a canales y usuarios; uno de ellos, **`notification.integration.error`**, habilita el **reporte agregado de emisiones fallidas/abandonadas** enviado por correo desde la Edge Function **`daily-emission-dispatcher`**, disparada por **pg_cron** (ver migraciones en `supabase/migrations/`).

- Registro de “report skills” en código: `supabase/functions/_shared/skillsRegistry.ts`.
- Detalle del flujo (Resend, destinatarios, cron, adjuntos): [Notificaciones, skills y Supabase Edge](./notificaciones-skills-supabase.md).

## Despacho y reintentos de integración

- **`POST /api/integrations/dispatch`**: pensado para invocación segura con **service role** (p. ej. desde triggers o jobs); recibe el registro de emisión / risk item y ejecuta el orquestador con lógica de **reintentos** ante errores transitorios de red o 5xx.
- **`POST /api/integrations/retry`**: reintento explícito de emisiones (revisar el `route.ts` para el contrato exacto del body).

Fallos relevantes en emisiones pueden además notificarse a **Discord** en tiempo casi real (`utils/notifications/integrationEmission.ts`) si está configurado el webhook.

## Notificaciones en la app (Next)

- **`src/utils/notifications/`**: webhooks (p. ej. Discord) para estados de emisión de integración.
- Complementa el correo diario por skill en Supabase; no sustituye la trazabilidad en base de datos.

## Relación con la documentación de producto

Los flujos de negocio (emisión, reclamo, postventa) desde la perspectiva de usuario y módulos del producto se enlazan en [Flujos e integraciones (producto)](../producto/flujos-e-integraciones.md).
