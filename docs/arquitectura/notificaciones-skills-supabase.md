# Notificaciones, skills y Supabase Edge

Esta página documenta el vínculo entre **skills en base de datos**, la **Edge Function** que arma reportes y correos, y el **cron en Postgres** (pg_cron + pg_net). Todo el código referenciado vive bajo `apps/next/supabase/`.

**Nota:** Los **skills** aquí son **capacidades de administración y notificación** (quién recibe qué informe), no los pasos del **workflow de un reclamo**. Para ver ambos conceptos en conjunto: [Workflows, automatización y skills](./workflows-y-skills.md).

## Skill `notification.integration.error`

El identificador interno del skill usado para el **reporte diario de emisiones con errores** es:

`notification.integration.error`

- En la tabla `skills`, la columna `name` almacena ese identificador (hay migraciones que añaden `label` para mostrar nombre amigable en UI).
- En el dashboard, los administradores asignan skills a **canales** (`admins_by_channels.skills`) y/o a **admins** (`admins.skills`). La UI puede guardar `{ value: UUID del skill, label }`; la Edge Function resuelve UUID → `skills.name` y lo cruza con un **registro de skills de reporte** en código.

Constante en la función:

- `EMISSION_REPORT_SKILL_NAME` = `notification.integration.error` (`supabase/functions/_shared/constants.ts`).

## Campo `channels.timezone` (relevante para skills y reportes)

El canal guarda una zona horaria en **`channels.timezone`** (texto con identificador **IANA**, p. ej. `America/Mexico_City`, `America/Bogota`).

- **Para qué sirve** — Cuando el job de **pg_cron** dispara la Edge Function en intervalos fijos (p. ej. cada hora en UTC), la lógica del reporte puede usar el **timezone del canal** para delimitar la **ventana “local”** del día o del periodo que debe incluirse en el correo (evitando que un corte en UTC desplace el sentido de “últimas 24 h” o “día de operación” para ese tenant).
- **Relación con skills** — El mismo canal concentra la asignación de **skills** a administradores (`admins_by_channels` / combinación con `admins.skills`). Quién recibe el informe depende del skill; **cuándo** encaja ese informe en la línea de tiempo operativa del negocio depende en buena parte de **`timezone`** + la expresión cron.
- **Otros usos del canal** — `channels.email` sigue siendo el remitente típico (`from`) en envíos desde la Edge Function; conviene documentar en operación que **email + timezone** son campos de primer orden para canales con reportes automáticos.

## Tabla `integrations` (contexto para el skill de emisión)

Los **adaptadores** (Phoenix, AMA, …) se resuelven a partir de filas en **`integrations`** por canal:

| Campo / concepto | Rol |
|------------------|-----|
| `slug` | Identificador del proveedor en mayúsculas (`PHOENIX`, `AMA`, …), alineado con el **registro de adaptadores** en código. |
| `auth_config` | Credenciales y parámetros de conexión (JSON) que consume cada adaptador al llamar a APIs externas. |

En el **paquete** del catálogo, campos como **`sales_integration_slug`** y **`post_sales_integration_slug`** enlazan el risk item con la fila correcta de `integrations` en cada flujo (venta vs postventa). No sustituyen a `auth_config`, pero sí **eligen qué integración** aplica. Visión global: [Integraciones (código)](./integraciones.md) y [Orquestador e integraciones](./orquestador-integraciones.md).

## Registro de skills en la Edge Function (`SKILLS_REGISTRY`)

Archivo: `supabase/functions/_shared/skillsRegistry.ts`.

- Cada **report skill** implementa `ReportSkill`: tiene un `skill_key` (p. ej. `notification.integration.error`) y un método `build(...)` que genera plantilla HTML, asunto, placeholders y filas para adjunto Excel/CSV.
- Hoy está registrado **`emissionDailyReportSkill`** (`_shared/formats/emissionDailyReport/emissionDailyReport.ts`), que agrega datos de emisiones fallidas/abandonadas en una ventana de tiempo (p. ej. últimas 24 h según constantes).
- Para añadir otro tipo de informe: crear el skill en `_shared/formats/...`, importarlo y añadirlo al array `SKILLS` en `skillsRegistry.ts`.

