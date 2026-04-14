# Módulo de Suscripciones

Muchos productos en InsureHero no cobran una sola vez: facturan **por periodo** (mensual, anual, etc.). El módulo de **Suscripciones** da sentido a esa recurrencia: qué se cobra, cuándo, qué pasa si falla un pago y cómo se atasca con el ciclo de vida de la póliza.

## Funcionalidades

- **Configurar ciclos de facturación** — A partir de las reglas del paquete (`pricing_rules`: periodicidad, anclaje al calendario, periodos de prueba opcionales, etc.), el sistema sabe si el contrato es de un solo cargo o de renovación automática.
- **Cobrar y registrar pagos** — Integración con pasarelas (por ejemplo Silice / Reef en los despliegues actuales): obtención de token, widget de cobro, callbacks que confirman o rechazan el cargo y actualizan el estado de la suscripción.
- **Gestionar renovaciones y bajas** — Renovación al cumplirse el periodo, suspensión por impago o cancelación según política comercial; histórico de intentos para operación y finanzas.
- **Notificar hitos** — Avisos de cobro próximo, fallo de tarjeta o renovación completada, según lo que habilites por canal y producto.

## Características

- **Alineación con el catálogo** — La recurrencia no es un “modo aparte”: nace de cómo definiste el **paquete** y el **producto**, de modo que precio y periodicidad no se desincronizan.
- **Menos sorpresas operativas** — Estados claros (activa, en mora, cancelada) permiten al soporte explicar al cliente qué ocurre sin interpretar logs a mano.
- **Puente con el mundo de pagos** — Los proveedores de pago cambian reglas y formatos; la plataforma concentra esa variación **fuera** del cálculo de cobertura y prima del núcleo.

Más detalle del flujo técnico de pagos en [Flujos e integraciones](./flujos-e-integraciones.md).
