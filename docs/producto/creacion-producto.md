# Cómo Crear un Producto en InsureHero

Esta guía explica paso a paso cómo crear un producto de seguro en InsureHero, desde la cobertura base hasta la emisión de una póliza. Está diseñada para usuarios que se están familiarizando con la plataforma.

## ¿Qué es un Producto de Seguro?

Un **producto de seguro** en InsureHero es el resultado final que puedes vender a tus clientes. Para crear un producto completo, necesitas construir varios componentes en un orden específico, como si estuvieras construyendo una casa: primero los cimientos, luego las paredes, después el techo, y finalmente puedes habitar la casa.

## El Proceso de Creación: De la Cobertura a la Póliza

El proceso de creación sigue este orden lógico:

**Canal → Cobertura → Variante → Paquete → Producto → Póliza**

Cada paso construye sobre el anterior, agregando más detalles y configuraciones.

---

## Paso 0: Configurar el Canal (Channel) 🔵

### ¿Qué es un Canal?

El **Canal** es tu espacio de trabajo en InsureHero. Define la configuración base que afectará a todos los productos que crees. **IMPORTANTE**: La moneda y el país del canal NO se pueden cambiar después de crearlo.

### Campos en la Base de Datos

Según el schema de Supabase, un canal tiene estos campos principales:

| Campo | Tipo | Descripción | ¿Se puede cambiar? |
|-------|------|-------------|-------------------|
| `id` | `uuid` | Identificador único generado automáticamente | No |
| `name` | `text` | Nombre del canal (ej: "Mi Aseguradora") | Sí |
| `currency_id` | `uuid` | **Moneda del canal** (FK a tabla `currencies`) | ❌ **NO** |
| `country_id` | `uuid` | **País de operación** (FK a tabla `countries`) | ❌ **NO** |
| `api_key` | `uuid` | Clave de API para integraciones | Generado automáticamente |
| `status` | `text` | Estado: 'ACTIVE' o 'INACTIVE' | Sí |
| `email` | `text` | Email de contacto | Sí |
| `phone_number` | `text` | Teléfono de contacto | Sí |
| `is_broker` | `boolean` | Si el canal es un broker | Sí |
| `production` | `boolean` | Si está en producción | Sí |

### Ejemplo Real

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Seguros ABC",
  "currency_id": "123e4567-e89b-12d3-a456-426614174000",  // USD
  "country_id": "789e0123-e45b-67c8-d901-234567890abc",  // México
  "api_key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "ACTIVE",
  "email": "contacto@segurosabc.com",
  "phone_number": "+52 55 1234 5678",
  "is_broker": false,
  "production": true
}
```

### ⚠️ Importante

- **`currency_id`** y **`country_id`** son campos **inmutables** una vez creado el canal
- Todos los productos, paquetes, variantes y coberturas creados en este canal usarán esta moneda y país
- Si necesitas operar en otro país o moneda, debes crear un nuevo canal

---

## Paso 1: Crear una Cobertura (Coverage) 🔴

### ¿Qué es una Cobertura?

La **Cobertura** es el cimiento de todo. Es el tipo básico de seguro que ofrece una aseguradora. Piensa en ella como la "materia prima" del seguro. Una cobertura representa un producto de seguro adquirido de una compañía aseguradora.

### Campos en la Base de Datos

Según el schema de Supabase (`coverages` table):

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | `uuid` | Identificador único (PK) | Auto-generado |
| `channel_id` | `uuid` | Canal al que pertenece (FK) | ✅ Sí |
| `name` | `text` | Nombre de la cobertura | ✅ Sí |
| `type` | `text` | Tipo de cobertura (ej: "AUTO", "LIFE", "HEALTH") | No |
| `description` | `text` | Descripción detallada | No |
| `insurer_id` | `uuid` | Aseguradora que proporciona la cobertura (FK) | No |
| `insurer_coverage_number` | `text` | **Número de cobertura del asegurador** | ✅ Sí |
| `country_id` | `uuid` | País específico (opcional, limita la cobertura) | No |
| `uid` | `text` | Identificador externo único (opcional) | No |
| `metadata` | `jsonb` | Metadatos adicionales (default: `{}`) | No |

### Identificadores

- **`id`**: UUID generado automáticamente por la base de datos
- **`uid`**: Identificador externo que puedes definir (ej: "COV-AUTO-001")
- **`insurer_coverage_number`**: Número que usa la aseguradora para identificar esta cobertura

### Ejemplo Real con Datos del Schema

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "channel_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Seguro de Vehículo Automotor",
  "type": "AUTO",
  "description": "Cobertura básica para vehículos automotores que incluye responsabilidad civil y daños materiales",
  "insurer_id": "insurer-uuid-123",
  "insurer_coverage_number": "AUTO-2024-001",
  "country_id": null,
  "uid": "COV-AUTO-001",
  "metadata": {
    "category": "automotive",
    "min_age": 18,
    "max_age": 75
  }
}
```

