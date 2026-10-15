---
displayed_sidebar: apiReferenceSidebar
---

# Shield: autenticación y tokens

## Principio

Todas las rutas bajo `/api/shield` (salvo las explícitamente públicas como `authorize`) esperan **`Authorization: Bearer <token>`**. El **tipo de token** y el **secreto** usado para verificarlo dependen del **prefijo** de la URL (`v1`, `ia`, `integrations`, etc.).

## Rama `v1` (canal con API key)

1. **Obtener token**: `GET /api/shield/v1/auth/authorize` con cabecera **`x-api-key`** igual a la API key del **canal** registrada en base de datos.
2. **Respuesta**: JWT firmado con **`AUTH_SECRET`** (vence en 1 h); el `sub` del token es el **id del canal**.
3. **Peticiones siguientes**: `Authorization: Bearer <jwt>`. El middleware valida el JWT y expone **`x-channel-id`** al handler.

No uses `Authorization` en el paso 1 (solo `x-api-key`).

La API key de un canal con `status = 'INACTIVE'` o con `deleted_at` recibe el mismo `401` "Invalid api key" que una key inexistente. Esto aplica a `v1/auth/authorize`, `ia/v1/auth/authorize` e `ia/v1/auth/validator`.

## Rama `v2`

Misma idea de **Bearer** tras obtener el token según el flujo de tu producto; los recursos pueden diferir de `v1` (p. ej. reclamos en segunda versión). Revisa el `route.ts` concreto.

## Ramas `ia/v1` y `ia/v2`

- JWT firmado con **`AUTH_IA_SECRET`**.
- El `sub` del token (`IAPayload`) lleva **`channel_id`** y **`global_key`**; el middleware los expone como **`x-channel-id`** y **`x-ai-api-key`**. Un token IA al que le falte cualquiera de los dos responde `401` "Invalid access token".
- Las rutas `ia` comparan `x-ai-api-key` con la clave global en el servidor. La clave (`GLOBAL_API_KEY`) es una variable de entorno **server-only** y la comparación se hace en tiempo constante (`utils/credentials.utils.ts`); no forma parte del bundle cliente.
- Rutas de autorización: p. ej. `GET .../ia/v1/auth/authorize`, validación en `.../ia/v1/auth/validator`.
- `GET .../ia/v1/channels/{channelId}` solo devuelve el canal del token; otro canal responde `404`.

## Ramas `integrations/v1` y `integrations/v2`

- Entran en esta rama las rutas con prefijo exacto **`/api/shield/integrations/`**. JWT firmado con **`AUTH_INTEGRATION_SECRET`**; un token de canal o IA responde `401`.
- **Obtener token**: `GET .../integrations/v1/auth/authorize` con **`x-api-key`** igual a la `api_key` de un **admin** (`admins`, sin `deleted_at`). El admin debe tener rol `INSURER_USER` (con `insurer_id`) o `BROKER_USER`, y al menos un `client_webhooks` en un canal activo (ni `INACTIVE` ni con `deleted_at`).
- Payload (`IntegrationPayload`): **`admin_id`**, **`insurer_id`** (si aplica) y **`webhooks`** (`channel_id` y `table`, solo de canales activos). El middleware pasa `webhooks` e `insurer_id` en las cabeceras internas `x-webhooks` y `x-insurer-id`.
- **`GET .../integrations/v1/auth/validator`** acepta las mismas keys que `authorize` y rechaza con el mismo `401` las que `authorize` rechaza. Con una key válida responde `{ data: [{ channel_id }, ...] }`, un elemento por canal de sus webhooks, sin repetidos.
- En `integrations/v2/claims*` el cliente envía **`x-channel-id`**, que solo se acepta si el canal está entre los webhooks del token. Si no lo está, la ruta no consulta y responde lo mismo que para un recurso inexistente.

| Respuesta de `integrations/v1/auth/authorize` | Caso |
|-----------------------------------------------|------|
| `401` "Invalid API key" | Key inexistente o admin con `deleted_at` |
| `401` "No webhooks found for this API key" | El admin no tiene webhooks en canales activos |
| `401` "No insurer found for this API key" | `INSURER_USER` sin `insurer_id` |
| `401` "Invalid api key" | Otro rol |

