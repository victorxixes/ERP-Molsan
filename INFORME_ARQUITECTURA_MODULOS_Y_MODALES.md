# Inventario de arquitectura del ERP-Molsan
## Módulos, páginas, ventanas modales y control de revisión
**Fecha de inventario:** 27 de octubre de 2026  
**Repositorio:** `victorxixes/ERP-Molsan` · rama `main`  
**Objetivo:** disponer de una base de control para revisar, corregir y unificar progresivamente los módulos del ERP.

> **Importante sobre el alcance:** este documento se ha preparado a partir del árbol de archivos y de la inspección de componentes React del repositorio. Confirma páginas y ventanas identificables en el código revisado, pero no certifica que cada pantalla esté operativa ni que coincida con lo desplegado en Render. Los modales dinámicos pueden cambiar de título según la selección. Los puntos marcados como pendientes requieren inspección de código adicional o comprobación visual.

---

# 1. Cómo utilizar este informe

Para cada módulo, revisar en este orden:

1. **Acceso y navegación:** ruta, tarjeta del espacio de trabajo y entrada en sidebar.
2. **Permisos:** qué roles pueden ver, crear, editar, eliminar y aprobar.
3. **Pantalla principal:** datos, filtros, tablas, paginación y estados vacíos.
4. **Ventanas modales:** apertura, cierre, guardado, validación, errores, responsive y accesibilidad.
5. **Integridad de datos:** persistencia, relaciones con FichaExpediente y otros módulos, documentos y auditoría.
6. **Diseño común:** cabecera, sidebar, tipografía, botones, tablas, tarjetas, sombras y comportamiento responsive.
7. **Prueba real:** confirmar en Render con un perfil autorizado y otro sin permisos.

Estados de revisión propuestos para este documento:
- **Pendiente:** aún no se ha revisado.
- **En revisión:** se está comprobando el código o la pantalla.
- **Incidencia:** se ha encontrado un fallo.
- **Corregido en código:** existe un cambio en GitHub, falta validar en el entorno desplegado.
- **Validado:** prueba funcional superada en Render.
- **No aplica:** no utiliza modales o no corresponde al módulo.

No marcar un módulo como validado únicamente porque compile o porque exista el archivo.

---

# 2. Mapa general de la aplicación

## 2.1 Entrada, navegación y paneles comunes

| Área | Archivo principal identificado | Función / alcance | Revisión |
|---|---|---|---|
| Inicio de sesión | `pages/LoginPage.jsx` | Acceso a la aplicación | Pendiente |
| Selector de módulos / espacio de trabajo | `pages/ModulosSelector.jsx` | Tarjetas de aplicaciones y accesos | Pendiente |
| Panel / dashboard | `pages/dashboard/Dashboard.jsx` | Resumen de entrada | Pendiente |
| Panel técnico | `pages/paneltecnico/PanelTecnico.jsx` | Herramientas técnicas y accesos de soporte | Pendiente |
| Módulo pendiente genérico | `pages/ModuloPendiente.jsx` | Pantalla para módulos aún no implementados o provisionales | Revisar usos |
| Agenda | `pages/agenda/Agenda.jsx` | Agenda con vistas | Pendiente |
| Notificaciones | `pages/notificaciones/Notificaciones.jsx` | Centro de notificaciones | Pendiente |
| Mensajes internos | `pages/mensajes/Mensajes.jsx` | Mensajería interna | Pendiente |
| Informes | `pages/informes/Informes.jsx` | Informes y consultas agrupadas | Pendiente |
| Logs | `pages/logs/Logs.jsx` | Consulta de registros | Pendiente |
| Intranet | `pages/intranet/Intranet.jsx` | Área de intranet | Pendiente |

**Modales identificados en áreas comunes**
- **Selector de módulos:** modal de soporte/acceso contextual (estado React `modalSoporte`).
- **Agenda:** tiene vistas separadas de día, semana y mes; el inventario de diálogos de agenda debe confirmarse inspeccionando sus componentes.
- **Notificaciones, Mensajes, Logs, Intranet y Dashboard:** ventanas modales concretas pendientes de inventario detallado; no se afirma que carezcan de ellas.

---

# 3. Módulo Expedientes

**Archivos principales**
- `pages/expedientes/ExpedientesListado.jsx`
- `pages/expedientes/FichaExpediente.jsx`
- Estilos: `ExpedientesListado.css`, `FichaExpedientePremium.css`
- Componentes relacionados identificados: `CarpetaDigitalModal`, `EnviarANotarioModal`.

