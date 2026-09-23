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

Cada despacho se registra en **`integration_emissions`** (`provider = 'SFTP'`, `SUCCESS`/`FAILED`, `external_id` = nombre del fichero). Las filas despachadas con éxito pasan a `status = 'sent'` con su `sent_at`.

## Configuración (`auth_config`)

La fila `integrations` correspondiente guarda, por familia, un bloque con:

- **`reports[]`** — un report por slug, con su plantilla de nombre de fichero, periodicidad, la **entidad** dueña del fichero (`carrier`) y parámetros propios de la familia (p. ej. la `clase` de EIAC).
- **`channels[]`** — por canal (`id_channel`): credenciales SFTP, `send_time` / `read_time` y los mapeos que cada familia necesita.

La **periodicidad** de un report (`daily` / `monthly`, con `schedule_day` y `skip_weekends`) determina la fecha de cierre que se estampa en el fichero.

### Entidad del report (`carrier`)

El campo `carrier` de cada report identifica la **entidad dueña del fichero**, que puede ser una aseguradora o no serlo. Hoy los reports de la integración `SFTP` declaran `Mapfre España` (EIAC, RIC, MIC, `OPEN_SYSTEMS`, `OPEN_SYSTEMS_V2`) y `Carrefour` (`PAYMENTS_DAILY`). El valor se escribe y se muestra tal cual, con esa grafía.

Lo usan dos caminos:

- **Dispatch** — persiste la entidad del report en `risk_item_data.carrier` de la emisión.
- **Pantalla Batch Jobs** (router tRPC `batchJobs`) — el `auth_config` es la **fuente del filtro de entidad**, no el histórico de emisiones:
  - **Selector** (`batchJobs.carriers`): lista los `carrier` distintos de los bloques cuyo `channels[].id_channel` incluye el canal en sesión, ordenados alfabéticamente sin distinguir mayúsculas. Se deduplica por `trim().toLowerCase()` y se muestra la primera grafía leída. No depende del rango de fechas ni de los demás filtros; la opción por defecto es **"Todas las entidades"**.
  - **Filtro**: el router resuelve la entidad elegida a los **slugs** de sus reports (mismo scope por canal) y se los pasa al RPC `batch_job_groups` como `p_slugs`. Sin entidad no se manda y no hay filtro; si la entidad no resuelve ningún slug viaja `p_slugs: []` y la tabla sale vacía. El filtro se aplica **después de agrupar**, sobre el slug del grupo (el primer slug no nulo de la serie), así que no altera los contadores de intentos.
  - **Valor mostrado**: la entidad de cada fila y del detalle de cada intento se resuelve **por slug contra el `auth_config`**; el `risk_item_data.carrier` del histórico queda solo como fallback cuando el slug no resuelve.

Un report sin `carrier` no aporta opción al selector: sus ficheros solo se ven con "Todas las entidades". Si la integración `SFTP` no existe, su `auth_config` está vacío o falla la lectura, el selector queda vacío y la pantalla sigue usable.

## Multi-tenant y seguridad

- Todo el pipeline está **scopeado por `channel_id`** (la tabla `temp_carriers_orders` lo lleva como FK).
- El **timezone del canal** gobierna las ventanas de consolidación y las fechas de cierre.
- Los endpoints de generación y despacho solo aceptan **service-role** (Bearer). `temp_carriers_orders` tiene RLS sin policies: solo el service-role escribe.

## Dónde está en el repo

- Generación por orden: `apps/next/src/app/api/integrations/carrefour-payments/order/route.ts`
- Consolidación y despacho: `apps/next/src/app/api/integrations/carrefour-payments/dispatch/route.ts`
- Adaptador SFTP: `apps/next/src/integrations/adapters/sftp/carrefour/`
- Builders por familia: `apps/next/src/integrations/carrefour-eiac/`, `carrefour-mic/`, y `carrefour-payments/ric.utils.ts`

## Referencias

- [Familias de ficheros y slugs](./familias.md)
- [Orquestador e integraciones](../../arquitectura/orquestador-integraciones.md)
