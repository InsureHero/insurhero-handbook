# Módulos del producto

InsureHero se entiende mejor cuando lo divides en **módulos**: bloques de funcionalidad que cubren una parte del negocio del seguro (catálogo, contratos, siniestros, cobros recurrentes, personas, canales y conexión con sistemas externos). No son “pantallas sueltas”; encajan en un mismo modelo de datos y en los mismos flujos de venta, postventa y operación.

En el menú lateral, debajo de esta página, encontrarás **una ficha por módulo**. Cada una sigue la misma lógica:

- **Funcionalidades**: qué puedes hacer en la práctica (acciones, flujos, artefactos).
- **Características**: cómo se comporta el módulo (calidad, límites, garantías de diseño que notan producto y operaciones).

Si recién empiezas con la jerarquía canal → cobertura → variante → paquete → producto, la guía [Cómo crear un producto](./creacion-producto.md) es el camino más concreto. Estas fichas **complementan** esa guía con el mapa funcional completo.

## Mapa rápido

| Módulo | En una frase |
|--------|----------------|
| [Productos](./modulo-productos.md) | Define **qué vendes**: catálogo, precios, reglas de empaquetado y comercialización. |
| [Pólizas](./modulo-polizas.md) | Es el **contrato** que queda con el cliente: emisión, vigencia, cambios y documentos. |
| [Reclamos](./modulo-reclamos.md) | Recoge y procesa **siniestros** con seguimiento, pruebas y cierre. |
| [Suscripciones](./modulo-suscripciones.md) | Orquesta **cobros recurrentes**, renovaciones y el ritmo de facturación. |
| [Usuarios](./modulo-usuarios.md) | Garantiza **quién entra** y **qué puede hacer** (roles, permisos, identidad). |
| [Canales](./modulo-canales.md) | Separa **contextos de negocio** (país, moneda, marca, administración) por canal. |
| [Integraciones](./modulo-integraciones.md) | Conecta InsureHero con **aseguradoras, pagos y APIs** sin ensuciar el núcleo. |
| [Workflows y automatización](./modulo-workflows.md) | Orquesta **estados de reclamo**, **comunicación** y **skills** de operación (alertas, reportes) como capa transversal. |

Para ver cómo esos módulos se enganchan en ventas, postventa y proveedores externos, revisa también [Flujos e integraciones](./flujos-e-integraciones.md). El detalle técnico de workflows frente a skills está en [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md).

**Concepto transversal** — El **risk item** es la pieza del core que une catálogo, emisión, pagos y portal del titular: [Risk item](../arquitectura/risk-item.md).