## 3.1 Listado de expedientes
Ventanas y diálogos identificados:
- [ ] **Filtros avanzados** — modal identificado en el código como “MODAL — FILTROS AVANZADOS”.
- [ ] **Control de plazos / SLA** — diálogo de ayuda identificado por `titulo-control-plazos`.
- [ ] **Carpeta digital del expediente** — se invoca `CarpetaDigitalModal`; comprobar categorías documentales, previsualización, carga y permisos.
- [ ] Otros menús o visores documentales — inventario visual pendiente.

Revisar filtros, búsqueda, tabla, paginación, columnas, accesos a ficha, duplicados por DNI, control de plazos y que no existan acciones duplicadas.

## 3.2 Ficha del expediente
En el archivo aparecen estados y secciones que controlan varios formularios/diálogos. Ventanas identificadas por nombre o estado en el código:
- [ ] **Datos de actividad** — modal compartido para datos propios de cada actividad.
- [ ] **Enviar a notario** — sección/modal de envío y datos notariales; existe componente `EnviarANotarioModal`.
- [ ] **Factura de honorarios** — modal específico de honorarios.
- [ ] **Complemento de saldo** — modal para gestionar el complemento.
- [ ] **PPAD** — modal/formulario PPAD.
- [ ] **Formulario de gasto** — diálogo de alta/edición de gasto.
- [ ] **Defecto registral** — bloque identificado como “MODAL DEFECTO”.
- [ ] **Fincas y Registros** — bloque identificado como “MODAL FINCAS Y REGISTROS”.
- [ ] **Solicitud de fusión** — bloque identificado como “MODAL SOLICITUD DE FUSIÓN”.
- [ ] **Acciones del expediente** — bloque identificado como “MODAL ACCIONES”.
- [ ] **Expedientes relacionados** — bloque identificado como “MODAL EXPEDIENTES RELACIONADOS”.
- [ ] **Observaciones** — bloque identificado como “MODAL OBSERVACIONES”.
- [ ] **Carpeta digital / repositorios de documentos** — componente/modal compartido.
- [ ] **Control de calidad / control del expediente / aviso de bloqueo** — estados visibles en el código; confirmar si cada uno se muestra como modal, panel o aviso.
- [ ] **Formulario de observación y formularios PPAD** — revisar si son diálogos independientes o subformularios dentro de un modal.

**Prioridad de revisión:** muy alta. La FichaExpediente es la fuente de verdad para procesos vinculados a CancelaGest, ApoderaGest y NotarGest. Verificar que fecha de firma/protocolo, notario, apoderado, documentos, pagos y estados se guardan una sola vez y se muestran coherentemente.

---

# 4. Módulos de gestión

## 4.1 CancelaGest
**Archivo:** `pages/cancelagest/Cancelagest.jsx`.

- Función: gestión de cancelaciones y operaciones relacionadas con expedientes.
- **Inventario de modales:** pendiente de inspección detallada del componente.
- [ ] Enumerar cada diálogo de creación/edición, provisión, documentos, firma y confirmación que exista.
- [ ] Comprobar que los datos que pertenecen a la FichaExpediente se leen de la fuente común.
- [ ] Comprobar relación con Provisiones, Honorarios, documentos y estados.
- [ ] Verificar permisos y pruebas en Render.

## 4.2 ApoderaGest
**Archivo:** `pages/apoderagest/ApoderaGest.jsx`.

Ventanas identificadas:
- [ ] **Encargos de un grupo / indicador** — diálogo con etiqueta accesible dinámica “Encargos de …”.
- [ ] **Resumen de actividad** — modal identificado por clases `ag-resumen-modal`; muestra expedientes coincidentes con el indicador.

Revisar:
- [ ] Relación expediente ↔ apoderado mediante identificador de empleado.
- [ ] Firma, modalidad, fecha, protocolo y estado coherentes con la FichaExpediente.
- [ ] Apertura de un expediente desde el resumen.
- [ ] Visor de documentos y permisos.
- [ ] Prueba con usuarios de distintos perfiles.

## 4.3 NotarGest
**Archivo:** `pages/notargest/NotarGest.jsx`.

