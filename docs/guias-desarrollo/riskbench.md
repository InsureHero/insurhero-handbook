# RiskBench (laboratorio de pruebas)

:::note Herramienta interna / dev-only
RiskBench es una **herramienta interna de desarrollo y QA**, no un componente de la plataforma de cara al cliente. Vive en el monorepo (`apps/riskbench`), se despliega como **proyecto Vercel propio** en `riskbench.insurehero.io` y apunta a **DEV**. El acceso está restringido a usuarios de la tabla `admins` (Supabase Auth, mismo proyecto que el dashboard).
:::

**RiskBench** es un laboratorio para **correr y observar los flujos de la plataforma** (a través de la **Shield API**) con datos reales, desde una UI pensada tanto para devs como para no-devs. Sirve para reproducir escenarios de negocio (compra, cobro, cancelación, fallo) sin depender de la UI de producción.

## Cómo se ejecuta

App **Next.js 14** (App Router) con React Query, `next-intl` (ES/EN), Tailwind y Supabase Auth.

```bash
yarn workspace riskbench dev          # local en :3100
yarn workspace riskbench check-types
yarn workspace riskbench lint
```

Variables de entorno en su `.env.template`. Se despliega como proyecto Vercel separado (Root Directory `apps/riskbench`).

## Vistas

| Vista | Para qué |
|-------|----------|
| **Scenarios** | Ejecuta **flujos completos en vivo** contra los endpoints reales, paso a paso: compra + pago, cuotas, cancelación por impago, fallo aislado. |
| **Risk items** | Alta de risk items de prueba (individual o **en lote**), con progreso en vivo, tabla de resultados y **limpieza en cascada** por batch. |
| **Worker** | Simula el **cobro programado**: avanza una cuota corriendo el `subscription-worker` en una fecha elegida. |
| **Dispatch** | Monitor de la **cola SFTP de Carrefour** y disparo **manual gateado** (operación real contra el carrier — ver [Ficheros Carrefour](../integraciones/carrefour-ficheros/intro.md)). |
| **Stress** | Prueba de **carga** con métricas agregadas (throughput, p50/p95/p99) y gráfico de latencia en vivo; la data se **purga** al terminar. |
| **History** | Navegador paginado de los risk items creados. |

## Datos de prueba y overrides

- Los payloads de prueba son **dinámicos y por canal** (p. ej. identificador **NIF** y precio real del producto para Carrefour ES), en lugar de valores fijos hardcodeados.
- Un **editor JSON de overrides** permite ajustar campos seguros del payload (fechas, sujeto asegurado, beneficiarios, consentimientos) validando que el JSON y las fechas sean coherentes; los **invariantes** (uid, paquete, póliza, datos de pago) quedan **bloqueados** para no romper el flujo.
- Desde la vista **Worker** se puede **pagar una orden por su `orderId`** (resultado `ok` / `ko`) y **generar la siguiente cuota** de un risk item recurrente.

## Alcance y guardrails

- **Datos reales sobre DEV**: RiskBench llama a los **endpoints reales** (Shield API, `subscription-worker`, dispatch) del entorno de desarrollo; lo que crea (risk items, órdenes, cobros) es real en DEV, no simulado.
- **Operaciones sensibles gateadas**: acciones con efecto externo —como el disparo de **Dispatch** hacia el carrier— requieren confirmación manual explícita, para no lanzar un envío real por accidente.
- **Limpieza**: las altas en lote permiten borrado en cascada por batch, y la data de la prueba de carga se purga al terminar.
- **Producción es de solo lectura**: el entorno se selecciona por configuración y, si es producción, los endpoints de escritura devuelven `403` — es **imposible crear o modificar datos en producción** desde RiskBench. La escritura (altas, pagos, worker, dispatch) solo está habilitada en DEV/staging.
- Acciones destructivas (purgas, borrado de ficheros) usan un botón de **confirmación en dos pasos**.

## Relación con el resto

- Consume la **[Shield API](../api-reference/shield/intro.md)** como cualquier partner, sobre el mismo modelo de **[risk item](../arquitectura/risk-item.md)**.
- El flujo de emisión y reintentos que observa vive en el **[orquestador](../arquitectura/orquestador-integraciones.md)**; el despacho de ficheros que monitorea, en **[Ficheros Carrefour](../integraciones/carrefour-ficheros/intro.md)**.
