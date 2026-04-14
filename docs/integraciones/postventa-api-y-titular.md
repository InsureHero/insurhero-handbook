---
displayed_sidebar: integracionesSidebar
---

# Postventa: API y titular

Capa **post-sales** para que el **titular** gestione sus datos sin acceder al dashboard: OTP por correo, JWT de sesión y operaciones acotadas sobre **risk items** donde figure como beneficiario titular.

## Qué es

- **Backend**: rutas bajo `/api/postsales/v1` (OTP, verificación, `me/risk-items`, detalle y subrecursos del risk item).
- **Contrato de seguridad**: JWT propio (`POSTSALES_JWT_SECRET`), independiente de Shield y de la sesión Supabase del staff.

## Cualidades / capacidades

| Aspecto | Detalle |
|---------|---------|
| **OTP** | Solicitud y verificación con límites de intentos; tabla `postsales_otp`. |
| **Elegibilidad** | RPC `postsales_risk_item_ids_by_holder_email` para validar que el email tenga risk items activos como titular. |
| **Autorización fina** | Comprobación contra `authorized_claimants` por risk item. |
| **Emisión post-cambio** | `POST /api/integrations/post-sales` con el mismo JWT, usando `post_sales_integration_slug` del paquete para el orquestador. |

## Qué hace InsureHero

1. Envía código al correo y valida el OTP.
2. Emite JWT de sesión post-sales.
3. Permite leer/editar lo permitido en política postventa.
4. Opcionalmente dispara **emisión externa** tras actualizar beneficiarios.

## Documentación detallada

- [API Post-sales](../api-reference/postsales-api)

## Referencias

- [Canal Vidanta (landing)](./vidanta)
- [Orquestador e integraciones](../arquitectura/orquestador-integraciones)
