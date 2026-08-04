---
displayed_sidebar: integracionesSidebar
---

# Familias de ficheros y slugs

Cada report de Carrefour se identifica por un **slug**. El handler de generación produce **un `register` por slug** aplicable a la orden (ver [pipeline](./intro.md)). Hay dos tipos de formato:

- **XML** — la familia **EIAC** (fragmentos que se envuelven en una cabecera al consolidar).
- **Ancho fijo / delimitado** — el resto (**RIC**, **OPEN_SYSTEMS**, **MIC**, **PAYMENTS_DAILY**).

> Las **posiciones y longitudes de campo** de cada layout viven en el código (los builders por familia) y son la fuente de verdad; aquí se documenta **qué es** cada familia y sus slugs, no el detalle posicional.

## EIAC (XML)

Emisión, recibos y anulación de pólizas en XML.

| Slug | Qué representa |
|------|----------------|
| `EIAC_POLIZAS_NP` | Emisión de **póliza nueva**. |
| `EIAC_POLIZAS_AN` | **Anulación** de póliza (cuando el risk item queda cancelado). |
| `EIAC_POLIZAS_CA` | **Cambio** sobre la póliza. |
| `EIAC_RECIBOS_NP` | Emisión de **recibo** nuevo. |
| `EIAC_RECIBOS_MO` | **Movimiento** de recibo (confirmación, anulación). Admite varias filas por orden. |

Los diarios (`EIAC_POLIZAS_NP`, `EIAC_POLIZAS_AN`, `EIAC_RECIBOS_NP`) se consolidan por **ventana de 24 h** en el timezone del canal. La cabecera XML lleva una `clase` configurada en el report.

### Códigos de emisor, receptor y mediador

Los bloques `<Emisor>` / `<Receptor>` de la cabecera y el `<IdMediador>` de cada registro no llevan valores fijos en el código: los cuatro salen del report del slug en `auth_config.EIAC.reports[]` (`emisor.codigoInterno`, `emisor.codigoDGS`, `receptor.codigoInterno`, `receptor.codigoDGS`). `<IdMediador>` consume el **mismo** bloque `receptor` que la cabecera —es el mismo dato de negocio: el código de InsureHero como mediador/receptor frente a Carrefour—, así que un cambio en la config mueve los dos bloques a la vez. Si alguno de esos campos falta, la generación de ese slug falla con un error explícito.

### Ramo y modalidad (por producto)

Los códigos de ramo de cada registro salen de la config del canal, `auth_config.EIAC.channels[].policies[]`, un array indexado por `policy_uid`:

| Campo de config | Etiqueta XML |
|---|---|
| `ramo_dgs` | `<RamoDGS>` |
| `cod_ramo` | `<RamoEntidad>` |
| `modalidadRamo` | `<ModalidadRamo>` |

Pólizas y recibos leen **los mismos campos**. Si el `policy_uid` de la orden no está mapeado ahí, el registro **no rompe el fichero**: solo ese registro sale con esos campos en `0` / vacío y queda un `console.warn` con el `policy_uid` faltante — el hueco queda visible sin bloquear la generación del resto de los registros del canal.

### `ComisionLiquida`

La comisión del canal **no** se lee de esa config por producto: se deriva del pricing real, con dos fuentes en orden de prioridad.

1. **Snapshot de la orden** (fuente preferida): la entrada con `owner = "channel"` de `orders.pricing.total.markups_details`, sumando sus detalles llamados `Comission`. Es el valor que tenía la orden al momento de la venta, así que un cambio de markup posterior no altera lo que ya se reportó, y es el mismo campo que alimenta el código económico `998` de `OPEN_SYSTEMS`.
2. **Catálogo en vivo** (solo si la orden no trae esa entrada, pricing en formato legado): se suma el tax `Comission` de los markups con `owner = "channel"` de **todas** las variantes vigentes del paquete (`variants.markup`, excluyendo las soft-deleted), resolviendo tanto monto fijo (`value`) como tasa (`rate` sobre el `gross_price` de ese markup).

En los dos caminos el nombre del tax se compara normalizado (sin espacios, en mayúsculas) y el total se redondea a 2 decimales. Ver [markup en la estructura de producto](../../arquitectura/estructura-jerarquica-productos.md).

## RIC (ancho fijo, estándar MAPFRE)

Registro de información de clientes, pólizas, intervinientes y contactos.

| Slug | Qué representa |
|------|----------------|
| `RIC_DAILY` | Fichero **diario** multi-tabla: cliente, póliza, interviniente y contacto en un mismo envío. |
| `RIC_MONTHLY_CLIENTES` | Consolidado **mensual** de clientes. |
| `RIC_MONTHLY_POLIZAS` | Consolidado mensual de pólizas. |
| `RIC_MONTHLY_INTERVINIENTES` | Consolidado mensual de intervinientes. |
| `RIC_MONTHLY_CONTACTOS` | Consolidado mensual de contactos. |

Cada registro indica su **operación**: alta (`01`), modificación (`02`) o baja (`03`), derivada del estado de la orden.

## OPEN_SYSTEMS / OPEN_SYSTEMS_V2 (SSAA — sistemas abiertos)

Fichero **mensual** de movimientos de póliza/recibo para el sistema de "sistemas abiertos" de MAPFRE. Nombre por defecto `BUZON_MENSUAL_{MMYYYY}_CARREFOUR`.

| Slug | Qué representa |
|------|----------------|
| `OPEN_SYSTEMS` | Layout base de movimientos mensuales. |
| `OPEN_SYSTEMS_V2` | Layout revisado (tipo de registro emisión/renovación y fechas de creación / anulación / cobro). Admite varias filas por orden. |

La fecha de cierre se resuelve según la periodicidad del report (`monthly` + `schedule_day` + `skip_weekends`).

### Códigos económicos (`OPEN_SYSTEMS`)

En el layout base, cada orden emite **un registro por código económico**, todos con los mismos datos de póliza/recibo y variando solo el código y su importe:

| Código | Importe |
|---|---|
| `993` | Prima neta de la orden. |
| `994` | Impuesto `IPS`. |
| `995` | Impuesto `LEA`. |
| `996` | Impuesto `CCS` (o `Consorcio`, si el pricing lo nombra así). |
| `998` | **Comisión del canal**: los detalles de la entrada `owner = "channel"` de `orders.pricing.total.markups_details` — el mismo snapshot del que sale `ComisionLiquida` en EIAC. |

Los importes se emiten **en céntimos**, redondeados al céntimo más cercano; un código sin valor en el pricing de la orden sale en `0`. `OPEN_SYSTEMS_V2` no lleva códigos económicos.

## MIC (ancho fijo)

| Slug | Qué representa |
|------|----------------|
| `MIC_OPE_DAILY` | **Operaciones** (OPE): cliente, póliza, cobertura y primas. |
| `MIC_ITC_DAILY` | **Información técnica de cobertura** (ITC): deducibles, límites y similares. |

Se generan en alta (creación) y en cancelación; no en modificaciones que no sean baja.

## PAYMENTS_DAILY (delimitado por `;`)

Movimientos de **pago** diarios. Cada línea lleva el tipo y valor del identificador del asegurado, el producto, el **signo** (`+` / `-`) y el **importe** de la orden.

## Referencias

- [Pipeline y despacho](./intro.md)
