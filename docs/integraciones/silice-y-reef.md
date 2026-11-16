---
displayed_sidebar: integracionesSidebar
---

# Pagos: Silice y Reef

Integración con **Silice** como pasarela y el **widget Reef** para cobros con tarjeta en flujos de órdenes y experiencias de pago del producto.

## Qué es

- **Silice**: emisión de **token** y datos de comercio/procesador para iniciar el cobro.
- **Reef**: experiencia embebida de pago configurada en front con `buildReefConfig` (montos, moneda, metadata de negocio).

## Cualidades / capacidades

| Aspecto | Detalle |
|---------|---------|
| **Tokenización** | API bajo rutas como `/api/payments/silice` para obtener token antes de mostrar el widget. |
| **Configuración del widget** | Mapeo de importes, impuestos, concepto, `ordenId`, moneda, `merchantMap`, `procesadorId`, y **metadata** (`riskItemId`, `channelId`) para trazabilidad. |
| **Tipos** | Contratos en `types/payment.types` alineados con el payload del widget. |

## Qué hace InsureHero

1. El front (dashboard o flujos habilitados) solicita token a Silice vía backend.
2. Construye la config Reef para el cliente (email, nombre, totales, `dataExtra` con IDs de negocio).
3. Los webhooks o rutas `/api/processPayment` completan el ciclo según el tipo de cobro (órdenes, suscripciones).

## Dónde está en el repo

- `apps/next/src/lib/reefWidget.ts`
- `apps/next/src/components/pay/`, `apps/next/src/app/api/payments/`

## Credenciales de Silice

Silice emite credenciales **por país y por entorno de Silice** (`dev` / `prod`), no por canal.

### Consumo actual (variables de entorno)

Hoy el login a Silice (`loginNegWidget`, en `apps/next/src/utils/silice.utils.ts`) se arma con cuatro variables de entorno, por lo que cada despliegue admite **un solo país**:

| Variable | Campo del login |
|----------|-----------------|
| `SILICE_USERNAME` | `username` |
| `SILICE_PASSWORD` | `password` |
| `SILICE_COUNTRY_CODE` | `countryCode` |
| `SILICE_DEALER_CODE` | `dealerCode` |

La URL base de la API de Silice está fija en el código (`silice.utils.ts`).

### Tabla `public.silice_credentials` (almacenamiento, aún sin consumo)

Existe una tabla para guardar las credenciales por país y entorno. **La app todavía no la lee**: el login sigue usando las variables `SILICE_*` hasta que se implemente el consumo.

| Columna | Detalle |
|---------|---------|
| `country_code` | Código de país que espera Silice en `countryCode` (`MX`, `EC`, `USA`, `ES`…). Mayúsculas, 2–3 letras (`check`). |
| `environment` | Entorno **de Silice** al que pertenece la credencial: `dev` o `prod` (`check`). No es el proyecto Supabase donde vive la fila. |
| `dealer_code` | `dealerCode` del login. |
| `username` | Usuario de Silice. |
| `password_secret_name` | Nombre del secreto en **Supabase Vault** con la password. Debe ser `silice_password_<pais>_<entorno>` con el país en minúsculas (p. ej. `silice_password_ec_dev`); la base lo exige con un `check`, así una fila nunca apunta al secreto de otro país o entorno. |
| `base_url` | URL base de la API de Silice para ese país y entorno. |
| `created_at` / `updated_at` | `updated_at` lo actualiza el trigger `touch_updated_at` en cada `update`. |
| `created_by` / `updated_by` | FK a `admins` (`on delete set null`). Nullable: la carga es manual y no hay sesión de la que tomar el admin. |

Reglas y comportamiento:

- **Una fila por país y entorno** (`unique (country_code, environment)`): un mismo país tiene, como máximo, una credencial `dev` y una `prod`.
- **La password no se guarda en la tabla**: vive en Vault. La existencia del secreto no se valida en la base (no hay FK hacia `vault`).
- **Excepción single-tenant**: la tabla no lleva `channel_id` porque es configuración de un proveedor, no dato de negocio de un canal. Tiene RLS habilitada **sin policies** y sin grants para `anon` / `authenticated`: solo `service_role` la lee y la escribe.
- **No se replica a Tinybird**: está en `NOT_MIRRORED_TABLES` (`tinybirdSync.config.ts`).
- **Carga manual por entorno**: tanto las filas como los secretos de Vault se cargan a mano (los secretos desde Supabase UI › Vault); ninguna migración trae datos y no hay UI de administración.

## Payment widget (iframe, repo aparte)

Existe un proyecto **Next.js independiente** que embebe Silice + Reef en un **iframe** y habla con la app contenedora por **`postMessage`** (`IH_INIT_PAYMENT` / `IH_PAYMENT_RESULT`). Útil para landings u orquestadores fuera del monorepo que reutilizan el mismo token `/api/payments/silice/token`. Documentación: **[Payment widget](./payment-widget.md)**.

## Referencias

- [Superficies REST](../api-reference/rest-superficies) (prefijos `/api/payments`, `processPayment`)
- [Integraciones (código)](../arquitectura/integraciones)
