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
- **Activate / Deactivate** arma o desarma el trigger; es **ortogonal** a publish (un flow puede estar activo con *cambios sin publicar*). Activar exige tener una versión publicada.
- **Rollback**: carga una versión anterior al draft para revisarla y publicarla como versión nueva (historial lineal).
- **Review changes / Compare**: diff estructural (nodos y conexiones agregados / quitados / cambiados) antes de publicar o restaurar.

Cada `flow_run` registra la `flow_version` que ejecutó, para poder reconstruir qué definición corrió en cada momento (runs previos al versionado quedan sin versión).

### Ejecución y observabilidad

El runner **camina el DAG** desde el trigger: `condition` elige la arista de salida, `delay` re-encola. Reintentos best-effort vía QStash. Cada run deja un **trace** (`flow_runs`); los runs `failed` / `partial` se ven en **Failed Messages** (DLQ) con enlace al trace y acción de reintento.

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
