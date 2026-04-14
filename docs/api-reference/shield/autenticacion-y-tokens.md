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
- Payload de integración (`IntegrationPayload`): puede incluir **webhooks**, **`insurer_id`**, etc.; el middleware los pasa en cabeceras internas.
- Autorización: p. ej. `GET .../integrations/v1/auth/authorize`, `.../auth/validator`.

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
