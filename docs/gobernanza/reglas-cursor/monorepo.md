---
id: monorepo
title: monorepo.mdc
sidebar_position: 5
---

# monorepo.mdc

Gobernanza de Turborepo y contratos entre los paquetes del monorepo. Aplica especialmente al modificar `packages/**` o el `package.json` raíz.

## Frontmatter

```yaml
---
description: "Gobernanza de Turborepo y contratos entre paquetes"
alwaysApply: true
globs: ["packages/**", "apps/next/package.json"]
---
```

## Paquetes del monorepo

### `@insureHero/types`
Contiene la definición de tipos de la base de datos y contratos globales. Es la **fuente de verdad** de tipos.

### `@insureHero/utils`
Utilidades de bajo nivel compartidas. **No debe importar nada de `apps/next`** — esto crearía una dependencia circular.

### `@insureHero/builders`
Lógica para construir entidades complejas (testing builders, factories).

## Gestión de dependencias

La mayoría de dependencias están **hoisted en la raíz**. Antes de añadir una nueva:

1. Revisa el `package.json` principal del monorepo.
2. Verifica si ya está disponible en algún workspace.
3. Solo añade una nueva dependencia si realmente falta.

## Sincronización tras cambios

Al modificar un paquete, el agente debe considerar el impacto en el Dashboard (`apps/next`). Los cambios en paquetes requieren un build para reflejarse en `dist/`:

```bash
turbo run build
```

Sin este paso, el dashboard puede seguir consumiendo la versión vieja del paquete.
