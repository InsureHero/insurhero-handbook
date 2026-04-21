---
id: core-governance
title: core-governance.mdc
sidebar_position: 2
---

# core-governance.mdc

Estándares globales de código y comportamiento del agente. Aplica a todas las interacciones.

## Frontmatter

```yaml
---
description: "Estándares globales de código y comportamiento de IA"
alwaysApply: true
---
```

## Reglas

### Idioma
El agente **responde siempre en español**.

### Stack obligatorio
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18
- **API:** tRPC 10
- **Validaciones:** Zod
- **BD:** Supabase

### TypeScript
- **Modo:** `strict: true` obligatorio.
- **Prohibido** el uso de `any`.
- **Seguridad de tipos:** con `noUncheckedIndexedAccess: true`, validar siempre nulos/undefined en accesos por índice.

### Convenciones de naming
- **PascalCase** para componentes React (ej: `UserProfile.tsx`).
- **camelCase** para utilidades y variables (ej: `formatDate.ts`).

### Contexto del monorepo
Respetar siempre la estructura de Turborepo definida en `@README.md`.

## Ejemplo de archivo MDC

```markdown
---
description: "Estándares globales de código y comportamiento de IA"
alwaysApply: true
---

# InsureHero Core Standards

- **Idioma**: Responde siempre en español.
- **Stack**: Next.js 14 (App Router), React 18, tRPC 10, Zod, Supabase.
- **TypeScript**: Modo `strict: true` obligatorio. Prohibido el uso de `any`.
- **Seguridad de Tipos**: Con `noUncheckedIndexedAccess: true`, valida siempre nulos/undefined en accesos por índice.
- **Naming**: PascalCase para componentes React, camelCase para utilidades y variables.
- **Contexto**: Respeta siempre la estructura de Turborepo definida en @README.md.
```
