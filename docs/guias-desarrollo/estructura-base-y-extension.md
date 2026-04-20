---
displayed_sidebar: guiasDesarrolloSidebar
sidebar_position: 2
---

# Estructura base y cómo extender sin romper el núcleo

Esta guía define **qué partes del sistema se consideran “base”** (convenciones que debemos respetar para que el monorepo siga siendo predecible) y **por dónde está permitido crecer** cuando añades integraciones, APIs o UI.

Contexto de alto nivel: [Estructura del monorepo](../arquitectura/estructura-monorepo.md), [Integraciones (código)](../arquitectura/integraciones.md) y [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md).

## Principio

- El **core** (productos, risk items, pólizas, reclamos en el modelo mental de InsureHero) debe seguir **agnóstico** del proveedor concreto (Phoenix, AMA, pasarela, etc.).
- Toda variación “de aseguradora o partner” se concentra en **adaptadores**, **rutas HTTP versionadas** y **contratos explícitos** — no en copiar lógica en pantallas sueltas.

## Qué no conviene reescribir “a medida”

| Área | Por qué es sensible |
|------|---------------------|
| **Flujo de emisión hacia externos** | Ya pasa por el **orquestador** y `StandardRiskItem`. Cambiar eso sin diseño afecta a todas las integraciones. |
| **Contrato `InsuranceAdapter` y registro** | Los slugs (`PHOENIX`, `AMA`, …) y `registry.ts` son el **punto único** de selección de adaptador. |
| **Ramas versionadas de API** | Los clientes externos dependen de `/api/shield/v1`, `v2`, `integrations/...`. Romper respuestas sin nueva versión genera incidentes. |
| **Semántica de risk item / póliza en DB** | Evoluciona con migraciones y tipos compartidos; no “campos sueltos” solo en front. |

Esto no significa que el código sea intocable: significa que los cambios **atraviesan revisión** y, si rompen contrato público, **nueva versión de API** o **nuevo adaptador**, no parches locales.

## Por dónde sí extendemos (rutas felices)

| Necesidad | Dónde trabajar | Documentación relacionada |
|-----------|----------------|---------------------------|
| **Nuevo proveedor de emisión** | `integrations/adapters/<nombre>/`, registro en `registry.ts`, fila en `integrations` (slug en **MAYÚSCULAS**) | [Integraciones (código)](../arquitectura/integraciones.md) |
| **Nuevo endpoint HTTP para partners / canales** | `apps/next/src/app/api/shield/...` (y middlewares ya existentes) | [Nuevas rutas Shield](./nuevas-rutas-shield.md), [Shield: intro](../api-reference/shield/intro.md) |
| **Lógica solo para el dashboard interno** | Routers **tRPC** bajo `src/trpc/` | [Guía de tRPC](./trpc.md) |
| **Pantallas y flujos de producto** | `components/` por feature, rutas bajo `app/` | [Guía de componentes](./componentes.md) |
| **Tipos compartidos entre apps/packages** | `packages/types` (y compilación con `yarn compile`) | [Interfaces y contratos TypeScript](./interfaces-y-contratos-typescript.md) |

## Anti‑patrones a evitar

1. **Lógica de “si es Phoenix haz X”** en componentes de UI del core — debe vivir en el **adaptador** o en datos configurables (paquete / integración), no en JSX repartido.
2. **Reutilizar un JWT de una rama Shield en otra** (`v1` vs `ia` vs `integrations`) — cada namespace tiene su secreto y contrato; ver [Namespaces y consumidores](../api-reference/shield/namespaces-y-consumidores.md).
3. **Cambiar respuestas o códigos de error de rutas publicadas** sin documentar y, si aplica, sin **nueva ruta versionada** (`v2`, subruta nueva).
4. **Duplicar contratos de dominio** en el front en lugar de importar desde `packages/types` o tipos generados.

## Checklist rápido antes de abrir un PR grande

- [ ] ¿El cambio es **extensión** (nuevo adaptador, nueva ruta, nuevo procedimiento) o **cambio de contrato**? Si es lo segundo, ¿hay plan de versionado o migración?
- [ ] ¿Los tipos nuevos están en el **paquete correcto** y exportados donde toca?
- [ ] ¿Las rutas Shield nuevas están **bajo el namespace adecuado** y pasan por el **middleware** correspondiente?
- [ ] ¿La documentación de API ([Inventario de rutas](../api-reference/shield/inventario-de-rutas.md) o [Superficies REST](../api-reference/rest-superficies.md)) puede actualizarse en el mismo entregable o queda un issue explícito?

## Siguientes pasos

1. [Interfaces y contratos TypeScript](./interfaces-y-contratos-typescript.md) — dónde definir tipos y límites del contrato con el orquestador.
2. [Nuevas rutas Shield](./nuevas-rutas-shield.md) — checklist para endpoints bajo `/api/shield`.
3. [Guía de componentes](./componentes.md) — organización de UI alineada con esta estructura.
