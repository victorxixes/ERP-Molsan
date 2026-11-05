# Inventario estático de las 90 pantallas — MOLSAN ERP PREMIUM 2027

Fecha: 2026-11-05. Rama: `fix/molsan-premium-2027-global-ui`.

## Método y límites
Se extrajeron las declaraciones `lazy(() => import(...))` de `frontend-app/src/App.jsx`: **90 componentes lazy distintos**, enlazados por **109 declaraciones de ruta**. El escaneo comprobó presencia de `MolsanPageHeader`, etiquetas `header/h1`, tablas y formularios. Esta es una clasificación estática de código, no una certificación visual; los componentes embebidos deben juzgarse dentro de su contenedor.

- **Premium por estructura (72):** usa `MolsanPageHeader` y no se detectó otra etiqueta `header/h1` en el componente.
- **Premium con contenido interno (8):** usa `MolsanPageHeader` y conserva etiquetas `header/h1` dentro de impresión, modales, estados restringidos o secciones; confirmar visualmente que no se convierten en una segunda cabecera superior.
- **Legacy (0):** no usa `MolsanPageHeader` y conserva `header/h1`; necesita adaptación.
- **Embebido (8):** no declara cabecera propia ni usa el componente común; validar integrado y no añadir una cabecera redundante.

## Premium por estructura — 72
Dashboard; FichaExpedienteDemo; CtnDetallePage; CtnListadoPage; EmpleadosListado; EmpleadoFicha; EmpleadoEditar; Intranet; Utilidades; Catalogos; CatalogoAbsis; CatalogoOficinas; TiposImpositivos; CorrespondenciaTipificada; FirmasEmail; HonorariosGestoria; Municipios; EntidadesBancarias; RegistrosPropiedad; OficinasLiquidadoras; AccionesExpediente; PanelTecnico; SeguridadUsuarios; SeguridadRoles; SeguridadModulos; SeguridadPermisos; SeguridadFicha; SeguridadAuditoria; SeguridadRolEditor; SeguridadLogs; Maestros; Fusiones; TiposExpediente; Fichajes; MensajeriaMolsan; MensajeriaSolicitudes; CatalogoFichajes; ReglasActividadesExpediente; ModelosDocumentos; DatosMolsan; AltaExpediente; CambiarGestorExpediente; AccesosNotariales; ImportarCTN; Herramientas; Seguridad; Cancelagest; ReasignarNotarioExpediente; AsignarExpedientesPromociones; ComplementosSaldo; ProcesoAbsis; ImportacionesDatos; ImportadorAbsis; ImportadorPostFirma; MantenimientoTecnico; AdministracionEmpleadoConfig; LecturaCopias; CambiosActividadAbsis; LecturaCancelaI; PPAD; Verifacti; CrearNoticia; SubirDocumento; TiposCargaHipotecaria; TiposConceptoGastos; ControlApoderados; MonitorSistema; AuditoriaAvanzada; LogsAvanzados; Logs; Notificaciones; ModulosSelector.

## Premium con contenido interno — 8
Agenda; ExpedientesListado; FichaExpediente; ProvisionesFondosPage; Informes; ApoderaGest; NotarGest; EncargaGest.

## Legacy — 0
Ninguna: las pantallas con cabecera heredada detectadas en el inventario ya se han migrado o se han reclasificado como diseños especiales.

## Especiales — 2

- LoginPage: pantalla de autenticación independiente; no debe recibir una cabecera interna de página.
- ModuloPendiente: estado de módulo en preparación, diseñado como tarjeta de estado y no como página operativa con cabecera común.

## Embebido — 8
VistaDia; VistaSemana; VistaMes; Ctn; EmpleadosModulo2026; Mensajes; MonitorRealtime; EncargaGestWorkspace.

## Cambios posteriores a la primera fotografía
Se han normalizado también EmpleadoEditar, SeguridadFicha, SeguridadRolEditor, SeguridadLogs e Intranet; ReglasActividadesExpediente, ModelosDocumentos, DatosMolsan, AltaExpediente, CambiarGestorExpediente y AccesosNotariales; e ImportarCTN, Herramientas, el Centro de Seguridad y CancelaGest. También se han migrado Reasignar expediente a notario, Asignar expedientes a promociones, Complementos de saldo y Proceso ABSIS. Las acciones de actualización de Complementos de saldo y Proceso ABSIS se han sacado de la cabecera. También se han unificado las cabeceras de Importaciones y datos, Importador ABSIS, Importador ABSIS · Post Firma y Mantenimiento técnico, conservando el botón de diagnóstico y su estado.

