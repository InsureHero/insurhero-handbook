---
displayed_sidebar: guiasDesarrolloSidebar
---

# Landing page Vidanta (postventa)

Esta guía describe el **landing page de Vidanta**: el front donde el **titular** completa datos del viaje, gestiona viajeros y dispara la integración con aseguradoras vía la API post-sales de InsureHero. No es un “landing genérico”: está pensado para el **flujo Vidanta** (beneficiarios, viajeros, confirmación). El código **no** vive dentro del monorepo principal de InsureHero; es un repositorio aparte en tu máquina de desarrollo.

## Ubicación del repositorio

Ruta local habitual:

```text
/Users/work/Desktop/insurhero/landing page/landing-next
```

- Carpeta contenedora: `landing page` (puede incluir otros artefactos en el mismo directorio).
- **Aplicación documentada aquí**: el proyecto **`landing-next`** (Next.js). Es el que debes abrir en el IDE y donde ejecutas `yarn dev` / `yarn build`.

Nombre del paquete: **`insurhero-landing-next`** (`package.json`).

## Qué problema resuelve

El **landing Vidanta** sustituye correos estáticos por un **flujo guiado** alineado con la API **post-sales** del backend InsureHero:

1. El titular **identifica** su email (debe existir como beneficiario titular en un risk item activo).
2. **OTP** por correo → **JWT de sesión** post-sales (misma familia que documenta [API Post-sales](../api-reference/postsales-api.md)).
3. **Selección de póliza / viaje** y revisión de datos (`TripSummary`).
4. **Alta o edición de viajeros** (`AddTravelers`) con validaciones.
5. **Confirmación** y, cuando aplica, llamada a **`POST /api/integrations/post-sales`** para sincronizar con el orquestador (Phoenix, AMA, etc. según el paquete).

<figure class="diagram-figure">
  <img
    class="diagram-asset"
    src="/img/diagrams/landing-vidanta-flujo.svg"
    alt="Landing Vidanta: OTP y pasos contra post-sales; confirmación hacia integrations post-sales"
    loading="lazy"
  />
  <figcaption class="diagram-caption">
    Fuente: <code>diagrams/landing-vidanta-flujo.mmd</code> — <code>yarn diagrams:build</code>. Clic en el diagrama para ampliarlo.
  </figcaption>
</figure>

## Stack técnico

| Pieza | Detalle |
|-------|---------|
| Framework | **Next.js 15** con **App Router** |
| UI | **Tailwind CSS**, componentes estilo **shadcn** (`components/ui/`) |
| Datos async | **TanStack Query** (`providers`) |
| Idiomas | **EN / ES** (`contexts/LanguageContext.tsx`, `lib/translations.ts`) |
| Notificaciones | **Sonner** (toasts) |

## Estructura relevante (`landing-next/`)

| Ruta | Contenido |
|------|-----------|
| `app/` | Layout, `page.tsx`, estilos globales, providers |
| `components/BookingFlow.tsx` | Orquestación de pasos y estado del flujo |
| `components/steps/` | `OtpVerification`, `TripSummary`, `AddTravelers`, `Confirmation` |
| `services/auth.service.ts` | OTP, token JWT en `sessionStorage`, evento `auth:session-expired` |
| `services/risk_item.service.ts` | Llamadas a risk items post-sales |
| `services/post_sales.service.ts` | **`POST /api/integrations/post-sales`** tras actualizar beneficiarios |
| `docs/emission-error-catalog.csv` | Catálogo de códigos de error de emisión (mensajes usuario / severidad) |

## Variables de entorno

Copia `.env.example` a `.env.local` en `landing-next`:

| Variable | Rol |
|----------|-----|
| **`NEXT_PUBLIC_API_BASE_URL`** | URL base del **backend** InsureHero (misma que sirve `/api/postsales/v1` y `/api/integrations/post-sales`). Ejemplo local: `http://localhost:3000` si el core corre en el puerto 3000. |
| `NEXT_PUBLIC_PRIVACY_POLICY_URL` | (Opcional) Enlace a política de privacidad en el paso de viajeros. |

El prefijo `NEXT_PUBLIC_` expone la URL en el **cliente** del navegador; debe ser el origen público del API (CORS ya contemplado en rutas post-sales).

## Cómo ejecutarlo en local

Desde el directorio **`landing-next`**:

```bash
cd "/Users/work/Desktop/insurhero/landing page/landing-next"
yarn install
yarn dev
```

Abre [http://localhost:3000](http://localhost:3000) (puerto por defecto de Next; si está ocupado, Next sugiere otro).

Build de producción:

```bash
yarn build
yarn start
```

## Integración con el backend (referencia rápida)

- **Autenticación**: el servicio de auth usa la API post-sales documentada en [API Post-sales](../api-reference/postsales-api.md) (`/auth/otp/request`, `/auth/otp/verify`). El token se guarda como `shield_access_token` en **sessionStorage** (nombre histórico; es el JWT post-sales).
- **Post-integración**: `post_sales.service.ts` llama a  
  `{NEXT_PUBLIC_API_BASE_URL}/api/integrations/post-sales`  
  con el cuerpo del risk item y beneficiarios marcados con `action: "create" | "edit"`, **después** de persistir cambios en beneficiarios vía API.

Para el **flujo completo** servidor (dispatch, orquestador, adaptadores), ver [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md).

## Catálogo de errores de emisión

En el repo del landing:

- Archivo: **`docs/emission-error-catalog.csv`**
- Sirve para mapear `error_code` → mensaje al usuario, plantillas de correo y severidad; se puede editar en Excel y versionar en Git.

## Relación con la documentación de producto

El flujo de negocio “titular completa datos → emisión post-venta” también se resume en [Flujos e integraciones (producto)](../producto/flujos-e-integraciones.md).
