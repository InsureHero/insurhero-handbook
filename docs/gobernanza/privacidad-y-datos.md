---
id: privacidad-y-datos
title: Privacidad y Datos
sidebar_position: 5
---

# Privacidad y Datos

InsureHero opera con datos sensibles de pólizas, beneficiarios y pagos. La gobernanza de IA exige protocolos estrictos para proteger esta información durante el desarrollo asistido.

## Privacy Mode obligatorio

> ⚠️ **El Privacy Mode debe estar activo** en todas las herramientas de IA usadas por el equipo.

El Privacy Mode garantiza que los datos de entrenamiento y las interacciones con la IA se procesen localmente o en entornos aislados. Esta capa de gobernanza impide que la lógica de negocio sensible o secretos del repositorio sean indexados por modelos públicos externos.

### Configuración por herramienta

- **Cursor:** activar "Privacy Mode" en Settings → General.
- **Claude Code:** verificar que la cuenta esté configurada con el plan correcto.
- **Otras herramientas:** validar antes de uso con el Tech Lead.

## Prohibiciones absolutas

> 🚫 **Queda terminantemente prohibido el uso de credenciales reales en interacciones con la IA.**

### No incluir en prompts
- Secrets de cualquier tipo (`AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, etc.).
- Contraseñas reales de cualquier sistema (propio o de terceros).
- Tokens de API válidos.
- Credenciales de bases de datos.
- Información personal identificable (PII) de usuarios reales.

### Si necesitas mostrar el formato de un secret
Usa placeholders evidentes:

✅ **Bien:**
`SUPABASE_SERVICE_ROLE_KEY=sbp_FAKE_EXAMPLE_xxxxxxxxxxxxxxx`

❌ **Mal:**
`SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Datos sintéticos en pruebas

> 📌 **Toda prueba o ejemplo debe utilizar datos generados artificialmente** que no tengan relación con usuarios, pólizas o transacciones reales.

### Reglas para datos de ejemplo

- **Nombres:** usar genéricos (`Juan Pérez`, `Maria González`) o el paquete `@insureHero/builders`.
- **Emails:** dominios de ejemplo (`@example.com`, `@test.com`).
- **IDs:** UUIDs aleatorios o placeholders (`yourUID01`, `test_id_123`).
- **Montos:** valores redondos y obviamente ficticios (100, 500, 1000).
- **Fechas:** fechas neutras, sin relación con eventos reales.

### Builders disponibles

El paquete `@insureHero/builders` provee factories para generar datos sintéticos consistentes con los schemas Zod del sistema. Úsalos siempre que sea posible en lugar de inventar datos manualmente.

## PII en los reportes de error

La misma regla aplica en runtime: **el monitor de errores no es un lugar donde pueda quedar PII**.

- Todo evento que sale hacia Sentry pasa por un saneo central (`beforeSend`) que redacta el subárbol completo de las claves sensibles conocidas (identificadores, datos de persona, pagos, beneficiarios, sujeto asegurado).
- La lista es compartida entre el reporte de UI y el server-side, así que ampliarla **reduce visibilidad de debug** en Shield y tRPC: se agrega solo lo que sea PII de verdad.
- Los errores de validación de formularios reportan **nombres de campo**, nunca valores.
- Al escribir un `catch` que reporta, no metas el objeto de dominio entero en el contexto solo por comodidad: pasa lo mínimo que sirva para diagnosticar.

Detalle técnico y lista de claves: [Alertas y observabilidad → Sentry](../integraciones/alertas-operacion).

## Cuando dudes, pregunta

Si tienes duda sobre si un dato es sensible o si una operación viola estas políticas, **detente y consulta** con el Tech Lead antes de pegar el contenido en una herramienta de IA.

> _"Es más barato preguntar que filtrar."_
