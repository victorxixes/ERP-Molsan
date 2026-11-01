# Auditoría de reparto de gestores — estado y revisión

Fecha: 2026-10-29

## Alcance de esta primera intervención

Revisión estática de la rama `main` de `victorxixes/ERP-Molsan`, centrada en la asignación automática y el acceso a la configuración centralizada. Los cambios de esta intervención se preparan en `audit/reparto-gestores-seguro`; no se despliegan en Render ni modifican datos de la base de datos.

## Hallazgo confirmado y corrección preparada

En `backend/app/expedientes/reparto.py`, `asignar_gestor_automaticamente` borraba `gestor_asignado_id` cuando no encontraba ningún empleado con reglas compatibles. Esto podía dejar un expediente sin gestor al cambiar de actividad, aunque ya tuviera uno asignado.

La rama de trabajo cambia ese comportamiento:

- Si había un gestor asignado, se conserva y se registra el motivo `sin_regla_reparto_gestor_conservado`.
- Si no había gestor, se mantiene sin asignar y se registra `sin_regla_reparto_sin_gestor`.
- El resultado de la función sigue siendo `None` cuando no se ha elegido un gestor nuevo; no se presenta como una asignación nueva válida.

Se añadieron pruebas de regresión para conservar gestor, expediente sin gestor, valor 0 y acceso provisional. La ejecución de GitHub Actions «Backend audit» (run 99) ha pasado: compilación de módulos y suite completa de `backend/tests` con SQLite aislado, sin base de datos de producción. También han pasado las comprobaciones recientes de sintaxis backend y build frontend.

**Limitación pendiente:** la lógica de acceso ya permite que el gestor conservado provisionalmente siga viendo ese expediente, y deja de hacerlo cuando el historial registra una asignación posterior. Se ha añadido el campo `gestor_asignacion_provisional` a la respuesta de detalle y al cambio de actividad, y una señal visual «Provisional» en la cabecera de la ficha. El panel central ya incluye una vista de solo lectura de expedientes sin gestor, asignaciones provisionales y carga pendiente por gestor/actividad. Sigue pendiente una acción controlada para resolver incidencias y consultar el historial completo.

## Panel central de Asignaciones

La ruta `/herramientas/utilidades/asignaciones` existe y lleva a `AdministracionEmpleadoConfig`. El panel permite localizar a un empleado y abrir la pestaña de Asignaciones de su modal; no es un segundo editor independiente de reglas ni un panel operativo con métricas de reparto.

La configuración se guarda en `empleados.reparto_actividades_json` y se lee/guarda mediante los endpoints de EncargaGest protegidos para administradores. Esto es coherente con mantener la ficha del empleado como fuente única de las reglas.

La pantalla central muestra ahora resumen de expedientes sin gestor, asignaciones provisionales, incidencias recientes y carga pendiente por gestor/actividad. La fuente de verdad sigue siendo `empleados.reparto_actividades_json`; el panel no modifica ni reasigna expedientes. Queda pendiente añadir filtros/paginación y un flujo de resolución controlada con historial completo.

## Validaciones pendientes

1. [x] Ejecutar las pruebas de regresión y la suite del backend: 82 pruebas pasadas, 1 aviso de dependencia y 21 subtests, en SQLite aislado.
2. Revisar las reglas de candidato y el cálculo de carga ponderada por porcentaje, con casos de actividad, oficina, territorio, producto, operación, estado, departamento y apoderado.
3. [x] Añadir indicación visible de asignación provisional. [ ] Implementar resolución controlada de incidencias.
4. Verificar que el panel central y la pestaña del empleado comparten la misma configuración y permisos.
5. [x] Build de frontend y sintaxis backend superados en GitHub Actions. [ ] Comprobar despliegue solo después de revisar y aprobar los cambios.
6. Realizar las pruebas funcionales con expedientes de prueba/casi definitivos; no hacer reasignaciones masivas ni cambios en datos históricos durante la auditoría.

## Casos que debe revisar MOLSAN

- Un cambio de actividad con un gestor nuevo compatible debe asignar el gestor según las reglas.
- Si no hay candidato compatible, el gestor anterior debe conservarse como provisional y la incidencia debe ser visible.
- Si el expediente nunca tuvo gestor y no hay candidato, debe seguir pendiente de asignación con un motivo claro.
- Los porcentajes deben tratarse como ponderación de reparto, salvo que se acuerde expresamente otra interpretación.
- La resolución de incidencias debe ser explícita y no debe provocar una reasignación masiva automática.

## Estado

- [x] Hallazgo del borrado silencioso confirmado.
- [x] Corrección preparada en rama separada.
- [x] Pruebas de regresión añadidas.
- [x] Ruta y función real del panel central identificadas.
- [x] Pruebas automatizadas del backend ejecutadas y superadas en SQLite aislado.
- [x] Estado provisional visible en la cabecera de la ficha.
- [x] Panel central de solo lectura con incidencias recientes y carga por actividad.
- [ ] Historial completo y resolución controlada de incidencias.
- [x] Build frontend y sintaxis backend superados en GitHub Actions.
- [ ] Validación funcional en Render/entorno de pruebas.
- [ ] Pruebas funcionales con MOLSAN.
