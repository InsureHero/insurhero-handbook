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

## Credenciales de Silice

Las credenciales de Silice no son por canal, sino por **entorno y país**.

### En uso hoy: variables de entorno

El login a Silice (`loginNegWidget`, en `apps/next/src/utils/silice.utils.ts`) y el endpoint `/api/payments/silice/token` leen cuatro variables de entorno, declaradas en `src/config/env.config.ts`:

| Variable | Uso en el login |
|----------|-----------------|
| `SILICE_USERNAME` | `username` |
| `SILICE_PASSWORD` | `password` |
| `SILICE_COUNTRY_CODE` | `countryCode` |
| `SILICE_DEALER_CODE` | `dealerCode` |

Con este esquema, cada entorno admite **un solo país**.

### Almacenamiento por país: `integrations` + Vault

Existe una fila en `public.integrations` con `slug = 'SILICE'` (`name = 'Silice'`, `base_url = null`). Se da de alta por migración con `auth_config = {}` (idempotente: `on conflict (slug) do nothing`, no pisa un `auth_config` ya cargado). Las credenciales se completan **a mano en cada entorno**, país por país.

:::note
Por ahora la app **no lee** este `auth_config`: el login sigue usando las variables `SILICE_*`. El paso del consumo a `integrations` llegará en un cambio posterior.
:::

`auth_config` es un objeto con una entrada por país. La clave es el código de país que Silice espera en `countryCode` (en mayúsculas: `MX`, `EC`, `USA`, `ES`…):

```json
{
  "MX": {
    "environment": "dev",
    "code": "<dealerCode de SILICE>",
    "user": "<usuario de SILICE>",
    "passwordId": "<id (uuid) del secreto en vault.secrets>"
  }
}
```

| Campo | Tipo | Qué es |
|-------|------|--------|
| `environment` | `"dev"` \| `"prod"` | Entorno de Silice de esa credencial. |
| `code` | string | `dealerCode` del login a Silice. |
| `user` | string | Usuario de Silice. |
| `passwordId` | string (uuid) | `id` del secreto en `vault.secrets`. La password **no** se guarda en `auth_config`; vive en Supabase Vault con nombre `silice_password_<pais>_<entorno>` (país en minúsculas, p. ej. `silice_password_mx_dev`). |

`integrations.auth_config` está en `SENSITIVE_COLUMNS` de la sincronización a Tinybird, por lo que no se replica.

**Cargar un país:**

```sql
-- 1. Crear el secreto en Vault (o desde Supabase UI > Vault) y anotar el id que devuelve
select vault.create_secret('<password>', 'silice_password_mx_dev', 'SILICE MX dev');

-- 2. Agregar el país a auth_config sin pisar los demás
update public.integrations
set auth_config = auth_config || jsonb_build_object('MX', jsonb_build_object(
  'environment', 'dev',
  'code', '<dealerCode>',
  'user', '<usuario>',
  'passwordId', '<id del paso 1>'
))
where slug = 'SILICE';
```

El operador `||` deja intactos los demás países; si el país ya existía, reemplaza su entrada.

**Resolver la password:**

```sql
select s.decrypted_secret
from public.integrations i
join vault.decrypted_secrets s on s.id = (i.auth_config -> 'MX' ->> 'passwordId')::uuid
where i.slug = 'SILICE';
```

Si el `passwordId` no existe en Vault, el join no devuelve fila.

## Dónde está en el repo

- `apps/next/src/lib/reefWidget.ts`
- `apps/next/src/components/pay/`, `apps/next/src/app/api/payments/`
- `apps/next/src/utils/silice.utils.ts` (login a Silice y pasarelas)
- `apps/next/supabase/migrations/20261116182502_drop_silice_credentials_add_silice_integration.sql` (alta de la integración `SILICE`)

## Payment widget (iframe, repo aparte)

Existe un proyecto **Next.js independiente** que embebe Silice + Reef en un **iframe** y habla con la app contenedora por **`postMessage`** (`IH_INIT_PAYMENT` / `IH_PAYMENT_RESULT`). Útil para landings u orquestadores fuera del monorepo que reutilizan el mismo token `/api/payments/silice/token`. Documentación: **[Payment widget](./payment-widget.md)**.

## Referencias

- [Superficies REST](../api-reference/rest-superficies) (prefijos `/api/payments`, `processPayment`)
- [Integraciones (código)](../arquitectura/integraciones)
