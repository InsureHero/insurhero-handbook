---
displayed_sidebar: integracionesSidebar
---

# Fenicio (lectura) — experimental

:::caution Experimental / dev-only
Esta integración es un **POC de lectura**: existe en `develop` pero **no está consolidada**. Las rutas leen la API de Fenicio y devuelven los datos **sin persistirlos** en el modelo de InsureHero (risk items / orders), y sus credenciales/consumidor están configurados **solo en entornos de desarrollo**. Documentada para dejar constancia del estado actual, no como integración productiva.
:::

Integración de **solo lectura** contra la **API de Fenicio** (plataforma externa de e-commerce/retail). En código el slug del adaptador es **`FENICIO`**.

## Qué hace hoy

- **`FenicioAdapter`** expone lecturas: `fetchOrders` (listado paginado), `fetchOrder(id)` y `fetchStocks` (existencias por SKU).
- Se exponen como rutas **Shield** bajo el namespace `integrations/v1`:
  - `GET .../integrations/v1/fenicio/orders`
  - `GET .../integrations/v1/fenicio/orders/[id]`
  - `GET .../integrations/v1/fenicio/stocks`
- La respuesta se **devuelve tal cual** (validación permisiva); el mapeo a entidades de negocio (risk items, órdenes) **aún no está cableado**.

## Configuración

- Base URL vía env **`FENICIO_API_BASE_URL`** (por defecto el entorno demo de Fenicio).
- El acceso a las rutas Shield se rige por el esquema de autenticación de Shield; el admin/API key del consumidor Fenicio existe **solo en dev** por ahora.

## Dónde está en el repo

- Adaptador: `apps/next/src/integrations/adapters/fenicio/`
- Rutas: `apps/next/src/app/api/shield/integrations/v1/fenicio/`

## Referencias

- [Shield · inventario de rutas](../api-reference/shield/inventario-de-rutas.md)
- [Orquestador e integraciones](../arquitectura/orquestador-integraciones.md)
