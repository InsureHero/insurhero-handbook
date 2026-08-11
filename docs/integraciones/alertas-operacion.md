---
displayed_sidebar: integracionesSidebar
---

# Alertas: Sentry, Discord, correo y Supabase

Servicios externos que **no emiten pólizas** pero dan **visibilidad operativa**: monitor de errores, notificaciones en tiempo casi real, informes por correo y jobs programados.

## Sentry

| | |
|---|---|
| **Qué es** | Monitor de errores de `apps/next`. Un solo proyecto (`insurehero-web`) y un solo DSN (`NEXT_PUBLIC_SENTRY_DSN`) para las tres runtimes: navegador, Node y edge. |
| **Qué hace InsureHero** | Reporta crashes de la UI, errores internos de tRPC y fallos del orquestador Shield, con tags y fingerprint propios para que agrupen por causa y no caigan todos en el mismo issue. |
| **Código** | `apps/next/src/instrumentation-client.ts` (navegador), `src/instrumentation.ts` + `src/sentry.{server,edge}.config.ts` (servidor y edge), `src/utils/sentry.utils.ts`, `src/utils/clientReport.utils.ts` |

Sin DSN el SDK arranca con `enabled: false`: no sale ningún request y la aplicación se comporta igual. Es el caso de local, CI y previews.

### Qué se reporta

| Origen | Qué captura | Tags y agrupado |
|---|---|---|
| **UI (Experience)** | Crash de segmento del App Router vía `ErrorBoundary`, crash del root layout vía `global-error.tsx`, y los `catch` de componentes que el usuario ve como un toast | Tags `ui.component`, `ui.action` y `ui.segment`; fingerprint `["ui", component, action, "{{ default }}"]`; contexto `ui` con la ruta y el `digest` si existe |
| **tRPC** | Todo error `INTERNAL_SERVER_ERROR` del handler | Tags `trpc.path`, `trpc.type` y `channel_id`; fingerprint por path; contexto `trpc_request` con el input saneado |
| **Shield** | Fallo del handler, fallo de validación del output y respuestas 5xx del backend | Tag `shield.failure` (`handler` / `output_validation`); fingerprint por transacción |

La ruta del cliente va al **contexto y no a un tag** a propósito: `usePathname()` devuelve los ids reales (`/risk-items/<uuid>`) y como tag infla la cardinalidad sin aportar nada sobre `ui.segment`.

Cómo instrumentar una pantalla nueva: [guía de componentes](../guias-desarrollo/componentes#reporte-de-errores-de-la-ui).

### Qué no llega a Sentry

- **`redirect()` y `notFound()` desde cliente**: son control de flujo, no fallos. Se saltean por su `digest` (`NEXT_REDIRECT` / `NEXT_NOT_FOUND`).
- **Ruido de navegador**: `ResizeObserver loop` y `AbortError` por `ignoreErrors` (los aborts los disparan tRPC y react-query en cada unmount), y todo stack originado en una extensión por `denyUrls` (`chrome-extension:`, `moz-extension:`, `safari-extension:`).
- **Errores de validación de formularios**: van como breadcrumb, nunca como evento.
- **`ChunkLoadError` sí se reporta**: es la señal de un deploy con assets rotos y en UI no hay otro log donde verlo.

### Redacción de PII

Todo evento de error del navegador pasa por `scrubEvent` (`beforeSend`) antes de salir:

- Recorre `event.extra`, `event.contexts` y `breadcrumbs[].data` con `sanitizeForReport`, que reemplaza por `[redacted]` el **subárbol completo** de cualquier clave listada en `PII_KEYS` (`email`, `phone`, `documento`, `beneficiaries`, `insured_subject`, `payment`, `card_number`, `iban`, `first_name`, `address`, `passport`, `tax_id`, …).
- El match es **exacto sobre la clave normalizada** (minúsculas, sin `_` ni `-`): `numero_tarjeta`, `cardNumber` y `card_number` se redactan igual, mientras que `payment_model` o `payment_status` no se tocan y siguen sirviendo para debug.
- A los breadcrumbs de `fetch` y `xhr` se les corta el query string: tRPC manda las queries por GET con el input entero ahí.
- Las tres runtimes van con `sendDefaultPii: false` explícito.

`PII_KEYS` es **compartida** con el reporte server-side, así que la misma redacción aplica al reporte de Shield y al contexto `trpc_request`.

Lo que el código no puede cubrir es el PII que venga dentro del **mensaje** de la excepción: la redacción mira nombres de clave y nunca ve el mensaje. Eso lo cubre el data scrubbing configurado en el proyecto de Sentry (_Data Scrubber_, _Use Default Scrubbers_ y _Additional Sensitive Fields_ cargados con las mismas claves de dominio, incluidas sus variantes de grafía). Ver [Privacidad y datos](../gobernanza/privacidad-y-datos).

### Variables de entorno

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | DSN único de las tres runtimes. Vacío ⇒ SDK deshabilitado. |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Etiqueta de ambiente. Si falta cae a `NEXT_PUBLIC_ENV` y luego a `NODE_ENV`. Un string **vacío no cae al fallback**: el environment queda en `""` y las alertas que filtran por ambiente no disparan. |
| `NEXT_PUBLIC_SENTRY_UI_REPORTING` | Kill switch del reporte de UI: con `"false"` los helpers de cliente dejan de capturar. Necesita redeploy — el DSN es compartido, así que no se puede cortar solo la UI desde Sentry. |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Solo build/CI: subida de source maps para stacktraces legibles. |

## Discord

| | |
|---|---|
| **Qué es** | Webhook entrante para alertas de equipo cuando una **emisión de integración** falla o se abandona. |
| **Qué hace InsureHero** | `notifyIntegrationEmissionDiscord` envía embeds con proveedor, risk item, intento y error (si `INTEGRATIONS_DISCORD_WEBHOOK_URL` está definida). |
| **Código** | `apps/next/src/utils/notifications/integrationEmission.ts` |

## Correo (Resend) y Edge Function

| | |
|---|---|
| **Qué es** | **Resend** como proveedor SMTP/API para correos transaccionales desde la Edge Function `daily-emission-dispatcher`. |
| **Qué hace InsureHero** | Reporte diario de emisiones con error por canal, adjunto CSV/Excel cuando aplica, destinatarios según skill `notification.integration.error`. |
| **Detalle** | [Skills y notificaciones (Supabase)](../arquitectura/notificaciones-skills-supabase) |

## Resumen

- **Sentry**: crashes de UI, tRPC y Shield en un único proyecto, agrupados por componente y acción.
- **Discord**: feedback inmediato a humanos ante fallos de emisión.
- **Correo + pg_cron**: consolidado periódico por canal y skill.
