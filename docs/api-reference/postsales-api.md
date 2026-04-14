---
displayed_sidebar: apiReferenceSidebar
---

# API Post-sales (`/api/postsales/v1`)

Superficie HTTP para el **portal postventa del titular**: login por **OTP por correo**, sesión con **JWT propio**, y operaciones acotadas sobre **risk items** donde el email figure como beneficiario titular (`isHolder`). Implementación en el monorepo principal: `apps/next/src/app/api/postsales/v1/`.

El **front del titular** que consume esta API es el **landing page Vidanta** (proyecto **landing-next**, repositorio aparte); guía: [Landing page Vidanta](../guias-desarrollo/landing-page-postventa.md).

## Secuencia del flujo (primera vez)

<figure class="diagram-figure">
  <img
    class="diagram-asset"
    src="/img/diagrams/postsales-otp-flujo.svg"
    alt="Secuencia OTP: email, código por correo, JWT post-sales y llamadas a risk items"
    loading="lazy"
  />
  <figcaption class="diagram-caption">
    Fuente: <code>diagrams/postsales-otp-flujo.mmd</code> — <code>yarn diagrams:build</code>. Clic en el diagrama para ampliarlo.
  </figcaption>
</figure>

## Autenticación

### Variables de entorno (servidor)

| Variable | Uso |
|----------|-----|
| `POSTSALES_JWT_SECRET` | Secreto HS256 para firmar y verificar el JWT de sesión (obligatorio en producción). |
| `POSTSALES_JWT_EXPIRATION` | Duración del token (p. ej. `1h`, `24h`); por defecto `1h` si no se define. |

Issuer del JWT: `insurehero-postsales` (`utils/postsales.utils.ts`).

### Flujo OTP

1. **`POST /api/postsales/v1/auth/otp/request`**  
   - Valida que existan risk items activos para el email como titular mediante la RPC **`postsales_risk_item_ids_by_holder_email`** (misma lógica que en listados posteriores).  
   - Persiste el OTP en la tabla **`postsales_otp`** y envía el código (p. ej. vía Resend).  
   - Incluye CORS para orígenes del cliente postventa.

2. **`POST /api/postsales/v1/auth/otp/verify`**  
   - Verifica el código; control de **intentos fallidos** (`postsales_otp.attempts`, ver migraciones de protección anti fuerza bruta).  
   - Si es correcto, emite **`signPostSalesToken(email)`** y devuelve el JWT para el header `Authorization: Bearer <token>`.

Las rutas OTP suelen responder a **`OPTIONS`** con métodos acotados (`POST, OPTIONS`).

### Uso del JWT

En el resto de rutas post-sales, el Bearer debe ser el JWT post-sales (no el de Supabase ni el de Shield). Utilidades:

- `getPostSalesEmailFromRequest` / `verifyPostSalesToken`
- `requirePostSalesEmail` y `assertPostSalesRiskItemAccess` en `postsales/v1/_utils/postsales-api.utils.ts`

## Autorización sobre risk items

Tras obtener el email del token, el acceso a un **risk item** concreto se valida contra **`authorized_claimants`**: debe existir fila con el `risk_item_id` y el `email` del titular. Si no, respuesta 401 con mensaje de acceso denegado.

## Endpoints principales

| Métodos | Ruta (prefijo `/api/postsales/v1`) | Descripción |
|---------|-----------------------------------|---------------|
| POST (+ OPTIONS) | `/auth/otp/request` | Solicitar OTP al email. |
| POST (+ OPTIONS) | `/auth/otp/verify` | Verificar OTP y obtener JWT. |
| GET | `/me/risk-items` | Listar risk items del titular (vía RPC de ids + datos). |
| GET, PATCH, … | `/risk-items/[riskItemId]` | Detalle y actualización del risk item permitida en postventa. |
| … | `/risk-items/[riskItemId]/beneficiaries` | Gestión de beneficiarios en alcance postventa. |
| … | `/risk-items/[riskItemId]/variants` | Variantes asociadas al ítem. |

La firma exacta (GET vs PATCH) está en cada `route.ts`; todas comparten CORS y validación de token.

## Base de datos relacionada

- **`postsales_otp`**: almacenamiento de OTP e intentos (RLS y políticas en migraciones `*postsales_otp*`).
- **RPC `postsales_risk_item_ids_by_holder_email`**: devuelve IDs de risk items **activos** donde el email es beneficiario con `isHolder = true` (usada en request OTP y en `me/risk-items`).

## Integración post-venta con aseguradora (`/api/integrations/post-sales`)

Ruta adicional bajo **`POST /api/integrations/post-sales`** (no bajo el prefijo `postsales/v1`):

- Exige el **mismo JWT post-sales** en `Authorization`.
- Recibe un cuerpo compatible con **`StandardRiskItem`** (p. ej. tras actualizar beneficiarios).
- Lee el **`post_sales_integration_slug`** del **paquete** asociado al risk item.
- Invoca el **orquestador** `orchestrateInsuranceEmission` para emitir contra el proveedor configurado (Phoenix, AMA, etc.).
- Si el paquete no tiene integración post-venta configurada, la ruta puede responder con `skipped` sin llamar al adaptador.

En el dashboard, el campo del paquete se expone como **“Post-sales Integration”** (`post_sales_integration_slug` en formularios de paquete).

### Ejemplo: solicitar OTP

```bash
curl -sS -X POST "https://TU_DOMINIO/api/postsales/v1/auth/otp/request" \
  -H "Content-Type: application/json" \
  -d '{"email":"titular@ejemplo.com"}'
```

### Ejemplo: verificar OTP

Cuerpo validado con Zod: `{ "email", "otp" }` (código de 6 dígitos).

```bash
curl -sS -X POST "https://TU_DOMINIO/api/postsales/v1/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"email":"titular@ejemplo.com","otp":"123456"}'
```

### Ejemplo: listar mis risk items (con JWT)

```bash
curl -sS "https://TU_DOMINIO/api/postsales/v1/me/risk-items" \
  -H "Authorization: Bearer TU_JWT_POSTSALES"
```

### Ejemplo: disparar emisión post-venta (mismo JWT)

Tras actualizar beneficiarios en el front, puedes llamar a la integración (cuerpo = `StandardRiskItem` según contrato):

```bash
curl -sS -X POST "https://TU_DOMINIO/api/integrations/post-sales" \
  -H "Authorization: Bearer TU_JWT_POSTSALES" \
  -H "Content-Type: application/json" \
  -d @risk-item-payload.json
```

Los campos exactos del JSON deben coincidir con lo que espera el handler y el orquestador.

## Referencias

- [Superficies REST](./rest-superficies.md) — inventario global de prefijos HTTP.
- [Integraciones (código)](../arquitectura/integraciones.md) — orquestador y adaptadores.
- [Flujos e integraciones (producto)](../producto/flujos-e-integraciones.md) — visión de negocio.
