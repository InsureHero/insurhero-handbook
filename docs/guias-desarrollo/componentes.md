---
displayed_sidebar: guiasDesarrolloSidebar
---

# Guía de Componentes

Guía para crear y usar componentes en el front del monorepo principal (`apps/next`). Debe ir alineada con la [estructura base](./estructura-base-y-extension.md): **la UI no sustituye** reglas de negocio que correspondan al orquestador, adaptadores o APIs — solo las consume o las dispara vía tRPC / acciones de servidor según el diseño del feature.

## Dónde colocar código nuevo

| Tipo | Carpeta típica | Notas |
|------|----------------|--------|
| **Layout global** (cabecera, shell del dashboard) | `components/global/` | Cambios poco frecuentes; coordinar con diseño. |
| **Feature** (pantalla de pólizas, reclamos, etc.) | `components/<dominio>/` (`policies/`, `claims/`, `variants/`, …) | Agrupar por dominio, no por tipo de archivo suelto. |
| **Formularios reutilizables** | `components/form/` | Patrones compartidos (RHF + Zod). |
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
- `components/<dominio>/`: Componentes del dominio (`risk-items/`, `variants/`, `flows/`, `orders/`, …)
- `components/form/`: Componentes de formularios

## Carga diferida de dependencias pesadas

El bundle del dashboard es estático: todo lo que se importa arriba de un archivo viaja al cliente, se use o no. Para librerías grandes que solo hacen falta tras una **acción explícita** del usuario, el patrón vigente es mover el `import` **dentro** de la función `async` que las usa.

Caso implementado: **ExcelJS** (~900 KB, el paquete individual más grande) en el import y el export de risk items.

```ts
// utils/xlxs.utils.ts — exportToExcel
const ExcelJS = (await import("exceljs")).default;
const workbook = new ExcelJS.Workbook();
```

Detalles que no son opcionales:

- **`.default` es obligatorio.** `exceljs` es CommonJS puro y, con `esModuleInterop`, el equivalente de `import ExcelJS from "exceljs"` es `(await import("exceljs")).default`. Sin eso el namespace del bundle de browser no expone `Workbook` y falla **en runtime**, no en compilación: TypeScript no lo detecta y el test bajo vitest tampoco (ahí se carga el build de Node, que sí expone los named exports).
- **El caller tiene que manejar el fallo.** Si el chunk no se descarga (red caída, deploy nuevo a mitad de sesión), el `await import()` rechaza. El botón de export hace `await` dentro de `try/catch/finally`, muestra un toast de error y apaga su estado de loading; el modal de import resetea su spinner en el catch. React no espera la promesa del handler, así que sin el `catch` propio el fallo queda silencioso.
- **Estado de loading y `disabled`.** El botón muestra un spinner mientras corre y queda deshabilitado mientras exporta o cuando no hay filas que exportar; eso cubre además el doble click.
- **No mutar datos cacheados.** `exportToExcel` clona su entrada (`structuredClone`) antes de transformarla: las filas vienen del cache de react-query y la transformación las mutaba, con lo que el segundo export salía corrupto.

El resto del repo sigue con imports estáticos: `next/dynamic` y `React.lazy` **no** se usan todavía, así que no hay un patrón genérico ni una regla de lint que prohíba el import estático de estos módulos.

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

## Valores derivados dentro de un formulario

Cuando un campo **no se ingresa sino que se calcula** a partir de otros (p. ej. el precio bruto de una variante, que sale del neto más impuestos), se usa `components/form/FormComputedValue/`: muestra el valor en un input de solo lectura y **no se registra en react-hook-form**, para no tener dos fuentes de verdad del mismo número.

Usa `Label` y no `FormLabel` a propósito: `FormLabel` llama a `useFormField()`, que exige el contexto de un `FormField` — y acá no hay campo que validar.

## Testing de Componentes

```typescript
import { render, screen } from '@testing-library/react';

import { Example } from './Example';

test('renders title', () => {
  render(<Example title="Test" />);
  expect(screen.getByText('Test').textContent).toBe('Test');
});
```

Dos cosas del harness actual que hay que tener presentes:

- **`@testing-library/jest-dom` no está instalado.** `toBeInTheDocument`, `toHaveAttribute` o `toBeDisabled` no existen en este repo y fallan como *Invalid Chai property*. Las aserciones van contra propiedades del DOM (`input.readOnly`, `button.disabled`, `element.textContent`).
- **El `render` compartido de `src/test/setupTests` no reenvía `children`**, así que monta un árbol vacío: los smoke tests “renders with default props” pasan sin montar nada. Para un test que **afirma** algo, importar `render` directo de `@testing-library/react` (funciona si el componente no consume providers).
