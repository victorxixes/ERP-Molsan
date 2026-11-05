# Revisión técnica de integración ERP-Molsan — 4 noviembre 2026

## Alcance y límites

La rama `production/erp-molsan-2026-11-04` se utiliza para integrar y probar los cambios de forma controlada. La PR #391 continúa abierta y en borrador.

No se ha fusionado la PR, no se ha desplegado esta rama en Render, no se ha aplicado ninguna migración a Supabase y no se han modificado servicios ni variables de producción.

Los 417 expedientes y pagos históricos son datos de prueba y quedan excluidos. La importación de aproximadamente 25 expedientes reales se realizará solo después de completar la integración, las pruebas y la aprobación del punto de restauración.

## Estado técnico verificado

### 1. Esquema y migraciones Alembic

Inventario offline completado:

- 67 tablas ORM.
- 33 tablas auxiliares y 7 índices.
- 77 operaciones ALTER/DDL estáticas reconciliadas.
- 0 columnas de ALTER pendientes de ORM.
- 0 DDL dinámico pendiente en el flujo web; se retiraron las 9 rutas heredadas detectadas.
- 14 entradas duplicadas/coincidentes revisadas: 4 tablas ya definidas en ORM y 10 definiciones auxiliares idénticas repetidas; 0 conflictos.
- 8 FK auxiliares hacia tablas ORM; 0 destinos sin resolver.

Revisiones presentes en la rama:
- `20261104_0001_initial_orm_schema.py`
- `20261104_0002_reconcile_orm_constraints.py`
- `20261104_0003_auxiliary_schema.py`
- `20261104_0004_secure_public_api.py` (RLS + revocación de acceso Data API para roles cliente)

La ejecución completa del workflow **Bootstrap ORM migration in isolated PostgreSQL** sobre el SHA `f8792f759679e5054604ec71f9611b554dfcf585` terminó correctamente el 4-11-2026. Se ejecutaron `upgrade head`, `alembic check`, `downgrade base` y un segundo `upgrade head`. Alembic informó **No new upgrade operations detected**. La base utilizada fue un PostgreSQL temporal de CI, nunca la base de Supabase.

### 2. Pruebas CI

En el SHA revisado `f8792f759679e5054604ec71f9611b554dfcf585` finalizaron correctamente:
- Backend audit.
- Offline ORM and DDL inventory.
- Bootstrap ORM migration in isolated PostgreSQL.
- Frontend dependency security audit.
- EncargaGest checks.
- Validar Fichaje Molsan.
- Validar Control Apoderados.
- Consolidación Post Firma checks.

Las modificaciones documentales posteriores vuelven a activar CI; antes de cualquier integración se comprobará el SHA más reciente, no solo esta ejecución.

### 3. Protección de producción

- El proceso web tiene bloqueadas las migraciones de esquema de arranque.
- Los endpoints heredados de mantenimiento comprueban el esquema provisionado; no deben ejecutar ALTER/CREATE desde peticiones.
- La variable antigua de migración en runtime no debe configurarse en Render.
- La generación de revisiones se ejecuta contra PostgreSQL aislado y publica artefactos para revisión; no debe hacer push automático ni desplegar.

## Supabase

Comprobaciones de solo lectura del proyecto `ERP_Molsan` el 4-11-2026:

- 0 tablas/vistas ERP en `public`.
- 0 migraciones registradas.
- 0 usuarios Auth.
- 1 bucket privado `molsan-private` (100 MiB, 20 MIME permitidos), 0 objetos.
- RLS activo en `storage.objects` y `storage.buckets`; 0 políticas en `storage.objects`.

No se ha aplicado ninguna migración ERP ni se han cargado documentos. Los asesores de seguridad y rendimiento no mostraban avisos en la comprobación realizada.

## Almacenamiento documental: implementación en rama

