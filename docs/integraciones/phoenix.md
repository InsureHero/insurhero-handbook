---
displayed_sidebar: integracionesSidebar
---

# Phoenix

Integración con la plataforma **Phoenix** para **emisión de contratos** y operaciones de póliza según la línea de producto (viajes, salud, hogar, estilo de vida). En código el slug del adaptador es **`PHOENIX`**.

## Qué es

- **Sistema externo**: APIs de Phoenix (destinos, catálogos, emisión) consumidas desde el **`PhoenixAdapter`**.
- **Punto de acople**: el orquestador llama a `adapter.emit(StandardRiskItem)`; Phoenix no conoce el modelo interno completo de InsureHero, solo el payload mapeado.

## Cualidades / capacidades

| Aspecto | Detalle |
|---------|---------|
| **Líneas de negocio** | Variantes de producto (`MIA_TRAVEL`, `MIA_HEALTH`, `MIA_HOME`, `MIA_LIFESTYLE`) con **cliente HTTP** y **mapper** dedicados por línea. |
| **Contrato unificado** | Entrada: `StandardRiskItem` (sujeto asegurado, beneficiarios, metadata). Salida: `EmissionResponse` (éxito, `externalId`, errores tipados, `requestPayload` para depuración). |
| **Configuración** | Credenciales y contexto en tabla **`integrations`** (`slug = 'PHOENIX'`), campo **`auth_config`**. |
| **Destino geográfico** | Constante `PHOENIX_TARGET_DESTINATION` (p. ej. `NACIONAL`), configurable por entorno. |
| **Documentos** | Normalización de tipos de documento (p. ej. PASSPORT → PASAPORTE) vía mapas en constantes. |

## Qué hace InsureHero

1. **Lee** `auth_config` de Phoenix desde Supabase.
2. **Resuelve** variante de producto y elige `PhoenixTravelClient`, `PhoenixHealthClient`, etc.
3. **Mapea** el risk item al contrato que exige cada API Phoenix (`mapToPhoenixTravelContract`, etc.).
4. **Emite** y devuelve resultado al orquestador; el dispatch persiste en **`integration_emissions`** y actualiza **`risk_items.metadata`**.

## Dónde está en el repo

- Adaptador: `apps/next/src/integrations/adapters/phoenix/`
- Registro: `integrations/registry.ts` → `PHOENIX: PhoenixAdapter`

## Referencias

- [Integraciones (código)](../arquitectura/integraciones)
- [Orquestador e integraciones](../arquitectura/orquestador-integraciones)
