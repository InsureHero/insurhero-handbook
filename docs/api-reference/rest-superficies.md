---
displayed_sidebar: apiReferenceSidebar
---

# Superficies REST y HTTP

Mapa **orientado a desarrollo** de las rutas HTTP relevantes bajo `apps/next/src/app/api/`. No es un catálogo OpenAPI: sirve para orientarse y profundizar en el código. Los prefijos son relativos al despliegue (p. ej. `https://<host>/api/...`).

## Convenciones

- **`/api/trpc`** — API interna tipada (Docusaurus: [tRPC API](./trpc-api.md)).
- **`/api/shield/...`** — REST para integraciones; varios **namespaces** según consumidor (ver tabla).
- **Autenticación** — En general `Authorization: Bearer <token>`; cada subárbol puede validar scopes distintos (middlewares en `src/app/middlewares/`).

## Tabla por prefijo

| Prefijo | Propósito típico |
|---------|-------------------|
| `/api/shield/v1` | API estable para integraciones generales (usuarios, pólizas, risk items, reclamos, etc.). |
| `/api/shield/v2` | Evolución de reclamos u otros recursos donde exista versión nueva. |
| `/api/shield/ia/v1`, `/api/shield/ia/v2` | Superficies pensadas para flujos de IA / automatización (mismos dominios que v1 en muchos casos, con rutas paralelas). |
| `/api/shield/integrations/v1`, `v2` | Partners de integración (reclamos, usuarios, risk items, órdenes, etc.). |
| `/api/postsales/v1` | Postventa del titular: OTP → JWT (`POSTSALES_JWT_*`), `me/risk-items`, CRUD acotado sobre risk items / beneficiarios / variantes. Ver [API Post-sales](./postsales-api.md). |
| `/api/payments/silice` | Token y datos para el widget de pago (Silice / Reef). |
| `/api/integrations` | **`dispatch`**: emisión orquestada con **service role**; **`retry`**: reintentos; **`post-sales`**: emisión post-cambio de datos con **JWT post-sales** y `post_sales_integration_slug` del paquete. |
| `/api/processPayment` | Procesamiento de pagos (órdenes, suscripciones). |
| `/api/workflows` | Evaluación de workflows, ejecución de webhooks de comunicación. Ver [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md). |
| `/api/executeClientWebhooks` | Entrega hacia webhooks de clientes. |
| `/api/mails/v1` | Envíos relacionados con reclamos u otros eventos. |
| `/api/addons/v1` | Generación de PDF u otros add-ons. |
| `/api/features/gen-pdf` | Generación de PDF vía features. |
| `/api/skills` | Endpoints auxiliares de **skills** (gestión / asignación en dashboard). Distinto del workflow de reclamos; ver [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md). |
| `/api/auth/callback` | Callback de autenticación OAuth / proveedor. |
| `/api/cookies/channel` | Utilidades de canal vía cookies. |
| `/api/trpc/[trpc]` | Handler tRPC (batch de procedimientos). |

## Autenticación por namespace (Shield)

Los archivos `authorize` siguen una convención clara:

- `/api/shield/v1/auth/authorize`
- `/api/shield/ia/v1/auth/authorize`
- `/api/shield/integrations/v1/auth/authorize`

La validación de permisos y el formato del token dependen del middleware aplicado a cada rama (`shieldAuth.middleware.ts` y similares).

## Recursos frecuentes (ejemplos de path)

Ejemplos reales en el código (no exhaustivos):

- Risk items: `.../risk-items`, `.../risk-items/[riskItemId]`, variantes, eventos, cancelación, rescisiones.
- Reclamos: `.../claims`, `.../claims/[claimId]`, workflow, assets.
- Pólizas: `.../policies/[policyNumber]`, versiones, subject-schema.
- Usuarios: `.../users`, by-email, OTP, verify-otp.
- Integraciones: webhooks bajo `.../integrations/webhooks/[webhookId]`.

Para la lista completa, usar búsqueda en el repo: `src/app/api/**/route.ts`.

## Supabase Edge Functions

Lógica desplegada fuera del proceso Next (cron, reportes, etc.) vive en `apps/next/supabase/functions/`. Complementa estas APIs HTTP pero no comparte el mismo prefijo `/api/`.

- Ejemplo: **`daily-emission-dispatcher`** — reportes por correo según skill `notification.integration.error` y **pg_cron**. Ver [Notificaciones, skills y Supabase Edge](../arquitectura/notificaciones-skills-supabase.md).

## Referencias

- [Shield (API nativa)](./shield/intro.md) — convenciones y buenas prácticas.
- [Integraciones (arquitectura)](../arquitectura/integraciones.md) — adaptadores y orquestador.
- [API Post-sales](./postsales-api.md) — OTP, JWT y `integrations/post-sales`.
- [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md) — workflows de reclamos, `/api/workflows` y skills de administración.
- [Notificaciones, skills y Supabase Edge](../arquitectura/notificaciones-skills-supabase.md) — skill `notification.integration.error` y Edge Function.
