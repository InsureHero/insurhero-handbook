# API Reference

Bienvenido al mapa de APIs de InsureHero. Aquí tienes **tres familias** distintas; cada una tiene su propia forma de autenticación y de leer la documentación.

## Cómo elegir por qué estás integrando

| Si desarrollas… | Empieza por… |
|-----------------|---------------|
| Pantallas del **dashboard** (React) | [tRPC API](./trpc-api.md) — sesión Supabase, tipos automáticos. |
| **Integraciones** de punta a punta (índice unificado) | [Integraciones](../integraciones/intro) — menú dedicado en la barra superior. |
| Un **partner** o sistema que llama por HTTP con API key / JWT | [Shield (API nativa)](./shield/intro.md) — secuencia authorize → Bearer. |
| El **portal del titular** (postventa, OTP) | [API Post-sales](./postsales-api.md) — JWT `POSTSALES_*`. |
| Jobs, **dispatch** de emisión, webhooks internos | [Superficies REST](./rest-superficies.md) + [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md). |

## Secuencia global (mental model)

<figure class="diagram-figure">
  <img
    class="diagram-asset"
    src="/img/diagrams/api-reference-modelo-global.svg"
    alt="Diagrama: Dashboard tRPC, Shield y Post-sales apuntan al núcleo Supabase"
    loading="lazy"
  />
  <figcaption class="diagram-caption">
    Fuente: <code>diagrams/api-reference-modelo-global.mmd</code> — <code>yarn diagrams:build</code>. Clic en el diagrama para ampliarlo.
  </figcaption>
</figure>

## Tipos de API

### 1. tRPC (interna)

- **Quién**: aplicación web autenticada con usuario Supabase.
- **Cómo**: `trpc.<router>.<procedimiento>` desde React; ver [tRPC API](./trpc-api.md).
- **Endpoint HTTP**: `POST /api/trpc`.

### 2. Shield (REST externa)

- **Quién**: integraciones B2B, scripts, otros backends.
- **Cómo**: primero **token** (según rama v1 / ia / integrations), luego `Authorization: Bearer`; ver [Shield (API nativa)](./shield/intro.md).
- **Base**: `/api/shield`.
- **Menú lateral**: en **API Reference** verás Shield, Superficies REST y Post-sales en el mismo panel (documentación nativa).

### 3. Post-sales

- **Quién**: portal del asegurado (titular).
- **Cómo**: OTP → JWT dedicado → rutas bajo `/api/postsales/v1`; ver [API Post-sales](./postsales-api.md).

### 4. Otras superficies

Integraciones de emisión (`/api/integrations/...`), pagos, workflows: [Superficies REST](./rest-superficies.md).

## Autenticación (resumen)

- **tRPC**: cookie de sesión Supabase (el usuario ya inició sesión en el dashboard).
- **Shield v1**: `x-api-key` en authorize → JWT para el resto de llamadas.
- **Post-sales**: JWT propio en `Authorization` tras verificar OTP.

## Versiones Shield

Existen ramas **v1**, **v2**, **ia** e **integrations** con contratos paralelos. Detalle en [Shield (API nativa)](./shield/intro.md).

## Respuestas

Los handlers usan utilidades comunes (`ShieldResponse`, etc.); el formato exacto depende del endpoint. En errores, revisa **código HTTP** + cuerpo JSON con `details` o mensaje de validación.

## Rate limiting

Si está habilitado en despliegue, puede aparecer información en cabeceras `X-RateLimit-*`.

## Siguiente lectura

1. [tRPC API](./trpc-api.md) — diagrama de secuencia y ejemplos con `integrationEmissions`.
2. [Shield (API nativa)](./shield/intro.md) — `curl` de ejemplo para authorize y risk-items.
3. [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md) — flujo dispatch → adaptadores.