### ¿Qué información necesitas para crear una cobertura?

1. **Nombre**: Un nombre descriptivo (ej: "Seguro de Vehículo Automotor")
2. **Tipo**: El tipo de cobertura según el enum del sistema (MEDICAL, DENTAL, VISION, THEFT, ACCIDENT, FIRE, FLOOD, OTHER)
3. **Aseguradora**: Selecciona la compañía de seguros que proporciona esta cobertura
4. **Número de cobertura del asegurador**: Este es **obligatorio** y debe ser único según la aseguradora
5. **UID (opcional)**: Un identificador externo si necesitas referenciarlo desde otro sistema
6. **País (opcional)**: Si quieres limitar esta cobertura a un país específico

### ¿Por qué empezar aquí?

La cobertura contiene toda la información base que necesitarás más adelante. Es como tener los planos de una casa antes de construirla. **Sin una cobertura, no puedes crear variantes**.

---

## Paso 2: Crear una Variante (Variant) 🟢

### ¿Qué es una Variante?

Una **Variante** es una versión específica de una cobertura con precios, límites, deducibles y condiciones definidos. Una cobertura puede tener múltiples variantes (por ejemplo, "Básico", "Intermedio", "Premium"). La variante es donde defines **cuánto cuesta** y **qué cubre exactamente**.

### Campos en la Base de Datos

Según el schema de Supabase (`variants` table):

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | `uuid` | Identificador único (PK) | Auto-generado |
| `channel_id` | `uuid` | Canal al que pertenece (FK) | ✅ Sí |
| `coverage_id` | `uuid` | **Cobertura base** (FK a `coverages`) | ✅ Sí |
| `name` | `text` | Nombre de la variante | ✅ Sí |
| `description` | `text` | Descripción detallada | No |
| `gross_price` | `text` | **Precio base como expresión matemática** | ✅ Sí |
| `taxes` | `jsonb` | Array de impuestos aplicables | ✅ Sí |
| `markup` | `jsonb` | Margen de ganancia (array) | ✅ Sí |
| `coverage_limits` | `numeric` | Límite máximo de cobertura (default: 0) | No |
| `deductible` | `text` | Deducible (puede ser expresión) | No |
| `conditions` | `text` | Condiciones de la variante | ✅ Sí |
| `exclusions` | `text` | Exclusiones de la variante | ✅ Sí |
| `subject_schema` | `jsonb` | **Esquema del sujeto asegurado** | ✅ Sí |
| `claim_schema` | `jsonb` | Esquema para reclamos | No |
| `pricing_rules` | `jsonb` | Reglas de precios específicas | No |
| `pricing_type` | `text` | Tipo: "one_time" o "recurring" | No |
| `uid` | `text` | Identificador externo único | No |

### Identificadores

- **`id`**: UUID generado automáticamente
- **`uid`**: Identificador externo (ej: "VAR-AUTO-BASIC-001")
- **`coverage_id`**: Debe referenciar una cobertura existente

### Campos Clave Explicados

#### 1. `gross_price` (text - expresión matemática)

Es una **expresión matemática** que se evalúa dinámicamente usando los valores del `subject_schema`. Puede incluir variables como `age`, `vehicle_value`, etc.

**Ejemplos:**
- `"500"` - Precio fijo
- `"500 + (age * 10)"` - Precio base + $10 por cada año de edad
- `"1000 + (vehicle_value * 0.02)"` - Precio base + 2% del valor del vehículo

#### 2. `taxes` (jsonb - array de impuestos)

