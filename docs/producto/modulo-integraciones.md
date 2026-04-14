# Módulo de Integraciones

El **módulo de Integraciones** es la frontera controlada entre InsureHero y el mundo exterior: aseguradoras, pasarelas de pago, webhooks de clientes y APIs consumidas por partners. La idea de producto es sencilla de explicar aunque debajo haya complejidad: el **core** mantiene el contrato de negocio; los **adaptadores** traducen hacia cada sistema externo.

## Funcionalidades

- **Emitir en sistemas de la aseguradora** — Cuando un risk item debe existir también en Phoenix, AMA u otro proveedor registrado, el **orquestador** despacha hacia el adaptador correcto y devuelve éxito o error tipado, con persistencia del resultado.
- **Exponer APIs estables hacia partners** — **Shield** y las rutas REST documentadas permiten consultar y mutar datos sin acoplar al detalle interno del dashboard.
- **Recibir eventos vía webhooks** — Cambios de estado y automatizaciones hacia sistemas del cliente cuando el flujo lo permita.
- **Postventa del titular** — Flujos con OTP, JWT de post-sales y, si el paquete lo define, emisión post-modificación vía la misma capa de integración.

## Características

- **Desacoplamiento del core** — El núcleo no incorpora reglas del tipo “si es Phoenix haz esto, si es AMA haz lo otro”: entrega un **contrato canónico** (`StandardRiskItem`) y el adaptador traduce. Así añadir un proveedor no obliga a dispersar lógica por pantallas y servicios ajenos al orquestador.
- **Observabilidad y alertas** — Errores de integración pueden disparar notificaciones (Discord, correos vía skills con Edge Functions, etc.) para que operación reaccione antes que el cliente lo note.
- **Reintentos y cola de fallidos** — Los fallos transitorios no tienen por qué ser definitivos: el sistema distingue reintentables de abandonos y puede encolar reprocesos sin perder contexto.

Para profundizar: [Flujos e integraciones](./flujos-e-integraciones.md), [Integraciones (arquitectura)](../arquitectura/integraciones.md) y [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md).
