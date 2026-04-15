---
displayed_sidebar: guiasDesarrolloSidebar
sidebar_position: 3
---

# Interfaces y contratos TypeScript

Cómo definir **tipos e interfaces** nuevos sin fragmentar el modelo de dominio: dónde colocarlos, cómo alinearlos con el **orquestador** y cuándo usar **Zod** en los bordes (HTTP, tRPC).

## Dónde viven los tipos

| Ubicación | Uso típico |
|-----------|------------|
| **`packages/types`** | Tipos compartidos entre apps, contratos estables, reexportaciones. Tras cambios: `yarn compile` en el workspace. |
| **`apps/next/src/types`** (o equivalente) | Tipos **solo del front** o capa de presentación cuando no deben ir al paquete compartido. |
| **`src/integrations/contracts/`** | Contratos de integración: p. ej. forma del **`InsuranceAdapter`**, payloads hacia/desde adaptadores. No mezclar con tipos de UI. |
| **Tipos generados (Supabase)** | Entidades y filas de BD; no duplicar a mano si el generador ya los produce. |

Regla práctica: si **dos módulos** (por ejemplo `trpc` y una `route.ts`) necesitan el mismo shape de dominio, el tipo **sube** a `packages/types` o al contrato compartido que ya use el core.

## Contrato del adaptador (`InsuranceAdapter`)

Los adaptadores de aseguradora implementan el contrato definido en el código (p. ej. `integrations/contracts/insurance-adapter.contract.ts` — nombre exacto según repo). Al añadir un proveedor:

1. Implementar la interfaz **completa** esperada (emit, manejo de errores coherentes con el orquestador).
2. Registrar el slug en **`registry.ts`** en **MAYÚSCULAS**, alineado con la fila `integrations.slug` y con `sales_integration_slug` / `post_sales_integration_slug` en el paquete.

Detalle de dominio del objeto que viaja: [Risk item](../arquitectura/risk-item.md) y [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md) (`StandardRiskItem`).

## Interfaces públicas vs internas

- **API Shield / REST**: define **entrada y salida** pensando en clientes externos; usa **Zod** (o validación equivalente) en el handler y tipos inferidos (`z.infer<typeof schema>`).
- **tRPC**: mismos límites — `input` con Zod en `protectedProcedure` / `publicProcedure`; el tipo inferido es la fuente de verdad para el cliente.
- **Props de componentes React**: interfaces `FooProps` junto al componente o en `types` locales; no reexportar desde ahí modelos de BD crudos si el componente solo necesita 3 campos — **mapear** a un DTO de vista.

## Nuevas interfaces de dominio

Cuando introduces un concepto nuevo (p. ej. un subestado de emisión o un campo de metadata):

1. Comprueba si encaja en **metadata JSON** existente del risk item o si requiere **migración** y tipo en `packages/types`.
2. Si solo afecta a **un adaptador**, puede vivir en el módulo del adaptador **siempre que** el orquestador siga recibiendo el contrato unificado hacia fuera.
3. Documenta el **contrato serializado** si cruza la API (campos opcionales, nombres estables).

## Zod en APIs

Patrón recomendado en rutas y tRPC:

- Un **schema Zod** por operación (`createXSchema`, `queryXSchema`).
- **No** confiar en `as` sobre JSON crudo sin validar.
- Mensajes de error **estables** para clientes automatizados (códigos HTTP + cuerpo coherente con el resto de Shield).

## Referencias cruzadas

- [Estructura base y extensión](./estructura-base-y-extension.md) — dónde encajan los cambios.
- [Nuevas rutas Shield](./nuevas-rutas-shield.md) — validación y namespaces.
- [Integraciones (código)](../arquitectura/integraciones.md) — tabla `integrations` y slugs.
