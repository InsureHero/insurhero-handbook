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

## Módulos pesados: carga diferida

Algunos paquetes no viajan en el bundle de las pantallas que no los usan.

### Editor JSON (Monaco)

`@monaco-editor/react` **no se importa de forma estática** en ninguna pantalla: el editor baja cuando se monta.

| Pieza | Rol |
|-------|-----|
| `components/global/LazyMonacoEditor/LazyMonacoEditor.tsx` | Única declaración del `dynamic(() => import("@monaco-editor/react"), { ssr: false })` del repo. |
| `components/global/EditorSkeleton/EditorSkeleton.tsx` | Placeholder de la caja del editor. Exporta `EDITOR_HEIGHT` (400px). |
| `components/global/Editor/Editor.tsx` | Wrapper de lectura (visor de eventos, JSON en solo lectura). |
| `components/form/FormJsonEditor/FormJsonEditor.tsx` | Wrapper de formulario (RHF), el de uso más extendido. |

Detalles del patrón:

- Los dos wrappers renderizan `LazyMonacoEditor`; si necesitas un editor nuevo, usa uno de ellos en lugar de importar el paquete.
- El skeleton cubre **las dos esperas**: la del chunk (como `loading` de `next/dynamic`) y la de los archivos de Monaco que bajan del CDN (como `loading` de `@monaco-editor/react`). Sin la segunda, la espera larga se vería con el `Loading...` por defecto sobre el fondo de la página.
- La altura sale siempre de `EDITOR_HEIGHT`, en el skeleton y en los dos wrappers, para que la caja no salte al montar el editor. `EditorProps` excluye `height` y `wrapperProps` con un `Omit`: no se pueden pasar desde fuera.
- El `loading` de `next/dynamic` es de nivel de módulo y no recibe las props del consumidor: el placeholder es el mismo para todos los puntos de render.
- Si el chunk no se puede descargar (red caída, deploy nuevo a mitad de sesión), el error sube al `error.tsx` del segmento y se reporta a Sentry; recupera la recarga.

### React Query Devtools

`Providers` (`components/global/Providers/Providers.tsx`) renderiza `ReactQueryDevtools` solo con `process.env.NODE_ENV === "development"`. El import se deja **estático** a propósito: así webpack resuelve la condición en build y el panel cae por tree-shaking en producción. La comparación es contra `"development"`, no una negación de `"production"`, de modo que también queda fuera en tests.

## Estado de tabla en la URL

Los listados de **Risk Items** y **Órdenes** guardan sus filtros en los search params, no en `useState` local: volver del detalle —con el botón atrás del navegador o con el control de volver de la pantalla— reconstruye la lista con los mismos filtros, la misma página y los mismos resultados. Recargar o abrir la misma URL en otra pestaña reproduce la búsqueda.

| Pieza | Dónde |
|-------|-------|
| `useTablePagination` | `components/global/Table/Table.hooks.ts` — el param `page` |
| `useUrlFilterParams` | mismo archivo — lee los params y aplica parches sobre ellos |
| `parse*Filters` / `serialize*Filters` | helper de cada pantalla (`RiskItemTableFilters.helpers.tsx`, `OrdersScreen.helpers.tsx`) |

Reglas del patrón:

- `setParams` borra la clave cuando el valor es `undefined`, resetea `page` a `1` y escribe con `router.replace(..., { scroll: false })`: cambiar un filtro no agrega entradas al historial.
- Cada `parse*Filters` contrasta el param contra las opciones que ofrece su selector y cae en el valor por defecto ante cualquier otro valor (también ante rangos de fecha inválidos), sin romper la pantalla. El `serialize` omite los campos que están en su default, así que limpiar filtros deja la URL sin params.
- El **input de búsqueda no se deriva de la URL**: vive en estado local y confirma el término en Enter y en blur. Un input de texto controlado por los search params pierde teclas mientras espera la navegación. El estado local se resincroniza cuando el filtro cambia desde afuera, que es lo que vacía o repuebla el input al limpiar filtros o al volver del detalle.
- La fila del listado pasa sus params al detalle en `?list=<params urlencoded>` y el control de volver los devuelve. Sin `list` —link directo, recarga, pestaña nueva— el control lleva al listado en su estado por defecto. El primitivo `GoBack` no cambia: `router.push(href)` cuando recibe `href`, `router.back()` cuando no.

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

### Selects con opciones asíncronas

Buena parte de los wrappers de `FormSelect` arma sus opciones desde una query, así que en un formulario de edición el valor guardado puede llegar **antes** que las opciones. El primitivo `FormSelect` (`components/form/FormSelect/FormSelect.tsx`) lo resuelve con dos helpers puros de `FormSelect.helpers.ts`:

- `resolveSelectedValue(children, value)` — le pasa el valor a Radix solo si algún item de `children` lo ofrece (recorrido recursivo, alcanza los items dentro de un `FormSelect.Group`); si no, devuelve `undefined` y el control muestra el placeholder. El valor sigue intacto en react-hook-form: lo que cambia es lo que ve Radix. Cubre tanto las opciones que todavía no llegaron como un valor que no está en el catálogo.
- `shouldIgnoreEmptyChange(children, value, next)` — descarta el `""` que el `<select>` nativo oculto de Radix burbujea cuando ningún item matchea el valor, que es lo que borraba el dato del formulario. Solo lo descarta cuando ningún item ofrece `""`, de modo que los wrappers con una opción vacía para limpiar el campo (el `None` de `FormGroupsSelect`) siguen pudiendo limpiarlo.

Los dos se apoyan en recorrer `children`: un wrapper que armara la lista dentro de un componente propio quedaría fuera de ese alcance y mostraría el placeholder con el valor puesto. Los wrappers del repo arman sus `FormSelect.Item` inline.

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
