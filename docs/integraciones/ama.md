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
| **Multi-canal** | `auth_config.channels[]`: cada canal (p. ej. Vidanta/MX, Carrefour/ES) trae sus propias credenciales, URLs, país (`country_id`) y contratos. El adaptador resuelve el bloque por el **`channel_id`** del risk item; si el canal no está configurado o su bloque es inválido, la emisión falla con `CHANNEL_NOT_CONFIGURED` / `INVALID_CHANNEL_CONFIG`. |
| **Autenticación** | OAuth2 client-credentials; `auth_url` y `base_url` **por canal** (ya no por variable de entorno). |
| **Handler / origen** | `AMA_HANDLER` (p. ej. `INSUREHERO`) identifica al integrador ante AMA — invariante global, no por canal. |
| **Titular** | Constantes de tipo holder y titular de póliza acordes al modelo AMA (`AMA_HOLDER_TYPE`, `AMA_POLICY_HOLDER`). |
| **Beneficiarios** | Mapeo explícito `mapBeneficiariesToAma` desde el risk item. |
| **Alta y baja** | `emit(data, { event })`: `"EMIT"` da de alta holders, `"CANCEL"` los da de baja. La **idempotencia vive en la capa de orquestación** (post-sales): consulta la última operación exitosa en `integration_emissions` y no vuelve a llamar a AMA si ya coincide con el evento, así que el adapter actúa como proxy sin estado. Un `CANCEL` sin ninguna emisión previa registrada también se omite. Los reintentos de una baja fallida los cubren el **ciclo de cobros** y la cola de post-sales (QStash) — no un cron dedicado. |
| **Quién pide la baja** | Los tres caminos de cancelación del core (botón de cancelación del dashboard vía `riskItems.update`, ruta Shield `.../risk-items/[riskItemId]/cancel`, cascadas de impago) encolan el `CANCEL`. Antes de encolarlo consultan ese **mismo último evento** en `integration_emissions`, no `risk_items.status`: una re-alta por pago tardío no resetea ese campo, así que fiarse de él dejaría sin camino de baja a una póliza reactivada. Ver [Risk item](../arquitectura/risk-item.md). |
| **Ciclo de pagos** | Al **primer** fallo de pago de una orden, el beneficiario se da de **baja temprana** en AMA aunque el risk item siga `active`. Si el pago se regulariza más tarde, se dispara una **re-alta** automática (`EMIT`). |
| **Configuración** | Tabla **`integrations`**, `slug = 'AMA'`, **`auth_config`** con `handler` + `channels[]` (secretos y parámetros por canal). |

## Qué hace InsureHero

1. Carga **`auth_config`** de la fila AMA en Supabase y **resuelve el bloque del canal** (`channel_id`) dentro de `channels[]`.
2. Según el `event`, construye peticiones de **alta** (create/update de holders) o **baja** según el contrato AMA del canal.
3. Devuelve `EmissionResponse` al orquestador; el flujo de **dispatch** / **post-sales** registra intentos y errores como con Phoenix.

## Dónde está en el repo

- Adaptador: `apps/next/src/integrations/adapters/ama/`
- Registro: `AMA` en `integrations/registry.ts`

## Referencias

- [Integraciones (código)](../arquitectura/integraciones)
- [Orquestador e integraciones](../arquitectura/orquestador-integraciones)