## Función `daily-emission-dispatcher`

Ruta: `supabase/functions/daily-emission-dispatcher/index.ts`.

Responsabilidades principales:

1. **Descubrir** pares `(channel_id, skill_key)` donde el canal tiene el skill registrado en código y asignado a miembros del canal (skills combinados de fila de canal + admin).
2. **Resolver destinatarios**: admins cuyo conjunto de skills (vía UUID o nombre) incluye el `skill_key` del registro; se obtienen emails desde `admins`.
3. **Construir el reporte** llamando a `SKILLS_REGISTRY[skillKey].build(supabase, channelId, ...)`.
4. **Decidir envío**: si no hay filas de error/abandono en el periodo, el envío se omite (“No errors to report”).
5. **Enviar correo** con **Resend** (API HTTP): HTML con placeholders, y opcionalmente adjunto CSV en base64. El remitente (`from`) se toma del email configurado en el **canal** (`channels.email`).
6. **Etiqueta de entorno**: el cuerpo puede incluir un sufijo “Entorno: …” si viene en el payload o en secretos de Vault (`email_environment_label`), para distinguir staging/producción en el asunto/cuerpo.

Invocación: HTTP POST a la URL de Edge Functions de Supabase (`/functions/v1/daily-emission-dispatcher`) con `Authorization: Bearer <service_role>`.

## Programación con pg_cron

Migración de referencia: `supabase/migrations/20260406070000_schedule_daily_emission_report.sql`.

- Usa extensión **`pg_cron`** para lanzar un job recurrente y **`pg_net`** para `http_post` hacia la Edge Function.
- El cron configurado en esa migración ejecuta **cada hora** (`0 * * * *`) una llamada POST; el cuerpo JSON puede incluir `environment_label` según secretos en Vault.
- Ajustes de horario o frecuencia implican cambiar la expresión cron y/o la lógica de “ventana local” dentro del reporte (timezone del canal en `channels.timezone`).

## Notificaciones en la app Next (Discord)

Fuera de Supabase, fallos reintentables o abandonados en el flujo de **emisiones de integración** pueden notificarse a **Discord** vía webhook:

- Código: `src/utils/notifications/integrationEmission.ts` (`notifyIntegrationEmissionDiscord`).
- Depende de variable de entorno para la URL del webhook; si no está definida, no se envía nada.

Esto complementa el correo diario por skill: Discord es tiempo casi real en errores de emisión; el reporte por email es agregado por canal.

## Resumen operativo

| Pieza | Rol |
|-------|-----|
| Tabla `skills` + asignación en admins / admins_by_channels | Quién debe recibir qué tipo de informe |
| `channels.timezone` | Hora local del canal para ventanas de reporte junto al cron |
| `channels.email` | Remitente (`from`) habitual en correos desde Edge Functions |
| `integrations.slug` + `auth_config` | Proveedor y credenciales que alimentan emisiones (contexto del mismo ecosistema de errores que el skill reporta) |
| `notification.integration.error` | Skill que activa el reporte diario de errores de emisión |
| `daily-emission-dispatcher` | Genera y envía el correo (y adjunto) |
| pg_cron + pg_net | Disparo programado desde la base |
| Resend | Proveedor de envío de email desde la Edge Function |

## Referencias cruzadas

- [Workflows, automatización y skills](./workflows-y-skills.md) — workflows de reclamos, rutas `/api/workflows` y relación con skills.
- [Integraciones (código)](./integraciones.md) — visión general del monorepo.
- [API Post-sales](../api-reference/postsales-api.md) — JWT postventa y rutas `/api/postsales/v1` (distinto de este flujo, pero mismo producto).
