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

Se añadieron dos pruebas de regresión para ambos escenarios en `backend/tests/test_reparto_sin_candidato.py`. Estas pruebas están escritas, pero todavía deben ejecutarse en un entorno con las dependencias del backend antes de considerarlas superadas.

**Limitación pendiente:** la lógica de acceso ya permite que el gestor conservado provisionalmente siga viendo ese expediente, y deja de hacerlo cuando el historial registra una asignación posterior. Aún falta una señal visual de «asignación provisional/incompatible» en la ficha y una bandeja operativa para resolver estas incidencias. La incidencia se registra y se respeta en el ámbito de acceso, pero todavía no existe una supervisión visual completa.

## Panel central de Asignaciones

La ruta `/herramientas/utilidades/asignaciones` existe y lleva a `AdministracionEmpleadoConfig`. El panel permite localizar a un empleado y abrir la pestaña de Asignaciones de su modal; no es un segundo editor independiente de reglas ni un panel operativo con métricas de reparto.

La configuración se guarda en `empleados.reparto_actividades_json` y se lee/guarda mediante los endpoints de EncargaGest protegidos para administradores. Esto es coherente con mantener la ficha del empleado como fuente única de las reglas.

Mejora recomendada pendiente: ampliar la pantalla central para supervisión (expedientes sin gestor, incidencias por falta de regla, carga por actividad y acceso al historial), sin crear una segunda fuente de configuración ni reasignar expedientes en masa.

## Validaciones pendientes

1. Ejecutar las pruebas de regresión añadidas y la suite disponible del backend.
2. Revisar las reglas de candidato y el cálculo de carga ponderada por porcentaje, con casos de actividad, oficina, territorio, producto, operación, estado, departamento y apoderado.
3. Añadir una indicación visible de asignación provisional y una forma controlada de resolver la incidencia.
4. Verificar que el panel central y la pestaña del empleado comparten la misma configuración y permisos.
5. Ejecutar build/pruebas de frontend y comprobar el despliegue solo después de revisar y aprobar los cambios.
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
- [ ] Pruebas ejecutadas y superadas.
- [ ] Estado provisional visible en la interfaz.
- [ ] Panel operativo de incidencias e historial.
- [ ] Build frontend/backend y validación en entorno de pruebas.
- [ ] Pruebas funcionales con MOLSAN.
