# Workflows, automatización y skills

En InsureHero conviven varias piezas que suelen llamarse “workflow” en conversaciones de producto. Esta página **ordena conceptos** y enlaza el detalle técnico: qué es un **workflow de reclamo**, qué es el **builder de flujos v4** (automatización *trigger-first*), qué hacen las rutas **`/api/workflows`** y los **webhooks de cliente**, y en qué se parecen o no eso y los **skills** de administración (notificaciones, reportes).

## Tres piezas distintas (y por qué importa)

| Idea | Qué es en la práctica | Ejemplo |
|------|------------------------|---------|
| **Workflow de negocio** | Secuencia de **estados y transiciones** sobre un recurso (sobre todo **reclamos**): quién puede mover de “en análisis” a “documentación pendiente”, qué queda auditado. | Rutas Shield `.../claims/[id]/workflow`, eventos del reclamo, UI del dashboard. |
| **Builder de flujos (v4)** | Motor de **automatización *trigger-first***: un flow = **un disparador (evento del core o cron) + un DAG de nodos** que el usuario arma sin código (“cuando pase X, hacé Y”). Reacciona a hechos ya ocurridos; no reemplaza la máquina de estados del reclamo. | Sección **“Flows”** del dashboard; tablas `flows` / `flow_triggers` / `event_outbox`; motor en `src/workflows/engine/v4`. |
| **Skills de administración** | **Etiquetas de capacidad** asignadas a **admins** y **canales** en base de datos: definen *qué tipo de informes o responsabilidades* tiene una persona (p. ej. recibir el correo diario de errores de emisión). | Tabla `skills`, asignación en `admins.skills` / `admins_by_channels.skills`, Edge Function `daily-emission-dispatcher`. |

Los **skills no sustituyen** el motor de estados de un reclamo. En cambio, **sí forman parte del “workflow operativo”** del equipo: gobiernan **quién entra en qué circuito de notificación** cuando algo falla o hay que informar periódicamente.

Para el skill documentado al detalle (reporte de emisiones): [Notificaciones, skills y Supabase Edge](./notificaciones-skills-supabase.md).

## Workflows de reclamos (dominio principal)

- Los **reclamos** llevan un ciclo de vida con estados y acciones permitidas según rol y reglas del canal.
- La **API Shield** expone recursos bajo patrones como `.../claims`, `.../claims/[claimId]` y **`.../claims/[id]/workflow`** en varios namespaces (`v1`, `v2`, `ia/v1`, `integrations/v2`, etc.). Sirve para que integraciones y el propio dashboard avancen el expediente de forma controlada.
- Complemento típico: **eventos** (`.../claims/[id]/events`) y **adjuntos** (`.../assets`) para dejar constancia de qué ocurrió.

Inventario orientado a desarrollo: [Shield: inventario de rutas](../api-reference/shield/inventario-de-rutas.md) (sección Reclamos).

## Rutas Next: `/api/workflows` y webhooks

Según el mapa de [Superficies REST](../api-reference/rest-superficies.md):

- **`/api/workflows`** — Evaluación de workflows y lógica relacionada con **pasos automatizados** (incluida, donde aplique, la orquestación hacia **webhooks de comunicación**).
- **`/api/executeClientWebhooks`** — Entrega hacia los **webhooks configurados por el cliente** cuando un flujo lo dispara (`executeClientWebhooks` en código).
- **`/api/mails/v1`** — Envíos de correo ligados a reclamos u otros eventos del flujo.

El código bajo `apps/next/src/app/api/workflows/**` y rutas vecinas es la referencia definitiva para nombres de handlers y payloads.

## Workflows v4: builder de flujos (trigger-first)

Además del workflow de negocio del reclamo, el dashboard incorpora un **builder de flujos** (sección **“Flows”**): un motor de automatización configurable y sin código con el que un canal arma sus integraciones y reacciones a eventos. Reemplaza el modelo previo de “tronco fijo” por un modelo **trigger-first** al estilo n8n / Zapier.

### Modelo

- **Un flow = un Trigger (raíz) + un DAG de nodos.** No hay pasos fijos: el flujo arranca en el nodo `trigger` y avanza por las aristas que arma el usuario.
- **El core emite, el flow reacciona.** Shield crea/actualiza risk items, órdenes y reclamos de forma transaccional y **emite un evento**; el flow es una **reacción best-effort** a ese hecho ya consumado. Un fallo del flow nunca revierte el core (no hay saga de compensación).
- **Disparadores:** eventos de dominio (`risk_item.created`, `risk_item.status_changed`, `order.created`, `order.status_changed`), **`dataset.updated`** (otro flujo actualizó un dataset compartido; ver más abajo) o **cron** (`schedule`). El *filtro* del trigger decide si el flow corre (gate); el nodo `condition` bifurca dentro del flujo.

