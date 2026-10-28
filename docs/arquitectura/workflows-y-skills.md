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
- **Disparadores:** eventos de dominio (`risk_item.created`, `order.confirmed`, …) o **cron** (`schedule`). El *filtro* del trigger decide si el flow corre (gate); el nodo `condition` bifurca dentro del flujo.

### Bus de eventos (transactional outbox)

Cada operación del core escribe el evento en `event_outbox` **en la misma transacción** que la op, de modo que no se pierde un evento si el proceso muere entre el commit y la emisión. Un worker (**drain**) drena el outbox, resuelve los `flow_triggers` que matchean `(canal, evento)` y **encola un run por flow** (vía QStash). Es best-effort e idempotente: varios drains en paralelo no reprocesan (claim con `SKIP LOCKED` y visibility timeout).

El drain se dispara de forma **reactiva**: un trigger sobre `event_outbox` publica un *poke* (vía `pg_net` → QStash, con deduplicación por ventana de ~10 s para colapsar ráfagas en una sola llamada) que ejecuta el drain en segundos, sin esperar a un cron. Un **Vercel Cron cada 5 min** queda como red de seguridad. Los secretos del poke viven en Supabase Vault; si faltan, el poke es no-op best-effort y no afecta la operación del core (el cron drena igual).

### Nodos

| Grupo | Nodos |
|-------|-------|
| Genéricos | `trigger`, `http`, `condition`, `transform`, `delay`, `log` |
| Especializados | `carrier_sync`, `sftp` (inbound/outbound), `payment_file`, `source`/`query`, `append_to_batch` |

El nodo `source`/`query` carga registros de nuestro propio modelo (risk items, órdenes, reclamos) por un vocabulario de filtros **acotado y siempre scopeado al canal** (sin SQL libre) — es lo que puebla el contexto cuando el trigger es cron. Un `source` que devuelve N registros se procesa con `foreach`.

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

El runner **camina el DAG** desde el trigger: `condition` elige la arista de salida, `delay` re-encola. Reintentos best-effort vía QStash. Cada run deja un **trace** (`flow_runs`); los runs `failed` / `partial` se ven en **Failed Messages** (DLQ) con enlace al trace y acción de reintento.

Si un nodo `http`, `webhook` o `sftp` usa una conexión que necesita un secreto y no lo tiene (p. ej. una conexión creada por una importación y todavía sin completar), el nodo falla con el código `connection_missing_credentials` y un mensaje que dice que la conexión no tiene credenciales.

#### Pantalla de ejecuciones (`/flows/runs`)

Lista las ejecuciones del canal (botón **“Ejecuciones”** del listado de flujos), de la más reciente a la más antigua, de a 20 por página, con dos vistas: **“Todas las ejecuciones”** y **“Envíos fallidos”**. Esta última (con un tooltip que la distingue del estado *Fallido*) muestra las ejecuciones disparadas por un evento que agotaron sus intentos y siguen sin reintentar ni descartar; *Fallido* es cualquier ejecución que terminó con error.

- **Filtros**: flujo (todos los del canal, incluidos inactivos y borradores, en orden alfabético), estado (*OK*, *Parcial*, *Fallido*, *En curso*) y rango **desde / hasta** de la hora de inicio, con fecha y hora:minuto en 24 h. Se aplican al cambiar, se combinan entre sí y con la vista, y vuelven la lista a la página 1. Con algún filtro activo aparece **“Limpiar filtros”**.
- El rango se interpreta **siempre en UTC** y ambos extremos incluyen el minuto elegido. Si el “desde” es posterior al “hasta”, se muestra un aviso y no se consulta.
- Los filtros y la vista viven en la **URL** (`flow`, `status`, `from`, `to`, `view`), así que se mantienen al recargar y se pueden compartir; la página actual no. Un valor inválido en la URL se ignora. **“Ver ejecuciones”** en el menú de un flujo abre `/flows/runs?flow=<id>`.
- Los filtros se aplican en la base, siempre dentro del canal. El resumen muestra *“N ejecuciones · página X de Y”* sobre el resultado filtrado.
- Todas las horas de la pantalla (columna **“Inicio (UTC)”**, título del modal de traza y horas dentro de los errores) se muestran en **UTC, formato 24 h**.

