---
displayed_sidebar: integracionesSidebar
---

# AMA (MIA Assistance)

Integración con el ecosistema **AMA / MIA Assistance** para altas y operaciones de asistencia vinculadas al modelo de beneficiarios y holders. En código el slug del adaptador es **`AMA`**.

## Qué es

- **Sistema externo**: API de MIA Assistance con **OAuth2** (client credentials). Las URLs (auth y base), el país y las credenciales viven **por canal** en `auth_config`, no en variables de entorno globales.
- **Punto de acople**: `AmaAdapter` implementa `InsuranceAdapter.emit()` y traduce `StandardRiskItem` a los DTO que espera el cliente AMA. Un mismo `emit` cubre **alta y baja** de beneficiarios (ver tabla).

## Cualidades / capacidades

| Aspecto | Detalle |
|---------|---------|
| **Multi-canal** | `auth_config.channels[]`: cada canal (p. ej. Vidanta/MX, Carrefour/ES) trae sus propias credenciales, URLs, país (`country_id`) y contratos. El adaptador resuelve el bloque por el **`channel_id`** del risk item; si el canal no está configurado o su bloque es inválido, la emisión falla de forma terminal (`CHANNEL_NOT_CONFIGURED` / `INVALID_CHANNEL_CONFIG`, sin reintento). |
| **Autenticación** | OAuth2 client-credentials; `auth_url` y `base_url` **por canal** (ya no por variable de entorno). |
| **Handler / origen** | `AMA_HANDLER` (p. ej. `INSUREHERO`) identifica al integrador ante AMA — invariante global, no por canal. |
| **Titular** | Constantes de tipo holder y titular de póliza acordes al modelo AMA (`AMA_HOLDER_TYPE`, `AMA_POLICY_HOLDER`). |
| **Beneficiarios** | Mapeo explícito `mapBeneficiariesToAma` desde el risk item. |
| **Alta y baja** | `emit(data, { operation })`: `"EMIT"` da de alta holders, `"CANCEL"` los da de baja. Si no hay emisión previa o ya estaba cancelado, devuelve estado **`SKIPPED`** (éxito, sin llamar a AMA). La baja fallida se reintenta vía el cron `ama-cancel-retry`. |
| **Configuración** | Tabla **`integrations`**, `slug = 'AMA'`, **`auth_config`** con `handler` + `channels[]` (secretos y parámetros por canal). |

## Qué hace InsureHero

1. Carga **`auth_config`** de la fila AMA en Supabase y **resuelve el bloque del canal** (`channel_id`) dentro de `channels[]`.
2. Según `operation`, construye peticiones de **alta** (create/update de holders) o **baja** según el contrato AMA del canal.
3. Devuelve `EmissionResponse` al orquestador; el flujo de **dispatch** / **post-sales** registra intentos y errores como con Phoenix.

## Dónde está en el repo

- Adaptador: `apps/next/src/integrations/adapters/ama/`
- Registro: `AMA` en `integrations/registry.ts`

## Referencias

- [Integraciones (código)](../arquitectura/integraciones)
- [Orquestador e integraciones](../arquitectura/orquestador-integraciones)
