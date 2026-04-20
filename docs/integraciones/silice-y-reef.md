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

## Payment widget (iframe, repo aparte)

Existe un proyecto **Next.js independiente** que embebe Silice + Reef en un **iframe** y habla con la app contenedora por **`postMessage`** (`IH_INIT_PAYMENT` / `IH_PAYMENT_RESULT`). Útil para landings u orquestadores fuera del monorepo que reutilizan el mismo token `/api/payments/silice/token`. Documentación: **[Payment widget](./payment-widget.md)**.

## Referencias

- [Superficies REST](../api-reference/rest-superficies) (prefijos `/api/payments`, `processPayment`)
- [Integraciones (código)](../arquitectura/integraciones)
