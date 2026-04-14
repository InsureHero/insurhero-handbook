---
displayed_sidebar: integracionesSidebar
---

# Alertas: Discord, correo y Supabase

Servicios externos que **no emiten pólizas** pero dan **visibilidad operativa**: notificaciones en tiempo casi real, informes por correo y jobs programados.

## Discord

| | |
|---|---|
| **Qué es** | Webhook entrante para alertas de equipo cuando una **emisión de integración** falla o se abandona. |
| **Qué hace InsureHero** | `notifyIntegrationEmissionDiscord` envía embeds con proveedor, risk item, intento y error (si `INTEGRATIONS_DISCORD_WEBHOOK_URL` está definida). |
| **Código** | `apps/next/src/utils/notifications/integrationEmission.ts` |

## Correo (Resend) y Edge Function

| | |
|---|---|
| **Qué es** | **Resend** como proveedor SMTP/API para correos transaccionales desde la Edge Function `daily-emission-dispatcher`. |
| **Qué hace InsureHero** | Reporte diario de emisiones con error por canal, adjunto CSV/Excel cuando aplica, destinatarios según skill `notification.integration.error`. |
| **Detalle** | [Skills y notificaciones (Supabase)](../arquitectura/notificaciones-skills-supabase) |

## Resumen

- **Discord**: feedback inmediato a humanos ante fallos de emisión.
- **Correo + pg_cron**: consolidado periódico por canal y skill.
