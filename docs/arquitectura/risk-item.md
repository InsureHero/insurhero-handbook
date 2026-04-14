# Risk item: concepto central del core

El **risk item** es el objeto operativo alrededor del cual gira buena parte de InsureHero una vez definido el **catálogo** (canal, coberturas, variantes, paquetes, productos). No es “otro nombre de póliza” ni un duplicado del producto en venta: es la **instancia viva** del negocio asegurador que conecta titular, coberturas efectivas, cobros, integraciones con aseguradoras, postventa y reclamos.

## Qué es (y qué no es)

- **Es** el registro de trabajo que el **dashboard**, **Shield**, **tRPC** y los flujos de **dispatch / post-sales** manipulan día a día: un mismo `risk_item_id` atraviesa emisión externa, metadata de integración, beneficiarios y autorizados para reclamos.
- **No es** solo la ficha de catálogo: el producto y el paquete describen *qué se puede vender*; el risk item describe *qué se vendió o está en curso* para un cliente concreto, en un canal concreto, con datos ya rellenados (sujeto asegurado, variantes aplicadas, etc.).
- **Relación con la póliza** — En el modelo mental del handbook, la **póliza** es el **documento contractual** materializado (número de póliza, snapshots, titular). El **risk item** es el **hilo operativo** en el core que alimenta integraciones, pagos y portal del titular; en muchos flujos avanzan juntos. Si necesitas el detalle de campos de póliza, sigue [Cómo crear un producto](../producto/creacion-producto.md) (emisión) y [Módulo de Pólizas](../producto/modulo-polizas.md).

## Qué datos aglutina

A alto nivel, un risk item combina:

- **Contexto de canal** — Misma moneda, país y políticas que definiste al crear el canal. El campo **`timezone`** (IANA) del canal importa para reportes y skills que usan ventanas en hora local; ver [Notificaciones, skills y Supabase Edge](./notificaciones-skills-supabase.md).
- **Selección comercial** — Paquete y variantes que aplican a ese contrato en curso, alineadas con `sales_integration_slug` / `post_sales_integration_slug` cuando hay emisión hacia Phoenix, AMA u otro proveedor.
- **Personas** — Titular (beneficiario titular), **beneficiarios**, **authorized_claimants** (quién puede reclamar o actuar en postventa según reglas).
- **Integración** — Tras el dispatch u operaciones de postventa, suele reflejarse estado en **`risk_items.metadata.integration`** (por ejemplo identificadores externos, errores, reintentos), coherente con la tabla **`integration_emissions`**.
- **Identidad estable** — Un **`uid`** u otras referencias útiles para trazas entre sistemas (logs, adaptadores, soporte).

Para el contrato exacto que consume el orquestador, el código define **`StandardRiskItem`** (ver [Orquestador e integraciones](./orquestador-integraciones.md)): es la forma canónica de serializar “este risk item” para **`adapter.emit(...)`**.

## Ciclo de vida (vista de producto)

1. **Creación y evolución** — Alta desde el flujo de ventas o integraciones; actualización de datos del sujeto asegurado, variantes o beneficiarios según reglas.
2. **Cobro** — Los pagos (Silice / Reef, etc.) suelen llevar **`riskItemId`** y **`channelId`** en metadata para conciliar con el ítem correcto.
3. **Emisión hacia aseguradora** — El **dispatch** (`POST /api/integrations/dispatch`) construye un `StandardRiskItem` y llama al **orquestador**; el resultado vuelve al historial de emisiones y a la metadata del risk item.
4. **Postventa del titular** — OTP, JWT y rutas **`/api/postsales/v1/...`** operan sobre risk items donde el email es titular; la RPC **`postsales_risk_item_ids_by_holder_email`** acota elegibilidad.
5. **Reclamos** — Los siniestros se anclan al contexto del contrato; las rutas Shield de **`.../claims`** y **`.../claims/[id]/workflow`** conviven con el mismo modelo de dominio.

Más contexto de flujo: [Flujos e integraciones](../producto/flujos-e-integraciones.md).

## Dónde se expone en la plataforma

| Superficie | Uso típico |
|------------|------------|
| **Shield** `.../risk-items`, `.../risk-items/[riskItemId]` | API HTTP para canales e integraciones: listado, detalle, variantes, eventos, cancelación, rescisiones. Ver [Inventario de rutas](../api-reference/shield/inventario-de-rutas.md). |
| **tRPC** `riskItems` | Pantallas internas del dashboard (ciclo de vida, edición acotada). Ver [tRPC API](../api-reference/trpc-api.md). |
| **`integrationEmissions`** | Consulta de emisiones por `risk_item_id`, reintentos desde backoffice. |
| **Post-sales** `/api/postsales/v1/` | Portal del titular sobre **sus** risk items. Ver [API Post-sales](../api-reference/postsales-api.md). |
| **Dispatch / post-sales integration** `/api/integrations/dispatch`, `/api/integrations/post-sales` | Orquestación tras venta o tras cambios postventa. |

Ejemplos `curl` mínimos: [Shield: flujos y ejemplos](../api-reference/shield/flujos-y-ejemplos.md).

## Lecturas relacionadas

- [Estructura jerárquica de productos](./estructura-jerarquica-productos.md) — Catálogo previo al risk item.
- [Orquestador e integraciones](./orquestador-integraciones.md) — `StandardRiskItem`, dispatch, colas de reintento.
- [Integraciones (código)](./integraciones.md) — Visión del monorepo y acoplamiento del core.
- [Workflows, automatización y skills](./workflows-y-skills.md) — Reclamos y automatización paralela.
- [Módulo de Integraciones](../producto/modulo-integraciones.md) — Enfoque producto.
