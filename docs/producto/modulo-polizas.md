# Módulo de Pólizas

Una **póliza** es el momento en que el catálogo deja de ser abstracto y se convierte en un compromiso con un **titular**: coberturas concretas, prima acordada, vigencia y condiciones. El módulo de Pólizas cubre todo el ciclo alrededor de ese contrato: desde la emisión hasta las modificaciones, consultas y baja. En paralelo, el **risk item** es el registro operativo del core que enlaza venta, integraciones y postventa con ese contrato; véase [Risk item](../arquitectura/risk-item.md).

## Funcionalidades

- **Emitir pólizas** — Tomando un producto (y el paquete elegido), el sistema calcula la prima según los datos del asegurado y genera el contrato con identificadores estables (`policy_number`, referencias internas y externas cuando aplica).
- **Consultar y operar el contrato activo** — Localizar pólizas por titular, estado o canal; revisar coberturas efectivas y documentos asociados según lo que exponga el backoffice o las APIs.
- **Listar y exportar risk items en el dashboard** — La tabla de Risk Items pagina en servidor con **50 filas por defecto** y un selector *Rows per page* (**50 / 100**). El tamaño elegido viaja en la URL (`?size=`, junto a `?page=`), así que sobrevive a una recarga y se puede compartir; cambiarlo vuelve a la página 1. Ningún request supera las 100 filas (es el límite del back), y el selector solo aparece en esta tabla: el resto de tablas del dashboard conservan su tamaño fijo. El botón de exportar genera un XLSX con las **filas visibles** (50 o 100) e incluye la columna **Holder** (email del beneficiario marcado como titular, `isHolder`), justo después de las columnas fijas del registro y antes de los campos del asegurado; si no hay titular o el titular no tiene email, la celda queda vacía.
- **Gestionar el ciclo de vida** — Renovaciones, endosos o bajas según reglas del negocio; el detalle exacto depende de cómo tu organización configure transiciones (activa, vencida, cancelada, etc.).
- **Mantener trazabilidad** — Historial de cambios relevantes, datos de titular y metadata operativa (canal de venta, agente, referencias de integración) para auditoría y soporte.

## Características

- **Instantánea de lo contratado** — La estructura del producto y las coberturas se **congelan** en el momento de la emisión: los cambios futuros en catálogo no alteran contratos ya emitidos salvo procesos explícitos de modificación.
- **Alineación con cobros y suscripciones** — Cuando el paquete es recurrente, la póliza enlaza con el ritmo de facturación y con el módulo de Suscripciones sin duplicar lógica de negocio.
- **Puente natural hacia la emisión externa** — Si tu compañía emite en Phoenix, AMA u otro proveedor, el orquestador actúa **después** de que el núcleo tiene un risk item coherente; el contrato “digital” y el externo pueden convivir con trazas enlazadas (ver [Flujos e integraciones](./flujos-e-integraciones.md)).

Para el modelo de datos paso a paso desde variante hasta póliza, puedes repasar el final de [Cómo crear un producto](./creacion-producto.md) (sección de emisión).
