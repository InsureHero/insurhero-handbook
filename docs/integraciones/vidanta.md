---
displayed_sidebar: integracionesSidebar
---

# Canal Vidanta (landing)

**Vidanta** es el canal de negocio que usa el **landing page** para que el titular complete viajeros, confirme datos y dispare la integración post-venta con InsureHero.

## Qué es

- **Front dedicado**: aplicación **Next.js** (`landing-next`) fuera del monorepo principal.
- **Acoplamiento**: consume la **API post-sales** y **`POST /api/integrations/post-sales`** contra el mismo backend que el core.

## Cualidades / capacidades

| Aspecto | Detalle |
|---------|---------|
| **Flujo guiado** | Pasos: OTP → resumen de viaje → viajeros → confirmación. |
| **i18n** | Interfaz en **EN / ES**. |
| **Estado de sesión** | JWT post-sales en `sessionStorage` (clave histórica `shield_access_token`). |
| **Sincronización** | Tras persistir beneficiarios, `post_sales.service` envía el risk item al orquestador con acciones `create` / `edit` por beneficiario. |

## Qué hace InsureHero (backend)

- Misma API post-sales y mismas reglas que para cualquier cliente del titular.
- El paquete define **`post_sales_integration_slug`** para saber qué adaptador usar en la emisión.

## Guía técnica completa

Documentación de instalación, variables y estructura de carpetas: **[Landing page Vidanta](../guias-desarrollo/landing-page-postventa)**.

## Referencias

- [Postventa: API y titular](./postventa-api-y-titular)
- [Integraciones (código)](../arquitectura/integraciones)