Array de objetos donde cada impuesto puede ser:
- **Tipo `rate`**: Porcentaje sobre el precio bruto
- **Tipo `value`**: Valor fijo

**Ejemplo:**
```json
[
  {
    "name": "IVA",
    "rate": "0.16",
    "type": "rate"
  },
  {
    "name": "Tasa Administrativa",
    "value": "50",
    "type": "value"
  }
]
```

#### 3. `markup` (jsonb - array de márgenes)

Array de objetos que representan márgenes de ganancia adicionales.

**Ejemplo:**
```json
[
  {
    "name": "Markup Canal",
    "gross_price": "100",
    "taxes": [
      {
        "name": "IVA Markup",
        "rate": "0.16",
        "type": "rate"
      }
    ]
  }
]
```

#### 4. `subject_schema` (jsonb - esquema del sujeto)

Define los campos requeridos para el sujeto asegurado. Se usa para:
- Validar datos al crear una póliza
- Calcular precios dinámicos usando variables en `gross_price`

**Ejemplo:**
```json
{
  "age": {
    "type": "number",
    "required": true,
    "label": "Edad del conductor"
  },
  "vehicle_value": {
    "type": "number",
    "required": true,
    "label": "Valor del vehículo"
  },
  "vehicle_year": {
    "type": "number",
    "required": true,
    "label": "Año del vehículo"
  },
  "license_years": {
    "type": "number",
    "required": false,
    "label": "Años con licencia"
  }
}
```

#### 5. `claim_schema` (jsonb - esquema de reclamos)

Define los campos requeridos para presentar un reclamo.

**Ejemplo:**
```json
{
  "incident_date": {
    "type": "date",
    "required": true,
    "label": "Fecha del incidente"
  },
  "incident_description": {
    "type": "text",
    "required": true,
    "label": "Descripción del incidente"
  },
  "damage_amount": {
    "type": "number",
    "required": true,
    "label": "Monto del daño"
  }
}
```

### Ejemplo Real Completo

```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "channel_id": "550e8400-e29b-41d4-a716-446655440000",
  "coverage_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Seguro Básico de Auto",
  "description": "Cobertura básica con límite de $50,000",
  "gross_price": "500 + (vehicle_value * 0.02)",
  "taxes": [
    {
      "name": "IVA",
      "rate": "0.16",
      "type": "rate"
    }
  ],
  "markup": [
    {
      "name": "Markup Canal",
      "gross_price": "50"
    }
  ],
  "coverage_limits": 50000,
  "deductible": "500",
  "conditions": "Vehículo no mayor a 10 años. Conductor con licencia vigente.",
  "exclusions": "No cubre daños por conducción bajo efectos del alcohol. No cubre carreras.",
  "subject_schema": {
    "age": {
      "type": "number",
      "required": true,
      "label": "Edad"
    },
    "vehicle_value": {
      "type": "number",
      "required": true,
      "label": "Valor del vehículo"
    }
  },
  "claim_schema": {
    "incident_date": {
      "type": "date",
      "required": true
    }
  },
  "uid": "VAR-AUTO-BASIC-001",
  "pricing_type": "recurring"
}
```

### Cálculo de Precio Final

El sistema calcula el precio así:

1. **Precio Base**: Evalúa `gross_price` usando valores del `subject_schema`
   - Ejemplo: Si `vehicle_value = 20000`, entonces: `500 + (20000 * 0.02) = 900`

2. **Aplicar Impuestos**: Calcula impuestos sobre el precio base
   - Ejemplo: `900 * 0.16 (IVA) = 144` → Precio con impuestos: `1044`

3. **Aplicar Markup**: Suma el markup
   - Ejemplo: `1044 + 50 = 1094`

4. **Precio Final Bruto**: `1094`
5. **Precio Neto**: `1094 - 144 = 950`

---

## Paso 3: Crear un Paquete (Package) 🟠

### ¿Qué es un Paquete?

Un **Paquete** agrupa una o más variantes relacionadas. Es como un "combo" que puedes ofrecer a tus clientes. Un paquete puede incluir múltiples variantes de diferentes coberturas (por ejemplo, un paquete "Auto Completo" puede incluir variante de auto + variante de robo + variante de responsabilidad civil).

### Campos en la Base de Datos

