# Autenticación y Autorización

InsureHero utiliza Supabase Auth para la gestión de autenticación y autorización.

## Flujo de Autenticación

### Autenticación de Usuarios

1. **Login**: Los usuarios se autentican a través de Supabase Auth
2. **Sesión**: Se mantiene una sesión JWT
3. **Middleware**: Next.js middleware valida la sesión en cada request

### Autenticación de API Externa (Shield API)

La API Shield utiliza un sistema de autenticación basado en tokens:

- **Authorization Header**: Token de API en el header `Authorization`
- **Validación**: Middleware valida el token antes de procesar requests
- **Blacklist**: Algunos endpoints están excluidos de autenticación (ej: `/api/shield/v1/auth`)

Referencia detallada (tokens por rama, namespaces, ejemplos): [Shield (API nativa)](../api-reference/shield/intro.md).

## Autorización

### Row Level Security (RLS)

Supabase RLS se utiliza para:

- Controlar acceso a nivel de fila en la base de datos
- Políticas basadas en roles de usuario
- Seguridad a nivel de base de datos

### Roles y Permisos

El sistema maneja diferentes roles:

- **Admin**: Acceso completo al sistema
- **Agent**: Acceso limitado a funcionalidades específicas
- **User**: Usuario final con acceso básico

## Middleware

El middleware de Next.js maneja:

1. **Common Middleware**: Validaciones generales
2. **Supabase Middleware**: Validación de sesión Supabase
3. **Shield Auth Middleware**: Validación de tokens API
4. **CORS Middleware**: Configuración de CORS

## Endpoints de Autenticación

### Dashboard (Interno)

- `/api/auth/callback`: Callback de OAuth
- Autenticación manejada por Supabase Auth Helpers

### Shield API (Externa)

- `/api/shield/v1/auth/authorize`: Autorización de clientes
- `/api/shield/ia/v1/auth/validator`: Validación de tokens
- `/api/shield/integrations/v1/auth/authorize`: Autorización de integraciones
