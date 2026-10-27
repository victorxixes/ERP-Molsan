# Checklist de pruebas funcionales — Fichaje Molsan y Control de Fichajes

**Fecha de preparación:** 27 de octubre de 2026  
**Repositorio:** `victorxixes/ERP-Molsan` · rama `main`  
**Estado inicial:** correcciones integradas en código; pruebas funcionales en Render pendientes.  
**Importante:** no marcar una prueba como superada sin ejecutarla y anotar el resultado. Usar cuentas de prueba y datos no sensibles.

## 1. Estado de versiones

- [x] PR #306 integrado: `f8c9c9db251572c58e458e59dd945c18ecdc6a5e`.
- [x] PR #307 integrado: `a33f29982e86a7682a8975eaa5afa7e9cb862a9b`; backend Render confirmado Live. Se desactiva el access log de Uvicorn para que las URL de WebSocket no registren el token de autenticación.
- [x] Workflow automático de validación de frontend/backend ejecutado correctamente en la revisión anterior.
- [ ] Pruebas funcionales con base de datos y usuarios reales/de prueba: pendientes.

## 2. Marcajes: entrada, pausa y salida

Ejecutar con una cuenta de empleado y comprobar que los cambios se persisten y aparecen al actualizar la pantalla.

- [ ] Registrar entrada: se guarda una sola vez y aparece en el historial.
- [ ] Intentar registrar una segunda entrada sin cerrar la jornada: debe rechazarse de forma clara.
- [ ] Intentar salida sin entrada abierta: debe rechazarse.
- [ ] Iniciar pausa con jornada abierta: se registra el inicio correcto.
- [ ] Intentar iniciar otra pausa sin cerrar la anterior: debe rechazarse.
- [ ] Intentar retorno sin pausa abierta: debe rechazarse.
- [ ] Cerrar la pausa con el retorno correspondiente: la secuencia queda completa.
- [ ] Registrar salida tras el retorno: la jornada queda cerrada.
- [ ] Intentar marcar después de la salida sin nueva entrada: debe rechazarse.
- [ ] Verificar que cada acción aparece una sola vez incluso con doble clic/solicitudes repetidas.
- [ ] Confirmar mensajes comprensibles ante errores de red o respuestas de validación.

## 3. Cálculo de jornada y horas

- [ ] Confirmar que las horas trabajadas se calculan entre entrada y salida.
- [ ] Confirmar que las pausas se descuentan según las reglas configuradas.
- [ ] Verificar jornada abierta: no debe presentar como definitivo un total que requiera salida.
- [ ] Verificar jornada que cruza medianoche.
- [ ] Verificar cambio de horario de verano/invierno en zona Europe/Madrid.
- [ ] Verificar cierre de mes y cambio de año sin duplicar ni perder registros.
- [ ] Contrastar resumen mensual/anual con una suma manual de registros de prueba.
- [ ] Comprobar qué ocurre con marcajes incompletos o secuencias históricas inconsistentes y que se identifican para revisión.

## 4. Vacaciones

- [ ] Solicitar un rango válido y comprobar estado SOLICITADO.
- [ ] Intentar fecha final anterior a la inicial: debe rechazarse.
- [ ] Intentar solicitud de más de 60 días naturales: debe rechazarse.
- [ ] Intentar rango que cruce años naturales: debe solicitar dividir la petición, según la validación actual.
- [ ] Crear dos solicitudes solapadas pendientes: la segunda debe rechazarse.
- [ ] Intentar solapar vacaciones con una ausencia o compensación pendiente/aprobada: debe rechazarse.
- [ ] Aprobar una solicitud válida con bolsa anual configurada.
- [ ] Intentar aprobar sin bolsa asignada: debe rechazarse.
- [ ] Intentar aprobar por encima del saldo anual: debe rechazarse.
- [ ] Verificar días asignados, disfrutados, reservados y restantes.
- [ ] Rechazar una solicitud con motivo/observación y confirmar que el estado se actualiza.
- [ ] Intentar resolver dos veces la misma solicitud: la segunda resolución debe rechazarse.

## 5. Ausencias y compensaciones

