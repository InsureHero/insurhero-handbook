---
displayed_sidebar: apiReferenceSidebar
---

# Shield: API REST nativa

**Shield** es la **API HTTP pública del core InsureHero** bajo el prefijo **`/api/shield`**. No es un “conector” opcional: es el **contrato estable** con el que **canales**, **partners**, **flujos IA** y **integraciones B2B** leen y escriben datos del mismo modelo que alimenta el dashboard (risk items, pólizas, reclamos, usuarios, etc.), con reglas y validaciones en el servidor.

Concepto de dominio: [Risk item](/arquitectura/risk-item).

La implementación vive en el monorepo en `apps/next/src/app/api/shield/`. El middleware `shieldAuth.middleware` unifica la autenticación por **JWT** según la rama (`v1`, `v2`, `ia`, `integrations`).

## Qué resuelve Shield

| Necesidad | Cómo lo cubre Shield |
|-----------|----------------------|
| Canal con **API key** propia | Flujo `authorize` → JWT ligado al **channel id** (`AUTH_SECRET`). |
| Automatización / **IA** | Ramas `ia/v1`, `ia/v2` con JWT firmado con `AUTH_IA_SECRET` y payload de canal. |
| **Partner** de integración | Ramas `integrations/v1`, `v2` con `AUTH_INTEGRATION_SECRET`, webhooks e `insurer_id` en cabeceras. |
| **Versionado** sin romper clientes | Misma familia de recursos en `v1` y `v2` (p. ej. reclamos) con rutas paralelas. |

## Documentación en esta sección

| Página | Contenido |
|--------|-----------|
| [Autenticación y tokens](./autenticacion-y-tokens) | API key, Bearer, secretos por rama, middleware. |
| [Namespaces y consumidores](./namespaces-y-consumidores) | `v1`, `v2`, `ia`, `integrations`: cuándo usar cada uno. |
| [Inventario de rutas](./inventario-de-rutas) | Listado agrupado por dominio (auth, risk items, claims, …). |
| [Flujos y ejemplos](./flujos-y-ejemplos) | Secuencia típica v1 y ejemplos `curl`. |

## Relación con otras guías

- **Mapa global de todos los prefijos HTTP** (Shield, post-sales, pagos, etc.): [Superficies REST](../rest-superficies).
- **Enfoque “partner / integración”** (contexto de negocio): [Capa Shield](../../integraciones/capa-shield) en la sección Integraciones.

## Referencias en código

- Rutas: `src/app/api/shield/**/route.ts`
- Middleware: `src/app/middlewares/shieldAuth.middleware.ts`
