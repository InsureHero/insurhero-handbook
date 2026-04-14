---
displayed_sidebar: integracionesSidebar
---

# API Shield (partners)

**Shield** no es un proveedor único: es la **familia de rutas REST** bajo `/api/shield` con la que **partners, canales e integraciones IA** consumen InsureHero sin pasar por el dashboard.

## Qué es

- **Superficie HTTP versionada**: `v1`, `v2`, ramas `ia` e `integrations`, cada una con **JWT firmado con un secreto distinto** (`AUTH_SECRET`, `AUTH_IA_SECRET`, `AUTH_INTEGRATION_SECRET`).
- **Primer contacto típico**: intercambio de **API key de canal** por JWT en `GET .../auth/authorize` (flujo clásico v1).

## Cualidades / capacidades

| Aspecto | Detalle |
|---------|---------|
| **Multi-namespace** | Mismos dominios (risk items, pólizas, reclamos, usuarios) expuestos según política de cada rama. |
| **Middleware** | `shieldAuth.middleware` valida Bearer y rellena cabeceras internas (`x-channel-id`, payload IA, webhooks de integración, etc.). |
| **Seguridad por contexto** | Tokens de integración pueden incluir `insurer_id`, webhooks; tokens IA incluyen `channel_id` y claves globales. |

## Qué hace InsureHero

1. Autentica y **deriva el canal o contexto** del JWT.
2. Ejecuta validaciones Zod por ruta (`route.ts`) y consulta/muta datos en Supabase.
3. Responde con utilidades comunes (`ShieldResponse`, errores 4xx/422 coherentes).

## Documentación detallada

- Guía con secuencias y ejemplos `curl`: [Shield (API nativa, API Reference)](../api-reference/shield/intro)
- Mapa de prefijos: [Superficies REST](../api-reference/rest-superficies)

## Dónde está en el repo

- `apps/next/src/app/api/shield/`
- `apps/next/src/app/middlewares/shieldAuth.middleware.ts`
