# Inventario de rutas frontend — MOLSAN ERP PREMIUM 2027

**Fuente:** `frontend-app/src/App.jsx` en `fix/molsan-css-selector-audit-round1`  
**Alcance:** declaraciones `Route` encontradas en el árbol actual; no equivale a páginas visuales ni incluye modales internos.

## Recuento

- **110 elementos `Route`**.
- **109 rutas con atributo `path`**: 108 rutas concretas y una ruta comodín (`*`).
- **1 ruta índice** (sin atributo `path`).
- **110 valores de ruta/índice únicos** en este árbol; no se detectaron duplicados literales.
- Existen rutas dinámicas como `:id` y `:apartado`, alias de compatibilidad y variantes externas. Una misma página/componente puede atender varias rutas; una ruta puede además mostrar subpestañas o modales que no aparecen aquí.

## Notas de protección

- La ruta raíz privada `/` envuelve `Layout` con `RequireAuth` y sirve de padre a las rutas operativas.
- Las rutas hijas heredan autenticación desde ese padre; las que muestran `RequireModule` o `protegerModulo` añaden el control de módulo.
- Los cinco accesos de portal externo se identifican expresamente como rutas sin `RequireAuth` en App. No se cambian porque forman parte del acceso externo previsto; su control específico debe verificarse dentro del propio portal.
- `/login` es público y `*` redirige a login.
- El acceso de demostración de FichaExpediente y la ruta de importaciones de datos heredan autenticación del padre, aunque no muestran un control de módulo en su propio elemento.

## Rutas

