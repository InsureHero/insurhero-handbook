---
displayed_sidebar: guiasDesarrolloSidebar
---

# Guía de Componentes

Guía para crear y usar componentes en el front del monorepo principal (`apps/next`). Debe ir alineada con la [estructura base](./estructura-base-y-extension.md): **la UI no sustituye** reglas de negocio que correspondan al orquestador, adaptadores o APIs — solo las consume o las dispara vía tRPC / acciones de servidor según el diseño del feature.

## Dónde colocar código nuevo

| Tipo | Carpeta típica | Notas |
|------|----------------|--------|
| **Layout global** (cabecera, shell del dashboard) | `components/global/` | Cambios poco frecuentes; coordinar con diseño. |
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
