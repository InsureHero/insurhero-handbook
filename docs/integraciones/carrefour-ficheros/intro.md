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

Un índice único `(order_id, integration_slug)` evita duplicados, **salvo** para los slugs que representan varios movimientos sobre la misma orden (`EIAC_RECIBOS_MO`, `OPEN_SYSTEMS`, `OPEN_SYSTEMS_V2`), donde se permiten varias filas.

### 3. Consolidación y despacho (cron por canal)

Un **cron horario** (`carrefour_dispatch`, pg_cron, uno por canal Carrefour) lee `send_time` y `read_time` de la config del canal (en su timezone) y, cuando coincide la hora, dispara `POST /dispatch` con la operación **`send`** o **`read`**. El dispatch:

- **Consolida** las filas `pending` del slug (para los EIAC diarios, acotando por la **ventana de 24 h** según `date`; el resto de slugs barre todos los `pending` sin ventana). Si no hay nada, no toca el SFTP y deja una emisión de traza (`skippedEmpty`, `SKIPPED_EMPTY`).
- **Guard anti-duplicado**: antes de construir el fichero cruza los ids del lote contra los `order_ids` de las **últimas 20 emisiones entregadas** del mismo slug (`send` / `retry_send` en `SUCCESS` que transmitieron de verdad; se descartan los precierres `stagedOnly` y los vacíos `skippedEmpty`). Si hay solape, **no se envía**: se persiste una emisión `operation: blocked` con los ids repetidos y la respuesta lleva `emission_status: BLOCKED_DUPLICATE`. Los slugs marcados como `accumulative` en su report se saltan el guard (ver [Configuración](#configuración-auth_config)).
- **Arma el fichero**: concatena los `register` para los formatos de texto; para EIAC envuelve los fragmentos en la cabecera XML.
- Lo sube a un **bucket** y lo envía por **SFTP**.
- El nombre del fichero se resuelve con **tokens de fecha** (`{YYYY}`, `{MM}`, `{DD}`, `{MMYYYY}`) desde la plantilla configurada.

### 4. SFTP (envío y recepción)

El **`CarrefourAdapter`** (registrado bajo el slug `SFTP`) implementa dos operaciones:

- **`send`**: sube el fichero al `remote_path` del SFTP de Carrefour.
- **`receive`**: baja ficheros de respuesta desde `remote_path_in` y los procesa.

Las credenciales SFTP (host, puerto, usuario, contraseña, `remote_path`, `remote_path_in`) viven **por canal** en `auth_config`.

### 5. Registro del despacho

Cada despacho se registra en **`integration_emissions`** (`provider = 'SFTP'`, `SUCCESS`/`FAILED`, `external_id` = nombre del fichero). En `risk_item_data` se guardan, entre otros, la `operation`, el `filename`, los `order_ids` del lote, `file_size_bytes` y `marked_as_sent`.

Tras un envío `SUCCESS` (y si el report no está en precierre con `mark_as_sent: false`), las filas del lote pasan a `status = 'sent'` con su `sent_at`. El marcado:

- Se hace **antes** de persistir la emisión, de modo que `marked_as_sent` refleja el resultado real y no la intención.
- Va **troceado en lotes de 200 ids** (el `.in()` de PostgREST viaja en la query string y un único update con un lote grande, p. ej. 1051 ids, no llegaba a aplicarse).
- Si un lote falla a mitad, los anteriores quedan marcados y la emisión registra `marked_as_sent: false`; los que quedaron en `pending` los frena el guard anti-duplicado en el siguiente envío.

Otras operaciones que se registran sin transmitir: `blocked` (guard anti-duplicado) y `aborted` (el fichero no se pudo construir o subir al bucket; guarda el motivo y los ids del lote y se relanza el error). El drain de reintentos solo mira `send` / `retry_send`, así que las ignora.

### 6. Reintentos (`sftp-retry-drain`)

Los envíos fallidos los recoge el cron **`GET /api/cron/sftp-retry-drain`**, que agrupa por fichero las emisiones SFTP de la **hora UTC en curso** y, si no hay ningún `SUCCESS` y quedan intentos (`retry_config` de la integración `SFTP`; por defecto 3 intentos con offsets de 15 y 30 min, sin cruzar la hora base), llama a `POST /api/integrations/carrefour-payments/retry`. El retry **no reconstruye** el fichero: retransmite el que ya está en el bucket.

- **`order_ids`**: el drain toma como referencia la emisión `send` original del grupo. Si el retry llega sin `order_ids`, los resuelve **antes de escribir nada**, desde la emisión más antigua del fichero que los lleve. La emisión `retry_send` persiste esos `order_ids`.
- **Anti-doble-envío por tamaño**: antes de retransmitir compara los bytes del fichero en `remote_path` con el `file_size_bytes` de la emisión. Solo si coinciden se salta el reenvío (`skippedResend`) y se limita a marcar las órdenes como `sent`. Si no coinciden (fichero truncado), no hay tamaño registrado o la comprobación falla, **se reenvía**: el nombre es el mismo, así que sobrescribe y no puede duplicar.
- **Precierre**: si el report tiene `send_via_sftp: false` en ese momento, el retry nunca transmite ni marca nada.

> Un fichero cuyos reintentos fallan todos dentro de la misma hora UTC deja de ser visible para el drain en la hora siguiente y no se vuelve a reintentar automáticamente.

### Qué cuenta como entrega

Una emisión `SUCCESS` **solo prueba entrega si transmitió**. De las tres rutas que escriben `SUCCESS` sin mandar nada —fichero vacío (`skippedEmpty`), precierre con `send_via_sftp: false` (`stagedOnly`) y reenvío saltado porque la copia remota ya coincide (`skippedResend`)— solo la última es una entrega real. El guard anti-duplicado aplica este criterio.

## Configuración (`auth_config`)

La fila `integrations` correspondiente guarda, por familia, un bloque con:

- **`reports[]`** — un report por slug, con su plantilla de nombre de fichero, periodicidad y parámetros propios de la familia (p. ej. la `clase` de EIAC). El flag **`accumulative`** (default `false`) excluye el slug del guard anti-duplicado; está en `true` para los cinco reports RIC, cuyo registro repite `order_ids` a propósito, y se siembra **por migración** (no a mano) para que viaje con cada release.
- **`channels[]`** — por canal (`id_channel`): credenciales SFTP, `send_time` / `read_time` y los mapeos que cada familia necesita.

La **periodicidad** de un report (`daily` / `monthly`, con `schedule_day` y `skip_weekends`) determina la fecha de cierre que se estampa en el fichero.

## Multi-tenant y seguridad

- Todo el pipeline está **scopeado por `channel_id`** (la tabla `temp_carriers_orders` lo lleva como FK).
- El **timezone del canal** gobierna las ventanas de consolidación y las fechas de cierre.
- Los endpoints de generación y despacho solo aceptan **service-role** (Bearer). `temp_carriers_orders` tiene RLS sin policies: solo el service-role escribe.

## Dónde está en el repo

- Generación por orden: `apps/next/src/app/api/integrations/carrefour-payments/order/route.ts`
- Consolidación y despacho: `apps/next/src/app/api/integrations/carrefour-payments/dispatch/route.ts`
- Reintentos: `apps/next/src/app/api/cron/sftp-retry-drain/route.ts` y `apps/next/src/app/api/integrations/carrefour-payments/retry/route.ts`
- Estado de envío (marcado, resolución de `order_ids`, tamaño remoto, guard): `apps/next/src/integrations/carrefour-payments/dispatch-state.ts`
- Adaptador SFTP: `apps/next/src/integrations/adapters/sftp/carrefour/`
- Builders por familia: `apps/next/src/integrations/carrefour-eiac/`, `carrefour-mic/`, y `carrefour-payments/ric.utils.ts`

## Referencias

- [Familias de ficheros y slugs](./familias.md)
- [Orquestador e integraciones](../../arquitectura/orquestador-integraciones.md)
