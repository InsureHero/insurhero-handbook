---
displayed_sidebar: integracionesSidebar
---

# Ficheros Carrefour (MAPFRE)

**Carrefour** es un canal cuya cartera de pólizas y recibos se entrega al carrier **MAPFRE** en forma de **ficheros planos** (XML y de ancho fijo) intercambiados por **SFTP**. A diferencia de Phoenix o AMA —que emiten por risk item a través del [orquestador](../../arquitectura/orquestador-integraciones.md)— Carrefour tiene un **pipeline propio** bajo `carrefour-payments`: los ficheros se generan a partir de las **órdenes** y se despachan de forma programada.

Esta página describe **cómo funciona el pipeline**; el catálogo de ficheros está en [Familias de ficheros](./familias.md).

## Pipeline de extremo a extremo

```
orders (INSERT)
   │  trigger AFTER INSERT
   ▼
POST /api/integrations/carrefour-payments/order   ── genera un "register" por cada slug aplicable
   ▼
temp_carriers_orders  (status = pending)
   │  cron horario por canal (carrefour_dispatch)
   ▼
POST /api/integrations/carrefour-payments/dispatch  ── consolida los pending del slug
   ▼
CarrefourAdapter (SFTP)  ── send / receive
   ▼
integration_emissions (SUCCESS/FAILED)  +  temp_carriers_orders (status = sent)
```

### 1. Generación (disparada por la orden)

Un **trigger `AFTER INSERT ON orders`** publica (vía `net.http_post`, post-commit) hacia `POST /api/integrations/carrefour-payments/order`. El handler:

- Carga el **contexto**: `auth_config` de la fila `integrations`, el `risk_item`, la `order` y el **`timezone` del canal**.
- **Resuelve qué reports aplican** al canal recorriendo `auth_config.<bloque>.channels[]` por `id_channel`.
- Por cada **slug** aplicable (p. ej. `EIAC_POLIZAS_NP`, `RIC_DAILY`, `PAYMENTS_DAILY`), tras pasar sus **puertas** (es alta / es cancelación / etc.), construye el **`register`** —la línea o el fragmento XML ya formateado— y lo persiste en **`temp_carriers_orders`** con `status = pending`.

### 2. Persistencia: `temp_carriers_orders`

Es la tabla de trabajo entre la generación y el despacho. Guarda el `register` ya listo por `(order_id, integration_slug)`, su `status` (`pending` → `sent` → `failed`) y una columna `date` en **wall-clock del timezone del canal** (no UTC), que el despacho usa para las ventanas diarias.

Un índice único `uniq_tco_order_slug` sobre `(order_id, integration_slug)` evita duplicados, **salvo** para los slugs que representan varios movimientos sobre la misma orden (`EIAC_RECIBOS_MO`, `OPEN_SYSTEMS`, `OPEN_SYSTEMS_V2`, `MIC_OPE_DAILY`), donde se permiten varias filas. Para `PAYMENTS_DAILY` la clave suma además el **signo** del `register` (4º campo), de modo que una orden admite como máximo una línea `+` (cobro) y una `-` (devolución). El `ON CONFLICT` del RPC `insert_carrier_registers_batch` usa la misma expresión que el índice: deben mantenerse alineados.

### 3. Consolidación y despacho (cron por canal)

Un **cron horario** (`carrefour_dispatch`, pg_cron, uno por canal Carrefour) lee `send_time` y `read_time` de la config del canal (en su timezone) y, cuando coincide la hora, dispara `POST /dispatch` con la operación **`send`** o **`read`**. El dispatch:

- **Consolida** las filas `pending` del slug (para los EIAC diarios, acotando por la **ventana de 24 h** según `date`).
- **Arma el fichero**: concatena los `register` para los formatos de texto; para EIAC envuelve los fragmentos en la cabecera XML.
- Lo sube a un **bucket** y lo envía por **SFTP**.
- El nombre del fichero se resuelve con **tokens de fecha** (`{YYYY}`, `{MM}`, `{DD}`, `{MMYYYY}`) desde la plantilla configurada.

### 4. SFTP (envío y recepción)

El **`CarrefourAdapter`** (registrado bajo el slug `SFTP`) implementa dos operaciones:

- **`send`**: sube el fichero al `remote_path` del SFTP de Carrefour.
- **`receive`**: baja ficheros de respuesta desde `remote_path_in` y los procesa.

Las credenciales SFTP (host, puerto, usuario, contraseña, `remote_path`, `remote_path_in`) viven **por canal** en `auth_config`.

### 5. Registro del despacho

Cada despacho se registra en **`integration_emissions`** (`provider = 'SFTP'`, `SUCCESS`/`FAILED`, `external_id` = nombre del fichero). Las filas despachadas con éxito pasan a `status = 'sent'` con su `sent_at`.

## Baja dentro del periodo de desistimiento

