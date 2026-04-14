# Módulo de Productos

El **módulo de Productos** es el corazón del catálogo: es donde traduces la oferta de la aseguradora en algo que el canal puede vender de forma reproducible. No se limita a “un registro más”; une coberturas, variantes con precio, paquetes comerciales y el producto final con código y reglas de vida.

## Funcionalidades

- **Diseñar la jerarquía de catálogo** — Partes de la **cobertura** (el “qué aseguramos” a nivel contrato con la aseguradora) y construyes **variantes** con límites, deducibles, impuestos y expresiones de precio que dependen del perfil del asegurado. Luego agrupas variantes en **paquetes** y, al final, en **productos** listos para comercializar. Esta cadena está detallada paso a paso en [Cómo crear un producto](./creacion-producto.md).
- **Definir precios y reglas** — El precio no tiene por qué ser un número fijo: puede depender de variables del sujeto asegurado (`subject_schema`), combinarse con impuestos y márgenes, y alinearse con reglas de facturación recurrente o pago único a nivel paquete.
- **Gobernar el ciclo de vida del producto** — Puedes modelar estados (borrador, activo, suspendido, archivado) para que operación y comercial sepan si algo es vendible o solo está en preparación.
- **Versionar la semántica del negocio sin romper lo vendido** — Cuando un cliente ya tiene una póliza emitida, el sistema conserva **instantáneas** de lo contratado; los cambios en catálogo no reescriben el pasado.

## Características

- **Coherencia por canal** — Moneda y país del canal son la base: todo lo que vendas bajo ese canal respeta ese marco; evita sorpresas al cruzar inventario y liquidez.
- **Separación clara entre “catálogo” y “contrato”** — El módulo de productos define la oferta; el de pólizas materializa el contrato con una persona o empresa concreta. Esa frontera mantiene orden cuando el catálogo evoluciona.
- **Flexibilidad para brokers y multi-ramo** — Puedes combinar variantes de distintas coberturas en un mismo paquete, preparar distintos niveles (básico / intermedio / premium) y exponer features comerciales en metadatos sin obligar a un único esquema rígido.

Si necesitas el detalle técnico de tablas y relaciones, sirve de apoyo [Estructura jerárquica de productos](../arquitectura/estructura-jerarquica-productos.md).
