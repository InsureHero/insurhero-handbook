---
displayed_sidebar: integracionesSidebar
---

# Orquestador y arquitectura de integraciones

Esta página describe **cómo el orquestador conecta el core de InsureHero con sistemas externos** (aseguradoras y APIs), alineada con el diagrama de arquitectura del equipo y con el código en `apps/next/src/integrations/`. El objeto de negocio que se serializa hacia el orquestador es el **risk item** vía **`StandardRiskItem`**; contexto amplio en [Risk item](./risk-item.md).

## Diagrama de arquitectura

Abajo está la **imagen de referencia del equipo**. **Haz clic en la imagen o en la barra** para **desplegar** la versión **vectorial (Mermaid)** que mantenemos en el handbook: misma idea de arquitectura, texto nítido al hacer zoom y fuente editable en el repo.

<details class="architecture-compare">
  <summary class="architecture-compare__summary">
    <figure class="diagram-figure diagram-figure--reference">
      <img
        src="/img/arquitectura-orquestador-integraciones.png"
        alt="Diagrama de arquitectura InsureHero (referencia del equipo): partners, canales, core, orquestador, integraciones"
        loading="lazy"
      />
      <figcaption class="diagram-caption">
        Referencia visual del lienzo (PNG). <strong>Clic aquí para ver la versión Mermaid del handbook debajo.</strong> Coloca el archivo en <code>static/img/arquitectura-orquestador-integraciones.png</code> si aún no está en el repo.
      </figcaption>
    </figure>
  </summary>
  <div class="architecture-compare__panel">
    <div class="architecture-compare__lead">Versión generada desde el código de documentación (comparar con la imagen de arriba):</div>
    <figure class="diagram-figure">
      <img
        class="diagram-asset"
        src="/img/diagrams/arquitectura-plataforma-integraciones.svg"
        alt="Arquitectura: partners, canales, Supabase, Shield, core, orquestador, adaptadores, contrato emitido, errores, Discord y pila de reintentos"
        loading="lazy"
      />
      <figcaption class="diagram-caption">
        Fuente: <code>diagrams/arquitectura-plataforma-integraciones.mmd</code> — <code>yarn diagrams:build</code>. Clic en el diagrama para ampliarlo (zoom nítido, SVG).
      </figcaption>
    </figure>
  </div>
</details>

