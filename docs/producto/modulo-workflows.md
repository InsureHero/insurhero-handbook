# Módulo de Workflows y automatización

Este módulo agrupa todo lo que en el día a día se describe como **“el workflow”**: el **camino que sigue un reclamo** (o procesos parecidos) desde que se abre hasta que se cierra, más las **acciones automáticas** que el sistema dispara en medio (avisos, webhooks, correos). No es un menú aparte en el producto con ese nombre exacto; es la **capa transversal** que une operación, integraciones y comunicación.

Los **skills** entran en esta historia, pero con un matiz importante: en InsureHero los skills de administración son sobre todo **etiquetas de capacidad** (“esta persona recibe informes de integración”, etc.), no cada paso del estado de un siniestro. La distinción está explicada en [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md).

## Funcionalidades

- **Definir y recorrer el ciclo del reclamo** — Estados claros (recibido, en revisión, pendiente de documentos, resuelto, cerrado, etc., según cómo tu canal lo modele), con trazabilidad de quién movió el expediente y cuándo.
- **Operar desde el dashboard y desde integraciones** — Mismas reglas de negocio expuestas vía **Shield** para partners o automatizaciones, sin bifurcar la verdad en hojas paralelas.
- **Disparar comunicación en puntos del flujo** — Cuando el diseño lo permite, el sistema puede enviar **correos**, registrar **eventos** o llamar **webhooks del cliente** para que un CRM u otra herramienta reaccione al cambio de estado.
- **Combinar con skills de operación** — Quién debe recibir **alertas o reportes periódicos** (p. ej. errores de emisión agregados por correo) se gobierna con **skills** asignados a admins y canales; eso forma parte del “workflow” del **equipo**, no del diagrama de estados del reclamo.

## Características

- **Separación entre “qué pasó en el siniestro” y “a quién le avisamos”** — El historial del reclamo permanece en dominio de claims; la suscripción a informes operativos usa el modelo de **skills** y Edge Functions donde corresponda.
- **Extensibilidad por canal** — Distintos ramos o socios pueden necesitar más pasos o más pruebas; la plataforma mantiene **permisos** y **APIs** alineados para no romper integraciones al evolucionar reglas.
- **Visibilidad para producto y TI** — Las rutas técnicas (`/api/workflows`, webhooks, Shield `.../workflow`) están resumidas en la documentación de arquitectura para que negocio y desarrollo compartan el mismo mapa.

## Dónde profundizar

| Enfoque | Documento |
|---------|-----------|
| Mapa técnico (workflows vs skills, rutas) | [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md) |
| Reclamos como dominio | [Módulo de Reclamos](./modulo-reclamos.md) |
| Emisión, postventa, alertas | [Flujos e integraciones](./flujos-e-integraciones.md) |
| Skill `notification.integration.error` y cron | [Notificaciones, skills y Supabase Edge](../arquitectura/notificaciones-skills-supabase.md) |