### Bus de eventos (transactional outbox)

Cada operación del core escribe el evento en `event_outbox` **en la misma transacción** que la op, de modo que no se pierde un evento si el proceso muere entre el commit y la emisión. Un worker (**drain**) drena el outbox, resuelve los `flow_triggers` que matchean `(canal, evento)` y **encola un run por flow** (vía QStash). Es best-effort e idempotente: varios drains en paralelo no reprocesan (claim con `SKIP LOCKED` y visibility timeout).

El reclamo lo hace el RPC `claim_event_outbox(p_limit, p_max_attempts)`, ejecutable **solo por `service_role`**:

- **Cuenta el intento al reclamar**, no al fallar. Así un evento cuyo run muere por timeout de la función no se reintenta sin fin: al agotar el máximo (**5 intentos**) pasa a `failed`. Las filas `failed` llevan `processed_at`, de modo que la retención del outbox también las poda.
- **Deadline del drain**: el drain corre dentro del límite de la función serverless; al acercarse al corte deja de iniciar runs nuevos y **libera** los eventos reclamados que no llegó a procesar.
- **Sin solapamiento de cron**: solo puede haber **un run de cron en curso por flow** (índice único parcial). Si ya hay otro, el evento se reprograma sin gastar intento. Los runs disparados por evento no se bloquean entre sí (dos entidades distintas pueden correr el mismo flow a la vez). Además, `cron-trigger` no encola un `schedule` si ya hay uno `pending`/`processing` para ese flow.

El drain se dispara de forma **reactiva**: un trigger sobre `event_outbox` publica un *poke* (vía `pg_net` → QStash, con deduplicación por ventana de ~10 s para colapsar ráfagas en una sola llamada) que ejecuta el drain en segundos, sin esperar a un cron. Un **Vercel Cron cada 5 min** queda como red de seguridad. Los secretos del poke viven en Supabase Vault; si faltan, el poke es no-op best-effort y no afecta la operación del core (el cron drena igual).

### Nodos

| Grupo | Nodos |
|-------|-------|
| Control | `trigger`, `condition`, `foreach`, `run_flow`, `log` |
| Datos | `source`, `lookup`, `map`, `collect`, `save_state`, `dataset_write`, `dataset_read`, `file_builder` |
| Salida | `http`, `webhook`, `email`, `sftp`, `create_risk_item` |

> Referencia: registro de nodos en `src/workflows/nodes/**` y ejecutores en `src/workflows/engine/executors.ts`.

El nodo `source` carga registros de nuestro propio modelo (risk items, órdenes, reclamos) por un vocabulario de filtros **acotado y siempre scopeado al canal** (sin SQL libre) — es lo que puebla el contexto cuando el trigger es cron. Recorre la tabla **por tramos** (por `created_at` + `id`, o por `id`) de hasta 1000 filas, hasta un máximo de 10000, y marca `truncated` si quedaron más; `fields` limita las columnas. Un valor de filtro puede ser una plantilla: si queda vacío, ese filtro no se aplica (útil en la primera corrida de un flujo incremental). Un `source` que devuelve N registros se procesa con `foreach`.

#### `foreach` y `collect`

- El `foreach` deja bajo su id un **resumen**: `count`, `total`, `succeeded`, `failed`, `errors` (`index`, `item`, `node`, `error`) y `truncated`, que los nodos posteriores leen como `{{<foreach>.succeeded}}`, etc.
- **`on_item_error`**: `continue` (por defecto; el item fallido queda en `errors` y sigue con los demás) o `stop` (corta en el primer item que falla).
- **Tope**: el `foreach` procesa como máximo 100 items (`FOREACH_HARD_CAP`). Si la lista supera el `max` configurado, el run queda `partial` y el paso lo indica (`truncated: processed N of M items`). El patrón para volúmenes mayores es incremental: cada run procesa hasta el tope y el siguiente sigue desde el estado guardado (`save_state`).
- **Clave de item** (`key`, plantilla opcional): los nodos `http`, `webhook` y `email` del cuerpo que no tienen `idempotency_key` propia usan la del item (en foreach anidados se compone, p. ej. `O1/A`). Así, reintentar un run no reenvía lo que ya salió bien.
- **`collect`** arma una fila (con el mismo editor de campos que `map`) y la agrega a `lists.<nombre>`, compartida por todo el run, incluidos foreach anidados. Después del loop la lista se usa entera, por ejemplo como `rows` de un `file_builder`.

