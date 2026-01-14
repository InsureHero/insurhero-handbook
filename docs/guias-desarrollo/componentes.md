# Guía de Componentes

Guía para crear y usar componentes en InsureHero.

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
