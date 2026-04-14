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

## Referencias

- [Autenticación y tokens](./autenticacion-y-tokens)
- [Inventario de rutas](./inventario-de-rutas)
- [Introducción](./intro)
