---
displayed_sidebar: integracionesSidebar
---

# AMA (MIA Assistance)

Integración con el ecosistema **AMA / MIA Assistance** para altas y operaciones de asistencia vinculadas al modelo de beneficiarios y holders. En código el slug del adaptador es **`AMA`**.

## Qué es

- **Sistema externo**: API de backend (`AMA_BASE_URL` por defecto entorno pre) y **OAuth2** en `AMA_AUTH_URL` para token de servicio.
- **Punto de acople**: `AmaAdapter` implementa `InsuranceAdapter.emit()` y traduce `StandardRiskItem` a los DTO que espera el cliente AMA.

## Cualidades / capacidades

| Aspecto | Detalle |
|---------|---------|
| **Autenticación** | Client credentials u flujo definido en `AmaClient`; URLs y país por variables (`AMA_COUNTRY_ID`, típicamente `MX`). |
| **Handler / origen** | `AMA_HANDLER` (p. ej. `INSUREHERO`) identifica al integrador ante AMA. |
| **Titular** | Constantes de tipo holder y titular de póliza acordes al modelo AMA (`AMA_HOLDER_TYPE`, `AMA_POLICY_HOLDER`). |
| **Beneficiarios** | Mapeo explícito `mapBeneficiariesToAma` desde el risk item. |
| **Configuración** | Tabla **`integrations`**, `slug = 'AMA'`, **`auth_config`** para secretos y parámetros. |

## Qué hace InsureHero

1. Carga **`auth_config`** de la fila AMA en Supabase.
2. Construye peticiones de creación/actualización de holders según el contrato AMA.
3. Devuelve `EmissionResponse` al orquestador; el flujo de **dispatch** / **post-sales** registra intentos y errores como con Phoenix.

## Dónde está en el repo

- Adaptador: `apps/next/src/integrations/adapters/ama/`
- Registro: `AMA` en `integrations/registry.ts`

## Referencias

- [Integraciones (código)](../arquitectura/integraciones)
- [Orquestador e integraciones](../arquitectura/orquestador-integraciones)