Ventanas identificadas:
- [ ] **Notificaciones / avisos** — `notificacionesAbiertas`, modal `ng-modal-avisos`.
- [ ] **Pagos** — `pagosAbiertos`, modal `ng-modal-pagos`.
- [ ] **Perfil de notaría/notario** — `perfilNotarioAbierto`, modal de perfil.
- [ ] **Resumen de expedientes** — modal `ng-resumen-expedientes-modal`, dinámico por indicador o notaría.
- [ ] **Visor PDF / vista previa de documento** — se detecta visor mediante iframe; confirmar si se abre en modal o panel.

Revisar:
- [ ] Identificación de notaría por CTN y datos del notario.
- [ ] Fecha, actualización, notificaciones, perfil/contraseña y salida.
- [ ] Coherencia de expedientes, pagos y documentos con FichaExpediente.
- [ ] Accesos notariales habilitados/deshabilitados.
- [ ] No mostrar pagos de otra notaría.

## 4.4 EncargaGest (Notarios + Gestoría)
**Archivos:** `pages/encargagest/EncargaGest.jsx`, `EncargaGestWorkspace.jsx`.

Ventanas identificadas en `EncargaGest.jsx`:
- [ ] **Nuevo encargo** — `modalNuevo`.
- [ ] **Editar encargo** — `modalEditar`.
- [ ] **Registrar incidencia** — `modalIncidencia`.
- [ ] **Accesos** — `modalAccesos`.
- [ ] **Perfil / detalle del encargo** — modal de perfil identificado por `eg-modal-perfil`.

Revisar:
- [ ] Crear, editar, autorizar y validar encargos.
- [ ] Incidencias compartidas entre Notarios y Gestoría.
- [ ] Documentos compartidos y vista previa.
- [ ] Varios contratos y varias fincas.
- [ ] Estado de firma y relación con ApoderaGest.
- [ ] Permisos distintos para notarios, gestoría y administración.
- [ ] Prueba de extremo a extremo en Render.

## 4.5 CTN / listado de notarías
**Archivos:** `pages/ctn/CtnListadoPage.jsx`, `CtnDetallePage.jsx`, `Ctn.jsx`.

Ventanas identificadas:
- [ ] **Ficha de notaría** — el listado permite seleccionar una notaría para abrir la ficha; confirmar el tipo de presentación (modal o navegación).
- [ ] **Firmas realizadas / histórico por modalidad** — modal identificado en `CtnDetallePage.jsx` mediante `ctn-detalle-modal`.

Revisar catálogo CTN, asociación de notario, modalidad de firma, histórico y permisos de administración.

---

# 5. Provisiones, honorarios y módulos económicos

## 5.1 Provisiones
**Archivo:** `pages/provisiones/ProvisionesFondosPage.jsx`.

- Pantalla de provisiones identificada.
- **Inventario de modales:** pendiente de inspección específica del componente.
- [ ] Documentar formularios de cálculo, edición, confirmación y PDF.
- [ ] Revisar la regla bancaria que utiliza el campo “Entidad actual”.
- [ ] Verificar el caso AJD/impuestos = 0,00 y los valores dependientes.
- [ ] Verificar la plantilla PDF, logotipo, encabezado y alineación.
- [ ] Probar las tarifas para CaixaBank y otras entidades.

## 5.2 Honorarios / gestoría
**Archivo identificado:** `pages/herramientas/HonorariosGestoria.jsx`; también existe el modal “Factura de honorarios” dentro de FichaExpediente.

- [ ] Confirmar si HonorariosGestoria es catálogo independiente o parte de Utilidades/Catálogos en navegación.
- [ ] Inventariar modales de tarifa, alta, edición e importes.
- [ ] Comprobar que el modal de factura muestra provisión/saldo desde Información crediticia, base e impuesto aplicable.
- [ ] Comprobar que abrir el modal no genera directamente una proforma sin la acción confirmatoria prevista.

---

# 6. Mensajería y Mensajería Gestión

**Archivos**
- `pages/mensajeria/MensajeriaSolicitudes.jsx`
- `pages/mensajeria/MensajeriaMolsan.jsx`
- `pages/mensajeria/MensajeriaProveedores.jsx`

## 6.1 Mensajería (empleado)
- [ ] **Detalle/edición de solicitud y comunicaciones** — diálogo condicional en `MensajeriaSolicitudes.jsx`.
- [ ] Comprobar creación de solicitud, origen/destino, contactos y teléfonos.
- [ ] Comprobar comunicación de ida y vuelta con gestión.
- [ ] Confirmar que cada empleado solo ve sus solicitudes.

