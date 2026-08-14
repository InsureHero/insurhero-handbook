# Módulo de Canales

Un **canal** en InsureHero es más que un “cliente” en el sentido comercial: es el **contenedor** donde vive tu operación en esa jurisdicción y moneda. Agrupa productos, usuarios administrativos, integraciones y reglas como si fuera una franquicia digital dentro de la plataforma.

## Funcionalidades

- **Crear y administrar el canal** — Nombre, contacto, banderas de broker, estado (activo / inactivo) y definición de si el entorno es productivo o de pruebas según cómo lo uses en tu organización.
- **Fijar moneda y país de operación** — Son decisiones estructurales: condicionan precios, impuestos, textos legales y, en muchos casos, qué integraciones tienen sentido.
- **Clasificar el canal: industria y tipo de despliegue** — La **industria** (`industry_id`) se elige de un catálogo global de solo lectura (`industries`, sembrado por migración: Insurance, Financial Services, Retail & E-commerce, Travel & Transportation, Hospitality…). El **tipo de despliegue** (`deployment_type`) distingue entre **Distribución** (`distribution`, el canal vende a terceros) y **Interno** (`internal`, uso dentro de la propia organización). Ambos son obligatorios al crear el canal y editables después.
- **Definir zona horaria (`timezone`)** — Valor **IANA** (p. ej. `America/Mexico_City`). El sistema lo usa para calcular **ventanas de tiempo en hora local** cuando hay reportes o skills que dependen del “día” del canal (p. ej. correo agregado de errores de emisión en combinación con cron). Detalle técnico: [Notificaciones, skills y Supabase Edge](../arquitectura/notificaciones-skills-supabase.md).
- **Exponer una API key propia** — Para que integraciones externas o canales de distribución identifiquen peticiones contra ese contexto sin mezclar tráfico con otro tenant.
- **Orquestar administradores del canal** — Quién puede configurar productos, quién ve reportes y quién opera reclamos **dentro** de ese canal, sin permisos cruzados involuntarios.

## Características

- **Inmutabilidad de moneda y país** — Una vez creado el canal, cambiar país o moneda no forma parte del diseño: obliga a **razonar bien** antes de crear y, si el negocio cambia, abrir un canal nuevo. Eso evita corrupción silenciosa de históricos y contratos.
- **Hora local explícita** — Tener `timezone` bien configurado evita que los equipos interpreten mal los cortes de reportes o el momento en que un admin “debería” recibir un informe asociado a un skill.
- **Clasificación opcional en canales existentes** — Industria y tipo de despliegue se pidieron después de que ya hubiera canales en producción, así que ambos son **nullable** y sólo se exigen en el alta. Un canal antiguo muestra el selector de industria vacío y ningún tipo de despliegue marcado, y puede guardarse desde configuración sin completarlos.
- **Aislamiento lógico** — Coberturas, variantes, paquetes y productos cuelgan del `channel_id`; en la práctica, es la base del multi-tenant de negocio. La industria, en cambio, es un **catálogo global compartido** por todos los canales: no se administra desde la UI, se amplía por migración.
- **Base para canales de distribución especiales** — Algunos socios (por ejemplo un resort o un portal white-label) necesitan flujos y landings propios; el canal da el marco para que esas experiencias no pisen datos de otros.

El arranque de un canal es el **Paso 0** en [Cómo crear un producto](./creacion-producto.md). Para un canal concreto documentado (Vidanta / landing), puedes seguir el enlace desde el sidebar a Integraciones.
