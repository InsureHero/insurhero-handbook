# Documentación de Producto

Bienvenido a la documentación de producto de InsureHero. Aquí se describe **cómo entender y operar la plataforma** como un producto coherente: catálogo, contratos, siniestros, cobros, personas, canales y conexión con sistemas externos. El tono está pensado para equipos de producto, operación y negocio; cuando haga falta detalle de implementación enlazamos con Arquitectura, Integraciones o API Reference.

## Cómo está organizado el menú

| Bloque | Qué encontrarás |
|--------|------------------|
| **Introducción** | Esta página y el mapa de arranque. |
| **Producto y catálogo** | Guía práctica [Cómo crear un producto](./creacion-producto.md) y las **fichas por módulo** (Productos, Pólizas, Reclamos, **Workflows y automatización**, Suscripciones, Usuarios, Canales e Integraciones), todas con secciones **Funcionalidades** y **Características**. |
| **Flujos y ecosistema** | Cómo encajan venta, pagos, postventa y proveedores en un solo relato: [Flujos e integraciones](./flujos-e-integraciones.md). |
| **Documentación técnica relacionada** | Accesos a Integraciones, API Reference, tRPC, landings y Arquitectura (misma información que en el menú superior, sin duplicar el detalle técnico aquí). |

Así puedes **saber en qué capa estás**: lectura orientada a negocio frente a especificación o código.

## Visión general en pocas líneas

InsureHero concentra en una sola plataforma:

- **Catálogo** — De cobertura a producto vendible, con precios y reglas que respetan canal, moneda y país.
- **Contratos** — Pólizas con titular, vigencia, instantáneas de lo contratado y enlaces operativos (cobros, integraciones).
- **Siniestros** — Reclamos con estados, documentación y trazabilidad.
- **Cobro recurrente** — Suscripciones alineadas con cómo definiste el paquete.
- **Gobernanza** — Usuarios, roles y canales que segmentan el negocio de forma segura.
- **Conectividad** — Integraciones con aseguradoras y pagos sin empastar el núcleo.

## Por dónde empezar

- **Si vas a configurar oferta nueva** — Sigue [Cómo crear un producto](./creacion-producto.md) y, en paralelo, lee [Módulo de Productos](./modulo-productos.md) y [Módulo de Canales](./modulo-canales.md) para ubicar decisiones que no se pueden deshacer (por ejemplo moneda y país del canal).
- **Si tu foco es operación o soporte** — Revisa [Módulo de Pólizas](./modulo-polizas.md), [Módulo de Reclamos](./modulo-reclamos.md), [Módulo de Workflows y automatización](./modulo-workflows.md) y [Módulo de Suscripciones](./modulo-suscripciones.md).
- **Si te ocupa la identidad y el acceso** — [Módulo de Usuarios](./modulo-usuarios.md).
- **Si necesitas el mapa completo** — [Módulos del producto](./modulos.md) lista las siete fichas en un solo vistazo.

## Estructura jerárquica (referencia)

La relación **Canal → Cobertura → Variante → Paquete → Producto** está explicada con detalle en Arquitectura: [Estructura jerárquica de productos](../arquitectura/estructura-jerarquica-productos.md).

Cuando el catálogo ya existe, el día a día gira en torno al **risk item** (instancia operativa del contrato en curso: titular, integraciones, postventa, reclamos). Léelo en [Risk item (concepto central)](../arquitectura/risk-item.md).
