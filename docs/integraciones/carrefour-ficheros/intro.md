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

- **Consolida** las filas `pending` del slug (para los EIAC diarios, acotando por la **ventana de 24 h** según `date`; el resto de slugs barre todos sus `pending`, sin ventana).
- **Bloquea duplicados**: antes de construir el fichero cruza los `order_ids` del lote contra los de las **últimas 20 emisiones entregadas** (`send` / `retry_send` en `SUCCESS`) del mismo slug. Si alguno se repite, **no envía nada**, lo deja en `console.error` y devuelve `emission_status: BLOCKED_DUPLICATE`. Los reports cuyo registro es acumulativo por diseño (p. ej. `RIC_DAILY`, que resetea a `pending` al acumular operaciones sobre la misma póliza) se excluyen del guard con `accumulative: true` en su report.
- **Arma el fichero**: concatena los `register` para los formatos de texto; para EIAC envuelve los fragmentos en la cabecera XML.
- Lo sube a un **bucket** y lo envía por **SFTP**.
- El nombre del fichero se resuelve con **tokens de fecha** (`{YYYY}`, `{MM}`, `{DD}`, `{MMYYYY}`) desde la plantilla configurada.

### 4. SFTP (envío y recepción)

El **`CarrefourAdapter`** (registrado bajo el slug `SFTP`) implementa dos operaciones:

- **`send`**: sube el fichero al `remote_path` del SFTP de Carrefour.
- **`receive`**: baja ficheros de respuesta desde `remote_path_in` y los procesa.

Las credenciales SFTP (host, puerto, usuario, contraseña, `remote_path`, `remote_path_in`) viven **por canal** en `auth_config`.

### 5. Registro del despacho

Cada despacho se registra en **`integration_emissions`** (`provider = 'SFTP'`, `SUCCESS`/`FAILED`, `external_id` = nombre del fichero). En `risk_item_data` se guardan, entre otros, la `operation` (`send`, `retry_send`, …), el `filename`, el `file_size_bytes` y los **`order_ids`** de las filas incluidas; los reintentos y el guard anti-duplicados se apoyan en esos datos. Las filas despachadas con éxito pasan a `status = 'sent'` con su `sent_at`.

### 6. Reintentos de envío

Un envío fallido se reintenta con el cron **`sftp-retry-drain`** (`apps/next/src/app/api/cron/sftp-retry-drain/route.ts`), que llama a `POST /api/integrations/carrefour-payments/retry`. El retry **no reconstruye** el fichero: retransmite el que ya está en el bucket.

- **Agrupación**: el drain lee las emisiones SFTP de la **hora UTC en curso** ordenadas por `created_at`, las agrupa por fichero (y por canal para las lecturas) y toma el **`send` original** como muestra para armar el retry (slug, `order_ids`, `file_size_bytes`, …). Un grupo con algún `SUCCESS` no se reintenta.
- **Política**: `retry_config` de la integración `SFTP` (`max_attempts` y offsets en minutos por intento); por defecto 3 intentos, a los 15 y 30 minutos. Un reintento que caería fuera de la hora del envío original no se dispara.
- **Resolución de `order_ids`**: si el body no los trae, se resuelven **antes de persistir nada** desde la primera emisión del fichero que los lleve (normalmente el `send` original). La emisión `retry_send` también los graba.
- **Anti-doble-envío**: antes de retransmitir se comparan los **bytes** del fichero en `remote_path` con el `file_size_bytes` registrado:

| Caso | Qué se hace |
|---|---|
| El fichero remoto existe y sus bytes coinciden | Se salta el reenvío (`skippedResend: true`) y solo se marcan las órdenes como `sent` |
| Existe pero los bytes no coinciden (subida truncada) | Se reenvía; sobrescribe el mismo nombre, no duplica |
| No hay `file_size_bytes` registrado o el fichero no existe | Se reenvía |
| La comprobación de tamaño falla (relay caído) | Warning en logs y se reenvía |

- **Precierre**: si el report tiene `send_via_sftp` desactivado por precierre, el retry nunca transmite por SFTP; si `mark_as_sent` está desactivado, no marca las órdenes.

Tras un reenvío exitoso, las `temp_carriers_orders` del fichero pasan a `sent` sin intervención manual.

:::caution Limitación conocida
Como el drain solo mira la hora UTC en curso, un fichero cuyo envío y reintentos fallan todos dentro de esa hora **no se vuelve a reintentar** automáticamente; hoy requiere reenvío manual.
:::

## Configuración (`auth_config`)

La fila `integrations` correspondiente guarda, por familia, un bloque con:

- **`reports[]`** — un report por slug, con su plantilla de nombre de fichero, periodicidad y parámetros propios de la familia (p. ej. la `clase` de EIAC). Flags de envío por report: `pre_close_date`, `mark_as_sent` y `send_via_sftp` (por defecto activos) y `accumulative` (por defecto `false`; exime al report del guard anti-duplicados).
- **`channels[]`** — por canal (`id_channel`): credenciales SFTP, `send_time` / `read_time` y los mapeos que cada familia necesita.

La **periodicidad** de un report (`daily` / `monthly`, con `schedule_day` y `skip_weekends`) determina la fecha de cierre que se estampa en el fichero.

## Multi-tenant y seguridad

- Todo el pipeline está **scopeado por `channel_id`** (la tabla `temp_carriers_orders` lo lleva como FK).
- El **timezone del canal** gobierna las ventanas de consolidación y las fechas de cierre.
- Los endpoints de generación y despacho solo aceptan **service-role** (Bearer). `temp_carriers_orders` tiene RLS sin policies: solo el service-role escribe.

## Dónde está en el repo

- Generación por orden: `apps/next/src/app/api/integrations/carrefour-payments/order/route.ts`
- Consolidación y despacho: `apps/next/src/app/api/integrations/carrefour-payments/dispatch/route.ts`
- Reintentos: `apps/next/src/app/api/integrations/carrefour-payments/retry/route.ts` y el cron `apps/next/src/app/api/cron/sftp-retry-drain/route.ts`
- Estado del despacho (`order_ids`, tamaño remoto, guard anti-duplicados): `apps/next/src/integrations/carrefour-payments/dispatch-state.ts`
- Adaptador SFTP: `apps/next/src/integrations/adapters/sftp/carrefour/`
- Builders por familia: `apps/next/src/integrations/carrefour-eiac/`, `carrefour-mic/`, y `carrefour-payments/ric.utils.ts`

## Referencias

- [Familias de ficheros y slugs](./familias.md)
- [Orquestador e integraciones](../../arquitectura/orquestador-integraciones.md)