Ve la pantalla quien tiene acceso a workflows; reintentar y descartar envíos fallidos es solo para SUPER_ADMIN.

### Exportar e importar entre canales y ambientes

Hay dos formatos de archivo:

- **Flujo individual** — se exporta desde el menú de cada flujo en el listado. Lleva la versión publicada, su trigger y su definición; las conexiones, subflujos y plantillas de correo viajan **solo por nombre** y se resuelven por nombre en el destino (sin distinguir mayúsculas ni espacios en los extremos). Si una referencia falta o su nombre está **repetido** en el destino, la vista previa lo muestra y la importación se bloquea.
- **Paquete** (`insurehero.flow-package`) — botón **“Exportar”** del listado de flujos (`/flows/export`). Agrupa workflows, conexiones y plantillas de correo de un canal, **sin credenciales**, más el origen (ambiente, canal, fecha y quién exportó) y la lista de credenciales quitadas.

**Exportar un paquete.** La pantalla lista los elementos del canal con casillas y “Seleccionar todo”. Un workflow sin versión publicada, o que usa algo que ya no existe en el canal, aparece deshabilitado con el motivo. Seleccionar un workflow suma sus dependencias (conexiones, subflujos y plantillas, a cualquier profundidad); el usuario puede quitarlas, y lo no incluido queda en el paquete solo por nombre. Antes de descargar, una vista previa muestra lo incluido, las credenciales que se van a quitar y los campos que no se pudieron revisar campo por campo.

**Credenciales.** El secreto cifrado de una conexión nunca se exporta. En la configuración de los nodos y en las cabeceras, parámetros y URL de las conexiones, todo valor que parezca una credencial —por el nombre del campo o por su forma (JWT, token opaco), con el mismo criterio que usa el motor al ocultar datos en las trazas— se reemplaza por un **marcador** (`[[credential required: complete it in the target environment]]`). Un valor con una referencia a variable (`{{...}}`) no se toca. Los bodies escritos como JSON o formulario se revisan campo por campo; la contraseña de una URL `usuario:contraseña@host` también se reemplaza.

**Importar.** La misma pantalla de importación acepta el paquete (solo **SUPER_ADMIN**). La vista previa indica para cada elemento si **se crea**, **se actualiza**, **queda sin cambios**, **se usa el existente**, o no se importa por **conflicto** o **referencia faltante**, y avisa de contenido distinto, triggers distintos, datasets faltantes y que los subflujos importados deben publicarse antes que los flujos que los usan.

- Se aplican primero conexiones y plantillas, después workflows.
- Conexión nueva: se crea sin credenciales. Conexión o plantilla con el mismo nombre (y, en conexiones, el mismo tipo) en el destino: se usa la existente sin modificarla.
- Workflow nuevo: se crea en **borrador** junto con su trigger; si el trigger no se puede crear, el workflow tampoco. Workflow ya importado del mismo origen: se actualiza su borrador y, si no tiene trigger, se le crea (uno existente no se cambia).
- Un workflow no se importa (ni los que dependen de él) si usa algo que falta, si un nombre está repetido en el destino o en el paquete, si una conexión tiene el mismo nombre y otro tipo, si nunca se importó y su nombre ya existe en el destino, o si su slug de trigger por API ya lo usa otro workflow del canal.
- Un error en un elemento no detiene al resto; al terminar se ve cada elemento como aplicado, fallido u omitido. Reimportar no duplica nada, completa lo pendiente y **conserva** los valores que el usuario ya completó en lugar de un marcador.

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
