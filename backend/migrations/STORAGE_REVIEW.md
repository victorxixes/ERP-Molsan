# Revisión y diseño de Supabase Storage — 4 noviembre 2026

## Estado confirmado

- El backend todavía guarda documentos y fotografías en rutas locales mediante `backend/app/storage.py`.
- El proyecto Supabase `ERP_Molsan` no tiene todavía buckets ni objetos: consulta de solo lectura del 4-11-2026: 0 buckets y 0 objetos.
- No se ha creado ningún bucket ni se ha copiado ningún fichero.
- No se contratará ni configurará un Persistent Disk de Render para sustituir este almacenamiento.
- Los documentos antiguos de Preview y los ficheros asociados a expedientes/pagos ficticios no se importarán.

## Inventario de código que debe migrarse

| Área | Código actual | Referencia de almacenamiento actual | Destino propuesto |
|---|---|---|---|
| Carpeta Digital y documentos de workflow de NotarGest | `carpeta_digital/router.py`, `notargest/router.py` | `DocumentoCarpetaDigital.nombre_guardado` + `CARPETA_DIGITAL_DIR` | Bucket privado `molsan-expedientes`, prefijos opacos por tipo |
| EncargaGest | `encargagest/router.py` | `EncargoExternoDocumento.nombre_guardado` + subdirectorio `encargagest` | Bucket privado `molsan-encargagest` |
| Mensajes | `mensajes/router.py`, `mensajes/adjuntos.py` | `Mensaje.archivo_url` + `MENSAJES_DIR` | Bucket privado `molsan-mensajes` |
| Documentos de intranet | `intranet/documentos/service.py`, `intranet/documentos/router.py` | `Documento.fichero` + `DOCUMENTOS_INTRANET_DIR` | Bucket privado `molsan-intranet` |
| Fotos de empleados | `empleados/router.py`, ruta `/api/fotos` en `main.py` | `Empleado.foto` + `FOTOS_EMPLEADOS_DIR` | Bucket privado `molsan-empleados` |

Los campos actuales de base de datos permiten guardar la clave del objeto sin guardar el binario:
- `DocumentoCarpetaDigital.nombre_guardado`.
- `EncargoExternoDocumento.nombre_guardado`.
- `Mensaje.archivo_url` (manteniendo compatibilidad de lectura con el formato histórico mientras se retira).
- `Documento.fichero` (pasará de ruta absoluta local a clave relativa del objeto).
- `Empleado.foto` (clave del objeto, no ruta del disco).

## Diseño de seguridad

1. Todos los buckets serán **privados**; no se habilitará lectura pública.
2. Solo el backend de Render utilizará `SUPABASE_SERVICE_ROLE_KEY`. Nunca se incluirá en `frontend-app`, en `.env.example` del frontend, en respuestas API ni en logs.
3. El backend verificará primero la sesión, los permisos del módulo y la relación del usuario con el expediente/mensaje/encargo. Solo después leerá el objeto.
4. Las descargas se servirán mediante el backend autorizado. Si una optimización posterior utiliza URL firmada, será de corta duración y solo se generará después de autorizar la petición.
5. Las claves serán aleatorias (UUID) y no incluirán nombres, NIF, identificadores de expediente ni otros datos personales. El nombre original y el MIME se conservan como metadatos en PostgreSQL.
6. Se validarán extensión, MIME real, tamaño máximo y normalización de la clave. No se aceptarán rutas absolutas, segmentos `..` ni nombres aportados por el usuario como clave.
7. El borrado/sustitución coordinará almacenamiento y transacción SQL: si falla el commit se elimina el objeto nuevo; si falla el borrado físico se registra el huérfano para limpieza controlada sin borrar metadatos válidos.

## Adaptador backend previsto

Crear un servicio único de almacenamiento con operaciones explícitas:
- `upload(bucket, key, content, content_type)`.
- `download(bucket, key)` o streaming equivalente.
- `delete(bucket, key)`.
- `ensure_bucket_configuration(...)` como tarea administrativa explícita, nunca en el arranque web.

Configuración exclusivamente en el servicio API de Render:
- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY` (secreto).
- `MOLSAN_STORAGE_BACKEND=supabase`.
- Nombres/límites de buckets, si se externalizan, con valores validados.

No habrá fallback silencioso al disco efímero en Render. Si faltan las credenciales de Storage, el servicio deberá fallar de forma explícita en la comprobación de disponibilidad, sin guardar documentos en local.

## Cambios de rutas y compatibilidad

- Refactorizar los seis módulos/zonas del inventario para que no usen `Path.write_bytes`, `FileResponse` sobre rutas locales ni `unlink` como mecanismo de persistencia.
- Mantener los endpoints autenticados actuales y sus controles de permisos.
- Revisar la ruta de Mensajes: `main.py` monta actualmente `/static/mensajes` sobre una carpeta temporal; los adjuntos privados deben descargarse solo por el endpoint autenticado que comprueba que el mensaje pertenece al usuario.
- La ruta `/api/fotos/{ruta:path}` seguirá comprobando el permiso de Empleados antes de obtener el objeto.
- Mantener las respuestas y contratos de frontend estables cuando sea posible; las claves internas no se mostrarán al navegador.

## Pruebas obligatorias

- Subida y descarga con usuario autorizado.
- Denegación 401/403 antes de acceder al objeto.
- Aislamiento entre expedientes, notarías, gestores y destinatarios de Mensajes.
- Tamaño excedido, MIME/extensión no permitidos y clave manipulada.
- Sustitución y borrado sin dejar registros rotos.
- Fallo de Storage, timeout y fallo de commit SQL con limpieza compensatoria.
- Comprobación de que buckets son privados y de que no se filtra la clave de servicio al frontend/logs.
- Pruebas de regresión de Carpeta Digital, NotarGest, EncargaGest, Mensajes, Intranet y fotos.

## Orden de ejecución

1. Implementar y probar el adaptador con un cliente HTTP simulado.
2. Refactorizar un módulo cada vez, empezando por Carpeta Digital/NotarGest y después EncargaGest, Mensajes, Intranet y Empleados.
3. Provisionar los buckets privados mediante una acción administrativa explícita cuando el código y la configuración estén listos.
4. Añadir `SUPABASE_SERVICE_ROLE_KEY` como secreto únicamente al servicio API Preview de Render y comprobar una subida/descarga de prueba no sensible.
5. Conservar producción intacta y no copiar archivos históricos. La importación de documentos de los 25 expedientes seleccionados se hará después de aprobar las pruebas integrales.

**Estado actual:** auditoría y diseño documentados. No se han creado buckets, no se han modificado rutas de almacenamiento, no se ha añadido ninguna clave y no se ha desplegado nada.
