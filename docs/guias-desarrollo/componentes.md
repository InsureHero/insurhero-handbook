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
    saveUser(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  );
};
```

## Reporte de errores de la UI

En la capa Experience **`console.*` no se usa**: ESLint lo prohíbe en `src/components/**`, `src/ui/**`, `src/hooks/**`, `src/stores/**` y las zonas de UI de `src/app` (raíz, `(dashboard)`, `(auth)`, `pay`, `verify`). Un `console.error` nuevo en esas carpetas —también pasado como callback— tumba `yarn lint`. Quedan fuera `src/app/api/**` y `src/app/middlewares/**`, que son Orchestration.

En su lugar hay dos helpers en `utils/clientReport.utils`:

| Helper | Cuándo usarlo | Qué hace |
|--------|---------------|----------|
| `reportClientError(error, options)` | Fallo real que el usuario ve (red, parseo, inserción, crash de render) | Emite un evento a Sentry |
| `addFormValidationBreadcrumb(component, fieldNames)` | Handler de error de `form.handleSubmit` | Deja un breadcrumb; **no** emite evento |

### Fallo real

```tsx
try {
  await sendMessage(payload);
} catch (error) {
  reportClientError(error, {
    component: "ChatComponent",
    action: "send-message",
    segment: "dashboard"
  });
  toast({ title: "Error", description: "…", variant: "destructive" });
}
```

`component` y `action` no son decorativos: forman el fingerprint del evento, o sea el bucket del issue en Sentry. La convención hay que respetarla porque cambiarlos después parte el historial del issue:

- `component`: nombre del componente en PascalCase, igual que el archivo.
- `action`: verbo en kebab-case de la operación que falló (`send-message`, `insert-risk-item`, `save-integration`).

Opcionales: `segment` (`"root" | "auth" | "dashboard"`), `route`, `digest` y `extra` (contexto libre que se mergea en `contexts.ui`). El helper **nunca propaga** —si el SDK está deshabilitado o el envío falla, la UI no se entera— y **no hace falta sanear lo que se pasa en `extra`**: la redacción de PII corre centralizada en `beforeSend` ([detalle](../integraciones/alertas-operacion.md#redacción-de-pii)).

### Fallos dentro de un loop

Reportar por iteración manda un evento por fila. Para eso está el acumulador:

```tsx
const failures = createFailureBucket();

for (const row of rows) {
  try {
    await insertRiskItem(row);
  } catch (error) {
    collectFailure(failures, error);
  }
}

reportFailureBucket(failures, {
  component: "ImportRiskItemsFromXLSXModal",
  action: "insert-risk-item",
  segment: "dashboard",
  totalRows: rows.length
});
```

Guarda el primer error y cuenta el resto; al cerrar la pasada emite **un solo** evento con `failedRows` y `totalRows` en el contexto. Si no hubo fallos no emite nada.

### Validación de formularios

Fallar una validación es el camino normal de un formulario, no un incidente: un campo mal configurado en un canal generaría cientos de eventos en un día. Va como breadcrumb, que no consume cuota y viaja adjunto si más tarde hay un crash real:

```tsx
<form
  onSubmit={form.handleSubmit(onSubmit, errors =>
    addFormValidationBreadcrumb("RiskItemForm", Object.keys(errors))
  )}
>
```

`Object.keys(errors)` da solo los **nombres** de los campos de primer nivel (en field arrays, el nombre del array). Alcanza para diagnóstico y garantiza que ningún valor tipeado por el usuario entre al payload.

### Crashes de segmento

Los `error.tsx` del App Router (raíz, `(auth)` y `(dashboard)`) delegan en `ErrorBoundary`, que reporta el crash en un `useEffect` y renderiza el mismo `MessageBoundary` de siempre. La prop `segment` es **requerida** y es la que termina en el tag `ui.segment`:

```tsx
"use client";
import { ErrorProps as Props } from "app/types";
import ErrorBoundary from "components/global/ErrorBoundary/ErrorBoundary";

const ErrorPage = (props: Props) => (
  <ErrorBoundary {...props} segment="dashboard" />
);

export default ErrorPage;
```

El boundary reporta siempre con `component: "ErrorBoundary"` y `action: "render-segment"` —no puede saber qué componente reventó— y el agrupado por stack lo resuelve el fingerprint. El crash del root layout lo cubre `app/global-error.tsx`, que reporta como `GlobalError` y toma la ruta de `window.location.pathname`, porque ahí el contexto del router ya no es confiable.

Configuración del SDK, filtros de ruido y variables de entorno: [Alertas y observabilidad](../integraciones/alertas-operacion.md#sentry).

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
