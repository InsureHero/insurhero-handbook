---
id: intro
title: Reglas de Cursor
sidebar_position: 1
---

# Reglas de Cursor (.cursor/rules)

Las reglas son archivos `.mdc` que viven en `.cursor/rules/` del monorepo. Actúan como **raíles de comportamiento** para el agente de Cursor: se aplican automáticamente en cada interacción y definen qué NO debe hacer el agente.

## Reglas vs. Documentación

Es crítico entender la diferencia entre los dos mecanismos que Cursor ofrece para alimentar contexto al agente:

| Característica | Reglas (`.cursorrules`) | Documentación (`@Docs`) |
|---------------|-------------------------|--------------------------|
| **Frecuencia** | Se aplican siempre, automáticamente. | Bajo demanda usando el prefijo `@`. |
| **Función** | **Restricción**: qué NO hacer y estándares. | **Información**: contexto técnico para ejecución. |
| **Ejemplo** | _"Prohibido el uso de tipos `any` en TypeScript"_. | _"Configuración de webhooks para carrier SafeGuard"_. |

**En resumen:**
- Las **Reglas** son restrictivas y siempre activas.
- Los **Docs** son informativos y se invocan cuando se necesitan.

## Catálogo de reglas

InsureHero define cuatro reglas técnicas en `.cursor/rules/`:

1. **[core-governance.mdc](./core-governance)** — Estándares globales de código y comportamiento del agente.
2. **[architecture.mdc](./architecture)** — Gobernanza de las 6 capas técnicas (A-F).
3. **[security.mdc](./security)** — Aislamiento multi-tenant y seguridad de la Shield API.
4. **[monorepo.mdc](./monorepo)** — Gobernanza de Turborepo y contratos entre paquetes.

Todas estas reglas tienen `alwaysApply: true`, lo que significa que se aplican en cada interacción del agente sin necesidad de invocarlas.