Según el schema de Supabase (`packages` table):

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | `uuid` | Identificador único (PK) | Auto-generado |
| `channel_id` | `uuid` | Canal al que pertenece (FK) | ✅ Sí |
| `name` | `text` | Nombre del paquete | ✅ Sí |
| `description` | `text` | Descripción del paquete | No |
| `uid` | `text` | Identificador externo único | No |
| `pricing_rules` | `jsonb` | **Reglas de precios del paquete** (default: `{}`) | No |

### Relación con Variantes

Los paquetes se relacionan con variantes a través de la tabla `packages_variants`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `uuid` | Identificador único |
| `package_id` | `uuid` | ID del paquete (FK) |
| `variant_id` | `uuid` | ID de la variante (FK) |
| `channel_id` | `uuid` | Canal (FK) |

**Relación**: Un paquete puede tener **muchas variantes** (N:M)

### `pricing_rules` (jsonb)

Define cómo se factura el paquete:

```json
{
  "pricing_type": "recurring",  // "one_time" o "recurring"
  "interval": "month",          // "day", "week", "month", "year"
  "interval_count": "1",        // Cada cuántos intervalos
  "billing_cycle": "start_of_month",  // "start_of_month", "end_of_month", "anniversary"
  "trial_period": "30"          // Días de prueba (opcional)
}
```

**Ejemplos:**
- **Pago único**: `{"pricing_type": "one_time"}`
- **Mensual**: `{"pricing_type": "recurring", "interval": "month", "interval_count": "1"}`
- **Anual**: `{"pricing_type": "recurring", "interval": "year", "interval_count": "1"}`

### Ejemplo Real Completo

```json
{
  "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "channel_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Paquete Auto Premium",
  "description": "Incluye cobertura de auto básica + robo + responsabilidad civil",
  "uid": "PKG-AUTO-PREMIUM-001",
  "pricing_rules": {
    "pricing_type": "recurring",
    "interval": "month",
    "interval_count": "1",
    "billing_cycle": "start_of_month",
    "trial_period": "30"
  }
}
```

**Variantes incluidas** (en tabla `packages_variants`):
- Variante "Seguro Básico de Auto" (`variant_id: b2c3d4e5...`)
- Variante "Seguro de Robo" (`variant_id: d4e5f6a7...`)
- Variante "Responsabilidad Civil" (`variant_id: e5f6a7b8...`)

---

## Paso 4: Crear un Producto (Product) 🟣

### ¿Qué es un Producto?

Un **Producto** es lo que finalmente puedes vender. Agrupa uno o más paquetes y define características generales del producto completo. El producto es la "casa completa" que puedes mostrar a tus clientes.

### Campos en la Base de Datos

Según el schema de Supabase (`products` table):

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | `uuid` | Identificador único (PK) | Auto-generado |
| `channel_id` | `uuid` | Canal al que pertenece (FK) | ✅ Sí |
| `code` | `text` | **Código único del producto** | ✅ Sí |
| `pricing` | `jsonb` | Configuración de precios general | ✅ Sí |
| `features` | `jsonb` | Características del producto | ✅ Sí |
| `lifecycle` | `jsonb` | Estados del ciclo de vida | ✅ Sí |
| `overrides` | `jsonb` | Modificaciones/sobrescrituras | ✅ Sí |

### Relación con Paquetes

Los productos se relacionan con paquetes a través de la tabla `products_packages`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `uuid` | Identificador único |
| `product_id` | `uuid` | ID del producto (FK) |
| `package_id` | `uuid` | ID del paquete (FK) |
| `channel_id` | `uuid` | Canal (FK) |

**Relación**: Un producto puede tener **muchos paquetes** (N:M)

### Campos JSONB Explicados

#### 1. `code` (text)
Código único que identifica el producto. Ejemplos: "AUTO-2024", "LIFE-PREMIUM-001"

#### 2. `pricing` (jsonb)
Configuración general de precios del producto (puede sobrescribir reglas de paquetes).

**Ejemplo:**
```json
{
  "currency": "USD",
  "discount_rules": {
    "early_bird": "0.10"
  }
}
```

#### 3. `features` (jsonb)
Características especiales del producto.

