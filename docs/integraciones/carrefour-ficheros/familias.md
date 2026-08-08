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

El código de modalidad (`ModalidadRamo`, dentro de `DatosRamo`) depende del **paquete**, no de la póliza: varios productos Carrefour comparten el mismo `policy_uid`, así que la config indexada por póliza no puede distinguirlos. Se resuelve —tanto en pólizas como en recibos— contra `auth_config.EIAC.channels[].packages[]`, buscando por **nombre de paquete** con match exacto; `DescripcionModalidad` sigue llevando ese mismo nombre. Un paquete sin entrada en esa lista no rompe la generación: ese registro sale con `ModalidadRamo` vacío y un `console.warn` señalándolo.

## RIC (ancho fijo, estándar MAPFRE)

Registro de información de clientes, pólizas, intervinientes y contactos.

| Slug | Qué representa |
|------|----------------|
| `RIC_DAILY` | Fichero **diario** multi-tabla: cliente, póliza, interviniente y contacto en un mismo envío (en cancelación, solo póliza e interviniente). |
| `RIC_MONTHLY_CLIENTES` | Consolidado **mensual** de clientes. |
| `RIC_MONTHLY_POLIZAS` | Consolidado mensual de pólizas. |
| `RIC_MONTHLY_INTERVINIENTES` | Consolidado mensual de intervinientes. |
| `RIC_MONTHLY_CONTACTOS` | Consolidado mensual de contactos. |

Cada registro indica su **operación**: alta (`01`), modificación (`02`) o baja (`03`), derivada del estado de la orden.

En **cancelación**, `RIC_DAILY` emite solo **dos** líneas —póliza e interviniente—: el cliente y los medios de contacto **no** se dan de baja. En alta y modificación emite las de siempre: cliente, póliza, interviniente y una línea de contacto por canal presente (1 a 3). Los consolidados mensuales no llevan esta puerta: cada uno sigue emitiendo su registro de entidad única con el código de operación que corresponda.

La fecha de anulación de póliza (`FEC_ANUL_POL`) solo se informa cuando la operación es **baja**; en alta y modificación viaja en blanco, sea cual sea la fecha de fin de vigencia del risk item (que por defecto es un valor centinela lejano, no una fecha real).

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

## Referencias

- [Pipeline y despacho](./intro.md)
