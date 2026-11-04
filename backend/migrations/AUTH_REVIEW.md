# Revisión de autenticación y permisos ERP-Molsan — 4 noviembre 2026

## Decisión de arquitectura

**Se conserva el sistema de identidad propio del ERP para esta puesta en marcha. No se migra ahora a Supabase Auth.**

La ausencia de usuarios en Supabase Auth no es un fallo de configuración: el ERP autentica empleados contra su tabla `empleados` y valida roles/permisos del propio ERP. NotarGest y EncargaGest también tienen flujos de portal que deben conservarse.

Supabase se utiliza como PostgreSQL y Storage. La clave privilegiada de Storage solo se usa desde el backend para objetos privados; no se entrega al navegador.

## Autenticación ERP revisada

- Login principal: `/api/auth/login`, con validación en `login_empleado`.
- Contraseñas nuevas: PBKDF2-HMAC-SHA256 con 310.000 iteraciones y salt aleatorio.
- Compatibilidad heredada: SHA-256 antiguo se verifica temporalmente y se actualiza a PBKDF2 después de un login correcto.
- JWT: HS256, expiración configurable, por defecto 480 minutos.
- `JWT_SECRET`: obligatorio, aleatorio, mínimo 32 caracteres; se rechazan valores conocidos.
- `get_current_user`: valida firma/expiración, empleado existente y activo.
- Permisos granulares: `require_perm_modulo` consulta los permisos del empleado/rol.
- `route_guard.py`: protege rutas API no públicas; las excepciones públicas son explícitas.
- WebSockets: vuelven a validar JWT y permisos en cada canal/acción sensible.

## Portales

- **NotarGest:** conserva su autenticación de portal y valida la identidad de notaría, la relación con el expediente, las categorías documentales y los datos sensibles.
- **EncargaGest:** conserva su autenticación de portal y valida la notaría/encargo y el ámbito de la cuenta.
- **ApoderaGest:** sigue usando identidad y permisos del ERP; mantiene controles de asignación/visibilidad del expediente.
- **Mensajes:** valida que el adjunto pertenezca a una conversación del usuario autenticado antes de descargarlo.

No se deben fusionar estos tokens o roles de portal en una única identidad Supabase Auth durante la migración de base de datos.

## Alta inicial de administrador

Se ha añadido `backend/scripts/bootstrap_admin.py` para crear la primera cuenta únicamente cuando la tabla `empleados` está vacía. Requiere `MOLSAN_ENVIRONMENT=preview` y la confirmación explícita `MOLSAN_BOOTSTRAP_ADMIN_CONFIRM=CREATE_FIRST_ADMIN_IN_PREVIEW`, además de `MOLSAN_BOOTSTRAP_ADMIN_USERNAME` y `MOLSAN_BOOTSTRAP_ADMIN_PASSWORD` (mínimo 16 caracteres). Crea el rol Administrador si no existe y asigna permisos completos sobre el catálogo base. Antes de consultar empleados exige que `alembic_version` sea exactamente `20261104_0004`; si el esquema no está completo, se detiene. No contiene contraseñas predeterminadas, no imprime la contraseña, se niega a modificar una instalación que ya tenga empleados y rechaza cualquier entorno distinto de Preview antes de abrir la conexión a base de datos.

Se ejecutará una sola vez después de aplicar y verificar el esquema en Preview, usando un secreto temporal introducido de forma segura en el entorno de ejecución. No se crea ningún usuario ni contraseña en esta fase.

## Configuración obligatoria en Render API Preview

- `DATABASE_URL`: conexión al proyecto Supabase de integración.
- `JWT_SECRET`: secreto aleatorio nuevo para el entorno Preview, generado en Render y no compartido por chat ni guardado en Git.
- `ALGORITHM=HS256`.
- `ACCESS_TOKEN_EXPIRE_MINUTES=480` (revisar la duración durante las pruebas).
- `CORS_ORIGINS`: únicamente el dominio Preview del frontend y los orígenes locales estrictamente necesarios.
- `MOLSAN_STORAGE_BACKEND=supabase`.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: esta última solo como secreto del servicio API.
- `MOLSAN_STORAGE_BUCKET=molsan-private`.

No copiar JWT_SECRET ni claves de producción al Preview. La nueva base está vacía; el usuario administrador inicial deberá crearse mediante un procedimiento de bootstrap seguro y auditado después de aplicar el esquema, sin contraseña predeterminada ni cuenta pública de registro.

## Supabase Data API y RLS

La API web del ERP es el único punto de entrada para empleados y portales. Los navegadores no deben consultar las tablas ERP directamente con la clave anon/publishable.

Se ha añadido la revisión Alembic `20261104_0004_secure_public_api.py`, que:
- activa RLS en todas las tablas de `public`;
- revoca privilegios de `anon` y `authenticated` si existen;
- revoca privilegios implícitos de `PUBLIC`;
- aplica revocaciones por defecto a objetos futuros creados por el rol de migración;
- no crea políticas de lectura para el navegador.

El backend mantiene acceso como propietario/rol de base de datos de confianza y aplica su autorización JWT/ERP. La revisión debe superar el ciclo completo en PostgreSQL aislado antes de aplicarse a Supabase. No se ha aplicado a ningún proyecto.

## Pruebas de aceptación

1. Login correcto y contraseña incorrecta (200/401).
2. JWT ausente, mal firmado, expirado y empleado inactivo (401).
3. Usuario autenticado sin permiso de módulo (403).
4. Usuario con permiso correcto (200).
5. Revocación de permiso/usuario activo durante sesión.
6. Aislamiento por notaría, gestor, expediente y conversación.
7. Intento de acceso directo a PostgREST con anon y authenticated (denegado).
8. Confirmar que el frontend no contiene `SUPABASE_SERVICE_ROLE_KEY`, JWT_SECRET ni credenciales de base de datos.

## Límites de esta revisión

No se han creado usuarios, contraseñas ni secretos en Supabase o Render. No se han cambiado las variables de ningún servicio y no se ha desplegado la rama. La integración de Preview y las pruebas con cuentas reales siguen pendientes.
