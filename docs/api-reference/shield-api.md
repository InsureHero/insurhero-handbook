# Shield API (REST)

API REST para integraciones externas con InsureHero.

## Base URL

```
/api/shield
```

## Autenticación

Todas las requests requieren un token de API en el header:

```
Authorization: Bearer <your-api-token>
```

## Versiones

- **v1**: Versión estable
- **v2**: Versión en desarrollo
- **ia/v1**: API para integraciones de IA
- **integrations/v1**: API para integraciones generales

## Endpoints Principales

### Autenticación

#### Autorizar Cliente

```http
GET /api/shield/v1/auth/authorize
```

#### Validar Token (IA)

```http
GET /api/shield/ia/v1/auth/validator
```

### Productos

#### Listar Productos

```http
GET /api/shield/v1/products
```

#### Crear Producto

```http
POST /api/shield/v1/products
Content-Type: application/json

{
  "name": "Producto Ejemplo",
  "description": "Descripción"
}
```

### Pólizas

#### Obtener Póliza

```http
GET /api/shield/v1/policies/{policyNumber}
```

#### Crear Póliza

```http
POST /api/shield/v1/policies
```

#### Actualizar Póliza

```http
PATCH /api/shield/v1/policies/{policyNumber}
```

### Reclamos (Claims)

#### Listar Reclamos

```http
GET /api/shield/v1/claims
```

#### Crear Reclamo

```http
POST /api/shield/v1/claims
```

#### Obtener Reclamo

```http
GET /api/shield/v1/claims/{claimId}
```

### Usuarios

#### Listar Usuarios

```http
GET /api/shield/v1/users
```

#### Crear Usuario

```http
POST /api/shield/v1/users
```

#### Obtener Usuario por Email

```http
GET /api/shield/v1/users/by-email?email=user@example.com
```

### Items de Riesgo

#### Listar Items de Riesgo

```http
GET /api/shield/v1/risk-items
```

#### Crear Item de Riesgo

```http
POST /api/shield/v1/risk-items
```

## Códigos de Estado HTTP

- `200 OK`: Request exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Request inválida
- `401 Unauthorized`: Token inválido o faltante
- `403 Forbidden`: Sin permisos
- `404 Not Found`: Recurso no encontrado
- `500 Internal Server Error`: Error del servidor

## Rate Limiting

Los límites de rate limiting se especifican en los headers de respuesta:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```
