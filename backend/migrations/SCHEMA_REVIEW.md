# Revisión del esquema objetivo ERP-Molsan

Fecha de actualización: 4 de noviembre de 2026.

## Alcance

Este inventario se genera desde el código de la rama de integración; no representa una lectura del esquema de producción. La validación de migraciones se ha ejecutado en un PostgreSQL temporal de CI. No se ha aplicado ninguna revisión a Supabase.

## Criterio de datos

Los 417 expedientes y pagos históricos de los entornos anteriores son datos ficticios/de prueba y no se migrarán. Después de completar y validar el ERP se preparará una importación separada de aproximadamente 25 expedientes seleccionados por MOLSAN. Los pagos y saldos se crearán posteriormente mediante los flujos funcionales del ERP.

## Inventario reconciliado

- 67 tablas registradas en SQLAlchemy.
- 33 tablas auxiliares declaradas mediante SQL estático.
- 7 índices auxiliares estáticos.
- 77 operaciones ALTER/DDL estáticas reconciliadas: 62 columnas ya representadas en ORM, 10 columnas incluidas en las definiciones auxiliares canónicas y 5 ajustes consolidados de claves/nulabilidad.
- 0 columnas de ALTER pendientes de incorporar a modelos ORM.
- 0 operaciones DDL dinámicas pendientes: las 9 rutas heredadas identificadas se han retirado del flujo web y se han sustituido por comprobaciones de esquema.
- 14 entradas de definiciones duplicadas o coincidentes: 4 corresponden a tablas ya incluidas en ORM y 10 son repeticiones idénticas de definiciones auxiliares. No se detectaron definiciones conflictivas.
- 8 referencias FK desde tablas auxiliares hacia tablas ORM.
- 0 destinos FK auxiliares sin resolver.

El inventario completo se genera mediante `backend/scripts/audit_supabase_schema.py` y se publica como artefacto del workflow **Offline ORM and DDL inventory**.

## Tablas auxiliares

1. absis_postfirma_cargas
2. absis_postfirma_registros
3. alta_expediente_contadores
4. catalogo_oficinas
5. catalogos_absis
6. catalogos_absis_categorias
7. correspondencia_configuracion
8. correspondencia_plantillas
9. ctn_portal_accesos_historial
10. datos_molsan_config
11. encargagest_notaria_gestor
12. expediente_absis_solicitudes
13. expediente_documentacion_previa_absis
14. expediente_gasto_pagos
15. expediente_gestor_historial
16. expediente_hipotecas
17. expediente_sla_actividad
18. expediente_traspasos_saldo
19. expediente_traspasos_saldo_origenes
20. expediente_visibilidad_config
21. facturas_honorarios_gestoria
22. mensajeria_servicios
23. mensajeria_solicitudes
24. mensajeria_albaranes
25. mensajeria_comunicaciones
26. mensajeria_facturas
27. mensajeria_factura_albaran
28. mensajeria_proveedores
29. notargest_avisos_leidos
30. notargest_historial_actividad
31. plantilla_factura_concepto_gasto
32. provisiones_email_envios
33. tipos_impositivos

Las siete referencias de índice auxiliares y las ocho referencias FK hacia tablas ORM están incluidas en la revisión 0003 y se crean después de las tablas ORM.

## Columnas auxiliares reconciliadas

Las 10 columnas adicionales detectadas en tablas auxiliares están incorporadas a las definiciones canónicas:

- `expediente_gasto_pagos`: `anulado_en`, `anulado_por`, `motivo_anulacion`.
- `expediente_visibilidad_config`: `empleado_id`, `ambito`.
- `expediente_documentacion_previa_absis`: `mover_siguiente_actividad`, `solicitud_registrada_localmente`, `fecha_solicitud_local`.
- `mensajeria_solicitudes`: `telefono_recogida`, `telefono_entrega`.

`expediente_visibilidad_config` se crea directamente con su clave primaria compuesta `(empleado_id, actividad_key, ambito)`. La columna `entidades_bancarias.codigo_europeo` es nullable en ORM. La FK de subtipo de defecto se normaliza en la revisión 0002 con nombre estable `fk_expediente_defectos_subtipo` y `ON DELETE SET NULL`.

## Definiciones duplicadas

Las 14 entradas detectadas corresponden a estos nombres de tabla (algunas aparecen repetidas en más de un módulo):

- agenda_citas
- expediente_gestor_historial
- expediente_absis_solicitudes
- correspondencia_configuracion
- plantilla_factura_concepto_gasto
- facturas_honorarios_gestoria
- expediente_promociones
- correspondencia_plantillas
- provisiones_email_envios
- defecto_subtipos
- expediente_defectos_historial

Se conserva una sola definición canónica por tabla auxiliar. Para `expediente_gestor_historial`, la definición conserva `gestor_id` y `gestor_anterior_id` con referencias a empleados, `actividad VARCHAR(120) NOT NULL` y `motivo VARCHAR(80)`.

## Revisiones Alembic versionadas

La rama contiene tres revisiones consecutivas:

1. `20261104_0001_initial_orm_schema.py`: esquema inicial de las 67 tablas ORM.
2. `20261104_0002_reconcile_orm_constraints.py`: reconciliación de la FK de subtipo de defecto.
3. `20261104_0003_auxiliary_schema.py`: 33 tablas auxiliares y 7 índices.
4. `20261104_0004_secure_public_api.py`: activa RLS en tablas públicas del ERP y revoca privilegios de `anon`, `authenticated` y `PUBLIC`; no crea políticas de acceso para el navegador.

## Validación aislada

Las revisiones 0001–0003 superaron el 4-11-2026 el ciclo completo en PostgreSQL temporal: `upgrade head`, `alembic check` (**No new upgrade operations detected**), `downgrade base` y segundo `upgrade head`.

La revisión 0004 añade el cierre de la Data API y RLS para el sistema de autenticación propio del ERP. Su validación conjunta con las cuatro revisiones está pendiente de la ejecución del workflow de CI actual; no se considerará validada hasta que termine correctamente.

El workflow utiliza PostgreSQL temporal de CI. Ninguna de estas pruebas equivale a aplicar las revisiones en Supabase ni autoriza el despliegue.

## Estado de Supabase

Comprobaciones de solo lectura del proyecto `ERP_Molsan` el 4-11-2026:

- 0 tablas/vistas ERP en `public`.
- 0 migraciones registradas.
- 0 usuarios en `auth.users`.
- 0 buckets y 0 objetos en Storage.

No se ha escrito esquema ni datos en el proyecto.

## Seeds y datos maestros pendientes

Las revisiones de estructura no importan expedientes ni pagos. Antes de conectar Preview hay que identificar los catálogos/datos maestros imprescindibles para una instalación limpia, localizar su fuente aprobada y crear seeds versionados e idempotentes por separado. No se deben copiar datos operativos antiguos como si fueran catálogos.

## Política de ejecución

El proceso web no debe ejecutar DDL, seeds ni reparaciones de esquema al arrancar ni desde endpoints. Las modificaciones estructurales se aplican mediante revisiones Alembic explícitas. Si falta una tabla, columna, índice o restricción, el servicio debe fallar con un diagnóstico claro, sin intentar alterar la base de datos durante una petición.

**Estado:** revisiones 0001–0003 de esquema probadas en PostgreSQL aislado; revisión 0004 de seguridad añadida y pendiente de validación CI conjunta. Supabase continúa vacío. Pendientes: completar CI, seeds aprobados, bucket privado y secreto de Storage, conexión del Preview y pruebas integrales.
