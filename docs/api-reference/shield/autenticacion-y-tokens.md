---
displayed_sidebar: apiReferenceSidebar
---

# Shield: autenticación y tokens

## Principio

Todas las rutas bajo `/api/shield` (salvo las explícitamente públicas como `authorize`) esperan **`Authorization: Bearer <token>`**. El **tipo de token** y el **secreto** usado para verificarlo dependen del **prefijo** de la URL (`v1`, `ia`, `integrations`, etc.).

## Rama `v1` (canal con API key)

1. **Obtener token**: `GET /api/shield/v1/auth/authorize` con cabecera **`x-api-key`** igual a la API key del **canal** registrada en base de datos.
2. **Respuesta**: JWT firmado con **`AUTH_SECRET`**; el `sub` del token es el **id del canal**.
3. **Peticiones siguientes**: `Authorization: Bearer <jwt>`. El middleware valida el JWT y expone **`x-channel-id`** al handler.

No uses `Authorization` en el paso 1 (solo `x-api-key`).

## Rama `v2`

Misma idea de **Bearer** tras obtener el token según el flujo de tu producto; los recursos pueden diferir de `v1` (p. ej. reclamos en segunda versión). Revisa el `route.ts` concreto.

## Ramas `ia/v1` y `ia/v2`

- JWT firmado con **`AUTH_IA_SECRET`**.
- Payload decodificado incluye contexto de **canal** y claves para servicios IA (`IAPayload`): el middleware rellena cabeceras como **`x-channel-id`** y **`x-ai-api-key`**`.
- Rutas de autorización: p. ej. `GET .../ia/v1/auth/authorize`, validación en `.../ia/v1/auth/validator`.

## Ramas `integrations/v1` y `integrations/v2`

- JWT firmado con **`AUTH_INTEGRATION_SECRET`**.
- Payload de integración (`IntegrationPayload`): incluye **webhooks** (obligatorio, array) y opcionalmente **`insurer_id`**; el middleware los pasa en cabeceras internas.
- El middleware **siempre** setea **`x-webhooks`** con los webhooks del token (`[]` si el token no tiene ninguno), así que un `x-webhooks` enviado por el cliente no llega a la ruta. Un payload sin campo `webhooks` responde **401**.
- Autorización: p. ej. `GET .../integrations/v1/auth/authorize`, `.../auth/validator`.

## Aislamiento por canal

Cada ruta resuelve el canal desde el token, nunca desde un valor elegido por el cliente:

- **`integrations/v1`** (lecturas de `users`, `risk-items`, `orders/[riskItemId]`, `claims` y `claims/[id]/events`): la ruta toma los `channel_id` de los webhooks del token **para su tabla** (`getIntegrationChannelIds` en `utils/integrationChannels.utils.ts`, con deduplicación) y filtra la consulta por esos canales. Si el token no tiene webhooks de esa tabla, la ruta **no consulta** y responde lo mismo que para un recurso inexistente o un listado vacío (p. ej. `200 { data: [] }` en `GET users`, `404` en los detalles, `422` en los listados de `risk-items` y `claims`).
- **`PATCH v1/orders/[orderId]/payment-result`**: la orden se carga filtrando por `x-channel-id`. Una orden de otro canal sigue el mismo camino que una inexistente (`422`), sin cambios ni evento.
- **`DELETE .../risk-items/[id]/rescissions`** (`v1` e `ia/v1`, lógica compartida en `app/api/shield/_shared/risk-items/rescind-risk-item.handler.ts`): tras la búsqueda inicial (por `id` o `uid` dentro del canal), todos los pasos usan el **id del risk item encontrado** y los updates de `risk_items`, `subscriptions` y `orders` filtran por el canal del token.

## Errores habituales

| Situación | Respuesta típica |
|-----------|-------------------|
| Bearer ausente o mal formado | 400 / mensaje “Missing bearer token” |
| JWT expirado | 401 / “Access token expired” |
| Secreto incorrecto para la rama | 401 / “Invalid access token” |

## Referencias

- Middleware: `shieldAuth.middleware.ts`
- [Namespaces y consumidores](./namespaces-y-consumidores)
- [Flujos y ejemplos](./flujos-y-ejemplos)
