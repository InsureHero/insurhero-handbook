---
id: security
title: security.mdc
sidebar_position: 4
---

# security.mdc

Aislamiento multi-tenant y seguridad de la Shield API. Define cómo se separan los datos entre canales y cómo se protege el acceso.

## Frontmatter

```yaml
---
description: "Aislamiento multi-tenant y seguridad de la Shield API"
alwaysApply: true
---
```

## Multi-tenancy basado en `channel_id`

### Regla central
El aislamiento de datos se basa **estrictamente** en el campo `channel_id`. Cada canal (cliente B2B) tiene sus datos completamente segregados.

### Filtrado obligatorio
Toda consulta a tablas de negocio **DEBE incluir**:

```ts
.eq('channel_id', channel_id)
```

Sin esta cláusula, el agente está produciendo código que viola la separación multi-tenant.

### Ejemplo correcto

❌ **Mal — consulta sin filtro de canal:**
```ts
const { data } = await supabase
  .from('risk_items')
  .select('*');
```

✅ **Bien — consulta con `channel_id`:**
```ts
const { data } = await supabase
  .from('risk_items')
  .select('*')
  .eq('channel_id', channel_id);
```

## Shield API

Las rutas en `/api/shield/**` deben validar **sesión y canal** mediante el middleware global. Sin esta validación, una ruta queda expuesta sin control de tenant.

## Row Level Security (RLS)

Cada nueva migración en `supabase/migrations/` **debe incluir RLS**. Las tablas sin RLS son consideradas inseguras incluso si el código aplica filtros — el agente debe rechazar migraciones que omitan esta capa de defensa.
