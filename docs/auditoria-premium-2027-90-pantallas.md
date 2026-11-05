# Inventario estático de las 90 pantallas — MOLSAN ERP PREMIUM 2027

Fecha: 2026-11-05. Rama: `fix/molsan-premium-2027-global-ui`.

## Método y límites
Se extrajeron las declaraciones `lazy(() => import(...))` de `frontend-app/src/App.jsx`: **90 componentes lazy distintos**, enlazados por **109 declaraciones de ruta**. El escaneo comprobó presencia de `MolsanPageHeader`, etiquetas `header/h1`, tablas y formularios. Esta es una clasificación estática de código, no una certificación visual; los componentes embebidos deben juzgarse dentro de su contenedor.

- **Premium por estructura (35):** usa `MolsanPageHeader` y no se detectó otra etiqueta `header/h1` en el componente.
- **Parcial (8):** usa `MolsanPageHeader` pero también conserva etiquetas `header/h1`; revisar posible cabecera secundaria/duplicada.
- **Legacy (39):** no usa `MolsanPageHeader` y conserva `header/h1`; necesita adaptación.
- **Embebido (8):** no declara cabecera propia ni usa el componente común; validar integrado y no añadir una cabecera redundante.

## Premium por estructura — 35
Dashboard; FichaExpedienteDemo; CtnDetallePage; CtnListadoPage; EmpleadosListado; EmpleadoFicha; EmpleadoEditar; Intranet; Utilidades; Catalogos; CatalogoAbsis; CatalogoOficinas; TiposImpositivos; CorrespondenciaTipificada; FirmasEmail; HonorariosGestoria; Municipios; EntidadesBancarias; RegistrosPropiedad; OficinasLiquidadoras; AccionesExpediente; PanelTecnico; SeguridadUsuarios; SeguridadRoles; SeguridadModulos; SeguridadPermisos; SeguridadFicha; SeguridadAuditoria; Maestros; Fusiones; TiposExpediente; Fichajes; MensajeriaMolsan; MensajeriaSolicitudes; CatalogoFichajes.

## Parcial — 8
Agenda; ExpedientesListado; FichaExpediente; ProvisionesFondosPage; Informes; ApoderaGest; NotarGest; EncargaGest.

## Legacy — 39
LoginPage; ModulosSelector; ModuloPendiente; Cancelagest; Herramientas; ImportarCTN; ImportacionesDatos; ImportadorAbsis; ImportadorPostFirma; ReglasActividadesExpediente; ModelosDocumentos; DatosMolsan; AltaExpediente; AdministracionEmpleadoConfig; AccesosNotariales; CrearNoticia; SubirDocumento; MantenimientoTecnico; CambiarGestorExpediente; ReasignarNotarioExpediente; AsignarExpedientesPromociones; ComplementosSaldo; ProcesoAbsis; LecturaCopias; CambiosActividadAbsis; LecturaCancelaI; PPAD; Verifacti; Logs; Notificaciones; MonitorSistema; AuditoriaAvanzada; LogsAvanzados; Seguridad; SeguridadLogs; SeguridadRolEditor; TiposCargaHipotecaria; TiposConceptoGastos; ControlApoderados.

## Embebido — 8
VistaDia; VistaSemana; VistaMes; Ctn; EmpleadosModulo2026; Mensajes; MonitorRealtime; EncargaGestWorkspace.

## Cambios posteriores a la primera fotografía
Se ha normalizado también la cabecera de EmpleadoEditar, SeguridadFicha e Intranet en esta rama. La categoría anterior ya refleja esos cambios: EmpleadoEditar, SeguridadFicha e Intranet están en Premium por estructura.

## Próximas acciones
1. Revisar visualmente los 8 componentes parciales para eliminar cabeceras internas duplicadas sin quitar títulos funcionales.
2. Adaptar las 39 pantallas Legacy, priorizando herramientas y subpáginas de Seguridad/Panel Técnico.
3. Revisar tablas, formularios, botones, estados vacíos/error/carga y modales en los 90 componentes y sus rutas.
4. Ejecutar CI; después desplegar exclusivamente a Preview y comprobar rutas autenticadas y estados reales.
5. No modificar producción ni bases de datos en esta intervención.
