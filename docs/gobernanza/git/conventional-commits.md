---
id: conventional-commits
title: Conventional Commits
sidebar_position: 1
---

# Conventional Commits

InsureHero adopta el estándar [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) para los mensajes de commit. El monorepo aplica este formato de forma **obligatoria** mediante `commitlint` + `@commitlint/config-conventional`, integrados en el pre-commit hook de Husky.

## Formato

```
<tipo>(<scope opcional>): <descripción corta>

<cuerpo opcional>

<footer opcional>
```

## Ejemplos reales del monorepo

```
feat(integrations): connect orchestrator to risk item creation flow
fix(types): resolve 18 TypeScript errors across dashboard
chore(deps): update qstash dependencies
refactor(shield): extract auth middleware to shared utility
docs(handbook): add AI governance section
test(ama): add coverage for promise.allSettled fallback
```

## Tipos de commit

Los tipos permitidos por @commitlint/config-conventional:

| Tipo | Cuándo usar |
|------|-------------|
| feat | Nueva funcionalidad para el usuario |
| fix | Corrección de bug |
| chore | Mantenimiento, actualizaciones de dependencias, config |
| refactor | Cambio interno sin alterar comportamiento ni API |
| docs | Cambios en documentación únicamente |
| test | Añadir o corregir tests |
| style | Formato, punto y coma, espacios (no afecta código) |
| perf | Mejora de rendimiento |
| build | Cambios en sistema de build o dependencias externas |
| ci | Cambios en configuración de CI (Vercel, GitHub Actions) |
| revert | Revertir un commit previo |

## Scope

El scope es opcional pero recomendado. Identifica el área del monorepo afectada. Scopes típicos en InsureHero:

- integrations — adapters, orchestrator
- shield — API pública
- trpc — routers del dashboard
- types — paquete @insureHero/types
- utils — paquete @insureHero/utils
- ama, phoenix — adaptadores específicos
- handbook — cambios en el repo de documentación

## Reglas del mensaje

- Descripción corta: imperativo, presente, minúsculas, sin punto final.
- Idioma: inglés (convención del equipo, coherente con el resto del código).
- Longitud: máximo ~72 caracteres en la línea de descripción.
- Cuerpo: cuando es necesario explicar el "porqué", separar de la descripción con una línea en blanco.
- Breaking changes: usar ! después del tipo (feat!: ...) o un footer BREAKING CHANGE: ....

## Ejemplo con cuerpo

```
feat(integrations): connect orchestrator to risk item creation flow

- Add provider field to OrchestratorOptions in types.ts
- Replace hardcoded PHOENIX provider with dynamic options.provider
- Create POST /api/integrations/dispatch endpoint triggered by
  Supabase AFTER INSERT on risk_items
- Always returns 200 to prevent Supabase trigger retries
```

## Herramientas del monorepo

**Commitizen (yarn commit)**

El monorepo incluye Commitizen para crear commits interactivamente sin memorizar el formato. En lugar de git commit:

```bash
yarn commit
```

Commitizen lanza un prompt interactivo que pregunta tipo, scope, descripción y cuerpo, y genera el mensaje con el formato correcto automáticamente.

**Validación automática**

Antes de cada commit, Husky ejecuta commitlint sobre el mensaje. Si el mensaje no cumple el formato de Conventional Commits, el commit es rechazado con un mensaje de error explicando qué regla se violó.

**Referencia a tickets**

Incluir el ticket de SCRUM en el cuerpo del commit cuando aplique:

```
feat(shield): add IA v2 authentication flow

Closes SCRUM-74
```

Esto permite trazabilidad automática entre commits, ramas y tickets en Jira.

## Lo que NO es un Conventional Commit

❌ Mensajes genéricos sin tipo:
```
update stuff
WIP
fix things
```

❌ Descripción en mayúsculas con punto final:
```
feat: Add new feature.
```

❌ Múltiples tipos en uno:
```
feat/fix: new thing and also fixed bug
```

Si necesitas hacer varias cosas, haz varios commits separados.
