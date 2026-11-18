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
POST /api/integrations/carrefour-payments/dispatch  ── consolida, sube al bucket
   ▼
CarrefourAdapter (SFTP) → relay (Lambda)  ── send / receive
   │  resultado del envío vía QStash (send)
   ▼
POST /api/integrations/carrefour-payments/send-result
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
- Lo sube a un **bucket** y lo envía por **SFTP** (vía el relay, ver abajo).
- El nombre del fichero se resuelve con **tokens de fecha** (`{YYYY}`, `{MM}`, `{DD}`, `{MMYYYY}`) desde la plantilla configurada.

En la operación `send`, el dispatch **no** marca las órdenes ni persiste la emisión con el resultado del envío: solo invoca el relay y loguea si la invocación HTTP falla. El marcado y la persistencia los hace el callback `send-result` (paso 5) cuando llega el resultado real.

### 4. SFTP (envío y recepción)

El **`CarrefourAdapter`** (registrado bajo el slug `SFTP`) implementa dos operaciones:

- **`send`**: sube el fichero al `remote_path` del SFTP de Carrefour.
- **`receive`**: baja ficheros de respuesta desde `remote_path_in` y los procesa.

Las credenciales SFTP (host, puerto, usuario, contraseña, `remote_path`, `remote_path_in`) viven **por canal** en `auth_config`.

El transporte SFTP real lo hace un **relay** (Lambda en AWS, repo `insurehero-carrier-connect`) al que el adapter llama por HTTP a través del orquestador. En `send`, el relay **no recibe el contenido del fichero**: recibe la referencia **`bucket` + `key`** (la misma ruta donde el dispatch lo subió) y lo descarga él mismo. Junto con eso viaja un **`callbackData`** opcional que el orquestador y el adapter solo reenvían, sin procesarlo:

| Campo | Para qué |
|---|---|
| `callback_url` | `${NEXT_PUBLIC_SITE_URL}/api/integrations/carrefour-payments/send-result` |
| `channel_id`, `slug`, `dateRange` | Reconstruir las órdenes del fichero en el callback (`dateRange` es `null` en los slugs sin ventana de fecha) |
| `markAsSent` | Decisión de marcado ya resuelta por el dispatch |
| `startedAt`, `integration`, `typefile`, `fileSizeBytes`, `carrier`, `sftpHost`, `sftpUser`, `remotePath`, `externalReference` | Traza que se escribe en `integration_emissions` |

La Lambda publica en **QStash** un POST hacia `callback_url` con el resultado (`status` `SUCCESS`/`FAILED`, `filename`, `error`) más el `callbackData`, y agrega lo que produce el envío real (`connectionStartedAt`, `sendStartedAt`, `errorCode`). La autenticación viaja por `Upstash-Forward-Authorization` con el secret dedicado, nunca en el payload.

:::note
La invocación dispatch → relay sigue siendo **HTTP síncrona**. Los resultados `SUCCESS` y `FAILED` capturados por la Lambda llegan al callback; el reporte de un **timeout** de la Lambda (destino `OnFailure` de AWS) todavía no queda cubierto con este tipo de invocación.
:::

### 5. Resultado del envío y registro (`send-result`)

`POST /api/integrations/carrefour-payments/send-result` recibe el mensaje de QStash y:

1. Valida el header `authorization` contra **`QSTASH_CALLBACK_SECRET`** → `401` si no coincide.
2. **Reconstruye las órdenes** del fichero con `consolidatePendingOrders(channel_id, slug, dateRange)`, la misma función y parámetros que usó el dispatch.
3. Si `status = SUCCESS` **y** `markAsSent`, marca esas filas como `sent` (con su `sent_at`).
4. **Siempre** persiste la emisión en **`integration_emissions`** (`provider = 'SFTP'`, `SUCCESS`/`FAILED`, `external_id` = nombre del fichero), con el error y su código cuando falla. Si no hay órdenes, persiste igual con `count = 0`.

Responde **HTTP 200** en todos los casos salvo auth (`401`) y env faltante (`500`): un body inválido o un error de BD se reflejan en el body (`ok: false`) y en logs, para no disparar reintentos duplicados de QStash.

Fuera del envío por SFTP, el dispatch sí persiste directamente: cuando el canal no envía por SFTP (`send_via_sftp = false`) deja el fichero solo en el bucket y registra la emisión como `SUCCESS` sin marcar órdenes; si falla la preparación del fichero, registra la emisión abortada.

## Configuración (`auth_config`)

La fila `integrations` correspondiente guarda, por familia, un bloque con:

- **`reports[]`** — un report por slug, con su plantilla de nombre de fichero, periodicidad y parámetros propios de la familia (p. ej. la `clase` de EIAC).
- **`channels[]`** — por canal (`id_channel`): credenciales SFTP, `send_time` / `read_time` y los mapeos que cada familia necesita.

La **periodicidad** de un report (`daily` / `monthly`, con `schedule_day` y `skip_weekends`) determina la fecha de cierre que se estampa en el fichero.

## Multi-tenant y seguridad

- Todo el pipeline está **scopeado por `channel_id`** (la tabla `temp_carriers_orders` lo lleva como FK).
- El **timezone del canal** gobierna las ventanas de consolidación y las fechas de cierre.
- Los endpoints de generación y despacho solo aceptan **service-role** (Bearer). El callback `send-result` no usa el service-role: valida contra el secret dedicado **`QSTASH_CALLBACK_SECRET`**. `temp_carriers_orders` tiene RLS sin policies: solo el service-role escribe.

## Dónde está en el repo

- Generación por orden: `apps/next/src/app/api/integrations/carrefour-payments/order/route.ts`
- Consolidación y despacho: `apps/next/src/app/api/integrations/carrefour-payments/dispatch/route.ts`
- Callback de resultado del envío: `apps/next/src/app/api/integrations/carrefour-payments/send-result/route.ts`
- Adaptador SFTP: `apps/next/src/integrations/adapters/sftp/carrefour/`
- Cliente del relay: `apps/next/src/integrations/orchestrator/carrierConnectClient.ts`
- Builders por familia: `apps/next/src/integrations/carrefour-eiac/`, `carrefour-mic/`, y `carrefour-payments/ric.utils.ts`

## Referencias

- [Familias de ficheros y slugs](./familias.md)
- [Orquestador e integraciones](../../arquitectura/orquestador-integraciones.md)
