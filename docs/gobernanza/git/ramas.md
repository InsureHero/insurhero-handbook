---
id: ramas
title: Convenciones de Ramas
sidebar_position: 2
---

# Convenciones de Ramas

## Formato oficial

```
<tipo>/<TICKET>
```

**Ejemplos reales del repositorio:**

```
feature/SCRUM-33
feature/SCRUM-63
feature/SCRUM-74
fix/SCRUM-91
hotfix/SCRUM-102
```

## Reglas

- **Tipo en minúsculas** (`feature`, `fix`, `hotfix`).
- **Ticket en mayúsculas** con formato `SCRUM-XXX`.
- **Separador:** un único `/` entre tipo y ticket.
- **Sin descripción adicional** — el ticket en Jira es la fuente de contexto.
- **Sin caracteres especiales** (`@`, `#`, `_`, espacios).

## Tipos de rama permitidos

| Tipo | Uso | Destino del merge |
|------|-----|-------------------|
| `feature/` | Nueva funcionalidad | `develop` |
| `fix/` | Corrección de bug no urgente | `develop` |
| `hotfix/` | Corrección urgente en producción | `main` (con cherry-pick a `develop`) |

> 💡 A diferencia de otros estándares, InsureHero **no usa** `chore/`, `refactor/`, `docs/`, `test/` como prefijos de rama. Esos cambios se agrupan dentro de un `feature/` o `fix/` según su naturaleza. La granularidad vive en los **commits** (Conventional Commits), no en las ramas.

## Tickets: sistema SCRUM

El equipo usa Jira con el prefijo `SCRUM-`. Todo el trabajo parte de un ticket — si no existe ticket, se crea antes de abrir la rama.

### Flujo de creación

1. Crear ticket en Jira (si no existe).
2. Anotar el ID (ej: `SCRUM-74`).
3. Crear la rama desde `develop`:
```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/SCRUM-74
```
4. Trabajar y commitear siguiendo [Conventional Commits](./conventional-commits).
5. Abrir PR contra `develop`.

## Ramas de ambiente (no tocar directamente)

Estas ramas representan ambientes. **No se commitea directamente sobre ellas** — solo reciben merges desde PRs:

- `main` → producción (`app.insurehero.io`)
- `sandbox` → pre-producción y ambiente para partners (`sandbox.insurehero.io`)
- `develop` → desarrollo activo (`develop.insurehero.io`)

Ver [Ambientes](./ambientes) para el detalle del flujo de promoción entre ramas.

## Anti-patrones

❌ **Descripciones en el nombre de rama:**
```
feature/add-phoenix-adapter
feature/fix-the-thing-that-broke
```
El ticket `SCRUM-XXX` ya describe el trabajo; el nombre de rama debe ser un identificador estable, no una descripción.

❌ **Mezclar tipos:**
```
feature-fix/SCRUM-99
feat/SCRUM-50
```
Solo `feature/`, `fix/`, `hotfix/` (sin abreviaturas).

❌ **Tickets en minúsculas:**
```
feature/scrum-33
```
El ticket se escribe siempre como aparece en Jira (`SCRUM-33`).

❌ **Ramas sin ticket:**
```
feature/quick-fix
fix/bug
```
Todo trabajo necesita un ticket rastreable.

## Limpieza

Tras el merge del PR, **eliminar la rama local y remota**:

```bash
git branch -d feature/SCRUM-74
git push origin --delete feature/SCRUM-74
```

GitHub/Vercel ya tienen configurado el auto-delete de ramas post-merge, pero localmente es responsabilidad del desarrollador mantener limpio `git branch`.
