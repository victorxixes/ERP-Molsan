# Inventario estático de las 90 pantallas — MOLSAN ERP PREMIUM 2027

Fecha: 2026-11-05. Rama: `fix/molsan-premium-2027-global-ui`.

## Método y límites
Se extrajeron las declaraciones `lazy(() => import(...))` de `frontend-app/src/App.jsx`: **90 componentes lazy distintos**, enlazados por **109 declaraciones de ruta**. El escaneo comprobó presencia de `MolsanPageHeader`, etiquetas `header/h1`, tablas y formularios. Esta es una clasificación estática de código, no una certificación visual; los componentes embebidos deben juzgarse dentro de su contenedor.

- **Premium por estructura (35):** usa `MolsanPageHeader` y no se detectó otra etiqueta `header/h1` en el componente.
- **Parcial (8):** usa `MolsanPageHeader` pero también conserva etiquetas `header/h1`; revisar posible cabecera secundaria/duplicada.
- **Legacy (39):** no usa `MolsanPageHeader` y conserva `header/h1`; necesita adaptación.
- **Embebido (8):** no declara cabecera propia ni usa el componente común; validar integrado y no añadir una cabecera redundante.

## Premium por estructura — 47
Dashboard; FichaExpedienteDemo; CtnDetallePage; CtnListadoPage; EmpleadosListado; EmpleadoFicha; EmpleadoEditar; Intranet; Utilidades; Catalogos; CatalogoAbsis; CatalogoOficinas; TiposImpositivos; CorrespondenciaTipificada; FirmasEmail; HonorariosGestoria; Municipios; EntidadesBancarias; RegistrosPropiedad; OficinasLiquidadoras; AccionesExpediente; PanelTecnico; SeguridadUsuarios; SeguridadRoles; SeguridadModulos; SeguridadPermisos; SeguridadFicha; SeguridadAuditoria; SeguridadRolEditor; SeguridadLogs; Maestros; Fusiones; TiposExpediente; Fichajes; MensajeriaMolsan; MensajeriaSolicitudes; CatalogoFichajes; ReglasActividadesExpediente; ModelosDocumentos; DatosMolsan; AltaExpediente; CambiarGestorExpediente; AccesosNotariales; ImportarCTN; Herramientas; Seguridad; Cancelagest.

## Parcial — 8
Agenda; ExpedientesListado; FichaExpediente; ProvisionesFondosPage; Informes; ApoderaGest; NotarGest; EncargaGest.

## Legacy — 27
LoginPage; ModulosSelector; ModuloPendiente; ImportacionesDatos; ImportadorAbsis; ImportadorPostFirma; AdministracionEmpleadoConfig; CrearNoticia; SubirDocumento; MantenimientoTecnico; ReasignarNotarioExpediente; AsignarExpedientesPromociones; ComplementosSaldo; ProcesoAbsis; LecturaCopias; CambiosActividadAbsis; LecturaCancelaI; PPAD; Verifacti; Logs; Notificaciones; MonitorSistema; AuditoriaAvanzada; LogsAvanzados; TiposCargaHipotecaria; TiposConceptoGastos; ControlApoderados.

## Embebido — 8
VistaDia; VistaSemana; VistaMes; Ctn; EmpleadosModulo2026; Mensajes; MonitorRealtime; EncargaGestWorkspace.

## Cambios posteriores a la primera fotografía
Se han normalizado también EmpleadoEditar, SeguridadFicha, SeguridadRolEditor, SeguridadLogs e Intranet; ReglasActividadesExpediente, ModelosDocumentos, DatosMolsan, AltaExpediente, CambiarGestorExpediente y AccesosNotariales; e ImportarCTN, Herramientas, el Centro de Seguridad y CancelaGest. CancelaGest deja de mostrar fecha y «Actualizar datos» en la cabecera.

## Próximas acciones
1. Revisar visualmente los 8 componentes parciales para eliminar cabeceras internas duplicadas sin quitar títulos funcionales.
2. Adaptar las 27 pantallas Legacy, priorizando herramientas y subpáginas de Seguridad/Panel Técnico.
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