Se ha añadido `backend/app/supabase_storage.py` y pruebas unitarias simuladas. Las rutas de Carpeta Digital, NotarGest, EncargaGest, Mensajes, Intranet y fotos de empleados ya tienen soporte para objetos privados de Supabase Storage. Mensajes se sirve por endpoint autenticado y se ha retirado el montaje estático público de adjuntos. En Render, `storage.py` falla de forma cerrada si no se activa Supabase Storage.

El diseño utiliza un bucket privado `molsan-private` con prefijos por dominio (`cd/`, `eg/`, `mensajes/`, `intranet/`, `fotos/empleados/`). Se mantiene compatibilidad de lectura con referencias locales antiguas para datos históricos, pero no se importarán documentos antiguos de Preview.

La implementación todavía no está desplegada ni validada contra un bucket real. Faltan crear el bucket privado, configurar el secreto `SUPABASE_SERVICE_ROLE_KEY` en el API Preview y ejecutar las pruebas reales de subida, descarga, sustitución, borrado, aislamiento y rollback. El detalle está en `backend/migrations/STORAGE_REVIEW.md`.

## Autenticación y permisos

Decisión tomada: conservar el sistema actual de empleados, PBKDF2, JWT, roles y permisos; no migrar ahora a Supabase Auth. La ausencia de usuarios Supabase Auth es intencionada, porque los usuarios del ERP viven en `empleados` y los portales NotarGest/EncargaGest mantienen sus propios flujos. Se ha documentado en `backend/migrations/AUTH_REVIEW.md`.

Se ha añadido la revisión candidata `20261104_0004_secure_public_api.py` para activar RLS y revocar acceso de `anon`/`authenticated`/`PUBLIC` a las tablas ERP expuestas por Data API. Debe superar el ciclo aislado de migraciones antes de aplicarse a Supabase. Falta ejecutar pruebas reales 401/403/200 y aislamiento en Preview.

## Render Preview

Los servicios Preview actuales siguen vinculados a ramas antiguas (`molsan-premium-2027-glass-luxe` para API y `molsan-premium-2027-global` para frontend), con auto-deploy desactivado. El conector Render disponible no permite cambiar la rama asociada; ese ajuste deberá hacerse en Render Dashboard. No se han cambiado variables ni se ha desplegado la rama. Después de cambiar ambas ramas, se configurarán las variables de Preview y se desplegará manualmente. Producción permanecerá intacta.

## Seeds y datos maestros

Las revisiones crean estructura, no datos operativos. Falta identificar los catálogos y datos maestros necesarios para una instalación limpia y preparar seeds idempotentes desde una fuente aprobada. Se ha añadido `backend/scripts/bootstrap_admin.py` para crear de forma explícita la primera cuenta administradora solo cuando `empleados` está vacía; requiere contraseña secreta temporal y no contiene credenciales predeterminadas. No se copiarán usuarios, permisos, expedientes ni pagos históricos sin validación explícita.

## Importación de 25 expedientes

Se ha preparado `backend/migrations/IMPORT_25_EXPEDIENTES.md` como runbook. No contiene datos personales ni ejecuta importaciones. La carga se hará en staging, con previsualización, validación de relaciones, aprobación, transacción controlada y evidencia de rollback.

## Secuencia pendiente

1. Ejecutar CI completo del SHA más reciente y validar conjuntamente las cuatro revisiones Alembic en PostgreSQL aislado.
2. Crear el bucket privado `molsan-private` y configurar `SUPABASE_SERVICE_ROLE_KEY` solo en API Preview.
3. Cambiar las ramas de los dos servicios Preview en Render Dashboard y configurar sus variables, sin tocar producción.
4. Preparar los seeds idempotentes de catálogos y el procedimiento de alta inicial del administrador.
5. Ejecutar pruebas integrales de API, documentos, portales, permisos 401/403/200, aislamiento, regresión y rollback.
6. Aprobar el punto de restauración y solo entonces preparar la importación de los 25 expedientes seleccionados.

**No fusionar, desplegar a producción, aplicar migraciones a Supabase ni importar datos históricos hasta superar las validaciones anteriores.**