_Los bloques “Adaptador X / Y / Z” en el diagrama representan **proveedores adicionales** que se pueden registrar en el mismo patrón; en el repositorio actual el registro incluye **Phoenix** y **AMA** (ver [Registro de adaptadores](#registro-de-adaptadores))._

## Secuencia resumida (ventas → dispatch)

Este diagrama muestra el camino **desde que el core tiene un risk item** hasta **emisión o cola de reintentos** (simplificado):

<figure class="diagram-figure">
  <img
    class="diagram-asset"
    src="/img/diagrams/dispatch-orquestador.svg"
    alt="Flujo: dispatch → sales_integration_slug → orquestador → éxito, abandonado o reintento con QStash"
    loading="lazy"
  />
  <figcaption class="diagram-caption">
    Vista gráfica del flujo. Fuente editable: <code>diagrams/dispatch-orquestador.mmd</code> — regenerar con <code>yarn diagrams:build</code>. Clic en el diagrama para ampliarlo.
  </figcaption>
</figure>

## Rol del orquestador

La función **`orchestrateInsuranceEmission`** (`integrations/orchestrator/engine.ts`) es la **única puerta** desde el core hacia la emisión en sistemas externos:

1. Recibe un **`StandardRiskItem`** ya normalizado (mismo contrato que consume Shield/APIs y el dispatch).
2. Resuelve el proveedor (`options.provider`, p. ej. `PHOENIX`, `AMA`).
3. Obtiene el adaptador con **`getInsuranceAdapter(provider)`** desde el **registro** (`integrations/registry.ts`).
4. Ejecuta **`adapter.emit(riskItem, { accessToken })`**.
5. Devuelve un **`OrchestratorResult`**: `SUCCESS` con datos del adaptador, o `FAILED` con código/mensaje estable (incluido `INTERNAL_ORCHESTRATOR_ERROR` si explota el adaptador).

El comentario en código resume el diseño: el **core permanece agnóstico** de la aseguradora concreta; la variación vive en los **adaptadores** y en las **capas de mapeo** hacia cada API externa.

## Contrato de entrada: `StandardRiskItem`

Definido en `integrations/contracts/insurance-adapter.contract.ts`. Es el **modelo canónico** que sale del core (risk item + paquete + sujeto asegurado, beneficiarios, reclamantes autorizados, metadata).

Campos relevantes para integraciones:

- **`uid`**: referencia externa estable para trazas y logs.
- **`package_id`**: enlaza con configuración de integración en el paquete (`sales_integration_slug` / `post_sales_integration_slug` en flujos distintos).
- **`insured_subject`**, **`beneficiaries`**, **`authorized_claimants`**: datos de negocio que cada adaptador mapea a su payload.

Cualquier nueva integración debe **rellenar o transformar hacia** este contrato antes de llamar al orquestador.

## Registro de adaptadores

`registry.ts` mapea slug en mayúsculas → clase adaptadora:

| Slug | Clase | Notas |
|------|--------|--------|
| `PHOENIX` | `PhoenixAdapter` | Lee `auth_config` de `integrations` donde `slug = 'PHOENIX'`. |
| `AMA` | `AmaAdapter` | Lee `auth_config` donde `slug = 'AMA'`. |

Añadir **Adapter X / Y** en el diagrama equivale a: implementar `InsuranceAdapter`, registrar en `ADAPTERS` y configurar filas en la tabla **`integrations`** en Supabase.

## Capa de mapeo por proveedor (integraciones)

### Phoenix

- **`PhoenixAdapter`** elige un **cliente HTTP** según la variante del producto (`MIA_TRAVEL`, `MIA_HEALTH`, `MIA_HOME`, `MIA_LIFESTYLE`) y usa **mappers** dedicados (`mapToPhoenixHealthContract`, etc.) — esto es la **“Mapping Layer”** del bloque Phoenix del diagrama.
- Autenticación y catálogo se apoyan en `auth_config` y datos resueltos desde BD dentro del adaptador.

### AMA

- **`AmaAdapter`** usa **`mapBeneficiariesToAma`** y tipos propios (`AmaCreateHolderRequest`, etc.) para construir las peticiones al cliente AMA.

En ambos casos, el adaptador traduce **`StandardRiskItem` → API externa** y **`EmissionResponse` → resultado unificado** (éxito, `externalId`, errores tipados, `requestPayload` para depuración).

## Cómo entra el flujo desde el core

### Emisión en ventas (webhook / dispatch)

**`POST /api/integrations/dispatch`** (autenticación con **service role**):

1. Recibe el `record` del risk item (p. ej. desde trigger Supabase).
2. Lee **`sales_integration_slug`** del **paquete**; si no hay, termina con `skipped`.
3. Construye un **`StandardRiskItem`** desde el registro.
4. Llama **`orchestrateInsuranceEmission(riskItem, { provider: salesIntegrationSlug })`**.
5. Persiste en **`integration_emissions`**: éxito, fallo **reintentable** o **abandonado** (`ABANDONED`), con **`error_history`**, **`next_retry_at`**, intentos.
6. Notifica a **Discord** en fallos reintentables y en abandonados (`notifyIntegrationEmissionDiscord`).
7. Si el fallo es reintentable y existe **`QSTASH_TOKEN`**, encola un reintento diferido hacia **`/api/integrations/retry`** (Upstash QStash, delay configurable).
8. Actualiza **`risk_items.metadata.integration`** con estado, `externalId`, `emissionId` y error.

Esto materializa en código el esquema del diagrama: **Orquestador → Integraciones → Contrato emitido** o **Manejador de errores → Discord + pila de fallidos / reintentos**.

### Postventa (JWT post-sales)

**`POST /api/integrations/post-sales`**: valida JWT post-sales, obtiene **`post_sales_integration_slug`** del paquete y llama al mismo orquestador. Mismo contrato `StandardRiskItem`, distinto campo de configuración en el paquete.

### Backoffice (tRPC)

**`integrationEmissions`**: consulta emisiones por risk item, **`retryEmissions`** y **`syncBeneficiaries`** delegan en lógica de reintento/emisión (`retryFromBackoffice`, `executeEmission`) para **gestionar reintentos** desde el dashboard (coherente con la “pila” del diagrama).

## Estados y reintentos (tabla `integration_emissions`)

| Estado en código | Significado aproximado |
|------------------|-------------------------|
| `SUCCESS` | Emisión aceptada por el adaptador; se guardan `external_id` y respuesta. |
| `FAILED` (reintentable) | Error de red/5xx/etc.; `next_retry_at` y posible cola QStash. |
| `ABANDONED` | Error no reintentable; se notifica a Discord; sin reintento automático. |

La lógica **`isRetryableError`** en `dispatch/route.ts` define qué errores pueden volver a la cola.

## Relación con otros documentos

- [Integraciones (código)](./integraciones.md) — panorama del monorepo.
- [Notificaciones, skills y Supabase Edge](./notificaciones-skills-supabase.md) — reportes por skill `notification.integration.error` (complemento al Discord en tiempo real).
- [API Post-sales](../api-reference/postsales-api.md) — OTP, JWT y ruta `integrations/post-sales`.
