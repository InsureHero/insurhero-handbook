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

Es la tabla de trabajo entre la generación y el despacho. Guarda el `register` ya listo por `(order_id, integration_slug)`, su `status` (`pending` → `sent` / `failed` en el despacho; tras la reconciliación de la respuesta (paso 6), `processed` o `needs_review`) y una columna `date` en **wall-clock del timezone del canal** (no UTC), que el despacho usa para las ventanas diarias.

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
- **`receive`**: baja ficheros de respuesta desde `remote_path_in` y los procesa.

Las credenciales SFTP (host, puerto, usuario, contraseña, `remote_path`, `remote_path_in`) viven **por canal** en `auth_config`.

### 5. Registro del despacho

Cada despacho se registra en **`integration_emissions`** (`provider = 'SFTP'`, `SUCCESS`/`FAILED`, `external_id` = nombre del fichero). Las filas despachadas con éxito pasan a `status = 'sent'` con su `sent_at`.

### 6. Reconciliación del fichero de respuesta (inbound)

MAPFRE devuelve un **fichero de respuesta** de cobros (`PAYMENTS_DAILY`) con una línea `OK` / `KO` por registro enviado. Una vez descargado al bucket, su reconciliación se dispara con `POST /api/shield/v1/payment-files/inbound` (body `filename`), que responde **`202`** de inmediato y trabaja en background. El trabajo pesado **no** corre en ese background: se reparte en **bloques** que procesa una cola **QStash** con reintentos.

```
POST /api/shield/v1/payment-files/inbound      ── productor (202)
   │  parse + match contra temp_carriers_orders (status = sent), una sola vez
   │  crea inbound_jobs (result.total_batches = N)
   ▼
QStash, cola carrefour-inbound-batch  (parallelism: 1, retries: 3)
   ▼
POST /api/integrations/carrefour-payments/inbound-batch   ── consumidor, un bloque por mensaje
   │  reconcilia los pares del bloque
   ▼
RPC complete_inbound_batch  ── registra el bloque y cierra el job (completed / partial)
```

**Productor.** Lee y parsea el fichero y hace el match posicional contra las filas `sent` **una sola vez**. Los grupos cuyo número de líneas no coincide con las filas enviadas se marcan `needs_review` en `temp_carriers_orders` en ese momento; las líneas huérfanas y los errores de parseo solo se registran en log. Los pares resueltos se agrupan por **`risk_item`** y se empaquetan en bloques de hasta `INBOUND_BATCH_SIZE` pares (env, **default 50**), sin partir nunca el grupo de un mismo `risk_item` (un bloque puede superar el tamaño objetivo si un grupo es grande). Crea el `inbound_job` y encola un mensaje por bloque con los pares **ya resueltos** y un `processed_at` común a todo el fichero. Si no hay pares, el job se crea ya cerrado y no se encola nada.

**Consumidor.** Autenticado por **Bearer service-role** (QStash lo reenvía con `Upstash-Forward-Authorization`). Por cada par aplica la lógica de transición de órdenes existente: `OK` → `markOrderAsPaid` (orden `confirmed`), `KO` → `markOrderAsFailed` (orden `failed`, con su cascada al `risk_item`), y pasa la fila de `temp_carriers_orders` a `processed`. Como todos los pares de un `risk_item` viajan en el mismo bloque, los que quedan cubiertos por una cancelación en cascada se saltean. Una excepción en la transición deja la fila en `needs_review` sin cortar el bloque. Luego llama a la RPC de cierre.

- Responde **`200`** si el bloque terminó, aunque haya KO de negocio o `needs_review`.
- Responde **`500`** solo ante un fallo real (p. ej. error de DB o de la RPC); QStash reintenta el bloque (hasta 3 veces).
- Es **idempotente**: `processed_at` viaja en el payload y actúa como clave de idempotencia de los `order_events`, así que un reintento sobre un bloque ya aplicado no duplica transiciones.

**Cierre del job (`complete_inbound_batch`).** RPC `SECURITY DEFINER` (solo `service_role`) que bloquea la fila del job, escribe el resultado del bloque en `result.batches[<índice>]` y **recalcula** `completed_batches` como el número de bloques registrados, de modo que una re-entrega del mismo bloque no cuenta dos veces. Cuando `completed_batches` alcanza `total_batches`, cierra el job exactamente una vez.

#### `inbound_jobs`

| `status` | Significado |
|---|---|
| `processing` | Bloques encolados, aún no han cerrado todos. Si un bloque agota sus reintentos, el job queda aquí con `completed_batches < total_batches`. |
| `completed` | Todos los bloques cerraron sin `needs_review`. Los **KO de negocio** (impagos) cuentan como reconciliación exitosa. |
| `partial` | Cerraron todos los bloques, pero hubo `needs_review` (excepciones de transición o grupos sin match del productor). Un fichero sin pares pero con grupos sin match se crea directamente en `partial`. |
| `failed` | Lo usa el flujo de reproceso del sweep (ver abajo) cuando la reconciliación lanza un error. |

El `result` JSONB guarda `total_batches`, `completed_batches`, `batches{}` (por bloque: `pairsProcessed`, `okApplied`, `koApplied`, `skippedByCascade`, `needsReview`) y `producer` (`needsReview`, `orphans`, `parseErrors`, `totalLines`). El estado de un job se consulta con `GET /api/shield/v1/payment-files/inbound?job_id=…` (scopeado por `x-channel-id`).

El endpoint aún acepta un `callback_url` opcional, pero en el modelo por bloques **no se invoca**: el cierre ocurre en la RPC.

#### Red de seguridad: sweep

El cron `GET /api/cron/carrefour-inbound-sweep` re-procesa los ficheros del bucket que no tienen un job `completed` (hasta 3 intentos por fichero; a partir de ahí los reporta como atascados). Este re-proceso **no** usa la cola: reconcilia el fichero entero en línea con la misma lógica de transición, y es idempotente porque solo toca filas en `sent`. Hoy el sweep solo considera terminal el estado `completed`, por lo que un job `partial` cuenta como un intento más.

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
- Reconciliación del fichero de respuesta: `apps/next/src/integrations/carrefour-payments/inbound/` (productor en `apps/next/src/app/api/shield/v1/payment-files/inbound/route.ts`, consumidor en `apps/next/src/app/api/integrations/carrefour-payments/inbound-batch/route.ts`, sweep en `apps/next/src/app/api/cron/carrefour-inbound-sweep/route.ts`)
- Builders por familia: `apps/next/src/integrations/carrefour-eiac/`, `carrefour-mic/`, y `carrefour-payments/ric.utils.ts`

## Referencias

- [Familias de ficheros y slugs](./familias.md)
- [Orquestador e integraciones](../../arquitectura/orquestador-integraciones.md)
