---
displayed_sidebar: integracionesSidebar
---

# Payment widget (repositorio aparte)

Aplicación **Next.js** dedicada a **embeber el flujo de pago Silice + Reef** en un **iframe** (o ventana hija) y coordinar el **padre** (landing, portal u otra app InsureHero) mediante **`postMessage`**. No vive en el monorepo principal; es un proyecto independiente, en la misma línea que el [landing Vidanta](../guias-desarrollo/landing-page-postventa.md) respecto al backend InsureHero.

## Ubicación del código

- Repositorio local habitual (ajusta a tu máquina): `~/Desktop/insurhero/payment-widget` (o la ruta donde clones el remoto).
- El código de la app suele estar bajo una carpeta interna **`payment-widget-main/`** (proyecto Next con `package.json` nombre **`payment-widget`**).

Comandos típicos dentro del proyecto:

```bash
npm install   # o yarn / pnpm
npm run dev
```

Por defecto la app sirve en **http://localhost:3000** (puerto según `next dev`).

## Qué problema resuelve

| Necesidad | Cómo lo cubre |
|-----------|----------------|
| **Aislar** el script y estilos del widget Reef (custom element `widget-pago`, JS/CSS externos) | App pequeña que solo monta el flujo de pago. |
| **Comunicar** la app contenedora (padre) sin acoplar código al monorepo `apps/next` | Contrato fijo de mensajes `IH_INIT_PAYMENT` / `IH_PAYMENT_RESULT`. |
| **Obtener token Silice** igual que el core | `POST` al backend InsureHero en `/api/payments/silice/token`. |

La lógica de negocio del cobro (órdenes, `processPayment`, suscripciones) sigue documentada en la ficha [Pagos: Silice y Reef](./silice-y-reef.md) y en [Superficies REST](../api-reference/rest-superficies.md).

## Flujo resumido

1. El **padre** incrusta el payment widget (iframe) apuntando al despliegue del proyecto (o `localhost` en desarrollo).
2. El padre envía **`postMessage`** con tipo **`IH_INIT_PAYMENT`** e importe, moneda, `orderId`, concepto, datos del cliente y metadatos **`riskItemId`** y **`channelId`**.
3. El widget valida el mensaje (Zod), llama al backend **`NEXT_PUBLIC_IH_BACKEND_URL/api/payments/silice/token`** y construye la config Reef (`buildReefConfig`), alineada con la idea de `reefWidget` en el monorepo.
4. Se inyectan CSS/JS del **Reef** (URLs hospedadas en S3), se crea el elemento **`widget-pago`** y se escuchan eventos del documento: **`widgetReady`**, **`widgetError`**, **`resultadoDisponible`**.
5. El resultado se devuelve al padre con **`postMessage`** tipo **`IH_PAYMENT_RESULT`** (`success`, `orderId`, `transactionId` o `error`).

## Variables de entorno

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| **`NEXT_PUBLIC_IH_BACKEND_URL`** | Sí | Origen del API InsureHero (sin barra final recomendada), p. ej. `https://<tu-app>.com`. El cliente llama a `…/api/payments/silice/token`. |

Opcional:

| Variable | Uso |
|----------|-----|
| **`NEXT_PUBLIC_SHOW_DEV_PANEL`** | Si es `true`, puede mostrarse el panel de prueba que simula el `postMessage` de inicio (además del comportamiento en `NODE_ENV === 'development'`). |

## Contrato de mensajes (padre ↔ iframe)

### Entrada: iniciar pago (`IH_INIT_PAYMENT`)

Validado con Zod en el widget. Campos del `payload`:

| Campo | Tipo | Notas |
|-------|------|--------|
| `amount` | number | Importe. |
| `currency` | `"USD"` \| `"MXN"` | Moneda. |
| `orderId` | string | Identificador de orden en tu flujo. |
| `concept` | string | Descripción / concepto del cobro. |
| `customerEmail` | string (email) | Cliente. |
| `customerName` | string | Nombre mostrado en el recibo Reef. |
| `riskItemId` | string | Trazabilidad con el risk item en InsureHero. |
| `channelId` | string | Canal (UUID según tu modelo). |

### Salida: resultado (`IH_PAYMENT_RESULT`)

El iframe envía al **padre** (`window.parent.postMessage`):

| Campo | Descripción |
|-------|-------------|
| `success` | Si el flujo terminó correctamente. |
| `orderId` | Mismo `orderId` recibido al iniciar. |
| `transactionId` | Opcional; identificador devuelto en éxito (p. ej. detalle del evento `resultadoDisponible`). |
| `error` | Opcional; mensaje si `success === false`. |

## Integración con el backend InsureHero

- El token y metadatos de comercio vienen de la misma superficie que el core: **POST** hacia el token Silice bajo el prefijo documentado en [Superficies REST](../api-reference/rest-superficies.md) (`/api/payments/silice`, etc.).
- **`dataExtra`** en la config Reef incluye `riskItemId` y `channelId` para alinear con el modelo de negocio descrito en [Silice y Reef](./silice-y-reef.md).

## Recursos externos (Reef)

El widget carga **CSS y JS** desde un bucket S3 (DSP). Las URLs están definidas en el código del componente; si cambian en proveedor, hay que actualizar el repositorio del payment widget y desplegar de nuevo.

## Relación con el monorepo

| Monorepo `apps/next` | Payment widget |
|----------------------|----------------|
| `src/lib/reefWidget.ts`, `components/pay/` | Replica la idea de **`buildReefConfig`** y metadatos en un contexto **embebido por iframe**. |
| Misma API `/api/payments/silice/token` | Consumo desde el cliente del widget vía `fetch` al `IH_BACKEND_URL`. |

No dupliques lógica de negocio de órdenes en el widget: limita su responsabilidad a **UI de pago + postMessage**.

## Referencias

- [Pagos: Silice y Reef](./silice-y-reef.md)
- [Superficies REST](../api-reference/rest-superficies.md)
- [Flujos e integraciones (producto)](../producto/flujos-e-integraciones.md)
- [Guía técnica landing Vidanta](../guias-desarrollo/landing-page-postventa.md) (otro front fuera del monorepo que consume APIs InsureHero)
