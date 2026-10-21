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

Es la tabla de trabajo entre la generación y el despacho. Guarda el `register` ya listo por `(order_id, integration_slug)`, su `status` (`pending` → `sent` → `failed`; y, tras leer el fichero de respuesta, `processed` o `needs_review` — ver [Recepción y reconciliación](#6-recepción-y-reconciliación-del-fichero-de-respuesta)) y una columna `date` en **wall-clock del timezone del canal** (no UTC), que el despacho usa para las ventanas diarias.

Un índice único `(order_id, integration_slug)` evita duplicados, **salvo** para los slugs que representan varios movimientos sobre la misma orden (`EIAC_RECIBOS_MO`, `OPEN_SYSTEMS`, `OPEN_SYSTEMS_V2`), donde se permiten varias filas.

### 3. Consolidación y despacho (cron por canal)

Un **cron horario** (`carrefour_dispatch`, pg_cron, uno por canal Carrefour) lee `send_time` y `read_time` de la config del canal (en su timezone) y, cuando coincide la hora, dispara `POST /dispatch` con la operación **`send`** o **`read`**. El dispatch:

- **Consolida** las filas `pending` del slug (para los EIAC diarios, acotando por la **ventana de 24 h** según `date`).
- **Arma el fichero**: concatena los `register` para los formatos de texto; para EIAC envuelve los fragmentos en la cabecera XML.
- Lo sube a un **bucket** y lo envía por **SFTP**.
- El nombre del fichero se resuelve con **tokens de fecha** (`{YYYY}`, `{MM}`, `{DD}`, `{MMYYYY}`) desde la plantilla configurada.

### 4. SFTP (envío y recepción)

El **`CarrefourAdapter`** (registrado bajo el slug `SFTP`) implementa dos operaciones:

- **`send`**: sube el fichero al `remote_path` del SFTP de Carrefour.
- **`receive`**: baja ficheros de respuesta desde `remote_path_in`, los deja en el bucket y dispara su [reconciliación](#6-recepción-y-reconciliación-del-fichero-de-respuesta).

Las credenciales SFTP (host, puerto, usuario, contraseña, `remote_path`, `remote_path_in`) viven **por canal** en `auth_config`.

### 5. Registro del despacho

Cada despacho se registra en **`integration_emissions`** (`provider = 'SFTP'`, `SUCCESS`/`FAILED`, `external_id` = nombre del fichero). Las filas despachadas con éxito pasan a `status = 'sent'` con su `sent_at`.

### 6. Recepción y reconciliación del fichero de respuesta

Carrefour devuelve un **fichero de respuesta de cobro** (`Respuesta_Cobro_Mawdy_*.txt`) con una línea por registro enviado y su resultado **OK** / **KO**. Reconciliarlo confirma o marca como fallidas las órdenes correspondientes. Para no depender de un proceso en background que Vercel puede congelar a mitad, el trabajo se reparte en **bloques** que procesa una **cola QStash** con reintentos.

```
CarrefourAdapter.receive / POST /api/shield/v1/payment-files/inbound / cron sweep
   │  prepareAndEnqueueInboundFile   (parsea + matchea UNA vez, crea el inbound_job)
   ▼
QStash  cola "carrefour-inbound-batch"  (parallelism 1, 3 reintentos por mensaje)
   │  un mensaje por bloque, con los pares ya resueltos
   ▼
POST /api/integrations/carrefour-payments/inbound-batch   ── reconcilia el bloque
   │  RPC finalize_inbound_batch  (cierre atómico del job)
   ▼
inbound_jobs  (processing → completed | partial | failed)
```

#### Entradas

Las tres entradas usan la misma función, `prepareAndEnqueueInboundFile`, y por tanto el mismo flujo por bloques:

| Entrada | Cómo llega |
|---|---|
| **Lectura SFTP** (cron `carrefour-inbound` y dispatch `read`) | El `CarrefourAdapter` baja el fichero y lo encola. |
| **`POST /api/shield/v1/payment-files/inbound`** | Endpoint Shield (JWT de canal) con `filename` y `callback_url` opcional. Responde **`202`** (`status: "accepted"`) y prepara el fichero con `fireAndForget`. |
| **Cron `carrefour-inbound-sweep`** | Red de seguridad: re-dispara los ficheros del bucket que no tienen un job cerrado (ver [Reproceso](#reproceso-y-sweep)). |

#### Productor: parseo, match y particionado

`prepareAndEnqueueInboundFile`:

1. **Parsea** el fichero (`parseInboundContent`) y lo **matchea** con las filas de `temp_carriers_orders` en `sent` por `register` (`matchPositionalByRegister`). Cada línea con su fila es un **par**. Las líneas sin fila son *orphans*; los grupos cuyo número de líneas no coincide con el de filas (*unmatched groups*) se marcan `needs_review` aquí mismo, antes de encolar.
2. Fija un **`processedAt`** (fecha de creación del fichero en el bucket) que viaja en todos los bloques: es la clave de idempotencia de las transiciones de orden.
3. **Particiona** los pares en bloques (`partitionPairsByRiskItem`) de hasta **`INBOUND_BATCH_SIZE`** pares (env, por defecto **50**). Todos los pares de un mismo `risk_item` caen en el **mismo** bloque —un grupo nunca se parte, aunque el bloque supere el tamaño—, para que la cascada de cancelación por impago funcione igual que dentro de un único loop.
4. Crea el **`inbound_job`** en `processing` con `total_batches = N` y persiste el `callback_url` si llegó. Si no hay bloques, el job se cierra directamente (`completed`, o `partial` si hubo *unmatched groups*) sin encolar nada.
5. **Encola N mensajes** en QStash, con los pares ya resueltos en el payload (el consumidor no vuelve a leer el fichero).

#### Consumidor: `inbound-batch`

`POST /api/integrations/carrefour-payments/inbound-batch` (invocado por QStash, auth **Bearer service-role** reenviado con `Upstash-Forward-Authorization`):

- Valida el payload (`job_id`, `filename`, `processed_at`, `batch_index`, `pairs`) con zod.
- Ejecuta **`reconcilePairs`** sobre el bloque, que reutiliza las transiciones de orden existentes: **OK → `markOrderAsPaid`** (orden `confirmed`), **KO → `markOrderAsFailed`** (orden `failed`, con `order_events`, `payment_attempts` y la cascada a `risk_item` en el segundo impago). La fila temporal pasa a `processed`; si la transición lanza una excepción, queda en `needs_review` y el bloque sigue.
- Llama a la RPC **`finalize_inbound_batch`** para registrar el bloque y, si es el último, cerrar el job.

| Respuesta | Cuándo | Efecto en QStash |
|---|---|---|
| `200` | El bloque terminó, aunque haya KO de negocio o `needs_review`. | No reintenta. |
| `489` + `Upstash-NonRetryable-Error: true` | Payload inválido o `batch_index` fuera de rango (`inbound_batch_index_out_of_range`). | No reintenta. |
| `500` | Fallo real de infraestructura / DB. | Reintenta (hasta 3). |

Un **KO de negocio no es un error**: la orden queda `failed` y el bloque responde `200`.

#### Cierre del job: `finalize_inbound_batch`

RPC `SECURITY DEFINER`, ejecutable solo por `service_role`. De forma atómica:

- Escribe el resultado del bloque en `result.batches[<batch_index>]` y **recalcula** `completed_batches` como el número de claves de `batches` (no suma a ciegas): una re-entrega del mismo bloque no cuenta dos veces.
- Cuando `completed_batches = total_batches`, pasa el job de `processing` a **`completed`**, o a **`partial`** si algún bloque —o el propio productor— dejó `needsReview > 0`. Solo una llamada consigue esa transición (`did_transition`); las re-entregas sobre un job ya terminal no lo vuelven a transicionar.
- Devuelve `status`, `result`, `did_transition` y `callback_url`. Si esta llamada cerró el job y hay `callback_url`, el consumidor hace un **único** `POST` JSON `{ job_id, filename, status, result, error }` (`postInboundCallback`).

#### `inbound_jobs`

| Estado | Significado |
|---|---|
| `processing` | Bloques en vuelo. |
| `completed` | Todos los bloques cerraron sin `needs_review`. |
| `partial` | Todos los bloques cerraron, pero hay líneas en `needs_review`. Es terminal. |
| `failed` | Falló la preparación del fichero, o un bloque agotó los reintentos. |

El `result` (JSONB) guarda:

- `total_batches`, `completed_batches`.
- `batches{}` — contadores por bloque (`pairsProcessed`, `okApplied`, `koApplied`, `skippedByCascade`, `needsReview`).
- `batch_ids{}` — por índice de bloque, los ids de `temp_carriers_orders` que lo forman (permite rearmar un bloque caído sin volver a particionar).
- `producer{}` — contadores del productor: `needsReview`, `orphans`, `parseErrors`, `totalLines`.
- Claves agregadas en el nivel superior, calculadas por la RPC: `totalLines`, `parseErrors`, `orphans`, `pairsProcessed`, `okApplied`, `koApplied`, `skippedByCascade`, `needsReview`.

#### Bloques que agotan los reintentos

Cada mensaje se encola con `Upstash-Failure-Callback` apuntando a **`POST /api/integrations/carrefour-payments/inbound-failure`** (misma auth service-role). Ese endpoint saca el `job_id` del payload original y marca el job **`failed`** solo si sigue en `processing` (no toca `result` ni pisa un estado terminal). Responde `200` de forma idempotente (job ya terminal, inexistente o payload indecodificable) y `500` solo ante un error real de DB.

#### Reproceso y sweep

`prepareAndEnqueueInboundFile` busca primero el job más reciente del `filename`:

- `completed` / `processing` → no hace nada.
- `failed` / `partial` → **reusa** ese job (no crea otro) e incrementa `attempts`:
  - sin bloques (`total_batches = 0`) → repite el flujo completo sobre el mismo job;
  - con bloques → reencola **solo los bloques caídos** (ausentes en `batches` o con `needsReview > 0`), rearmados con `batch_ids` y un match que incluye filas `sent` y `needs_review`.

El cron **`carrefour-inbound-sweep`** recorre el bucket de recibidos y dispara (fire-and-forget) el reproceso de los ficheros sin job o con job `partial` / `failed`, hasta 10 por ejecución. Los que alcanzan **3 intentos** se reportan como *stuck* en el log y no se reintentan.

La reconciliación es **idempotente**: el match solo toma filas pendientes, y las transiciones de orden no se duplican gracias al único `(order_id, event_type, processed_at)` de `order_events`.

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

- Generación por orden: `apps/next/src/app/api/integrations/carrefour-payments/order/route.ts`
- Consolidación y despacho: `apps/next/src/app/api/integrations/carrefour-payments/dispatch/route.ts`
- Adaptador SFTP: `apps/next/src/integrations/adapters/sftp/carrefour/`
- Reconciliación del fichero de respuesta: `apps/next/src/integrations/carrefour-payments/inbound/index.ts`, consumidor `apps/next/src/app/api/integrations/carrefour-payments/inbound-batch/route.ts`, failure-callback `.../inbound-failure/route.ts`, crons `apps/next/src/app/api/cron/carrefour-inbound{,-sweep}/route.ts`
- Builders por familia: `apps/next/src/integrations/carrefour-eiac/`, `carrefour-mic/`, y `carrefour-payments/ric.utils.ts`

## Referencias

- [Familias de ficheros y slugs](./familias.md)
- [Orquestador e integraciones](../../arquitectura/orquestador-integraciones.md)