## Webhooks de cliente (`v1` e `ia/v1`)

`.../v1/integrations/webhooks*` y `.../ia/v1/integrations/webhooks*` aceptan más de un tipo de token:

| Operación | `v1/integrations/webhooks*` | `ia/v1/integrations/webhooks*` |
|-----------|-----------------------------|--------------------------------|
| `GET` listado y `GET` por id | Token de integraciones o de canal | Token de integraciones o IA |
| `POST` y `DELETE` | Solo token de integraciones | Solo token de integraciones |

- Con token de canal o IA, el canal sale del token y se ignora el `x-channel-id` del cliente.
- Con token de integraciones, `x-channel-id` se valida contra los webhooks del token: un canal ajeno da `200 { data: [] }` en el listado, `404` "Webhook not found" en `GET`/`DELETE` por id y `422` en `POST`.
- El `POST` guarda el webhook con el `admin_id` del token; el `DELETE` solo borra webhooks de ese admin (los de otro admin responden `404`). Un token de integraciones sin `admin_id` (emitido antes de este campo) responde `401`.
- El `POST` rechaza con `422` las `url` que no son `http`/`https` o que apuntan a un destino interno literal (loopback, redes privadas, link-local, `localhost`, CGNAT, IPv4 mapeada en IPv6). No se resuelve el DNS.
- La rama `ia` sigue exigiendo `x-ai-api-key`.

## Token de usuario (OTP)

`POST .../users/{userId}/otp` y `POST .../users/{userId}/verify-otp` (`v1` e `ia/v1`) emiten un **token de usuario** para el alta de claims:

- `otp` genera un código de 6 dígitos con `crypto`, válido 15 minutos, y reinicia el contador de intentos. Acepta hasta `OTP_RATE_LIMIT_REQUESTS` solicitudes por usuario en una ventana de `OTP_IP_BLOCK_MINUTES` minutos; por encima responde `422` sin cambiar el código vigente ni enviar uno nuevo.
- `verify-otp` compara en tiempo constante. Cada fallo suma un intento; al llegar a `OTP_MAX_ATTEMPTS` el código queda invalidado y los intentos siguientes responden `400` "Invalid OTP" (también con el código correcto). Un usuario sin email ni teléfono responde `400` "User without email or phone".
- El token se firma con **`AUTH_USER_SECRET`** (no con `AUTH_SECRET`), con `aud` `shield:user`, `sub` = email o teléfono y vence en 1 h.
- Se envía en la cabecera **`User-Authorization`** del alta de claims, que lo valida con ese secreto y ese `aud`. Un token de canal en `User-Authorization` no sirve (`400`), y el token de usuario como `Bearer` en una ruta de canal responde `401`.

La configuración OTP sale de `config/otp.config.ts`, compartida con `postsales/v1/auth/otp`:

| Variable | Default |
|----------|---------|
| `OTP_MAX_ATTEMPTS` | 3 |
| `OTP_RATE_LIMIT_REQUESTS` | 10 |
| `OTP_IP_BLOCK_MINUTES` | 60 |
| `OTP_TTL_MINUTES` | 3 (solo postsales; el OTP de `users` vence a los 15 minutos) |

## Variables de entorno

`AUTH_USER_SECRET` (mínimo 32 caracteres), `GLOBAL_API_KEY` (uuid) y `ADDONS_CHECKSUM` son **server-only** y obligatorias en `config/env.config.ts`: si falta alguna, el middleware no levanta. `ADDONS_CHECKSUM` se compara en tiempo constante en `features` y `addons/v1/pdf`. Las `OTP_*` son opcionales y no pasan por `env.config`.

## Errores habituales

| Situación | Respuesta típica |
|-----------|-------------------|
| Bearer ausente | 400 / “Missing bearer token” |
| Bearer mal formado | 400 / “Invalid bearer token” |
| JWT expirado | 401 / “Access token expired” |
| Secreto incorrecto para la rama, o token IA sin `channel_id` / `global_key` | 401 / “Invalid access token” |

## Referencias

- Middleware: `shieldAuth.middleware.ts`
- [Namespaces y consumidores](./namespaces-y-consumidores)
- [Flujos y ejemplos](./flujos-y-ejemplos)
