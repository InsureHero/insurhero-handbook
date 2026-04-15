---
displayed_sidebar: guiasDesarrolloSidebar
sidebar_position: 4
---

# Nuevas rutas y recursos en la API Shield

Guía operativa para **añadir o modificar** endpoints bajo **`/api/shield/...`** sin romper clientes ni mezclar autenticación entre namespaces.

Antes de tocar código, lee la referencia: [Shield: introducción](../api-reference/shield/intro.md), [Namespaces y consumidores](../api-reference/shield/namespaces-y-consumidores.md) y el [Inventario de rutas](../api-reference/shield/inventario-de-rutas.md). Mapa global de prefijos: [Superficies REST](../api-reference/rest-superficies.md).

## 1. Elegir el namespace correcto

| Prefijo | Cuándo usarlo |
|---------|----------------|
| **`/api/shield/v1`** (y **`v2`** si existe paridad) | Canales con API key, scripts backend; evolución de recursos sin romper `v1`. |
| **`/api/shield/ia/v1`** o **`ia/v2`** | Servicios de IA / automatización con credenciales IA. |
| **`/api/shield/integrations/v1`** o **`v2`** | Partners B2B, webhooks, flujos con `AUTH_INTEGRATION_SECRET`. |

**No** reutilices tokens entre ramas: un JWT válido en `v1` no sirve para `ia` ni `integrations`.

## 2. Ubicación en el repo

Convención documentada:

- Implementación: `apps/next/src/app/api/shield/**/route.ts` (App Router: un `route.ts` por segmento que defina GET/POST/…).
- Autenticación unificada: `src/app/middlewares/shieldAuth.middleware.ts` (y variantes que ya use cada rama).

Al añadir un recurso, **sigue la estructura de carpetas** de recursos similares en el mismo namespace (p. ej. mismo patrón que otros `.../risk-items/...` o `.../claims/...`) para que revisión y descubrimiento sean sencillos.

## 3. Checklist de implementación

1. **Copiar el patrón** del recurso más cercano en el mismo namespace (validación, formato de error, paginación).
2. **Validar entrada** con Zod (query, body, params dinámicos).
3. **Respuestas y códigos HTTP** coherentes con el resto de Shield (éxito, 401, 403, 404, 422).
4. **Autorización**: confirmar que el middleware y scopes aplican al caso (canal, partner, recurso).
5. **No exponer datos** de otro tenant: filtrar siempre por **channel** / contexto que el token autoriza.
6. **Tests** si el repositorio los tiene para `app/api` (o al menos pruebas manuales documentadas en el PR).
7. **Documentación**: actualizar el [Inventario de rutas](../api-reference/shield/inventario-de-rutas.md) o abrir issue con la lista de paths nuevos para que el handbook quede alineado.

## 4. Cambios que rompen contrato

- **Campos nuevos opcionales** en respuestas: suelen ser compatibles hacia atrás.
- **Quitar campos, renombrar o cambiar tipos** en rutas ya publicadas: tratar como **breaking**.
- Estrategias: nueva ruta bajo **`v2`**, subruta nueva, o nuevo recurso; evitar “cambiar el comportamiento” de `v1` sin aviso.

## 5. Relación con tRPC

El **dashboard interno** consume **tRPC** (`/api/trpc`), no Shield. Si la funcionalidad es **solo interna**, valora un procedimiento tRPC en lugar de ampliar Shield, para no ensanchar la superficie pública.

## 6. Referencias en código (recordatorio)

| Artefacto | Ruta típica |
|-----------|-------------|
| Rutas Shield | `src/app/api/shield/**/route.ts` |
| Middleware | `src/app/middlewares/shieldAuth.middleware.ts` |

## Ver también

- [Estructura base y extensión](./estructura-base-y-extension.md)
- [Interfaces y contratos TypeScript](./interfaces-y-contratos-typescript.md)
- [Capa Shield en integraciones](../integraciones/capa-shield.md) (contexto de negocio)
