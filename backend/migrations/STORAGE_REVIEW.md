# Revisión e implementación de Supabase Storage — 4 noviembre 2026

## Estado del proyecto Supabase

- Proyecto `ERP_Molsan`, ref `powiprqarmluanplxpyb`, activo en EU Central.
- La última consulta de solo lectura registró 0 buckets y 0 objetos.
- No se ha creado el bucket, no se ha aplicado migración a Supabase y no se han subido documentos.
- No se contratarán discos persistentes de Render.
- No se importarán archivos heredados de Preview ni documentos asociados a expedientes/pagos ficticios.

## Diseño elegido

Se utiliza **un único bucket privado `molsan-private`** y prefijos por dominio. Así se mantiene una sola política de acceso y se evita duplicar configuración de buckets sin necesidad. Los prefijos no son una frontera de autorización: cada endpoint debe validar primero identidad, permiso y relación con el recurso.

Prefijos:
- `cd/`: Carpeta Digital y documentos de NotarGest.
- `eg/`: documentos de EncargaGest.
- `mensajes/`: adjuntos de Mensajes.
- `intranet/`: documentos de intranet.
- `fotos/empleados/`: fotografías de empleados.

## Código implementado en la rama de integración

- `backend/app/supabase_storage.py`: adaptador HTTP para subir, descargar, comprobar existencia y borrar objetos. Valida claves, codifica segmentos, usa solo credenciales de servidor y no crea URLs públicas.
- `backend/tests/test_supabase_storage.py`: pruebas unitarias simuladas para subida, descarga, existencia, borrado/referencias y rechazo de traversal.
- Carpeta Digital: subida, descarga, eliminación, previsualización de cierre y reemplazo de expediente digital soportan referencias remotas; se mantiene lectura de referencias locales antiguas.
- NotarGest: subida de documentos de workflow, documentos generales y facturas; descargas y reemplazo usan el adaptador privado.
- EncargaGest: subida, descarga y borrado de adjuntos usan el adaptador privado.
- Mensajes: adjuntos usan el adaptador privado y se sirven por endpoint autenticado. Se ha retirado el montaje estático `/static/mensajes` para evitar descargas sin comprobar la conversación. La UI ya consume el endpoint autenticado.
- Intranet: subida, descarga y eliminación de documentos usan el adaptador privado; se mantiene lectura de rutas locales antiguas.
- Fotos de empleados: objetos con nombre versionado, descarga mediante `/api/fotos` con permiso de Empleados y eliminación de la foto anterior solo después de confirmar la referencia nueva.
- `backend/app/storage.py`: en Render falla de forma cerrada si `MOLSAN_STORAGE_BACKEND=supabase` no está activado; en modo Supabase valida URL y clave al arrancar. No se permite fallback silencioso a almacenamiento efímero en Render.

El bucket privado `molsan-private` ya se ha creado en el proyecto Supabase de integración con `public=false`, límite de 100 MiB y lista MIME permitida. La comprobación de solo lectura confirma 0 objetos. No se han creado tablas ERP ni aplicado migraciones. El modo local permanece disponible para desarrollo local. En Preview/Render deberá configurarse explícitamente Supabase antes de desplegar esta rama.

## Configuración necesaria (solo API Preview)

Variables de entorno:
- `SUPABASE_URL=https://powiprqarmluanplxpyb.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: secreto de servidor obtenido desde la sección API Keys del proyecto; nunca compartirlo en chat, GitHub, frontend ni logs.
- `MOLSAN_STORAGE_BUCKET=molsan-private`
- `MOLSAN_STORAGE_BACKEND=supabase`

Crear el bucket desde Supabase Dashboard > Storage > New Bucket:
- Nombre: `molsan-private`.
- Visibilidad: **Private**.
- Límite de tamaño: al menos 100 MiB (el máximo actual de Carpeta Digital es 100 MiB).
- No crear políticas públicas de lectura.
- No colocar la clave service-role en el frontend.

El backend usa la clave privilegiada únicamente en el servidor y valida los permisos ERP antes de descargar. No se requiere crear usuarios Supabase Auth para este flujo.

## Autenticación y autorización

- El backend valida el usuario empleado y sus permisos antes de operar sobre los objetos.
- NotarGest y EncargaGest conservan sus validaciones de portal, notaría y encargo.
- Mensajes exige participación en la conversación y valida la existencia del objeto al emitir el adjunto por WebSocket.
- Las fotografías siguen exigiendo permiso del módulo Empleados.
- Los objetos no se exponen mediante URL pública ni se envían al navegador con la clave de servicio.

## Riesgos y validaciones pendientes

1. Ejecutar el workflow backend audit en el SHA más reciente y revisar cualquier fallo de importación/sintaxis.
2. Verificar en Preview que el bucket privado existe y que la API puede subir, descargar, comprobar y borrar un archivo de prueba.
3. Probar los cinco flujos de archivo con cuentas y permisos reales: Carpeta Digital, NotarGest, EncargaGest, Mensajes, Intranet y fotos.
4. Probar 401/403 antes de leer objetos y aislamiento entre expedientes, notarías, gestores y destinatarios.
5. Probar rollback SQL, fallos de red, timeouts, reemplazo de fotos y documentos, y limpieza de objetos huérfanos.
6. Comprobar límites de tamaño y tipos MIME permitidos en el bucket y en cada endpoint.

## Render Preview

Los servicios Preview actuales siguen apuntando a ramas antiguas y tienen auto-deploy desactivado. El conector Render disponible permite consultar servicios, modificar variables y disparar despliegues, pero no modificar la rama asociada del servicio. La rama deberá cambiarse en Render Dashboard antes de desplegar esta integración. No se han cambiado variables ni desplegado servicios.

## Producción

No se ha cambiado ningún servicio de producción, no se ha aplicado ninguna migración, no se han creado buckets y no se han copiado documentos.

**Estado:** adaptador y rutas principales implementados en la rama de integración; provisión del bucket, secreto, ejecución CI final, cambio de rama de Preview y pruebas reales siguen pendientes.