- [ ] Crear solicitud de ausencia con tipo existente y fechas válidas.
- [ ] Rechazar tipo de ausencia inexistente o inactivo.
- [ ] Rechazar fecha final anterior a la inicial y rangos superiores a 60 días.
- [ ] Rechazar solapamientos con otra ausencia, vacaciones o compensación pendiente/aprobada.
- [ ] Aprobar una ausencia válida y comprobar que la resolución queda registrada.
- [ ] Rechazar una ausencia indicando el motivo y verificar el historial.
- [ ] Comprobar las solicitudes de compensación y festivos trabajados, incluidas sus transiciones de estado y conflictos con vacaciones/ausencias.
- [ ] Verificar que no se modifica información de otro empleado desde los formularios de solicitud.

## 6. Documentos justificativos

- [ ] Subir documento con tipo, fecha y fichero válidos.
- [ ] Comprobar validación cuando falta un campo obligatorio o el fichero no es válido.
- [ ] Verificar que el empleado ve sus documentos y no los de otras personas.
- [ ] Verificar que administración puede filtrar y consultar documentos según permisos.
- [ ] Aprobar y rechazar un justificante con motivo.
- [ ] Confirmar historial de revisiones y que una nueva revisión no borra las anteriores.
- [ ] Comprobar apertura/descarga del fichero y control de acceso directo a su URL.

## 7. Permisos y privacidad

Usar al menos dos cuentas de empleado distintas y una cuenta de administración autorizada.

- [ ] Empleado A solo consulta sus propios marcajes, vacaciones, ausencias y documentos.
- [ ] Empleado A no puede consultar ni editar los registros de Empleado B manipulando URL o llamadas API.
- [ ] Un usuario sin permiso de Fichaje Molsan no puede acceder a sus rutas/API.
- [ ] Un empleado con permiso personal de fichajes, pero sin permiso administrativo, no puede acceder a Control de Fichajes.
- [ ] Administración autorizada puede consultar la plantilla y resolver solicitudes.
- [ ] Usuario sin permiso administrativo recibe acceso denegado en API, aunque conozca la URL.
- [ ] Corregir un marcaje administrativamente exige motivo y deja auditoría con valores anteriores/nuevos.
- [ ] Los periodos cerrados bloquean las operaciones que deben quedar impedidas; reabrir/cerrar requiere motivo.
- [ ] Revisar logs nuevos y confirmar que no se registran tokens de autenticación en las URL WebSocket.

## 8. Pantallas, filtros y navegación

- [ ] Navegar por el calendario de meses y años, incluido enero/diciembre.
- [ ] Comprobar filtros y búsqueda de Resumen de marcajes.
- [ ] Comprobar resumen anual de horas y consistencia con los registros.
- [ ] Comprobar filtros administrativos por empleado, fechas, tipo y estado.
- [ ] Comprobar que las acciones y botones se deshabilitan mientras se procesa una petición para evitar duplicados.
- [ ] Revisar estados vacíos, mensajes de error y confirmaciones de éxito.
- [ ] Revisar escritorio y móvil.
- [ ] Comprobar festivos, compensaciones, documentos, cierres y auditoría en las pantallas administrativas.

## 9. Registro de ejecución

Añadir una fila por sesión de pruebas. No introducir contraseñas, tokens ni datos personales reales en este documento.

| Fecha/hora | Perfil de prueba | Área / caso | Resultado esperado | Resultado obtenido | Estado | Incidencia/PR |
|---|---|---|---|---|---|---|
| — | — | — | — | — | Pendiente | — |

Estados permitidos: **Pendiente**, **Superada**, **Fallida**, **Bloqueada**.

## 10. Criterio de cierre

Se podrá considerar listo para uso una vez que:
1. Todas las pruebas críticas de marcajes, cálculo de horas, vacaciones/ausencias y permisos estén superadas.
2. Los errores detectados estén corregidos y desplegados.
3. Se repitan las pruebas afectadas después de cada corrección.
4. No queden incidencias críticas o altas abiertas.
5. La persona responsable confirme los resultados en Render.

**Situación actual:** la revisión y las correcciones de código están registradas; queda ejecutar el protocolo funcional en Render. La compilación correcta por sí sola no equivale a validación funcional.
