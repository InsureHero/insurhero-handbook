# Workflows, automatización y skills

En InsureHero conviven varias piezas que suelen llamarse “workflow” en conversaciones de producto. Esta página **ordena conceptos** y enlaza el detalle técnico: qué es un **workflow de reclamo**, qué hacen las rutas **`/api/workflows`** y los **webhooks de cliente**, y en qué se parecen o no eso y los **skills** de administración (notificaciones, reportes).

## Dos ideas distintas (y por qué importa)

| Idea | Qué es en la práctica | Ejemplo |
|------|------------------------|---------|
| **Workflow de negocio** | Secuencia de **estados y transiciones** sobre un recurso (sobre todo **reclamos**): quién puede mover de “en análisis” a “documentación pendiente”, qué queda auditado. | Rutas Shield `.../claims/[id]/workflow`, eventos del reclamo, UI del dashboard. |
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
