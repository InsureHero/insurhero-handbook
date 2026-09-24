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

Cada despacho se registra en **`integration_emissions`** (`provider = 'SFTP'`, `external_id` = nombre del fichero). En `risk_item_data` la emisión guarda la `operation`, el `filename`, el `count`, el `file_size_bytes` y los **`order_ids`** del lote, además de `marked_as_sent` y `sent_via_sftp`.

| `operation` | Cuándo se escribe |
|-------------|-------------------|
| `send` | Envío normal. `SUCCESS`/`FAILED` según el resultado del SFTP. También se usa, con `SUCCESS`, para un lote vacío (`skippedEmpty`) o un precierre con `send_via_sftp: false` (`stagedOnly`). |
| `retry_send` | Reintento de un envío fallido (ver [Reintentos](#6-reintentos)). |
| `blocked` | El guard anti-duplicado abortó el envío (`BLOCKED_DUPLICATE`); lleva solo los ids repetidos. |
| `aborted` | El fichero no se pudo construir o subir al bucket (`PREPARE_FAILED`); se relanza el error. |

**Una emisión `SUCCESS` solo prueba entrega si además transmitió**: las de `skippedEmpty` y `stagedOnly` no cuentan como entrega en ningún punto del flujo.

**Marcado como `sent`.** Tras un envío exitoso (y si `mark_as_sent` lo permite), las filas del lote pasan a `status = 'sent'` con su `sent_at`. El update se hace **en lotes de 200 ids** y **antes** de persistir la emisión, de modo que `marked_as_sent` refleja el resultado real. Si un lote falla a mitad, los anteriores quedan marcados, la emisión registra `marked_as_sent: false` y el error indica cuántos alcanzó.

**Guard anti-duplicado.** Antes de construir el fichero, el dispatch cruza los ids del lote con los `order_ids` de las **últimas 20 emisiones entregadas** (`send`/`retry_send` en `SUCCESS` que transmitieron) del mismo slug. Si hay solape, no transmite: persiste la emisión `blocked`, deja un `console.error` con el conteo de repetidos y responde `emission_status: BLOCKED_DUPLICATE`. El guard no corre para los reports marcados como **`accumulative`** (ver [Configuración](#configuración-auth_config)).

### 6. Reintentos

Un cron (**`GET /api/cron/sftp-retry-drain`**) revisa las emisiones SFTP de la **hora UTC en curso**, las agrupa por fichero y, para los que tienen fallos y ningún `SUCCESS`, llama a **`POST /api/integrations/carrefour-payments/retry`** según los offsets y el máximo de intentos de `retry_config` (por defecto 3). Como el drain solo mira la hora en curso, un fichero cuyos reintentos fallan todos dentro de esa hora deja de reintentarse.

El retry **no reconstruye** el fichero: retransmite el que ya está en el bucket.

- Los **`order_ids`** se toman del body o, si no vienen, de la emisión `send` original (la primera emisión del fichero que los lleve). Se resuelven **antes** de escribir nada y se graban en la emisión `retry_send`.
- **Anti-doble-envío por tamaño**: si el fichero ya está en `remote_path` y sus bytes coinciden con `file_size_bytes`, se salta el reenvío (`skippedResend`) y solo se marcan las órdenes. Si los bytes no coinciden, no hay `file_size_bytes` registrado o la comprobación falla, **se reenvía** (mismo nombre, sobrescribe; no puede duplicar).
- Si el envío original era un precierre con `send_via_sftp: false`, el retry nunca transmite.

## Configuración (`auth_config`)

La fila `integrations` correspondiente guarda, por familia, un bloque con:

- **`reports[]`** — un report por slug, con su plantilla de nombre de fichero, periodicidad y parámetros propios de la familia (p. ej. la `clase` de EIAC). El flag **`accumulative`** (default `false`) excluye el slug del guard anti-duplicado; lo llevan los cinco reports **RIC**, que repiten `order_ids` a propósito porque su registro es acumulativo por póliza. El valor se siembra por migración, no a mano.
- **`channels[]`** — por canal (`id_channel`): credenciales SFTP, `send_time` / `read_time` y los mapeos que cada familia necesita.

La **periodicidad** de un report (`daily` / `monthly`, con `schedule_day` y `skip_weekends`) determina la fecha de cierre que se estampa en el fichero.

## Multi-tenant y seguridad

- Todo el pipeline está **scopeado por `channel_id`** (la tabla `temp_carriers_orders` lo lleva como FK).
- El **timezone del canal** gobierna las ventanas de consolidación y las fechas de cierre.
- Los endpoints de generación y despacho solo aceptan **service-role** (Bearer). `temp_carriers_orders` tiene RLS sin policies: solo el service-role escribe.

## Dónde está en el repo

- Generación por orden: `apps/next/src/app/api/integrations/carrefour-payments/order/route.ts`
- Consolidación y despacho: `apps/next/src/app/api/integrations/carrefour-payments/dispatch/route.ts`
- Estado de envío (marcado, resolución de `order_ids`, tamaño remoto, guard): `apps/next/src/integrations/carrefour-payments/dispatch-state.ts`
- Reintentos: `apps/next/src/app/api/cron/sftp-retry-drain/route.ts` y `apps/next/src/app/api/integrations/carrefour-payments/retry/route.ts`
- Adaptador SFTP: `apps/next/src/integrations/adapters/sftp/carrefour/`
- Builders por familia: `apps/next/src/integrations/carrefour-eiac/`, `carrefour-mic/`, y `carrefour-payments/ric.utils.ts`

## Referencias

- [Familias de ficheros y slugs](./familias.md)
- [Orquestador e integraciones](../../arquitectura/orquestador-integraciones.md)