## 6.2 Mensajería Gestión
En `MensajeriaMolsan.jsx` se identifica un modal dinámico controlado por `modal`; los formularios dependen de la acción seleccionada. Categorías funcionales a documentar visualmente:
- [ ] Solicitud (crear/editar y comunicaciones).
- [ ] Servicio/tarifa.
- [ ] Albarán.
- [ ] Factura y vinculación de albaranes.
- [ ] Confirmar si cada categoría comparte el mismo modal o usa variantes.

En `MensajeriaProveedores.jsx` el alta/edición de proveedor se realiza en un formulario de la propia página; no debe anotarse como modal salvo que la interfaz desplegada demuestre lo contrario.

Revisar:
- [ ] Permisos backend y separación entre empleado y gestión.
- [ ] Máximo de dos proveedores.
- [ ] API externa de transportistas pendiente según el informe `INFORME_APIS_PENDIENTES_INFORMATICA.md`.
- [ ] Tracking, errores, duplicados, documentos y despliegue.

---

# 7. Empleados, Seguridad y Fichajes

## 7.1 Empleados
Archivos identificados:
- `pages/empleados/EmpleadosListado.jsx`
- `pages/empleados/EmpleadosModulo2026.jsx`
- `pages/empleados/EmpleadoFicha.jsx`
- `pages/empleados/EmpleadoEditar.jsx`
- `pages/empleados/EmpleadoPerfil.jsx`

- [ ] Inventariar modal de alta/edición, ficha, perfil, documentos y confirmaciones si existen.
- [ ] Verificar que un empleado solo edita sus datos personales autorizados y no puede abrir fichas de otros empleados sin permiso.
- [ ] Revisar permisos de módulos desde la ficha del empleado.
- [ ] Confirmar coherencia entre permisos visibles, sidebar y autorización backend.

## 7.2 Seguridad
Archivos identificados:
- `pages/seguridad/Seguridad.jsx`
- `SeguridadResumen.jsx`, `SeguridadUsuarios.jsx`, `SeguridadRoles.jsx`, `SeguridadRolEditor.jsx`, `SeguridadPermisos.jsx`, `SeguridadModulos.jsx`, `SeguridadFicha.jsx`, `SeguridadAuditoria.jsx`, `SeguridadLogs.jsx`.

- [ ] Inventariar diálogos de alta/edición de usuario y rol, asignación de permisos y confirmaciones.
- [ ] Comprobar que la UI no sea el único control de autorización.
- [ ] Revisar matriz de permisos por módulo y subpágina.
- [ ] Probar accesos denegados directamente en API y URL.

## 7.3 Fichaje Molsan y administrador de fichajes

**Archivos identificados**
- `pages/fichajes/Fichajes.jsx`
- `pages/fichajes/FichajesResumen.jsx`
- `pages/fichajes/SolicitudesAusencia.jsx`
- `pages/fichajes/ControlFichajesAdmin.jsx`
- `pages/fichajes/DocumentosAdmin.jsx`
- `pages/fichajes/FestivosCompensaciones.jsx`
- Backend: `backend/app/fichajes/router.py`
- Validación automática: `.github/workflows/validar-fichajes.yml`