Además del alta, el handler de generación se re-ejecuta (con `update: true`) cuando cambia el estado de la cobertura o de la orden: el trigger `dispatch_file_registers_on_risk_item_cancellation` lo dispara al cancelar el risk item (`PATCH /api/shield/v1/risk-items/{id}/cancel`) y `dispatch_file_registers_on_order_update` al actualizar la orden. En una baja se generan las trazas normales de cancelación (OPEN_SYSTEMS `ANU`, `EIAC_RECIBOS_MO`, `EIAC_POLIZAS_AN`, `MIC_OPE_DAILY` tipo 2).

Si la baja ocurre **dentro del periodo de desistimiento**, el handler aplica además un tratamiento según el estado de la orden. El periodo se lee de `trial_period` en `packages.pricing_rules` (días, contados desde `risk_item.created_at`, límite **inclusivo**); si falta, es `0`, no es numérico o falla la lectura de `packages`, la baja solo genera las trazas normales.

| Estado de la orden al cancelar | Dentro del periodo | Fuera del periodo |
|---|---|---|
| **Cobrada** (`confirmed`) | Se agrega una línea **`PAYMENTS_DAILY` con signo `-`** (mismo importe que el cobro) para solicitar la devolución. | Solo trazas normales (`EIAC_RECIBOS_MO` como cobrado). |
| **No cobrada** (`emitted`) | Tras insertar las trazas de la baja, la orden pasa a **`cancelled`** (evento `order_cancelled`, sin cascada al risk item ni nueva notificación al carrier). | La orden sigue `emitted`. |

### Devolución confirmada (orden cobrada)

La línea `-` se envía en el fichero de pagos y su resultado vuelve en el fichero de respuesta que procesa el inbound (`receive`):

- **OK** → la orden pasa a `status = returned` y `payment_status = returned` (evento `payment_returned`, idempotente ante reprocesos) y la fila temporal queda `processed`. Ese cambio de estado re-entra en el handler, que genera **OPEN_SYSTEMS con movimiento `DBR`** y **`EIAC_RECIBOS_MO` con SituacionRecibo `DE`** (ClaseMovimiento `AN`). Las trazas de devolución se generan aquí, no en la baja.
- **KO** → la orden no se modifica y la fila queda en `needs_review` con error `refund_ko_needs_review` para gestión manual.

Las líneas `+` se reconcilian como siempre (cobro OK / KO).

### Re-entrada con orden ya cancelada

Cuando el handler re-entra con la orden en `cancelled` y el risk item cancelado (p. ej. tras la cancelación de una orden `emitted` en periodo, o tras la cancelación de orden y cobertura por segundo KO de cobro), consulta una vez `temp_carriers_orders` y **no vuelve a insertar** OPEN_SYSTEMS `ANU` ni `EIAC_RECIBOS_MO` con SituacionRecibo `AN` si ya existen para esa orden (esos slugs están exentos del índice único y, sin esta comprobación, se duplicarían).

Los logs de estas decisiones llevan el prefijo `[SCRUM-373]` con `order_id` y `risk_item_id`.

## Configuración (`auth_config`)

La fila `integrations` correspondiente guarda, por familia, un bloque con:

- **`reports[]`** — un report por slug, con su plantilla de nombre de fichero, periodicidad y parámetros propios de la familia (p. ej. la `clase` de EIAC).
- **`channels[]`** — por canal (`id_channel`): credenciales SFTP, `send_time` / `read_time` y los mapeos que cada familia necesita.

La **periodicidad** de un report (`daily` / `monthly`, con `schedule_day` y `skip_weekends`) determina la fecha de cierre que se estampa en el fichero.

## Multi-tenant y seguridad

- Todo el pipeline está **scopeado por `channel_id`** (la tabla `temp_carriers_orders` lo lleva como FK).
- El **timezone del canal** gobierna las ventanas de consolidación y las fechas de cierre.
- Los endpoints de generación y despacho solo aceptan **service-role** (Bearer). `temp_carriers_orders` tiene RLS sin policies: solo el service-role escribe.

## Dónde está en el repo

- Generación por orden: `apps/next/src/app/api/integrations/carrefour-payments/order/route.ts` (periodo de desistimiento en `rescission-window.ts`)
- Inbound de respuestas de cobro: `apps/next/src/integrations/carrefour-payments/inbound/`
- Transiciones de estado de la orden: `apps/next/src/utils/orders/state-transitions.ts`
- Consolidación y despacho: `apps/next/src/app/api/integrations/carrefour-payments/dispatch/route.ts`
- Adaptador SFTP: `apps/next/src/integrations/adapters/sftp/carrefour/`
- Builders por familia: `apps/next/src/integrations/carrefour-eiac/`, `carrefour-mic/`, y `carrefour-payments/ric.utils.ts`

## Referencias

- [Familias de ficheros y slugs](./familias.md)
- [Orquestador e integraciones](../../arquitectura/orquestador-integraciones.md)
