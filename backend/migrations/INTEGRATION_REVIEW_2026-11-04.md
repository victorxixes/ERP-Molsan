# Revisión técnica de integración ERP-Molsan — 4 noviembre 2026

## Alcance y límites

Revisión estática de la rama `production/erp-molsan-2026-11-04`. No se ha desplegado código, no se ha fusionado la PR, no se ha aplicado ninguna migración a Supabase y no se han cambiado servicios ni variables de Render.

La PR #391 sigue abierta y en borrador. La rama incluye una migración ORM inicial que se ha probado en PostgreSQL temporal de CI; esa prueba no acredita que el esquema completo esté listo para Supabase.

## Estado CI observado

En la consulta del commit revisado, los workflows visibles no habían terminado todos:
- EncargaGest checks: en ejecución.
- Frontend dependency security audit: en ejecución.
- Consolidación Post Firma checks: pendiente.
- Validar Fichaje Molsan: pendiente.
- Validar Control Apoderados: pendiente.

Hay que volver a consultar el estado del SHA actual antes de declarar CI verde.

## Hallazgos que bloquean la integración

### 1. El inventario del esquema aún no está convertido en migraciones completas

El inventario offline identifica:
- 67 tablas ORM.
- 33 tablas auxiliares.
- 7 índices auxiliares.
- 9 puntos con DDL dinámico.
- 16 definiciones duplicadas/coincidentes que requieren consolidación canónica.
- 8 FK auxiliares hacia tablas ORM.

La migración ORM no sustituye la creación de las 33 tablas auxiliares, sus índices, seeds, ni la conversión explícita de los nueve puntos dinámicos.

### 2. Quedan endpoints y rutinas que intentan modificar el esquema en ejecución

Revisión de código:
- `backend/app/encargagest/router.py`: rutina de creación de estructuras auxiliares y columna de reparto; debe quedar estrictamente fuera del proceso web.
- `backend/app/expedientes/defectos/migracion_router.py`: añade columnas, índice y FK a `expediente_defectos`.
- `backend/app/expedientes/fix_schema.py`: añade dinámicamente columnas a `expedientes`.
- `backend/app/expedientes/gastos/migracion_router.py`: endpoint `/aplicar`, protegido por permiso administrativo, ejecuta ALTER TABLE sobre `expediente_gastos`.
- `backend/app/expedientes/router.py`: endpoint `/migraciones/actividades`, protegido por permiso administrativo, ejecuta ALTER TABLE; el endpoint `/migraciones/actualizar-envio-notario` crea tabla/índice y altera columnas.
- `backend/app/informes/facturacion_router.py`: rutina de ALTER TABLE e índices sobre `expediente_gastos`.
- `backend/app/main.py`: rutina de inicio que comprueba y añade columnas, crea `apoderagest_liquidaciones` y modifica `expedientes`/otras tablas.

**Hallazgo de seguridad prioritario:** el endpoint `POST /migraciones/actualizar-envio-notario` aparece definido con `db: Session = Depends(get_db)`, pero sin dependencia `usuario=Depends(get_current_user)` ni comprobación explícita de permiso antes de ejecutar DDL. Debe dejar de ejecutar DDL en peticiones y, mientras se retira, quedar inaccesible para usuarios normales. No se debe resolver permitiendo migraciones de esquema desde el backend web.

### 3. Almacenamiento documental incompatible con Render efímero

`backend/app/storage.py` resuelve cuatro directorios locales (carpeta digital, mensajes, documentos de intranet y fotos de empleados), y advierte de almacenamiento efímero en Render. El modelo `DocumentoCarpetaDigital` guarda metadatos y un nombre de archivo, pero no acredita una implementación de object storage.

Antes de conectar el Preview debe implementarse y probarse un adaptador de almacenamiento persistente (objetos en Supabase Storage), con:
- buckets privados por dominio documental o una separación equivalente bien justificada;
- rutas/keys no predecibles y metadatos en PostgreSQL;
- autorización en backend antes de emitir URL firmada o descargar;
- límites de tamaño y validación MIME/extensión;
- políticas de Storage cerradas por defecto;
- pruebas de subida, lectura, sustitución y borrado;
- migración/importación de ficheros separada, sin copiar datos ficticios históricos.

No crear buckets ni abrir políticas hasta que el modelo de acceso esté definido.

### 4. Autenticación y permisos

No se debe asumir que Supabase Auth esté configurado. Hay que inventariar el sistema real de usuarios, JWT, roles y permisos del ERP, verificar todas las rutas y decidir si se conserva el backend de autenticación actual o se migra explícitamente. No exponer nunca claves privilegiadas de Supabase al frontend.

## Secuencia de cierre

1. Eliminar DDL de arranque y de endpoints; todas las operaciones pasan a migraciones Alembic versionadas.
2. Construir la revisión de esquema completa: tablas ORM + auxiliares + índices + columnas + FK/UNIQUE/CHECK + secuencias + triggers y dependencias.
3. Convertir los nueve puntos dinámicos en operaciones estáticas revisadas; no interpolar nombres/tipos procedentes de peticiones.
4. Crear seeds idempotentes y separados de los datos operativos.
5. Añadir pruebas de upgrade, downgrade y upgrade, además de comparación de esquema y pruebas de permisos.
6. Implementar Supabase Storage privado y probarlo desde el backend.
7. Configurar Render Preview contra Supabase Preview, con secretos solo en backend y sin tocar servicios productivos.
8. Ejecutar pruebas integrales y solo entonces preparar la importación de los aproximadamente 25 expedientes reales de prueba.

## Regla de datos

No importar los 417 expedientes ni pagos históricos de prueba. Los 25 expedientes seleccionados se incorporarán después de que el ERP esté integrado y validado. No se importan ahora.


## Actualización de seguridad aplicada en la rama

En commits posteriores a esta revisión se ha aplicado una contención adicional:
- Los hooks heredados de esquema/catálogos en `main.py` ya no se registran en el arranque web.
- `runtime_schema_migrations_enabled()` devuelve siempre `False`; las variables de entorno antiguas no pueden reactivar esos hooks.
- El hilo de DDL de arranque de EncargaGest consulta esa misma guarda y queda desactivado.
- Los endpoints de mantenimiento de defectos, gastos y envío a notario inspeccionados en esta rama verifican el esquema provisionado y no ejecutan ALTER/CREATE desde la petición.
- Se ha añadido `backend/tests/test_runtime_schema_migrations.py` para cubrir la desactivación por defecto y asegurar que las variables antiguas no la reactivan.

Esta contención no sustituye la migración Alembic completa ni constituye una ejecución de pruebas. La creación de tablas auxiliares, los seeds y las reparaciones de datos deben convertirse en revisiones/tareas explícitas antes de provisionar el entorno limpio. No activar la variable antigua en Render.
