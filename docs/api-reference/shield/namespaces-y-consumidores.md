---
displayed_sidebar: apiReferenceSidebar
---

# Shield: namespaces y consumidores

Cada prefijo bajo `/api/shield` define un **contrato** y un **tipo de cliente** objetivo. Las rutas suelen **espejar** los mismos conceptos de dominio (risk items, reclamos, pólizas…) con paths paralelos.

## Tabla resumen

| Prefijo | Consumidor típico | Autenticación |
|---------|-------------------|---------------|
| `/api/shield/v1` | Canales con **API key**, scripts backend del partner | JWT con `AUTH_SECRET` tras `authorize` |
| `/api/shield/v2` | Evolución de API (p. ej. reclamos v2) | Misma familia de tokens que la rama exponga en código |
| `/api/shield/ia/v1`, `/ia/v2` | Servicios de **IA / automatización** | JWT con `AUTH_IA_SECRET` |
| `/api/shield/integrations/v1`, `/v2` | **Partners** de integración B2B | JWT con `AUTH_INTEGRATION_SECRET` |

## Cómo elegir namespace

- **¿Tu sistema tiene API key de canal en InsureHero?** → Empieza por **`v1`** (flujo documentado en [Flujos y ejemplos](./flujos-y-ejemplos)).
- **¿Eres un módulo IA interno con credenciales IA?** → Ramas **`ia`**.
- **¿Contrato de integración con webhooks / aseguradora?** → Ramas **`integrations`**.

No mezcles tokens entre ramas: un JWT de `v1` no sirve para `ia` ni `integrations`.

## Paridad de recursos

Muchos recursos existen en **varios** namespaces (misma idea de negocio, distinto prefijo). La validación y los campos pueden variar ligeramente; la fuente de verdad es cada **`route.ts`**.

## Referencias

- [Inventario de rutas](./inventario-de-rutas)
- [Introducción](./intro)
