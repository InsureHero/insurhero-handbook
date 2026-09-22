---
displayed_sidebar: apiReferenceSidebar
---

# Shield: flujos y ejemplos

Ejemplos prácticos para la rama **`v1`** (canal con API key). Para **IA** e **integrations**, el patrón es el mismo nivel lógico: obtener JWT válido para esa rama y enviarlo en `Authorization`.

## Secuencia Shield v1 (canal con API key)

<figure class="diagram-figure">
  <img
    class="diagram-asset"
    src="/img/diagrams/shield-v1-authorize.svg"
    alt="Secuencia Shield v1: x-api-key en authorize, Bearer en rutas, middleware inyecta x-channel-id"
    loading="lazy"
  />
  <figcaption class="diagram-caption">
    Fuente: <code>diagrams/shield-v1-authorize.mmd</code> — <code>yarn diagrams:build</code>. Clic en el diagrama para ampliarlo.
  </figcaption>
</figure>

### Paso 1: obtener token

La ruta **`GET /api/shield/v1/auth/authorize`** espera la cabecera **`x-api-key`** (no `Authorization`). Respuesta exitosa: cuerpo con el token emitido (formato `ShieldResponse.ok`).

```bash
curl -sS -X GET "https://TU_DOMINIO/api/shield/v1/auth/authorize" \
  -H "x-api-key: TU_CHANNEL_API_KEY"
```

### Paso 2: listar risk items (ejemplo)

```bash
curl -sS -G "https://TU_DOMINIO/api/shield/v1/risk-items" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_JWT" \
  --data-urlencode "from=0" \
  --data-urlencode "to=50"
```

Con filtro por póliza:

```bash
curl -sS -G "https://TU_DOMINIO/api/shield/v1/risk-items" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_JWT" \
  --data-urlencode "policyId=UUID_POLIZA"
```

### Crear risk item (POST)

```bash
curl -sS -X POST "https://TU_DOMINIO/api/shield/v1/risk-items" \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"package_uid":"...","policy_uid":"...", ... }'
```

Los campos exactos dependen de `v.riskItem.shield.insert()` en el código.

## Códigos HTTP habituales

| Código | Significado |
|--------|-------------|
| `200` | Éxito |
| `201` | Recurso creado |
| `400` | Validación / cabeceras incorrectas |
| `401` | Token inválido o expirado |
| `403` | Sin permisos |
| `404` | Recurso no encontrado |
| `422` | Datos no procesables (`unprocessableContent`) |

## Validación de entrada y de salida

Las rutas Shield se construyen con el helper `api(request).input(...).handle(...)`, que **valida la entrada** con Zod (cabeceras, query, body y params dinámicos). Si la entrada no pasa, la respuesta es `422` y el handler **no llega a consultar la base**: por ejemplo, en los listados paginados un rango con `to - from` mayor al máximo permitido se rechaza antes de la query.

La validación de la **salida** es opcional y depende de cómo cierre cada ruta:

| Cierre de la ruta | Comportamiento |
|-------------------|----------------|
| `.output(schema)` | La respuesta se valida contra un schema Zod antes de emitirse. Si no encaja, el cliente recibe `422` con `error: "Internal validation failed"` **aunque la query haya ido bien**, y el fallo se reporta a Sentry con el tag `shield.failure: output_validation`. En listados el schema es un `z.array(...)`: **una sola fila inválida invalida la respuesta completa**. |
| `.response` | La respuesta del handler sale tal cual, sin validar. Los datos viajan como los devuelve la base. |

La mayoría de las rutas todavía cierran con `.output(...)`. La excepción documentada es **`GET /api/shield/v1/packages`** (ver abajo).

### `GET /api/shield/v1/packages` no valida su salida

Esta ruta cierra con `.response`. Consecuencias para el consumidor:

- Devuelve `200` con **todas** las filas del canal: una fila con `pricing_rules` vacío (`{}`) o con un `billing_cycle` fuera del enum del schema ya no tumba el lote entero.
- Como la query usa `select: "*"` y no hay schema que recorte claves, la respuesta incluye columnas que antes no viajaban: `category_id`, `created_at`, `updated_at`, `deleted_at`.
- La validación de **entrada** sigue igual: rango de paginación inválido → `422`; falta `x-channel-id` → lo corta el middleware.
- Un error de la query sigue devolviendo `422` con su `details`.

Las demás rutas de packages (`ia/v1/packages`, `v1/packages/[packageId]`, `ia/v1/packages/[packageId]`) **sí** validan salida con el mismo schema, así que siguen pudiendo responder `422 Internal validation failed` sobre datos que existen.

## Referencias

- [Autenticación y tokens](./autenticacion-y-tokens)
- [Inventario de rutas](./inventario-de-rutas)
- [Introducción](./intro)
