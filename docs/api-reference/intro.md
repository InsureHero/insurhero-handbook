# API Reference

Documentación completa de las APIs disponibles en InsureHero.

## Tipos de API

InsureHero expone dos tipos principales de APIs:

### 1. tRPC API (Interna)

API tipada utilizada por el dashboard interno. Proporciona:

- Type-safety end-to-end
- Autocompletado en el cliente
- Validación automática con Zod

**Endpoint**: `/api/trpc`

### 2. REST API (Shield - Externa)

API REST para integraciones externas. Incluye:

- Autenticación basada en tokens
- Versiones de API (v1, v2)
- Endpoints para diferentes canales (IA, Integrations)

**Base URL**: `/api/shield`

## Autenticación

Todas las APIs requieren autenticación:

- **tRPC**: Sesión de usuario a través de Supabase
- **REST API**: Token de API en header `Authorization: Bearer <token>`

## Versiones

La API Shield soporta múltiples versiones:

- **v1**: Versión estable actual
- **v2**: Versión en desarrollo con mejoras

## Estructura de Respuestas

### Respuestas Exitosas

```json
{
  "data": { ... },
  "status": "success"
}
```

### Respuestas de Error

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  },
  "status": "error"
}
```

## Rate Limiting

Las APIs tienen límites de rate limiting para prevenir abuso. Los límites se especifican en los headers de respuesta.
