---
displayed_sidebar: integracionesSidebar
---

# Phoenix

Integración con la plataforma **Phoenix** para **emisión de contratos** y operaciones de póliza según la línea de producto (viajes, salud, hogar, estilo de vida). En código el slug del adaptador es **`PHOENIX`**.

## Qué es

- **Sistema externo**: APIs de Phoenix (autenticación, catálogos de tipos de viaje y tipos de documento fiscal, emisión de contrato) consumidas desde el **`PhoenixAdapter`**.
- **Punto de acople**: el orquestador llama a `adapter.emit(StandardRiskItem)`; Phoenix no conoce el modelo interno completo de InsureHero, solo el payload mapeado.

## Cualidades / capacidades

| Aspecto | Detalle |
|---------|---------|
| **Líneas de negocio** | Variantes de producto (`MIA_TRAVEL`, `MIA_HEALTH`, `MIA_HOME`, `MIA_LIFESTYLE`) con **cliente HTTP** y **mapper** dedicados por línea (`phoenix/index.ts:31-42`). |
| **Contrato unificado** | Entrada: `StandardRiskItem` (sujeto asegurado, beneficiarios, metadata). Salida: `EmissionResponse` (éxito, `externalId` = `contractNumber` de Phoenix, errores tipados, `requestPayload` para depuración). |
| **Configuración** | Credenciales y contexto en tabla **`integrations`** (`slug = 'PHOENIX'`), campo **`auth_config`**. El adaptador **no lee variables de entorno propias**: las únicas que toca son `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` para leer esa fila (`phoenix/index.ts:54-58`). |
| **Destino geográfico** | `destinationCode` viene de la entrada de `auth_config.products[]` que matchea el `package_id` del risk item; si falta, la emisión de viaje falla con error explícito (`phoenix/index.ts:207-213`). |
| **Documentos** | El tipo de documento fiscal se resuelve **en runtime** contra el catálogo `fiscalIdTypes` que devuelve Phoenix, no contra un mapa en constantes (`mappers/travel.mapper.ts:70-79`). |

### Variantes, clientes y mappers

| Variante | Cliente | Mapper |
|----------|---------|--------|
| `MIA_TRAVEL` | `clients/travel.client.ts` | `mappers/travel.mapper.ts` |
| `MIA_HEALTH` | `clients/health.client.ts` | `mappers/health.mapper.ts` |
| `MIA_HOME` | `clients/home.client.ts` | `mappers/home.mapper.ts` |
| `MIA_LIFESTYLE` | `clients/lifestyle.client.ts` | `mappers/lifestyle.mapper.ts` |

### Cómo se resuelve la configuración

1. Lee `auth_config` de `integrations` filtrando por `slug = 'PHOENIX'` (`index.ts:60-74`).
2. Matchea el `package_id` del risk item contra `auth_config.products[]` (`index.ts:77-86`). De esa entrada salen `provider_product_id`, `country_api`, `package_uid`, `variant` y `destinationCode`.
3. Resuelve la configuración de la variante desde `auth_config.variants` y con ella autentica el cliente contra `token_url` / `base_url` (`index.ts:87-115`).

Si el `package_id` no está en `products[]`, o la variante no existe en `variants`, el adaptador falla con un error que nombra el valor buscado.

## Qué hace InsureHero

1. **Lee** `auth_config` de Phoenix desde Supabase.
2. **Resuelve** variante de producto y elige `PhoenixTravelClient`, `PhoenixHealthClient`, etc.
3. **Consulta catálogos** según la variante: `MIA_TRAVEL` pide `tripTypes` y `fiscalIdTypes` en paralelo y matchea el `tripType` del risk item contra el catálogo (`index.ts:178-205`); `MIA_HEALTH`, `MIA_HOME` y `MIA_LIFESTYLE` solo piden `fiscalIdTypes` y van directo al mapper.
4. **Mapea** el risk item al contrato que exige cada API Phoenix (`mapToPhoenixTravelContract`, etc.).
5. **Emite** y devuelve resultado al orquestador; el dispatch persiste en **`integration_emissions`** y actualiza **`risk_items.metadata`**.

En viaje, el `tripPrice` que se envía sale de `insured_subject.assistanceAmount` redondeado a dos decimales (`index.ts:217-220`, `travel.mapper.ts:22`).

## Consideraciones abiertas

- **Matching de `fiscalIdType` sin ancla** (`mappers/travel.mapper.ts:70-79`): la resolución busca el primer entry del catálogo cuya descripción **contenga** el `fiscalType` del beneficiario (case-insensitive). Un `fiscalType` que sea substring de otra descripción matchea la equivocada, y sin match cae en el código `"2"` sin log ni error.
- **Cobertura de tests**: no hay archivos `.test.ts` bajo `src/integrations/adapters/phoenix/`; el resto de adaptadores (`ama`, `fenicio`, `mawdy-mail`, `sftp`) sí tienen suite.

Estado detallado de la auditoría del adaptador: `docs/audits/phoenix-adapter-audit.md` en el repo de la plataforma.

## Dónde está en el repo

- Adaptador: `apps/next/src/integrations/adapters/phoenix/` (`index.ts`, `base.client.ts`, `types.ts`, `clients/`, `mappers/`)
- Registro: `integrations/registry.ts` → `PHOENIX: PhoenixAdapter`
- Runner manual: `GET /api/test-phoenix` (`app/api/test-phoenix/route.ts`) dispara el orquestador real con el fixture `integrations/test-risk-item.json`. No es un test de Vitest.

## Referencias

- [Integraciones (código)](../arquitectura/integraciones)
- [Orquestador e integraciones](../arquitectura/orquestador-integraciones)
