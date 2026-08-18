# Módulo de Usuarios

Sin una gestión clara de **identidad y permisos**, ningún seguro a escala se sostiene: operadores, agentes, administradores y a veces el propio asegurado necesitan entrar al sistema con límites distintos. Este módulo cubre **cuentas**, **roles** y el vínculo con **Supabase Auth** en la arquitectura actual.

## Funcionalidades

- **Dar de alta y mantener usuarios** — Creación de cuentas, asociación a un canal o contexto de trabajo, datos de perfil y estado (activo / bloqueado) según políticas internas.
- **Asignar roles y permisos** — Un administrador de canal no debería ver lo mismo que un agente de ventas o un evaluador de reclamos; el modelo de roles concentra operaciones sensibles (catálogo, emisiones, finanzas, integraciones).
- **Autenticación y sesiones** — Inicio de sesión, recuperación de acceso y caducidad de sesión; integración con el proveedor de identidad que use el proyecto (Supabase es el estándar en este stack).
- **Auditoría básica** — Saber **quién** hizo cambios materialmente importantes ayuda en disputas internas y en cumplimiento.

## Invitar miembros a un canal

Desde **Configuración → Team**, quien tenga el privilegio de gestionar agentes puede sumar personas al canal con un único botón (*Invite members*). El sistema decide solo qué hacer con el correo que se escribe:

- **Ya tiene cuenta en la plataforma** — se la vincula al canal directamente. Si ya era miembro de ese canal, se avisa del duplicado.
- **No tiene cuenta** — se le envía una **invitación por correo** con un enlace de un solo uso que caduca en **24 horas**. Al abrirlo, la persona fija su contraseña y entra a su canal con los **privilegios definidos al invitar**; hasta ese momento no existe como usuario del dashboard.

Todo invitado entra como **agente de canal**: los privilegios se eligen al invitar (por canal), pero el rol de negocio no se selecciona en el formulario.

La misma pantalla lista las **invitaciones pendientes** aparte de los miembros activos, marcando cuáles ya vencieron, con acciones para **reenviar** o **revocar**. Revocar invalida el enlace de inmediato.

Si se invita a la misma persona a **varios canales** antes de que acepte, recibe un solo correo: un único clic la activa en todos los canales pendientes a la vez, y revocar la invitación de un canal no afecta a los demás.

Detalle técnico del flujo (tabla `channel_invitations`, enlace compartido, trigger de alta): [Autenticación y autorización](../arquitectura/autenticacion-autorizacion.md).

## Características

- **Segregación por contexto** — En escenarios multi-canal, un usuario suele pertenecer a un **universo** (canal / broker) sin cruzar datos ajenos por defecto.
- **Menos superficie de error** — Los permisos finos evitan que alguien sin formación toque integraciones productivas o parámetros de precio globales por accidente.
- **Base para experiencias mixtas** — Los mismos principios soportan el dashboard interno y, con otros tokens y flujos, el **portal de postventa** del titular (OTP + JWT), sin confundir un rol con otro.

La postventa del titular está descrita también en [Flujos e integraciones](./flujos-e-integraciones.md) y en [API Post-sales](../api-reference/postsales-api.md).