## Próximas acciones
1. Revisar visualmente los 8 componentes parciales para eliminar cabeceras internas duplicadas sin quitar títulos funcionales.
2. No quedan pantallas Legacy identificadas por este criterio estático, priorizando herramientas y subpáginas de Seguridad/Panel Técnico.
3. Revisar tablas, formularios, botones, estados vacíos/error/carga y modales en los 90 componentes y sus rutas.
4. Ejecutar CI; después desplegar exclusivamente a Preview y comprobar rutas autenticadas y estados reales.
5. No modificar producción ni bases de datos en esta intervención.


## Revisión inicial de modales

Se localizaron los componentes modales del frontend y se revisaron sus mecanismos de accesibilidad:

- `ModalCtnDetalle`, `ModalEmpleado`, `CarpetaDigitalModal`, `LiquidarExpedienteModal` y `ProvisionesModal`: usan `useAccessibleDialog` y exponen `role="dialog"` / `aria-modal`.
- `EnviarANotarioModal`: usa `useAccessibleDialog`; el rol y `aria-modal` se activan en el modo modal y se omiten correctamente en el modo embebido.
- `SidebarPerfilModal`: delega el diálogo a `ModalEmpleado`, que ya aplica el hook común.
- `ModalNuevaCita`: se ha corregido en esta rama; ahora usa `useAccessibleDialog`, referencia del panel, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` y foco inicial/restauración. El cierre por Escape y el ciclo de foco los gestiona el hook compartido.

El hook común también contempla Escape, ciclo Tab/Shift+Tab, foco fuera del diálogo, anidamiento y restauración del foco previo. Esta revisión estática no sustituye las pruebas manuales de teclado, lector de pantalla, móvil ni los flujos de validación/guardado.

## Componentes comunes para tablas y formularios

- `MolsanDataTable` proporciona ordenación local o servidor, búsqueda/paginación opcional, ajuste de ancho de columnas, estados vacíos y controles accesibles.
- `MolsanButton` y `molsan-controls.css` proporcionan variantes compartidas de botones, campos y estados.
- `molsan-tables.css` define tabla corporativa, cabecera, hover, scroll horizontal y responsive.

**Pendiente:** identificar, ruta por ruta, qué listados y formularios usan realmente estos componentes y cuáles conservan tablas/controles locales; migrar solo cuando se pueda preservar ordenación del servidor, paginación, validaciones, permisos y acciones.

La última pasada también ha retirado la fecha y el acceso «Ir a módulos» de las cabeceras de ApoderaGest y NotarGest; en EncargaGest se conserva únicamente «Cerrar sesión» como acción de cabecera. El selector Espacio de trabajo usa ahora la cabecera común y mantiene la sesión activa y el cierre de sesión.

En las 8 parciales, los marcadores adicionales de `header/h1` pueden corresponder a secciones internas, contenido de impresión o estados restringidos, no necesariamente a una segunda cabecera visible. La inspección visual en Preview determinará si alguno debe reclasificarse o corregirse.


### Resultado de adopción estática en los 90 componentes lazy

- **46** componentes contienen una etiqueta nativa `<table>`.
- Solo **NotarGest** referencia `MolsanDataTable`; **3** componentes de ruta usan directamente la clase `molsan-table` (ExpedientesListado, FichaExpedienteDemo y CtnListadoPage).
- **32** componentes contienen `<form>`; solo **3** referencias de ruta usan clases `molsan-field`.
- No se detectó referencia directa a `MolsanButton` en el código fuente de los 90 componentes lazy. Puede haber usos en componentes hijos compartidos, por lo que este dato no equivale a un inventario de todo el árbol React.
- Las tablas nativas sí reciben una capa visual global desde `MolsanCardsPremium2027.css` mediante `.erp-main-content table:not(.molsan-table)` (cabecera azul hielo, bordes, hover y ajustes responsive). `MolsanFase3.css` normaliza tipografía y geometría de rutas. La capa `molsan-controls.css` define campos y botones compartidos, pero su adopción directa en las páginas lazy sigue siendo baja.

**Decisión:** no sustituir masivamente las 46 tablas nativas por `MolsanDataTable`: varias pueden depender de ordenación remota, paginación, renderizado de celdas o acciones propias. Primero se debe probar cada caso y conservar su contrato funcional; la normalización visual global existente es la base segura mientras se migra progresivamente.

Como corrección transversal de formularios, se añadió en `MolsanCardsPremium2027.css` una base corporativa para inputs/selects/textarea nativos sin clase propia dentro de `.erp-main-content`: borde, radio, altura, padding, foco visible y estado deshabilitado. Los controles con clases específicas de módulo quedan excluidos de la base para no pisar sus contratos visuales; se migrarán selectivamente tras comprobarlos.