#### HTTP paginado y reintentos

El nodo `http` admite **`pagination`** con estrategias `page`, `offset`, `cursor` y `next_url` (en el cuerpo o en la cabecera `Link`). Con paginación, la salida es `{ status, items, count, pages, truncated, truncated_reason }`; `{{page.number}}`, `{{page.offset}}` y `{{page.cursor}}` sirven para APIs que piden la página en el cuerpo (p. ej. GraphQL).

Protecciones: corta con página vacía, incompleta o `has_more` falso; tope de páginas (10 por defecto, 100 máx.) y de elementos (1000 por defecto, 10000 máx.); una página o cursor repetido corta (`repeated`); la URL siguiente **debe ser del mismo origen** (anti SSRF), si no el paso falla; pausa configurable entre páginas (máx. 5 s); deja de pedir cuando no queda tiempo antes del corte de la función (`time`).

Ante **429/503** el nodo reintenta respetando `Retry-After` (espera máx. 10 s), 2 reintentos por defecto y 5 como máximo. Otros errores no se reintentan.

#### Estado incremental (`workflow_state`)

Cada flow tiene un almacén clave/valor (`workflow_state`, RLS por canal; solo el motor escribe). El run lo carga al empezar y lo expone como **`{{state.<clave>}}`** en cualquier campo (p. ej. `?since={{state.last_date}}`). El nodo **`save_state`** guarda valores al pasar; dentro de un `foreach` guarda item por item, de modo que un run cortado conserva el avance. Con `on_item_error: stop` el estado no avanza más allá de un item fallido; con `continue` lo saltea.

#### Datasets compartidos (`flow_datasets`)

Permiten que un flow deje datos para que otros los consulten, sin tablas a medida:

- **`flow_datasets`**: filas por (canal, dataset, clave) con `data` jsonb, vencimiento obligatorio (30 días por defecto, de 1 a 365), y el flow y run que las escribieron. Tope de 50000 filas por dataset. RLS por canal; solo el motor escribe; el drain borra las vencidas.
- **`dataset_write`** (Guardar en dataset): clave con plantilla (la misma clave reemplaza la fila); el dato sale de una tabla de campos o de una ruta tal cual. El nombre del dataset puede venir de los datos (`{{trigger.dataset}}`).
- **`dataset_read`** (Leer dataset): una fila por clave (`found`, `data`) o las filas actualizadas después de una fecha, de la más vieja a la más nueva, con límite (1000 por defecto, 5000 máx.) y `truncated`.
- **Disparador `dataset.updated`**: un run que guardó filas emite **un evento por dataset** (no uno por fila); el flow receptor puede filtrar por `trigger.dataset`. Un flow nunca se dispara con lo que él mismo escribió, y la cadena se corta a los **3 niveles** para que dos flows que se alimentan mutuamente no corran para siempre.

### Conexiones y recursos por canal

Los nodos que hablan con el exterior no llevan secretos en la definición del flow; referencian **recursos** que viven fuera:

- **Connections propias del canal** (`channel_connections`): http/webhook/sftp del canal. El secreto se guarda **cifrado at-rest** (AES-256-GCM) y **nunca** se devuelve al cliente; en el picker aparecen como *“Your connections”*.
- **Adapters globales de InsureHero** (registro `integrations`: Phoenix, AMA/MAPFRE, MAWDY, SFTP), habilitados por canal mediante una **allow-list explícita** (`channel_integrations`). El motor **rechaza** ejecutar un adapter no habilitado para el canal del flow —aunque el slug esté forzado a mano en la definición— y marca el run como fallido (defensa en profundidad).
- **Templates de email** channel-scoped: el nodo email resuelve el `template_id` **en vivo** desde `email_templates` en cada ejecución (editar el template se refleja sin re-guardar el flow).

### Versionado: draft / published

Editar un flow activo es seguro por construcción: el builder edita siempre un **draft** y el runner ejecuta siempre la **versión publicada**. Ambos ejes son ortogonales.

