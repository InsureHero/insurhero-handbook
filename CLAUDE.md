# CLAUDE.md — Actualización de documentación desde specs

Este repositorio es el **handbook** (Docusaurus) de la plataforma InsureHero.
Un workflow del monorepo te invoca cuando se implementa un spec, con la tarea de
mantener esta documentación al día. Estas son las reglas que debes seguir.

## Regla de oro

El **spec describe un cambio**; el **handbook describe el estado actual**.
No copies el spec dentro de la doc. Lee el spec, entiende qué quedó implementado,
y actualiza la sección correspondiente para que refleje cómo funciona el sistema
**hoy** (rama `develop`). Si la sección ya lo refleja bien, no la toques.

## Qué puedes editar

- `docs/**` — todo el contenido (Markdown/MDX). Es tu superficie principal.
- `src/data/homeHub.ts` y `src/data/integracionesHub.ts` — tarjetas de navegación,
  solo si aparece o cambia un área documentada.

## Qué NO puedes tocar

- `src/**` salvo los dos `*Hub.ts` de arriba.
- `middleware.ts`, `src/lib/supabase/**`, `src/context/**`, `src/theme/**` (auth y plumbing).
- `docusaurus.config.ts`, `sidebars.ts`, `vercel.json`, configs.
- Diagramas: `diagrams/*.mmd` y `static/img/diagrams/*.svg`. Si un cambio deja un
  diagrama desactualizado, **anótalo como TODO en el cuerpo del PR**; no lo edites.

## Mapa: área de código (spec) → dónde documentar

| Si el spec toca… | Actualiza… |
|---|---|
| Phoenix / AMA / adapters / orquestador | `docs/integraciones/{phoenix,ama}.md`, `docs/arquitectura/orquestador-integraciones.md`, `docs/arquitectura/integraciones.md`, `src/data/integracionesHub.ts` |
| Rutas Shield (`app/api/shield/**`) | `docs/api-reference/shield/*`, `docs/api-reference/shield-api.md` |
| Routers tRPC | `docs/api-reference/trpc-api.md`, `docs/guias-desarrollo/trpc.md` |
| Post-sales (`app/api/postsales/**`) | `docs/api-reference/postsales-api.md`, `docs/integraciones/postventa-api-y-titular.md` |
| Contratos / StandardRiskItem | `docs/arquitectura/risk-item.md`, `docs/guias-desarrollo/interfaces-y-contratos-typescript.md` |
| Migraciones / Vault / triggers / DB | `docs/arquitectura/notificaciones-skills-supabase.md`, `docs/integraciones/alertas-operacion.md`, `docs/gobernanza/*` |
| Landing Vidanta | `docs/guias-desarrollo/landing-page-postventa.md`, `docs/integraciones/vidanta.md` |
| Jerarquía de producto / precios | `docs/producto/*`, `docs/arquitectura/estructura-jerarquica-productos.md` |
| Pagos (Silice / Reef) | `docs/integraciones/silice-y-reef.md`, `docs/integraciones/payment-widget.md` |

Si no encaja claramente, elige la sección más cercana y menciónalo en el PR.

## Estilo

- Español, tono y estructura de los docs existentes. Imita el archivo que edites.
- MDX/Markdown válido. Reusa tablas y bloques de código como ya se usan.
- **Enlaces:** solo a slugs que existen. El build corre con `onBrokenLinks: 'throw'`,
  así que un enlace roto tumba el PR. Si necesitas enlazar algo que no existe, no
  inventes la ruta: describe en prosa o anótalo como TODO.
- No inventes nombres de endpoints, campos ni valores. Si el spec no lo da, no lo escribas.

## Antes de terminar

- Cambios acotados a lo que el/los spec(s) realmente implementaron.
- En el resumen para el PR: qué secciones tocaste, qué specs cubriste, y qué dejaste
  como TODO (p. ej. diagramas).
- Si tras leer los specs concluyes que nada cambia en la doc, no edites nada.