**Estado técnico a 27 de octubre de 2026**
- [x] Revisión de código y correcciones integradas en `main` mediante el PR #306 (`f8c9c9db251572c58e458e59dd945c18ecdc6a5e`): resumen anual de horas, ajustes de cálculo horario, límites de periodos cerrados, validaciones de solapamientos y separación de permisos personales/administrativos.
- [x] Protección de solicitudes de vacaciones y ausencias frente a fechas invertidas, rangos excesivos y solapamientos con otras solicitudes pendientes o aprobadas, incluidos conflictos con compensaciones.
- [x] Validaciones administrativas para aprobar vacaciones según saldo asignado y para resolver solicitudes una sola vez.
- [x] Revisión de seguridad de los registros de acceso WebSocket: PR #307 (`a33f29982e86a7682a8975eaa5afa7e9cb862a9b`) desactiva el access log de Uvicorn para evitar que las URL de conexión expongan el token de autenticación. Despliegue de backend confirmado como Live en Render.
- [x] Workflow de GitHub para compilar el frontend y comprobar la compilación/sintaxis del backend; la ejecución anterior terminó correctamente.
- [ ] **Prueba funcional real pendiente:** secuencia completa entrada → pausa → retorno → salida, incluyendo intentos inválidos (entrada duplicada, salida sin entrada, pausa duplicada o retorno sin pausa abierta).
- [ ] **Prueba funcional real pendiente:** cálculo de horas trabajadas y pausas, jornada sin cerrar, turnos que cruzan medianoche, cambio horario y límites de mes/año.
- [ ] **Prueba funcional real pendiente:** solicitar, aprobar y rechazar vacaciones; verificar saldo asignado, días comprometidos, solicitudes pendientes y conflictos de fechas.
- [ ] **Prueba funcional real pendiente:** solicitar y resolver ausencias; comprobar solapamientos entre vacaciones, ausencias y compensaciones.
- [ ] **Prueba funcional real pendiente:** subida, consulta y descarga de justificantes; tipo, fecha, historial y revisión administrativa.
- [ ] **Prueba funcional real pendiente:** aislamiento de datos entre empleados, acceso directo a URL/API y permisos separados de Fichaje Molsan y Control de Fichajes.
- [ ] **Prueba funcional real pendiente:** calendario mensual y navegación por meses/años, filtros, resumen anual, festivos, compensaciones, cierres de periodo y auditoría de correcciones administrativas.
- [ ] **Comprobación de entorno pendiente:** realizar estas pruebas en Render con cuentas de prueba de empleado y administrador y comprobar los registros recientes. La compilación correcta no sustituye estas pruebas.

**Criterio de cierre:** el módulo se considerará validado cuando las pruebas anteriores se ejecuten en el entorno desplegado y sus resultados queden registrados. Hasta entonces, el estado correcto es **corregido en código; pendiente de pruebas funcionales**, no “validado”.


---

# 8. Utilidades, catálogos, informes y administración técnica

## 8.1 Utilidades / Herramientas
Archivos identificados en `pages/herramientas/`:
- `Herramientas.jsx`, `Utilidades.jsx`, `Catalogos.jsx`
- `AccesosNotariales.jsx`, `AccionesExpediente.jsx`, `AdministracionEmpleadoConfig.jsx`
- `CambiarGestorExpediente.jsx`, `CambiosActividadAbsis.jsx`, `CatalogoAbsis.jsx`
- `CatalogoFichajes.jsx`, `CatalogoOficinas.jsx`, `ComplementosSaldo.jsx`
- `CorrespondenciaTipificada.jsx`, `CrearNoticia.jsx`, `EntidadesBancarias.jsx`
- `FirmasEmail.jsx`, `HonorariosGestoria.jsx`, `ImportarCTN.jsx`, `LecturaCancelaI.jsx`, `LecturaCopias.jsx`
- `MantenimientoTecnico.jsx`, `Municipios.jsx`, `OficinasLiquidadoras.jsx`, `PPAD.jsx`
- `ProcesoAbsis.jsx`, `RegistrosPropiedad.jsx`, `SubirDocumento.jsx`, `TiposCargaHipotecaria.jsx`
- `TiposConceptoGastos.jsx`, `Verifacti.jsx`, `importador_absis.jsx`.

El listado anterior identifica pantallas/componentes, no implica que todos se presenten actualmente como bloques dentro de Utilidades.

- [ ] Inventariar diálogos de alta/edición y confirmación en cada catálogo.
- [ ] Confirmar la separación entre Utilidades y Catálogos en navegación.
- [ ] Revisar accesos notariales, importadores ABSIS, municipios, oficinas, registros, entidades bancarias y honorarios.
- [ ] Comprobar que acciones destructivas piden confirmación y quedan auditadas.

## 8.2 Informes
**Archivo:** `pages/informes/Informes.jsx`.

- [ ] El módulo contiene varios apartados de informe; documentar cada tarjeta/página y sus filtros.
- [ ] Se identifica edición de datos de firma desde la tabla, incluyendo modalidad real de firma y fecha de envío; confirmar si se presenta como edición en línea o modal.
- [ ] Revisar exportaciones, filtros, paginación y permisos.
- [ ] Verificar que cada apartado que deba ser una página independiente abre su propia página y no mezcla informes distintos.

## 8.3 Panel técnico, monitor y auditoría
Archivos identificados:
- `PanelTecnico.jsx`, `AuditoriaAvanzada.jsx`, `LogsAvanzados.jsx`, `MonitorRealtime.jsx`, `MonitorSistema.jsx`.

