# Flujos e integraciones

Esta página conecta la **visión de producto** con la **implementación actual**: qué piezas del sistema intervienen cuando un flujo cruza el dashboard, las APIs públicas o un proveedor externo. No sustituye guías funcionales detalladas; delimita responsabilidades para equipos de desarrollo y producto.

## Principio

- El **modelo de negocio** (canales, productos, paquetes, variantes, coberturas, risk items, pólizas, reclamos) vive en el core. El **risk item** es la instancia operativa que conecta catálogo con emisión, integraciones y postventa; está explicado en [Risk item](../arquitectura/risk-item.md).
- Las **integraciones** (aseguradoras Phoenix/AMA, pagos Silice/Reef, postsales, webhooks) se acoplan por **adaptadores** y **APIs versionadas**, no duplicando reglas de negocio en cada cliente.

## Flujo de emisión hacia aseguradora

1. **Configuración** en el dashboard: producto, paquete, variantes, skills y reglas asociadas al canal.
2. **Creación y evolución del risk item** (tRPC y UI interna).
3. Cuando corresponde una **emisión externa**, el **orquestador** invoca el adaptador (`PHOENIX`, `AMA`, …) con un payload normalizado.
4. La respuesta exitosa o el error tipado alimentan historial, notificaciones y estados en el risk item.

Detalle técnico: [Integraciones (arquitectura)](../arquitectura/integraciones.md).

## Pagos

1. Inicialización del cobro desde la experiencia de usuario (órdenes / suscripciones según el caso).
2. Obtención de token y datos para el **widget** (Silice / Reef).
3. Callbacks y rutas `/api/processPayment` / relacionadas completan el ciclo según el tipo de cobro.

## Postventa (portal del asegurado)

1. El titular solicita un **código OTP** al email; el backend comprueba que existan **risk items activos** donde ese email sea beneficiario **titular** (RPC `postsales_risk_item_ids_by_holder_email`).
2. Tras validar el OTP, recibe un **JWT post-sales** (`POSTSALES_JWT_SECRET`) para las llamadas siguientes.
3. Puede listar y editar datos permitidos sobre sus **risk items**, **beneficiarios** y **variantes** vía `/api/postsales/v1/...`.
4. Si el **paquete** tiene **`post_sales_integration_slug`**, el cliente puede llamar a **`POST /api/integrations/post-sales`** para que el **orquestador** emita contra Phoenix/AMA con el payload actualizado.

Referencia técnica: [API Post-sales](../api-reference/postsales-api.md). El **landing page Vidanta** (front del titular) está documentado en [Landing page Vidanta](../guias-desarrollo/landing-page-postventa.md).

## Reportes y alertas de integración

- **Correo diario** a admins con skill **`notification.integration.error`**: Edge Function **`daily-emission-dispatcher`** + **pg_cron** (detalle en [Notificaciones, skills y Supabase Edge](../arquitectura/notificaciones-skills-supabase.md)).
- **Discord** (opcional) ante emisiones **FAILED** / **ABANDONED** reintentables: `utils/notifications/integrationEmission.ts`.

## Reclamos y workflows

- Los reclamos se gestionan en el core y se exponen por **Shield** según namespace (`v1`, `v2`, `ia`, `integrations`). El recurso **`.../claims/[id]/workflow`** concentra la evolución controlada del expediente; el inventario de rutas está en [Shield: inventario de rutas](../api-reference/shield/inventario-de-rutas.md).
- Las rutas Next **`/api/workflows`** y **`/api/executeClientWebhooks`** automatizan pasos y entregan eventos hacia **webhooks del cliente** cuando el flujo lo define en código.
- Los **skills** de administración (p. ej. quién recibe el reporte diario de errores de emisión) **no son** el mismo concepto que el workflow de estados del reclamo, pero sí forman parte del **workflow operativo del equipo** (notificaciones y reportes). Lectura recomendada: [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md) y, en producto, [Módulo de Workflows y automatización](./modulo-workflows.md).

## Qué leer después

| Necesidad | Documento |
|-----------|-----------|
| Mapa de carpetas y paquetes | [Estructura del Monorepo](../arquitectura/estructura-monorepo.md) |
| Adaptadores y orquestador | [Integraciones (arquitectura)](../arquitectura/integraciones.md) |
| Lista de routers tRPC | [tRPC API](../api-reference/trpc-api.md) |
| Mapa HTTP | [Superficies REST](../api-reference/rest-superficies.md) |
| Convenciones Shield | [Shield (API nativa)](../api-reference/shield/intro.md) |
| Post-sales y JWT | [API Post-sales](../api-reference/postsales-api.md) |
| Workflows vs skills (mapa conceptual) | [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md) |
| Skills + correos Supabase | [Notificaciones, skills y Supabase Edge](../arquitectura/notificaciones-skills-supabase.md) |
