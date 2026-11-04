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
- 0 buckets y 0 objetos Storage.

No se ha aplicado ninguna migración ni se han cargado datos. Los asesores de seguridad y rendimiento no mostraban avisos en la comprobación realizada.

## Almacenamiento documental: siguiente fase

El backend aún usa almacenamiento local en `backend/app/storage.py` para Carpeta Digital, Mensajes, documentos de intranet y fotos. También hay escrituras locales en NotarGest y EncargaGest.

Como no se contratarán discos persistentes de Render, el siguiente bloque es implementar Supabase Storage privado:
- buckets privados separados por dominio;
- claves aleatorias y metadatos en PostgreSQL;
- autorización en backend antes de leer o emitir una URL firmada;
- límites de tamaño/MIME y controles contra path traversal;
- pruebas de subida, descarga, sustitución, borrado y fallos transaccionales;
- credencial privilegiada únicamente en el servicio API de Render, nunca en frontend.

La auditoría y el diseño se documentan en `backend/migrations/STORAGE_REVIEW.md`. Aún no se han creado buckets ni se han cambiado rutas.

## Autenticación y permisos

El backend conserva su sistema actual de usuarios empleados, JWT, roles y permisos. Supabase Auth está vacío. Antes de abrir Preview hay que cerrar la decisión de conservar este sistema o realizar una integración explícita con Supabase Auth, y probar 401/403/200, permisos por módulo y aislamiento de ApoderaGest, EncargaGest y NotarGest. No se expondrán claves privilegiadas al navegador.

## Render Preview

Los servicios Preview existentes siguen vinculados a ramas anteriores y no se han cambiado. No están desplegados desde la rama de integración. La conexión se realizará después de cerrar Storage, autenticación, seeds y configuración de variables; producción permanecerá intacta.

## Seeds y datos maestros

Las revisiones crean estructura, no datos operativos. Falta identificar los catálogos y datos maestros necesarios para una instalación limpia y preparar seeds idempotentes desde una fuente aprobada. No se copiarán usuarios, permisos, expedientes ni pagos históricos sin validación explícita.

## Importación de 25 expedientes

Se ha preparado `backend/migrations/IMPORT_25_EXPEDIENTES.md` como runbook. No contiene datos personales ni ejecuta importaciones. La carga se hará en staging, con previsualización, validación de relaciones, aprobación, transacción controlada y evidencia de rollback.

## Secuencia pendiente

1. Implementar y probar Supabase Storage privado; no crear discos persistentes.
2. Cerrar autenticación, roles, permisos y aislamiento de portales.
3. Identificar y preparar seeds de catálogos/datos maestros.
4. Configurar los servicios Preview de Render contra esta rama y el proyecto Supabase correcto, sin tocar producción.
5. Ejecutar pruebas integrales de API, documentos, portales, permisos, regresión y rollback.
6. Aprobar el punto de restauración y solo entonces preparar la importación de los 25 expedientes seleccionados.

**No fusionar, desplegar a producción, aplicar migraciones a Supabase ni importar datos históricos hasta superar las validaciones anteriores.**
