# Módulo de Reclamos

Los **reclamos** (siniestros) son el otro gran pilar del seguro: convierten la promesa del contrato en un proceso operativo con pruebas, evaluación y, si corresponde, pago indemnizatorio. Este módulo debe servir tanto a personas de mesa de ayuda como a equipos que necesitan orden y trazabilidad.

## Funcionalidades

- **Registrar reclamos** — Alta de un siniestro vinculado a la póliza o al risk item que aplique, con fecha de ocurrencia, descripción y datos mínimos exigidos por el producto (`claim_schema` u equivalente en tu configuración).
- **Seguimiento por estados** — El reclamo avanza por etapas (recibido, en análisis, documentación pendiente, aprobado, pagado, cerrado, etc.) de forma que cualquier actor sepa “en qué está” sin abrir hilos informales.
- **Gestión documental** — Adjuntar evidencias (fotos, informes, facturas) y asociarlos al expediente para que la evaluación sea reproducible meses después.
- **Comunicación y asignación** — Reparto entre evaluadores o equipos, comentarios internos y, donde el producto lo permita, mensajes hacia el asegurado o terceros autorizados.

## Características

- **Coherencia con el contrato** — Lo que se puede reclamar está acotado por las coberturas y exclusiones que firmó el cliente; el sistema ayuda a no aceptar reclamos fuera de vigencia o fuera de alcance si las reglas están modeladas.
- **Workflow adaptable** — No todos los ramos se resuelven igual: algunos reclamos son rápidos y otros multicapa. La plataforma permite enfoques distintos siempre que se respete la trazabilidad y los permisos por rol.
- **Superficies múltiples** — El mismo núcleo puede alimentar el backoffice, flujos vía **Shield** y, en algunos casos, experiencias asistidas por IA según namespace y políticas del canal.

El **workflow** (estados, transiciones, comunicación y skills de operación) se describe de forma transversal en [Módulo de Workflows y automatización](./modulo-workflows.md) y en [Workflows, automatización y skills](../arquitectura/workflows-y-skills.md).

Para integración técnica (namespaces, APIs), enlaza desde [Flujos e integraciones](./flujos-e-integraciones.md) hacia la documentación de Shield y REST.
