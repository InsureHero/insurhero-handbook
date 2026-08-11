---
displayed_sidebar: guiasDesarrolloSidebar
---

# Guía de Componentes

Guía para crear y usar componentes en el front del monorepo principal (`apps/next`). Debe ir alineada con la [estructura base](./estructura-base-y-extension.md): **la UI no sustituye** reglas de negocio que correspondan al orquestador, adaptadores o APIs — solo las consume o las dispara vía tRPC / acciones de servidor según el diseño del feature.

## Dónde colocar código nuevo

| Tipo | Carpeta típica | Notas |
|------|----------------|--------|
| **Layout global** (cabecera, shell del dashboard) y **componentes compartidos entre features** | `components/global/` | Cambios poco frecuentes; coordinar con diseño. Aquí va lo reutilizable que **compone** otros componentes (p. ej. campos de `components/form/`), porque `src/ui/` son primitivas sin dependencias hacia `components/`. |
| **Feature** (pantalla de pólizas, reclamos, etc.) | `components/features/<feature>/` | Agrupar por dominio, no por tipo de archivo suelto. |
| **Formularios reutilizables** | `components/forms/` | Patrones compartidos (RHF + Zod). |
| **Primitivas UI** (botón, card, diálogo) | `src/ui/` o equivalente | Reutilizar antes de crear variantes one‑off. |

Evita copiar **lógica de integración** (Phoenix, AMA, reglas de emisión) dentro de componentes presentacionales: eso pertenece a **servidor**, **tRPC** o **configuración** (paquete / canal), como describe [Integraciones (código)](../arquitectura/integraciones.md).

## Crear un Componente

### Estructura Básica

```typescript
// src/components/Example/Example.tsx
import { cn } from '@/utils';

interface ExampleProps {
  title: string;
  className?: string;
}

export const Example = ({ title, className }: ExampleProps) => {
  return (
    <div className={cn("base-styles", className)}>
      <h1>{title}</h1>
    </div>
  );
};
```

### Componentes con Estado

```typescript
'use client';

import { useState } from 'react';

export const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
};
```

## Componentes UI

El proyecto utiliza componentes de Radix UI y componentes personalizados en `src/ui/`.

### Usar Componentes UI

```typescript
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';

export const MyComponent = () => {
  return (
    <Card>
      <Button>Click me</Button>
    </Card>
  );
};
```

## Componentes del Dashboard

Los componentes del dashboard están organizados por funcionalidad:

- `components/global/`: Componentes globales (Header, Sidebar, etc.)
- `components/features/`: Componentes específicos de features
- `components/forms/`: Componentes de formularios

## Filtro por rango de fechas en tablas (`DateRangeFilterModal`)

Las barras de filtros de las tablas del dashboard abren su rango de fechas con un **único componente compartido**: `components/global/DateRangeFilterModal/`. No hay un modal por pantalla — si añades una tabla que filtra por fechas, reutiliza este y **no** crees una variante.

El componente es genérico sobre `TSchema extends FieldValues` y es puramente presentacional:

- **El form vive en el consumer.** El modal no llama a `useFormContext`: recibe el `control` por prop. El consumer ya hace `const { control } = useFormContext<Schema>()` en su `*TableFilters`.
- **No depende de i18n.** Todos los textos (título, labels, placeholders) llegan resueltos por props; el consumer los saca de su `t(...)`. Por eso el harness de tests solo necesita un `FormProvider`, no un provider de traducciones.
- **Renderiza `DialogTitle`**, no un `<strong>`, para que el diálogo tenga nombre accesible y el `aria-labelledby` de Radix resuelva.

### Props

| Prop | Tipo | Para qué |
|------|------|----------|
| `children` | `React.ReactNode` | El trigger (el botón con el icono `Settings2`) |
| `control` | `Control<TSchema>` | Lo pasa el consumer, ya tipado con su schema |
| `title` | `string` | Título del diálogo, ya resuelto por el consumer |
| `startDateName` / `endDateName` | `DatePath<TSchema>` | Nombres de los campos. `DatePath` es un mapped type sobre `Path<TSchema>` que solo admite paths cuyo valor acepta un `Date`: si el schema del consumer no tiene el campo, o su tipo no encaja, falla en compilación |
| `from` / `to` | `string` | Fechas del filtro ya aplicado (`configNow`), para preseleccionar cada calendario. Se pasan los dos campos sueltos, no el objeto entero |
| `startDateLabel` / `startDatePlaceholder` | `string` | Textos del primer calendario |
| `endDateLabel` / `endDatePlaceholder` | `string` | Textos del segundo calendario |
| `fieldsClassName` | `string` | Clases del `div` que envuelve los campos |
| `extraFields` | `React.ReactNode` (opcional) | Campos adicionales, renderizados **dentro** del wrapper de campos y después de los dos calendarios (quedan como columna en línea, no debajo) |

### Consumers y sus dos variantes

Hoy lo usan siete pantallas, con dos combinaciones de labels y wrapper:

| Pantallas | Claves i18n (namespace `Table`) | `fieldsClassName` | `extraFields` |
|-----------|--------------------------------|-------------------|---------------|
| Users, Groups, Events, Claims events | `header.filter.createdAt.*` en ambos calendarios, con `endDateLabel=""` | `"flex flex-row items-end"` | — |
| Claims in progress, Claims finished | `header.filter.startCalendar.*` / `header.filter.endCalendar.*` | `"flex flex-row"` | — |
| Claims | `header.filter.startCalendar.*` / `header.filter.endCalendar.*` | `"flex flex-row"` | `FormAssigneeSelect` |

El título es la misma clave en las siete: `header.filter.modal.title`.

### Ejemplo de uso

```tsx
<DateRangeFilterModal
  control={control}
  title={t("header.filter.modal.title")}
  startDateName="start_date"
  endDateName="end_date"
  from={configNow.from}
  to={configNow.to}
  startDateLabel={t("header.filter.createdAt.label")}
  startDatePlaceholder={t("header.filter.createdAt.placeholder")}
  endDateLabel=""
  endDatePlaceholder={t("header.filter.createdAt.placeholder")}
  fieldsClassName="flex flex-row items-end"
>
  <Button className="self-end mb-2 " variant="secondary">
    <Settings2 />
  </Button>
</DateRangeFilterModal>
```

`TSchema` se infiere del `control`, así que no hace falta anotar la genérica en el punto de uso: el compilador comprueba `startDateName` / `endDateName` contra el schema real del consumer.

Notas de comportamiento actual, útiles al tocar esta zona:

- El rango de años del **segundo** calendario se deriva de `from` (el filtro ya aplicado), no del `start_date` que el usuario acaba de elegir en el modal.
- Los placeholders se pasan pero **no llegan a pantalla**: los dos calendarios reciben `defaultValue`, así que el botón siempre muestra la fecha formateada.
- El modal necesita un `FormProvider` ancestro aunque reciba el `control` por prop, porque los campos de formulario que compone sí lo consumen.

## Formularios

### Con React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export const MyForm = () => {
  const form = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  );
};
```

## Estilos

### Tailwind CSS

El proyecto utiliza Tailwind CSS para estilos:

```typescript
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  Content
</div>
```

### Clases Utilitarias

Usar `cn()` para combinar clases:

```typescript
import { cn } from '@/utils';

<div className={cn("base-class", isActive && "active-class")} />
```

## Testing de Componentes

```typescript
import { render, screen } from '@testing-library/react';
import { Example } from './Example';

test('renders title', () => {
  render(<Example title="Test" />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```
