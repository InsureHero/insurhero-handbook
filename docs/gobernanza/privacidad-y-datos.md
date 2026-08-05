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

## Logs sin secretos ni PII

Los logs de la plataforma **no son un lugar seguro**: quedan escritos y no se pueden desescribir. Por eso ningún log del repositorio imprime:

- Tokens o credenciales de carrier —ni completos ni su longitud, que ya es fingerprinting—.
- Secrets de plataforma (`AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) ni valores derivados de ellos.
- Payloads completos de request o response.
- PII de asegurados o titulares: nombre, documento, email, teléfono, domicilio.
- URLs con query string (usar `pathname`, que no arrastra parámetros).

Lo que sí se loguea son identificadores internos, nombres de proveedor, estados y contadores.

La guardia técnica es la regla `no-console` en `apps/next`, que solo admite `console.warn` y `console.error` y cierra `log`, `info` y `debug` como canal por donde se pueda volver a filtrar un token. El detalle de niveles y excepciones está en [Guías de Desarrollo → Logging](/guias-desarrollo/intro#logging).

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

## Cuando dudes, pregunta

Si tienes duda sobre si un dato es sensible o si una operación viola estas políticas, **detente y consulta** con el Tech Lead antes de pegar el contenido en una herramienta de IA.

> _"Es más barato preguntar que filtrar."_