**Ejemplo:**
```json
{
  "mobile_app": true,
  "24_7_support": true,
  "online_claims": true,
  "telemedicine": false
}
```

#### 4. `lifecycle` (jsonb)
Estados del ciclo de vida del producto.

**Ejemplo:**
```json
{
  "states": ["draft", "active", "suspended", "archived"],
  "current_state": "active",
  "transitions": {
    "draft_to_active": "approval_required",
    "active_to_suspended": "admin_action"
  }
}
```

#### 5. `overrides` (jsonb)
Modificaciones que sobrescriben configuraciones de paquetes o variantes.

**Ejemplo:**
```json
{
  "package_overrides": {
    "PKG-AUTO-PREMIUM-001": {
      "pricing_rules": {
        "trial_period": "60"
      }
    }
  }
}
```

### Ejemplo Real Completo

```json
{
  "id": "d4e5f6a7-b8c9-0123-def4-567890123456",
  "channel_id": "550e8400-e29b-41d4-a716-446655440000",
  "code": "AUTO-2024",
  "pricing": {
    "currency": "USD",
    "discount_rules": {
      "annual_payment": "0.15"
    }
  },
  "features": {
    "mobile_app": true,
    "24_7_support": true,
    "online_claims": true,
    "roadside_assistance": true
  },
  "lifecycle": {
    "states": ["draft", "active", "suspended"],
    "current_state": "active"
  },
  "overrides": {}
}
```

**Paquetes incluidos** (en tabla `products_packages`):
- Paquete "Auto Premium" (`package_id: c3d4e5f6...`)
- Paquete "Auto Básico" (`package_id: f6a7b8c9...`)

---

## Paso 5: Emitir una Póliza (Policy) 📄

### ¿Qué es una Póliza?

Una **Póliza** es el contrato individual que se emite a un cliente específico basado en un producto. Es como la "escritura" de la casa para un comprador específico. La póliza se crea cuando un cliente decide comprar un producto.

### Campos en la Base de Datos

Según el schema de Supabase (`policies` table):

| Campo | Tipo | Descripción | Requerido |
|-------|------|-------------|-----------|
| `id` | `uuid` | Identificador único (PK) | Auto-generado |
| `channel_id` | `uuid` | Canal (FK) | ✅ Sí |
| `holder_id` | `uuid` | **Cliente titular** (FK a `users`) | ✅ Sí |
| `policy_number` | `text` | **Número de póliza único** | ✅ Sí |
| `version` | `smallint` | Versión de la póliza (default: 1) | ✅ Sí |
| `uid` | `text` | Identificador externo único | No |
| `product` | `jsonb` | **Producto completo** (snapshot) | ✅ Sí |
| `coverages` | `jsonb` | **Coberturas incluidas** (snapshot) | ✅ Sí |
| `subject_schema` | `jsonb` | **Datos del sujeto asegurado** | ✅ Sí |
| `total_gross_price` | `text` | **Precio total calculado** | ✅ Sí |
| `metadata` | `jsonb` | Metadatos adicionales (default: `{}`) | No |
| `features` | `jsonb` | Características activas (default: `[]`) | No |
| `attachments` | `jsonb` | Archivos adjuntos (default: `[]`) | No |
| `max_rescission_window` | `text` | Ventana de cancelación (días) | No |

### Identificadores

- **`id`**: UUID generado automáticamente
- **`policy_number`**: Número único de póliza (ej: "POL-2024-001234")
- **`uid`**: Identificador externo (opcional)

### Campos Clave Explicados

#### 1. `product` (jsonb - snapshot completo)

Es un **snapshot** del producto al momento de crear la póliza. Incluye toda la estructura: paquetes, variantes, coberturas, precios, etc. Esto asegura que si el producto cambia después, la póliza mantiene la información original.

#### 2. `coverages` (jsonb - snapshot de coberturas)

Snapshot de todas las coberturas incluidas en la póliza con sus variantes y precios calculados.

#### 3. `subject_schema` (jsonb - datos del cliente)

Contiene los **valores reales** del sujeto asegurado que se usaron para calcular el precio.

**Ejemplo:**
```json
{
  "age": 35,
  "vehicle_value": 25000,
  "vehicle_year": 2020,
  "license_years": 10
}
```

#### 4. `total_gross_price` (text - precio final)

