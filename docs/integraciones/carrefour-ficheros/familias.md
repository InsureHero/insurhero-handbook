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

## RIC (ancho fijo, estándar MAPFRE)

Registro de información de clientes, pólizas, intervinientes y contactos.

| Slug | Qué representa |
|------|----------------|
| `RIC_DAILY` | Fichero **diario** multi-tabla: cliente, póliza, interviniente y contacto en un mismo envío. |
| `RIC_MONTHLY_CLIENTES` | Consolidado **mensual** de clientes. |
| `RIC_MONTHLY_POLIZAS` | Consolidado mensual de pólizas. |
| `RIC_MONTHLY_INTERVINIENTES` | Consolidado mensual de intervinientes. |
| `RIC_MONTHLY_CONTACTOS` | Consolidado mensual de contactos. |

Cada registro indica su **operación**: alta (`01`), modificación (`02`) o baja (`03`), derivada del estado de la orden. En una modificación o baja las líneas se **appendean** a la fila ya existente de la orden, salvo que esa fila haya quedado `cancelled` por la cancelación del risk item (ver [pipeline](./intro.md)): en ese caso no se toca, porque el alta tampoco viajó.

## OPEN_SYSTEMS / OPEN_SYSTEMS_V2 (SSAA — sistemas abiertos)

Fichero **mensual** de movimientos de póliza/recibo para el sistema de "sistemas abiertos" de MAPFRE. Nombre por defecto `BUZON_MENSUAL_{MMYYYY}_CARREFOUR`.

| Slug | Qué representa |
|------|----------------|
| `OPEN_SYSTEMS` | Layout base de movimientos mensuales. |
| `OPEN_SYSTEMS_V2` | Layout revisado (tipo de registro emisión/renovación y fechas de creación / anulación / cobro). Admite varias filas por orden. |

La fecha de cierre se resuelve según la periodicidad del report (`monthly` + `schedule_day` + `skip_weekends`).

## MIC (ancho fijo)

| Slug | Qué representa |
|------|----------------|
| `MIC_OPE_DAILY` | **Operaciones** (OPE): cliente, póliza, cobertura y primas. |
| `MIC_ITC_DAILY` | **Información técnica de cobertura** (ITC): deducibles, límites y similares. |

Se generan en alta (creación) y en cancelación; no en modificaciones que no sean baja.

## PAYMENTS_DAILY (delimitado por `;`)

Movimientos de **pago** diarios. Cada línea lleva el tipo y valor del identificador del asegurado, el producto, el **signo** (`+` / `-`) y el **importe** de la orden.

No tiene puerta propia de generación: el register se crea en la emisión y se consolida **sin ventana de fechas** (a diferencia de los EIAC diarios). Si el risk item se cancela antes de que la fila se despache, esa fila se marca `cancelled` y no llega al fichero de cobros — ver [pipeline](./intro.md).

## Referencias

- [Pipeline y despacho](./intro.md)