- **Save** escribe solo el draft; el runner sigue con la versión viva.
- **Publish** valida el DAG (exactamente un trigger, nodos alcanzables desde él, sin ciclos) y, si pasa, crea una fila en `flow_versions` (historial append-only, `version_number` incremental) y activa esa definición.
- **Activate / Deactivate** arma o desarma el trigger; es **ortogonal** a publish (un flow puede estar activo con *cambios sin publicar*). Activar exige tener una versión publicada. Al activar un flow de evento con **eventos pendientes** en el outbox, la UI avisa del número que se procesará (para no reprocesar historia). En **desarrollo** existe además una acción *Clear backlog & activate* que **descarta** esos pendientes antes de activar; está **bloqueada en producción** (es una ayuda de dev, no una operación de negocio).
- **Rollback**: carga una versión anterior al draft para revisarla y publicarla como versión nueva (historial lineal).
- **Review changes / Compare**: diff estructural (nodos y conexiones agregados / quitados / cambiados) antes de publicar o restaurar.

Cada `flow_run` registra la `flow_version` que ejecutó, para poder reconstruir qué definición corrió en cada momento (runs previos al versionado quedan sin versión).

### Ejecución y observabilidad

El runner **camina el DAG** desde el trigger: `condition` elige la arista de salida y `foreach` recorre listas. Cada run deja un **trace** (`flow_runs`); los runs `failed` / `partial` se ven en **Failed Messages** (DLQ) con enlace al trace y acción de reintento.

- El `flow_run` se crea en estado `running` **antes** de ejecutar y se actualiza al terminar, así todo run iniciado queda registrado aunque la función muera. Los runs `running` vencidos pasan a `failed` con código `run_timeout`.
- El trace se guarda **resumido**: arrays recortados a 20 items y textos a 2000 caracteres, conservando la forma; cada recorte queda anotado en `truncated`.
- Retención de `flow_runs`: **30 días**.
- El **test run** del editor lee el estado (`workflow_state`) y los datasets reales, pero no los escribe ni emite eventos `dataset.updated`.

#### Alertas por fallos repetidos

Cada flow puede configurar alertas en la sección **“Alertas si falla”** del inspector del disparador (tabla `workflow_alert_settings`, RLS por canal, editable por el admin): activar, cuántos runs seguidos deben fallar antes de avisar (3 por defecto, de 1 a 50), si cuentan los `partial`, emails, webhook (solo `https` desde el editor) e idioma del aviso.

- Cuando los últimos N runs terminados fallaron, se abre un **incidente** (`workflow_incidents`, solo escribe el motor; un índice único parcial garantiza un solo incidente abierto por flow). Mientras siga fallando solo se actualiza (fallos, paso, error, último run); el primer run que sale bien lo **resuelve**. El editor muestra el incidente abierto.
- Se envía **un aviso al abrir y otro al resolver**, por email y/o webhook. El webhook lleva `event` (`flow.incident.opened` / `flow.incident.resolved`), flow, fallos, paso, error, enlace y el texto en `content` y `text` (Discord y Slack lo muestran sin adaptar). Los errores conocidos del motor se traducen por código al idioma elegido.
- La evaluación corre **después de cerrar el run** y nunca rompe el drain: cualquier error se registra y se ignora. Un run que se cae por el motor también cuenta como fallo.

> Referencia de código: `src/workflows/engine/v4/**` (motor), `src/app/api/workflows/v4/**` (drain, cron-trigger), `src/components/flows/**` (builder). Todo bajo el paraguas SCRUM-151.

## Skills y tRPC

En el dashboard, **tRPC** agrupa procedimientos de distintos dominios; entre ellos suelen aparecer **`claims`**, **`workflows`**, **`skills`**, **`users`**, **`admins`**, etc. (ver [tRPC API](../api-reference/trpc-api.md)). Ahí los **skills** son sobre todo **gestión del catálogo de skills y asignación** a administradores y canales, no la máquina de estados del reclamo.

## Cómo se lee todo junto (flujo mental)

1. Un **reclamo** avanza por su **workflow de negocio** (Shield + dashboard + integraciones).
2. En paralelo, **reglas de comunicación** (correos, webhooks externos) pueden ejecutarse cuando el sistema alcanza ciertos puntos.
3. Los **skills** deciden **qué administradores** están habilitados para **ciertos reportes o alertas** (p. ej. consolidado diario de emisiones fallidas), vía Supabase Edge y cron.

## Referencias

- [Notificaciones, skills y Supabase Edge](./notificaciones-skills-supabase.md)
- [Superficies REST](../api-reference/rest-superficies.md)
- [Módulo de Workflows (producto)](../producto/modulo-workflows.md)
- [Flujos e integraciones (producto)](../producto/flujos-e-integraciones.md)
