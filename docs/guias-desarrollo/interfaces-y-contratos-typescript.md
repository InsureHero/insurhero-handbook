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

## Tipos de base de datos (Supabase)

Las filas de BD **no se escriben a mano**: se generan contra el proyecto Supabase de **DEV** con

```bash
yarn gen:db-types
```

que reescribe `packages/types/src/types/generated-database.types.ts` (y encadena format + `yarn compile`). `database.types.ts` solo **re-exporta** lo generado — `export type Database = DatabaseGenerated;` más el helper `Tables<T>` — sin overrides manuales de tablas encima: el archivo generado es la única fuente de verdad del schema, y una tabla o columna que falte ahí se arregla **regenerando**, no parcheando el tipo.

Helpers disponibles desde `@insureHero/types`:

| Helper | Para qué |
|--------|----------|
| `Database` | Generic del cliente: `SupabaseClient<Database>`, `createClient<Database>(...)` |
| `Tables<"flows">` | Fila completa (`Row`) de una tabla |
| `TablesInsert<"workflows">` | Shape de un `insert` (respeta NOT NULL y defaults) |
| `TablesUpdate<"channel_connections">` | Shape de un `update` (campos opcionales) |
| `Json` | Columnas JSONB |

Reglas al escribir código que consulta Supabase:

- **Tipa el cliente.** Un helper que recibe el cliente declara `SupabaseClient<Database>`, no `SupabaseClient` pelado; con el genérico ausente, `.from(...)` cae en el overload `any` de postgrest-js y se pierde todo el chequeo aunque los tipos existan.
- **`select` parcial → `Pick`.** Si la consulta trae unas pocas columnas, tipa con `Pick<Tables<"flow_triggers">, "flow_id" | "filters">` en vez de redeclarar el shape a mano.
- **Nada de shims de tipos.** Patrones como `type Loose = { from: (table: string) => any }` o `data as unknown as MiFila[]` para esquivar tipos faltantes están fuera: `any` está prohibido (`strict: true` en todo el monorepo).
- **Los joins pueden necesitar un cast puntual** cuando el inferidor de Supabase no resuelve bien la relación (p. ej. un `!inner`). Se acota a esa expresión y se documenta; nunca se degrada el cliente completo.

### Zod y columnas obligatorias

El schema Zod del borde (tRPC / Shield) es el contrato de entrada: si no exige lo que la tabla exige, el `insert` solo compila a base de casts y el fallo aparece en runtime (o lo tapa un trigger con default). Al agregar o volver obligatoria una columna, actualiza también la validación y los formularios que la alimentan — hoy, por ejemplo, `v.workflow.insert()` exige `channel_id` y `validation_schema` en línea con el `Insert` real de `workflows`.

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