Precio total calculado como expresión matemática que suma todos los precios de las variantes incluidas.

**Ejemplo:** `"1094 + 200 + 150"` (suma de todas las variantes del paquete)

### Ejemplo Real Completo

```json
{
  "id": "e5f6a7b8-c9d0-1234-ef56-789012345678",
  "channel_id": "550e8400-e29b-41d4-a716-446655440000",
  "holder_id": "user-uuid-123",
  "policy_number": "POL-2024-001234",
  "version": 1,
  "uid": "POL-ABC-001234",
  "product": {
    "id": "d4e5f6a7-b8c9-0123-def4-567890123456",
    "code": "AUTO-2024",
    "packages": {
      "Paquete Auto Premium": {
        "coverages": {
          "Seguro de Vehículo": ["Seguro Básico de Auto"],
          "Seguro de Robo": ["Seguro de Robo Básico"]
        }
      }
    }
  },
  "coverages": {
    "Seguro de Vehículo": [
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "name": "Seguro Básico de Auto",
        "gross_price": "1094",
        "coverage_limits": 50000
      }
    ]
  },
  "subject_schema": {
    "age": 35,
    "vehicle_value": 25000,
    "vehicle_year": 2020
  },
  "total_gross_price": "1094 + 200 + 150",
  "metadata": {
    "sales_channel": "web",
    "agent_id": "agent-123"
  },
  "features": ["mobile_app", "24_7_support"],
  "attachments": ["https://storage.../policy-doc.pdf"],
  "max_rescission_window": "30"
}
```

### ¿Cómo se calcula el precio de la póliza?

1. El cliente selecciona un **producto**
2. El cliente elige un **paquete** dentro del producto
3. El cliente completa el **`subject_schema`** con sus datos
4. El sistema:
   - Toma todas las **variantes** del paquete
   - Calcula el precio de cada variante usando `gross_price` + `taxes` + `markup`
   - Suma todos los precios → `total_gross_price`
5. Se crea la póliza con todos estos datos como **snapshot**

---

## Diagrama de Flujo del Proceso de Creación

import FlujoCreacionProducto from '@site/src/components/FlujoCreacionProducto';

<FlujoCreacionProducto />

## Estructura Visual Completa

import EstructuraCreacionProducto from '@site/src/components/EstructuraCreacionProducto';

<EstructuraCreacionProducto />

---

## Resumen de Identificadores y Relaciones

### Identificadores por Nivel

| Nivel | Campo `id` | Campo `uid` | Otros Identificadores |
|-------|------------|-------------|----------------------|
| **Canal** | `uuid` (auto) | - | `api_key` (uuid) |
| **Cobertura** | `uuid` (auto) | `text` (opcional) | `insurer_coverage_number` (text, requerido) |
| **Variante** | `uuid` (auto) | `text` (opcional) | - |
| **Paquete** | `uuid` (auto) | `text` (opcional) | - |
| **Producto** | `uuid` (auto) | - | `code` (text, requerido) |
| **Póliza** | `uuid` (auto) | `text` (opcional) | `policy_number` (text, requerido) |

### Relaciones en la Base de Datos

```
CHANNEL (1) ──→ (N) COVERAGE
CHANNEL (1) ──→ (N) VARIANT
CHANNEL (1) ──→ (N) PACKAGE
CHANNEL (1) ──→ (N) PRODUCT
CHANNEL (1) ──→ (N) POLICY

COVERAGE (1) ──→ (N) VARIANT

VARIANT (N) ←──→ (N) PACKAGE  [tabla: packages_variants]

PACKAGE (N) ←──→ (N) PRODUCT   [tabla: products_packages]

PRODUCT (1) ──→ (N) POLICY
```

---

## Ejemplo Completo: Seguro de Auto

### Paso 0: Canal
```json
{
  "name": "Seguros ABC",
  "currency_id": "USD-uuid",
  "country_id": "MEX-uuid"
}
```

### Paso 1: Cobertura
```json
{
  "name": "Seguro de Vehículo Automotor",
  "type": "AUTO",
  "insurer_coverage_number": "AUTO-2024-001",
  "insurer_id": "insurer-uuid"
}
```