| # | Ruta | Grupo | Protección observada |
|---:|---|---|---|
| 1 | `/login` | Autenticación | Acceso público al login |
| 2 | `modulos` | Ruta privada independiente | Guard explícito en el elemento |
| 3 | `apoderagest` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 4 | `encargagest` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 5 | `encargagest/notario` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 6 | `encargagest/ctn` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 7 | `encargagest/agenda` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 8 | `encargagest/mensajes` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 9 | `encargagest/intranet` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 10 | `notargest` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 11 | `notargest-notario` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 12 | `notargest-notarios` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 13 | `encargagest-notario` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 14 | `encargagest-notarios` | Portal externo | Ruta externa; sin RequireAuth en App.jsx |
| 15 | `notargestweb` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 16 | `encargagestweb` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 17 | `/` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 18 | `(index)` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 19 | `dashboard` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 20 | `cancelagest` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 21 | `fichajes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 22 | `control-fichajes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 23 | `mensajeria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 24 | `mensajeria-gestion` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 25 | `apoderagest/liquidaciones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 26 | `herramientas/utilidades/control-apoderados` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 27 | `agenda` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 28 | `agenda/dia` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 29 | `agenda/semana` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 30 | `agenda/mes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 31 | `expedientes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 32 | `expedientes/:id` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 33 | `expedientes-demo-glass-luxe` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 34 | `provisiones-fondos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 35 | `catalogos/provisiones-fondos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 36 | `herramientas/utilidades/visibilidad-tablas` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 37 | `herramientas/utilidades/asignaciones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 38 | `herramientas/utilidades/complementos-saldo` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 39 | `herramientas/utilidades/proceso-absis` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 40 | `herramientas/utilidades/ppad` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 41 | `herramientas/utilidades/verifacti` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 42 | `ctn` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 43 | `ctn/listado` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 44 | `ctn/:id` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 45 | `empleados` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 46 | `empleados/listado` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 47 | `empleados/:id` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 48 | `empleados/:id/editar` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 49 | `intranet` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 50 | `informes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 51 | `informes/:apartado` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 52 | `mensajes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 53 | `herramientas` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 54 | `herramientas/importar-ctn` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 55 | `herramientas/municipios` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 56 | `herramientas/importador-absis` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 57 | `herramientas/importador-absis/postfirma` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 58 | `herramientas/importaciones-datos` | ERP privado | RequireAuth heredado del Layout; sin guard de módulo explícito en esta ruta |
| 59 | `herramientas/utilidades` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 60 | `herramientas/utilidades/modelos-documentos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 61 | `herramientas/utilidades/reglas-actividades-expediente` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 62 | `herramientas/utilidades/datos-molsan` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 63 | `herramientas/utilidades/alta-expediente` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 64 | `herramientas/utilidades/lectura-copias` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 65 | `herramientas/utilidades/cambios-actividad-absis` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 66 | `herramientas/utilidades/lectura-cancela-i` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 67 | `herramientas/utilidades/accesos-notariales` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 68 | `catalogos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 69 | `catalogos/absis` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 70 | `catalogos/oficinas` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 71 | `catalogos/tipos-impositivos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 72 | `catalogos/fichajes` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 73 | `catalogos/mensajeria-servicios` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 74 | `catalogos/firmas-email` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 75 | `catalogos/correspondencia-tipificada` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 76 | `herramientas/utilidades/correspondencia-tipificada` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 77 | `herramientas/honorarios-gestoria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 78 | `herramientas/entidades-bancarias` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 79 | `herramientas/registros-propiedad` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 80 | `herramientas/oficinas-liquidadoras` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 81 | `herramientas/acciones-expediente` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 82 | `herramientas/tipos-carga-hipotecaria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 83 | `herramientas/tipos-concepto-gastos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 84 | `herramientas/tipos-expediente` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 85 | `herramientas/utilidades/crear-noticia` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 86 | `herramientas/utilidades/subir-documento` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 87 | `herramientas/mantenimiento-tecnico` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 88 | `herramientas/utilidades/cambiar-gestor` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 89 | `herramientas/utilidades/reasignar-notario` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 90 | `herramientas/utilidades/asignar-promociones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 91 | `logs` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 92 | `notificaciones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 93 | `/fusiones` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 94 | `paneltecnico` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 95 | `paneltecnico/monitor-sistema` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 96 | `paneltecnico/monitor-realtime` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 97 | `maestros` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 98 | `paneltecnico/auditoria-avanzada` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 99 | `paneltecnico/logs-avanzados` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 100 | `seguridad` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 101 | `seguridad/usuarios` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 102 | `seguridad/roles` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 103 | `seguridad/modulos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 104 | `seguridad/permisos` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 105 | `seguridad/ficha/:id` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 106 | `seguridad/logs` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 107 | `seguridad/roles/editor` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 108 | `auditoria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 109 | `seguridad/auditoria` | ERP privado | RequireAuth heredado del Layout + control de módulo |
| 110 | `*` | Fallback | Redirige a /login |

## Interpretación del inventario anterior de 98

El número 98 no debe compararse directamente con las declaraciones de `Route`: hay 110 elementos de ruta, 109 paths, aliases, rutas dinámicas y una ruta índice. Para reconciliar 98 pantallas hay que agrupar estas rutas por componente/pantalla y sumar por separado subpáginas internas y modales. Este documento registra rutas; no afirma que existan 110 pantallas distintas ni que todos los modales estén inventariados.



## Mapa de ruta a componente (revisión estática)

Fuente: `frontend-app/src/App.jsx` en la rama de trabajo. Se identifican 110 declaraciones `Route` y el componente de página que recibe la ruta, excluyendo wrappers de protección (`RequireAuth`, `RequireModule`) y el layout. Las rutas dinámicas y los componentes con pestañas internas pueden representar varias pantallas; este mapa no sustituye el inventario de modales y estados.

| # | Ruta | Componente de página |
|---:|---|---|
| 1 | `/login` | `LoginPage` |
| 2 | `modulos` | `ModulosSelector` |
| 3 | `apoderagest` | `ApoderaGest` |
| 4 | `encargagest` | `EncargaGest` |
| 5 | `encargagest/notario` | `EncargaGest` |
| 6 | `encargagest/ctn` | `EncargaGestWorkspace` |
| 7 | `encargagest/agenda` | `EncargaGestWorkspace` |
| 8 | `encargagest/mensajes` | `EncargaGestWorkspace` |
| 9 | `encargagest/intranet` | `EncargaGestWorkspace` |
| 10 | `notargest` | `NotarGest` |
| 11 | `notargest-notario` | `NotarGest` |
| 12 | `notargest-notarios` | `NotarGest` |
| 13 | `encargagest-notario` | `EncargaGest` |
| 14 | `encargagest-notarios` | `EncargaGest` |
| 15 | `notargestweb` | `NotarGest` |
| 16 | `encargagestweb` | `EncargaGest` |
| 17 | `/` | `RequireAuth` |
| 18 | `(index)` | `Dashboard` |
| 19 | `dashboard` | `Dashboard` |
| 20 | `cancelagest` | `Cancelagest` |
| 21 | `fichajes` | `Fichajes` |
| 22 | `control-fichajes` | `Fichajes` |
| 23 | `mensajeria` | `MensajeriaSolicitudes` |
| 24 | `mensajeria-gestion` | `MensajeriaMolsan` |
| 25 | `apoderagest/liquidaciones` | `ControlApoderados` |
| 26 | `herramientas/utilidades/control-apoderados` | `ControlApoderados` |
| 27 | `agenda` | `Agenda` |
| 28 | `agenda/dia` | `VistaDia` |
| 29 | `agenda/semana` | `VistaSemana` |
| 30 | `agenda/mes` | `VistaMes` |
| 31 | `expedientes` | `ExpedientesListado` |
| 32 | `expedientes/:id` | `FichaExpediente` |
| 33 | `expedientes-demo-glass-luxe` | `FichaExpedienteDemo` |
| 34 | `provisiones-fondos` | `ProvisionesFondosPage` |
| 35 | `catalogos/provisiones-fondos` | `ProvisionesFondosPage` |
| 36 | `herramientas/utilidades/visibilidad-tablas` | `AdministracionEmpleadoConfig` |
| 37 | `herramientas/utilidades/asignaciones` | `AdministracionEmpleadoConfig` |
| 38 | `herramientas/utilidades/complementos-saldo` | `ComplementosSaldo` |
| 39 | `herramientas/utilidades/proceso-absis` | `ProcesoAbsis` |
| 40 | `herramientas/utilidades/ppad` | `PPAD` |
| 41 | `herramientas/utilidades/verifacti` | `Verifacti` |
| 42 | `ctn` | `Ctn` |
| 43 | `ctn/listado` | `CtnListadoPage` |
| 44 | `ctn/:id` | `CtnDetallePage` |
| 45 | `empleados` | `EmpleadosModulo2026` |
| 46 | `empleados/listado` | `EmpleadosListado` |
| 47 | `empleados/:id` | `EmpleadoFicha` |
| 48 | `empleados/:id/editar` | `EmpleadoEditar` |
| 49 | `intranet` | `Intranet` |
| 50 | `informes` | `Informes` |
| 51 | `informes/:apartado` | `Informes` |
| 52 | `mensajes` | `MensajesWrapper` |
| 53 | `herramientas` | `Herramientas` |
| 54 | `herramientas/importar-ctn` | `ImportarCTN` |
| 55 | `herramientas/municipios` | `Municipios` |
| 56 | `herramientas/importador-absis` | `ImportadorAbsis` |
| 57 | `herramientas/importador-absis/postfirma` | `ImportadorPostFirma` |
| 58 | `herramientas/importaciones-datos` | `ImportacionesDatos` |
| 59 | `herramientas/utilidades` | `Utilidades` |
| 60 | `herramientas/utilidades/modelos-documentos` | `ModelosDocumentos` |
| 61 | `herramientas/utilidades/reglas-actividades-expediente` | `ReglasActividadesExpediente` |
| 62 | `herramientas/utilidades/datos-molsan` | `DatosMolsan` |
| 63 | `herramientas/utilidades/alta-expediente` | `AltaExpediente` |
| 64 | `herramientas/utilidades/lectura-copias` | `LecturaCopias` |
| 65 | `herramientas/utilidades/cambios-actividad-absis` | `CambiosActividadAbsis` |
| 66 | `herramientas/utilidades/lectura-cancela-i` | `LecturaCancelaI` |
| 67 | `herramientas/utilidades/accesos-notariales` | `AccesosNotariales` |
| 68 | `catalogos` | `Catalogos` |
| 69 | `catalogos/absis` | `CatalogoAbsis` |
| 70 | `catalogos/oficinas` | `CatalogoOficinas` |
| 71 | `catalogos/tipos-impositivos` | `TiposImpositivos` |
| 72 | `catalogos/fichajes` | `CatalogoFichajes` |
| 73 | `catalogos/mensajeria-servicios` | `MensajeriaMolsan` |
| 74 | `catalogos/firmas-email` | `FirmasEmail` |
| 75 | `catalogos/correspondencia-tipificada` | `CorrespondenciaTipificada` |
| 76 | `herramientas/utilidades/correspondencia-tipificada` | `CorrespondenciaTipificada` |
| 77 | `herramientas/honorarios-gestoria` | `HonorariosGestoria` |
| 78 | `herramientas/entidades-bancarias` | `EntidadesBancarias` |
| 79 | `herramientas/registros-propiedad` | `RegistrosPropiedad` |
| 80 | `herramientas/oficinas-liquidadoras` | `OficinasLiquidadoras` |
| 81 | `herramientas/acciones-expediente` | `AccionesExpediente` |
| 82 | `herramientas/tipos-carga-hipotecaria` | `TiposCargaHipotecaria` |
| 83 | `herramientas/tipos-concepto-gastos` | `TiposConceptoGastos` |
| 84 | `herramientas/tipos-expediente` | `TiposExpediente` |
| 85 | `herramientas/utilidades/crear-noticia` | `CrearNoticia` |
| 86 | `herramientas/utilidades/subir-documento` | `SubirDocumento` |
| 87 | `herramientas/mantenimiento-tecnico` | `MantenimientoTecnico` |
| 88 | `herramientas/utilidades/cambiar-gestor` | `CambiarGestorExpediente` |
| 89 | `herramientas/utilidades/reasignar-notario` | `ReasignarNotarioExpediente` |
| 90 | `herramientas/utilidades/asignar-promociones` | `AsignarExpedientesPromociones` |
| 91 | `logs` | `Logs` |
| 92 | `notificaciones` | `Notificaciones` |
| 93 | `/fusiones` | `Fusiones` |
| 94 | `paneltecnico` | `PanelTecnico` |
| 95 | `paneltecnico/monitor-sistema` | `MonitorSistema` |
| 96 | `paneltecnico/monitor-realtime` | `MonitorRealtime` |
| 97 | `maestros` | `Maestros` |
| 98 | `paneltecnico/auditoria-avanzada` | `AuditoriaAvanzada` |
| 99 | `paneltecnico/logs-avanzados` | `LogsAvanzados` |
| 100 | `seguridad` | `Seguridad` |
| 101 | `seguridad/usuarios` | `SeguridadUsuarios` |
| 102 | `seguridad/roles` | `SeguridadRoles` |
| 103 | `seguridad/modulos` | `SeguridadModulos` |
| 104 | `seguridad/permisos` | `SeguridadPermisos` |
| 105 | `seguridad/ficha/:id` | `SeguridadFicha` |
| 106 | `seguridad/logs` | `SeguridadLogs` |
| 107 | `seguridad/roles/editor` | `SeguridadRolEditor` |
| 108 | `auditoria` | `SeguridadAuditoria` |
| 109 | `seguridad/auditoria` | `SeguridadAuditoria` |
| 110 | `*` | `Navigate` |

**Límite de la matriz:** identifica el destino de navegación a nivel de componente. Las subpestañas, vistas internas, modales, formularios y estados de carga/error deben seguir auditándose dentro de cada componente y no se consideran rutas independientes.
