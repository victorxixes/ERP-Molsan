# Revisión del esquema objetivo ERP-Molsan

Estado del análisis offline del código (no es una inspección de la base de datos real ni una migración aplicable).

## Criterio de datos

Los expedientes y pagos históricos de los entornos anteriores son datos de prueba. No se migrarán. Tras validar la integración se preparará una importación separada de aproximadamente 25 expedientes seleccionados para pruebas reales.

## Inventario actual

- 67 tablas SQLAlchemy registradas al importar la aplicación.
- 33 tablas auxiliares declaradas mediante SQL estático.
- 7 índices auxiliares estáticos.
- 82 operaciones ALTER/DDL estáticas reconciliadas: 66 añaden columnas ya presentes en ORM; 11 se corresponden con columnas ya incluidas en las definiciones auxiliares canónicas; 5 se consolidan en las definiciones finales de claves y nulabilidad.
- 9 operaciones DDL dinámicas que deben convertirse a operaciones explícitas.
- 0 columnas añadidas por ALTER que falten en los modelos ORM (la auditoría de columnas ha localizado 66 ya representadas).
- 16 definiciones duplicadas o coincidentes con ORM.
- 8 referencias FK desde tablas auxiliares hacia tablas ORM.
- 0 destinos FK sin resolver detectados en el DDL auxiliar.

## Tablas auxiliares estáticas

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

Las dependencias entre estas tablas auxiliares deben respetarse al crear la revisión inicial. Ocho referencias apuntan a tablas ORM que deben existir antes que las auxiliares.

## DDL dinámico pendiente

Las 9 ubicaciones detectadas son:

- backend/app/encargagest/router.py:121
- backend/app/expedientes/defectos/migracion_router.py:58
- backend/app/expedientes/fix_schema.py:291
- backend/app/expedientes/gastos/migracion_router.py:91
- backend/app/expedientes/router.py:418
- backend/app/expedientes/router.py:4300
- backend/app/informes/facturacion_router.py:62
- backend/app/main.py:906
- backend/app/main.py:940

Hay que extraer las listas/diccionarios que generan los nombres de columnas y crear operaciones estáticas explícitas. No se permitirá DDL arbitrario generado por datos de usuario en ejecución normal.

## Duplicidades a reconciliar

El inventario detecta definiciones duplicadas o ya presentes en ORM para:

- agenda_citas
- expediente_gestor_historial
- defecto_subtipos
- expediente_absis_solicitudes
- correspondencia_configuracion
- plantilla_factura_concepto_gasto
- facturas_honorarios_gestoria
- expediente_documentos_escritura
- expediente_promociones
- correspondencia_plantillas
- provisiones_email_envios
- expediente_defectos_historial

Algunas entradas aparecen en varios archivos. La revisión debe elegir una única definición canónica. Para expediente_gestor_historial, la definición canónica debe mantener gestor_id y gestor_anterior_id con sus referencias a empleados, actividad VARCHAR(120) NOT NULL y motivo VARCHAR(80).

Las 11 columnas auxiliares detectadas están incluidas en las definiciones finales: expediente_gasto_pagos (anulación), expediente_documentacion_previa_absis (avance y registro local), expediente_visibilidad_config (empleado_id/ambito) y mensajeria_solicitudes (teléfono de recogida/entrega). Se han añadido estos dos últimos campos a la definición canónica de mensajería.

La tabla auxiliar `expediente_visibilidad_config` se crea directamente con su clave primaria compuesta `(empleado_id, actividad_key, ambito)`; no se debe crear primero una PK antigua para después alterarla. La columna `entidades_bancarias.codigo_europeo` ya es nullable en el modelo ORM. La FK de subtipo de defecto se ha definido en ORM con nombre estable y `ON DELETE SET NULL`, para reconciliarla en la siguiente revisión Alembic.

## Política de DDL en ejecución

El backend no debe cambiar el esquema. Las sentencias idempotentes heredadas solo se convierten en no-op cuando el objeto ya existe con el estado final provisionado. Si falta una tabla, índice, columna o restricción, la operación falla y exige una migración Alembic versionada. Las eliminaciones/destructivas no se ejecutan desde peticiones.

La migración Alembic inicial debe incorporar:
1. Las 67 tablas ORM.
2. Las 33 tablas auxiliares y sus 7 índices.
3. Las columnas y restricciones de las 82 operaciones estáticas.
4. Las 9 operaciones dinámicas una vez enumeradas.
5. Seeds explícitos para catálogos/datos maestros que deban existir en la instalación limpia.

## Estado de aplicación

No se ha creado ni ejecutado la revisión inicial. Supabase sigue sin tablas del ERP. Este documento es una guía de revisión; no debe ejecutarse como SQL.