### Paso 2: Variantes
```json
// Variante 1: Básico
{
  "coverage_id": "coverage-uuid-1",
  "name": "Seguro Básico de Auto",
  "gross_price": "500 + (vehicle_value * 0.02)",
  "coverage_limits": 30000,
  "deductible": "500"
}

// Variante 2: Premium
{
  "coverage_id": "coverage-uuid-1",
  "name": "Seguro Premium de Auto",
  "gross_price": "800 + (vehicle_value * 0.03)",
  "coverage_limits": 100000,
  "deductible": "200"
}
```

### Paso 3: Paquete
```json
{
  "name": "Paquete Auto Premium",
  "pricing_rules": {
    "pricing_type": "recurring",
    "interval": "month"
  }
}
// Incluye: Variante Básico + Variante Premium
```

### Paso 4: Producto
```json
{
  "code": "AUTO-2024",
  "features": {
    "mobile_app": true,
    "24_7_support": true
  }
}
// Incluye: Paquete Auto Premium
```

### Paso 5: Póliza
```json
{
  "policy_number": "POL-2024-001234",
  "holder_id": "user-uuid",
  "product": { /* snapshot del producto */ },
  "subject_schema": {
    "age": 35,
    "vehicle_value": 25000
  },
  "total_gross_price": "1300 + 200"  // Calculado automáticamente
}
```

---

## Preguntas Frecuentes

### ¿Puedo crear un producto sin paquetes?
No. Un producto necesita al menos un paquete para poder venderse.

### ¿Puedo crear un paquete sin variantes?
No. Un paquete necesita al menos una variante para tener contenido.

### ¿Puedo crear una variante sin cobertura?
No. Una variante siempre está basada en una cobertura existente (`coverage_id` es requerido).

### ¿Cuántas variantes puede tener una cobertura?
Tantas como necesites. Por ejemplo, puedes tener "Básico", "Intermedio", "Premium", "VIP", etc.

### ¿Cuántos paquetes puede tener un producto?
Tantos como quieras. Esto te permite ofrecer diferentes opciones a tus clientes.

### ¿El precio se calcula automáticamente?
Sí. El sistema calcula el precio final basándose en:
1. El precio base de la variante (`gross_price` como expresión)
2. Los datos del cliente (`subject_schema`)
3. Los impuestos configurados (`taxes`)
4. El markup (`markup`)

### ¿Puedo cambiar la moneda o país después de crear el canal?
❌ **NO**. `currency_id` y `country_id` son campos **inmutables** en el canal. Si necesitas otra moneda o país, crea un nuevo canal.

### ¿Qué es un `uid`?
Un `uid` (Unique Identifier) es un identificador externo opcional que puedes usar para referenciar elementos desde otros sistemas. No es requerido, pero es útil para integraciones.

### ¿Qué es un snapshot en la póliza?
Un snapshot es una copia completa de los datos al momento de crear la póliza. Esto asegura que si cambias el producto después, la póliza mantiene la información original con la que se emitió.

---

## Consejos para Usuarios Nuevos

1. **Empieza simple**: Crea primero una cobertura, una variante, un paquete y un producto básico para entender el flujo.

2. **Usa nombres descriptivos**: Esto te ayudará a identificar rápidamente cada elemento.

3. **Prueba el cálculo de precios**: Crea una variante de prueba y verifica que el precio se calcule correctamente usando diferentes valores en `subject_schema`.

4. **Revisa las condiciones y exclusiones**: Asegúrate de que estén claras para evitar malentendidos con clientes.

5. **Guarda tus configuraciones**: Una vez que tengas un producto funcionando, puedes usarlo como plantilla para crear otros similares.

6. **Usa `uid` para integraciones**: Si necesitas integrar con otros sistemas, usa el campo `uid` para mantener referencias consistentes.

7. **Planifica tu canal**: Antes de crear el canal, asegúrate de la moneda y país correctos, ya que no se pueden cambiar después.

---

## Siguiente Paso

Una vez que hayas creado tu primer producto, puedes:
- Emitir pólizas para tus clientes
- Gestionar las pólizas activas
- Procesar reclamos
- Ver reportes y estadísticas

Para más información técnica sobre la estructura, consulta la [Estructura Jerárquica de Productos](../arquitectura/estructura-jerarquica-productos.md) en la sección de Arquitectura.