- [ ] Inventariar modal de emulación de perfiles y confirmaciones de acciones técnicas.
- [ ] Verificar que emular un usuario no cambia permisos reales ni expone datos fuera del rol.
- [ ] Revisar monitor, logs, auditoría y mensajes de error.
- [ ] Probar solo con perfil técnico/admin autorizado.

## 8.4 Maestros y fusiones
- `pages/maestros/Maestros.jsx`
- `pages/fusiones/Fusiones.jsx`

- [ ] Identificar formularios, diálogos de selección, confirmaciones y detalle.
- [ ] Comprobar integridad de datos y relaciones con expedientes.
- [ ] Confirmar permisos y registro de cambios.

---

# 9. Lista de verificación transversal para cada modal

Aplicar esta lista a cada ventana modal del inventario:

- [ ] Tiene un título claro y único.
- [ ] El título refleja la acción y el contexto del registro.
- [ ] Tiene botón de cierre visible y cierre coherente con Escape/clic exterior, cuando corresponda.
- [ ] No pierde cambios sin avisar si el formulario está modificado.
- [ ] Los botones Guardar/Confirmar se deshabilitan durante el envío para evitar duplicados.
- [ ] Muestra validaciones junto al campo correspondiente.
- [ ] Los errores de API se muestran con un mensaje comprensible.
- [ ] El éxito de guardado se confirma y la vista se actualiza.
- [ ] No duplica campos que pertenecen a la FichaExpediente o a otro origen de verdad.
- [ ] El tamaño y el scroll funcionan en escritorio y móvil.
- [ ] Tiene foco, etiquetas accesibles y semántica de diálogo.
- [ ] Respeta permisos en backend; ocultar el botón no es suficiente.
- [ ] Conserva datos previos al editar y no los sustituye por valores vacíos involuntariamente.
- [ ] La operación queda auditada cuando modifica información relevante.
- [ ] Está probado con un usuario autorizado y uno no autorizado.

---

# 10. Registro de incidencias y prioridades

Añadir una fila por incidencia detectada durante las revisiones:

| ID | Módulo/página | Modal o componente | Problema observado | Prioridad | Estado | Commit/PR | Validado en Render |
|---|---|---|---|---|---|---|---|
| ARQ-001 | Expedientes / FichaExpediente | Datos de actividad | Pendiente de revisión | Alta | Pendiente | — | No |
| ARQ-002 | Mensajería | Permisos y envío externo | Revisar despliegue, pruebas de acceso y API de transportista | Alta | Pendiente de validación | Ver commits del módulo | No |
| ARQ-003 | EncargaGest | Nuevo/editar encargo/incidencias | Pruebas de extremo a extremo pendientes | Alta | Pendiente | — | No |
| ARQ-004 | Informes | Tarjetas y páginas de informe | Confirmar que los apartados abren páginas separadas | Media | Pendiente | — | No |
| ARQ-005 | Global | Diseño y comportamiento de modales | Unificar patrón visual y accesibilidad | Media | Pendiente | — | No |

---

# 11. Orden recomendado de revisión

1. **Seguridad y permisos** — primero, porque afecta a todos los módulos.
2. **FichaExpediente y Expedientes** — origen de verdad y punto de unión de varios procesos.
3. **CancelaGest, ApoderaGest y NotarGest** — verificar coherencia con el expediente.
4. **EncargaGest** — validar el circuito compartido entre notarios y gestoría.
5. **Provisiones y Honorarios** — importes, impuestos, tarifas y documentos.
6. **Mensajería y Mensajería Gestión** — validar permisos; luego API de transportistas.
7. **Empleados y Fichajes** — privacidad, permisos, documentos y marcajes.
8. **Informes** — confirmar que cada apartado tiene navegación y filtros correctos.
9. **Utilidades, catálogos y panel técnico** — ordenar, revisar accesos y confirmar auditoría.
10. **Unificación visual** — aplicar un patrón común de cabeceras, formularios y modales una vez identificados los flujos.

---

# 12. Fuente de este inventario

Inventario basado en los archivos del frontend bajo `frontend-app/src/pages/` y componentes importados por las páginas principales, revisados en la rama `main` a fecha indicada. Para continuar, actualizar este documento en cada ronda: añadir modales que se descubran, retirar los que se hayan eliminado y marcar la fecha/commit de la última comprobación. No se considera un inventario definitivo de todas las ventanas hasta completar la revisión visual de cada módulo en Render.
