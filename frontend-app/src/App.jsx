// ============================================================
// ERP SJ-2026 — Sistema de rutas principal
// ============================================================

import { Routes, Route, Navigate } from "react-router-dom";
import { Component, lazy, Suspense } from "react";
import { useAuthStore } from "./store/authStore";

/* AUTH */
import RequireAuth from "./components/auth/RequireAuth";
import RequireModule from "./components/auth/RequireModule";

/* LAYOUT */
import Layout from "./layout/Layout";

/* LOGIN */
const LoginPage = lazy(() => import("./pages/LoginPage"));

/* MODULOS */
const ModulosSelector = lazy(() => import("./pages/ModulosSelector"));

const ModuloPendiente = lazy(() => import("./pages/ModuloPendiente"));

/* DASHBOARD */
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard.jsx"));
const Cancelagest = lazy(() => import("./pages/cancelagest/Cancelagest.jsx"));

/* AGENDA */
const Agenda = lazy(() => import("./pages/agenda/Agenda.jsx"));
const VistaDia = lazy(() => import("./pages/agenda/VistaDia.jsx"));
const VistaSemana = lazy(() => import("./pages/agenda/VistaSemana.jsx"));
const VistaMes = lazy(() => import("./pages/agenda/VistaMes.jsx"));

/* EXPEDIENTES */
const ExpedientesListado = lazy(() => import("./pages/expedientes/ExpedientesListado.jsx"));
const FichaExpediente = lazy(() => import("./pages/expedientes/FichaExpediente.jsx"));
const FichaExpedienteDemo = lazy(() => import("./pages/expedientes/FichaExpedienteDemo.jsx"));
const ProvisionesFondosPage = lazy(() => import("./pages/provisiones/ProvisionesFondosPage.jsx"));

/* CTN */
const Ctn = lazy(() => import("./pages/ctn/Ctn.jsx"));
const CtnDetallePage = lazy(() => import("./pages/ctn/CtnDetallePage.jsx"));
const CtnListadoPage = lazy(() => import("./pages/ctn/CtnListadoPage.jsx"));

/* EMPLEADOS */
const EmpleadosModulo2026 = lazy(() => import("./pages/empleados/EmpleadosModulo2026.jsx"));
const EmpleadosListado = lazy(() => import("./pages/empleados/EmpleadosListado.jsx"));
const EmpleadoFicha = lazy(() => import("./pages/empleados/EmpleadoFicha.jsx"));
const EmpleadoEditar = lazy(() => import("./pages/empleados/EmpleadoEditar.jsx"));

/* INTRANET */
const Intranet = lazy(() => import("./pages/intranet/Intranet.jsx"));

/* MENSAJES */
const Mensajes = lazy(() => import("./pages/mensajes/Mensajes.jsx"));

/* HERRAMIENTAS */
const Herramientas = lazy(() => import("./pages/herramientas/Herramientas.jsx"));
const ImportarCTN = lazy(() => import("./pages/herramientas/ImportarCTN.jsx"));
const ImportadorAbsis = lazy(() => import("./pages/herramientas/importador_absis"));
const ImportadorPostFirma = lazy(() => import("./pages/herramientas/ImportadorPostFirma.jsx"));
const Utilidades = lazy(() => import("./pages/herramientas/Utilidades.jsx"));
const ReglasActividadesExpediente = lazy(() => import("./pages/herramientas/ReglasActividadesExpediente.jsx"));
const ModelosDocumentos = lazy(() => import("./pages/herramientas/ModelosDocumentos.jsx"));
const DatosMolsan = lazy(() => import("./pages/herramientas/DatosMolsan.jsx"));
const AltaExpediente = lazy(() => import("./pages/herramientas/AltaExpediente.jsx"));
const AdministracionEmpleadoConfig = lazy(() => import("./pages/herramientas/AdministracionEmpleadoConfig.jsx"));
const AccesosNotariales = lazy(() => import("./pages/herramientas/AccesosNotariales.jsx"));
const Catalogos = lazy(() => import("./pages/herramientas/Catalogos.jsx"));
const CatalogoAbsis = lazy(() => import("./pages/herramientas/CatalogoAbsis.jsx"));
const CatalogoOficinas = lazy(() => import("./pages/herramientas/CatalogoOficinas.jsx"));
const TiposImpositivos = lazy(() => import("./pages/herramientas/TiposImpositivos.jsx"));
const CorrespondenciaTipificada = lazy(() => import("./pages/herramientas/CorrespondenciaTipificada.jsx"));
const FirmasEmail = lazy(() => import("./pages/herramientas/FirmasEmail.jsx"));
const HonorariosGestoria = lazy(() => import("./pages/herramientas/HonorariosGestoria.jsx"));
const CrearNoticia = lazy(() => import("./pages/herramientas/CrearNoticia.jsx"));
const SubirDocumento = lazy(() => import("./pages/herramientas/SubirDocumento.jsx"));
const Informes = lazy(() => import("./pages/informes/Informes.jsx"));
const MantenimientoTecnico = lazy(() => import("./pages/herramientas/MantenimientoTecnico.jsx"));
const CambiarGestorExpediente = lazy(() => import("./pages/herramientas/CambiarGestorExpediente.jsx"));
const ReasignarNotarioExpediente = lazy(() => import("./pages/herramientas/ReasignarNotarioExpediente.jsx"));
const AsignarExpedientesPromociones = lazy(() => import("./pages/herramientas/AsignarExpedientesPromociones.jsx"));
const ComplementosSaldo = lazy(() => import("./pages/herramientas/ComplementosSaldo.jsx"));
const ProcesoAbsis = lazy(() => import("./pages/herramientas/ProcesoAbsis.jsx"));
const LecturaCopias = lazy(() => import("./pages/herramientas/LecturaCopias.jsx"));
const CambiosActividadAbsis = lazy(() => import("./pages/herramientas/CambiosActividadAbsis.jsx"));
const LecturaCancelaI = lazy(() => import("./pages/herramientas/LecturaCancelaI.jsx"));
const PPAD = lazy(() => import("./pages/herramientas/PPAD.jsx"));
const Verifacti = lazy(() => import("./pages/herramientas/Verifacti.jsx"));

/* LOGS */
const Logs = lazy(() => import("./pages/logs/Logs.jsx"));

/* NOTIFICACIONES */
const Notificaciones = lazy(() => import("./pages/notificaciones/Notificaciones.jsx"));

/* MUNICIPIOS */
const Municipios = lazy(() => import("./pages/herramientas/Municipios.jsx"));

/* ENTIDADES BANCARIAS */
const EntidadesBancarias = lazy(() => import("./pages/herramientas/EntidadesBancarias.jsx"));

/* REGISTROS DE LA PROPIEDAD */
const RegistrosPropiedad = lazy(() => import("./pages/herramientas/RegistrosPropiedad.jsx"));

/* OFICINAS LIQUIDADORAS */
const OficinasLiquidadoras = lazy(() => import("./pages/herramientas/OficinasLiquidadoras.jsx"));

/* ACCIONES DEL EXPEDIENTE */
const AccionesExpediente = lazy(() => import("./pages/herramientas/AccionesExpediente.jsx"));

/* PANEL TÉCNICO */
const PanelTecnico = lazy(() => import("./pages/paneltecnico/PanelTecnico.jsx"));
const MonitorSistema = lazy(() => import("./pages/paneltecnico/MonitorSistema.jsx"));
const MonitorRealtime = lazy(() => import("./pages/paneltecnico/MonitorRealtime.jsx"));
const AuditoriaAvanzada = lazy(() => import("./pages/paneltecnico/AuditoriaAvanzada.jsx"));
const LogsAvanzados = lazy(() => import("./pages/paneltecnico/LogsAvanzados.jsx"));

/* SEGURIDAD */
const Seguridad = lazy(() => import("./pages/seguridad/Seguridad.jsx"));
const SeguridadUsuarios = lazy(() => import("./pages/seguridad/SeguridadUsuarios.jsx"));
const SeguridadRoles = lazy(() => import("./pages/seguridad/SeguridadRoles.jsx"));
const SeguridadModulos = lazy(() => import("./pages/seguridad/SeguridadModulos.jsx"));
const SeguridadPermisos = lazy(() => import("./pages/seguridad/SeguridadPermisos.jsx"));
const SeguridadFicha = lazy(() => import("./pages/seguridad/SeguridadFicha.jsx"));
const SeguridadLogs = lazy(() => import("./pages/seguridad/SeguridadLogs.jsx"));
const SeguridadRolEditor = lazy(() => import("./pages/seguridad/SeguridadRolEditor.jsx"));

/* AUDITORÍA */
const SeguridadAuditoria = lazy(() => import("./pages/seguridad/SeguridadAuditoria.jsx"));

/* MAESTROS */
const Maestros = lazy(() => import("./pages/maestros/Maestros.jsx"));

/* FUSIONES */
const Fusiones = lazy(() => import("./pages/fusiones/Fusiones"));

/* REAL TIME */
import RealtimeGlobal from "./components/realtime/RealtimeGlobal";

/* TIPOS DE CARGA HIPOTECARIA */
const TiposCargaHipotecaria = lazy(() => import("./pages/herramientas/TiposCargaHipotecaria.jsx"));

/* TIPOS DE CONCEPTOS DE GASTOS */
const TiposConceptoGastos = lazy(() => import("./pages/herramientas/TiposConceptoGastos.jsx"));
const TiposExpediente = lazy(() => import("./pages/herramientas/TiposExpediente.jsx"));

/* APODERAGEST */
const ApoderaGest = lazy(() => import("./pages/apoderagest/ApoderaGest.jsx"));
const NotarGest = lazy(() => import("./pages/notargest/NotarGest.jsx"));
const EncargaGest = lazy(() => import("./pages/encargagest/EncargaGest.jsx"));
const EncargaGestWorkspace = lazy(() => import("./pages/encargagest/EncargaGestWorkspace.jsx"));
const Fichajes = lazy(() => import("./pages/fichajes/Fichajes.jsx"));
const MensajeriaMolsan = lazy(() => import("./pages/mensajeria/MensajeriaMolsan.jsx"));
const MensajeriaSolicitudes = lazy(() => import("./pages/mensajeria/MensajeriaSolicitudes.jsx"));
const CatalogoFichajes = lazy(() => import("./pages/herramientas/CatalogoFichajes.jsx"));
const ControlApoderados = lazy(() => import("./pages/apoderagest/ControlApoderados.jsx"));


/**
 * ============================================================
 * WRAPPER MENSAJES
 * ============================================================
 */

const protegerModulo = (modulo, elemento) => (
  <RequireModule module={modulo}>{elemento}</RequireModule>
);


function MensajesWrapper() {

  const empleado = useAuthStore(
    (s) => s.empleado
  );

  if (!empleado || !empleado.id) {

    return (
      <div className="p-6">
        Cargando módulo de mensajes…
      </div>
    );

  }

  return (
    <Mensajes
      usuarioId={empleado.id}
    />
  );
}


class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidMount() {
    this._capturarErrorGlobal = (evento) => {
      const error = evento?.error || new Error(evento?.message || "Error JavaScript global desconocido");
      console.error("[ERP] Error JavaScript global:", error);
      this.setState((actual) => actual.error ? null : ({ error, errorInfo: null }));
    };
    this._capturarRechazoNoControlado = (evento) => {
      const razon = evento?.reason;
      const error = razon instanceof Error
        ? razon
        : new Error(String(razon || "Promesa rechazada sin detalle"));
      console.error("[ERP] Promesa no controlada:", error);
      this.setState((actual) => actual.error ? null : ({ error, errorInfo: null }));
    };
    window.addEventListener("error", this._capturarErrorGlobal);
    window.addEventListener("unhandledrejection", this._capturarRechazoNoControlado);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this._capturarErrorGlobal);
    window.removeEventListener("unhandledrejection", this._capturarRechazoNoControlado);
  }

  componentDidCatch(error, info) {
    this.setState({ errorInfo: info || null });
    console.error("[ERP] Error de renderizado capturado:", error, info?.componentStack);
  }

  obtenerDiagnostico(error) {
    const mensaje = String(error?.message || error || "Error de renderizado desconocido");
    const texto = mensaje.toLowerCase();

    if (/failed to fetch|networkerror|network request failed|load failed/.test(texto)) {
      return {
        causa: "No se ha podido completar una comunicación de red. Puede que el backend esté reiniciándose, no responda o exista un problema de conexión.",
        accion: "Comprueba el estado del backend en Render. Cuando vuelva a estar disponible, prueba a recargar el ERP."
      };
    }
    if (/timeout|statement timeout|lock timeout|deadlock detected|could not obtain lock|canceling statement/.test(texto)) {
      return {
        causa: "La base de datos ha tardado más de lo permitido o una operación ha esperado un bloqueo. El límite evita que el proceso quede esperando indefinidamente; no identifica por sí solo qué sesión mantiene el bloqueo.",
        accion: "Conserva el error técnico y revisa los registros del backend en Render, especialmente las líneas STARTUP SQL inmediatamente anteriores y posteriores."
      };
    }
    if (/loading chunk|chunkloaderror|dynamically imported module|importing a module script/.test(texto)) {
      return {
        causa: "Es posible que el frontend se haya actualizado mientras el navegador conservaba archivos antiguos en caché, o que falte un recurso del despliegue.",
        accion: "Recarga el ERP. Si persiste, comprueba que el despliegue frontend esté en estado LIVE."
      };
    }
    if (/undefined|is not defined|null|cannot read properties|cannot access/.test(texto)) {
      return {
        causa: "Probable error de programación: una variable, propiedad o dato que el módulo esperaba no está disponible en ese momento.",
        accion: "Anota el módulo y el mensaje exacto. Hay que revisar la función indicada y el flujo que proporciona ese dato."
      };
    }
    if (/401|403|unauthorized|forbidden|token|sesión/.test(texto)) {
      return {
        causa: "Posible problema de sesión, token caducado o permisos insuficientes.",
        accion: "Comprueba si la sesión sigue activa y si el usuario tiene permisos para acceder a esta función."
      };
    }
    return {
      causa: "Error inesperado de la interfaz. El mensaje técnico que aparece abajo es la pista principal; por sí solo no confirma la causa raíz.",
      accion: "Guarda el mensaje, la hora y la ruta del ERP y revisa los registros de Render y la función afectada."
    };
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;
      const diagnostico = this.obtenerDiagnostico(error);
      const detalle = [
        "Diagnóstico ERP Molsan",
        `Fecha: ${new Date().toLocaleString()}`,
        `Ruta: ${window.location.pathname}`,
        `Error: ${String(error?.message || error || "Error desconocido")}`,
        `Causa posible: ${diagnostico.causa}`,
        `Acción recomendada: ${diagnostico.accion}`,
        this.state.errorInfo?.componentStack ? `Componentes: ${this.state.errorInfo.componentStack}` : ""
      ].filter(Boolean).join("\\n");

      return (
        <main className="flex min-h-screen items-center justify-center p-6">
          <section className="w-full max-w-3xl">
            <h1>El ERP ha detectado un error</h1>
            <p>La sesión no se ha cerrado. El diagnóstico siguiente ayuda a identificar qué ha fallado y qué revisar.</p>
            <div className="mb-3 p-4">
              <strong className="block mb-1">Posible causa</strong>
              <p>{diagnostico.causa}</p>
            </div>
            <div style={{ marginBottom: 12, padding: 14 }}>
              <strong style={{ display: "block", marginBottom: 5 }}>Qué hacer</strong>
              <p style={{ margin: 0 }}>{diagnostico.accion}</p>
            </div>
            <strong className="block mb-1">Error técnico</strong>
            <pre className="max-h-44 overflow-auto whitespace-pre-wrap p-3">{String(error?.message || error || "Error de renderizado desconocido")}</pre>
            <p className="mt-3">Ruta: {window.location.pathname} · Fecha: {new Date().toLocaleString()}</p>
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => { try { navigator.clipboard?.writeText(detalle); } catch (e) { console.warn("No se pudo copiar el diagnóstico."); } }}>Copiar diagnóstico</button>
              <button type="button" onClick={() => window.location.reload()}>Recargar ERP</button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

/**
 * ============================================================
 * APP
 * ============================================================
 */

export default function App() {

  const empleado = useAuthStore((state) => state.empleado);
  const token = useAuthStore((state) => state.token);

  return (

    <div>
      <AppErrorBoundary>

      {empleado && token ? <RealtimeGlobal /> : null}

      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center p-8">Cargando módulo…</div>}>
      <Routes>

        {/* ====================================================
            LOGIN
            ==================================================== */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* ====================================================
            MODULOS
            ==================================================== */}

                  <Route
            path="modulos"
            element={
              <RequireAuth>
                <ModulosSelector />
              </RequireAuth>
            }
          />


          
          <Route
            path="apoderagest"
            element={
              <RequireAuth>
                <RequireModule module="apoderagest">
                  <ApoderaGest />
                </RequireModule>
              </RequireAuth>
            }
          />

        
        
        <Route

        
          path="encargagest"

        
          element={<EncargaGest />}

        
        />

        <Route path="encargagest/notario" element={<EncargaGest accessMode="external" />} />
        
        {/* Espacio interno EncargaGest: módulos compartidos sin entrar en CancelaGest. */}
        <Route path="encargagest/ctn" element={<EncargaGestWorkspace page="ctn" />} />
        <Route path="encargagest/agenda" element={<EncargaGestWorkspace page="agenda" />} />
        <Route path="encargagest/mensajes" element={<EncargaGestWorkspace page="mensajes" />} />
        <Route path="encargagest/intranet" element={<EncargaGestWorkspace page="intranet" />} />

        <Route
          path="notargest"
          element={<NotarGest />}
        />

        {/* Portales externos para notarías: rutas explícitas y separadas. */}
        <Route
          path="notargest-notario"
          element={<NotarGest accessMode="external" />}
        />
        <Route
          path="notargest-notarios"
          element={<NotarGest accessMode="external" />}
        />
        <Route
          path="encargagest-notario"
          element={<EncargaGest accessMode="external" />}
        />
        <Route
          path="encargagest-notarios"
          element={<EncargaGest accessMode="external" />}
        />

        {/* Compatibilidad con enlaces antiguos: cada ruta conserva su portal correcto. */}
        <Route
          path="notargestweb"
          element={<NotarGest />}
        />
        <Route
          path="encargagestweb"
          element={<EncargaGest />}
        />
        
        {/* ====================================================
            RUTAS PRIVADAS
            ==================================================== */}

        <Route
          path="/"
          element={
            <RequireAuth>

              <>
                <Layout />
              </>

            </RequireAuth>
          }
        >

          {/* ==================================================
              DASHBOARD
              ================================================== */}

          <Route
            index
            element={protegerModulo("dashboard", <Dashboard />)}
          />

          <Route
            path="dashboard"
            element={protegerModulo("dashboard", <Dashboard />)}
          />

          <Route path="cancelagest" element={protegerModulo("cancelagest", <Cancelagest />)} />

          {/* Fichaje Molsan: módulo de empleado y control administrativo. */}
          <Route path="fichajes" element={protegerModulo("fichajes", <Fichajes modo="empleado" />)} />
          <Route path="control-fichajes" element={protegerModulo("control-fichajes", <Fichajes modo="admin" />)} />
          <Route path="mensajeria" element={protegerModulo("mensajeria", <MensajeriaSolicitudes />)} />
          <Route path="mensajeria-gestion" element={protegerModulo("mensajeria-gestion", <MensajeriaMolsan vistaGestion />)} />
          <Route path="apoderagest/liquidaciones" element={<RequireModule module="apoderagest"><ControlApoderados modo="colaborador" /></RequireModule>} />
          <Route path="herramientas/utilidades/control-apoderados" element={protegerModulo("apoderagest", <ControlApoderados modo="admin" />)} />


          {/* ==================================================
              AGENDA
              ================================================== */}

          <Route
            path="agenda"
            element={protegerModulo("agenda", <Agenda />)}
          />

          <Route
            path="agenda/dia"
            element={protegerModulo("agenda", <VistaDia />)}
          />

          <Route
            path="agenda/semana"
            element={protegerModulo("agenda", <VistaSemana />)}
          />

          <Route
            path="agenda/mes"
            element={protegerModulo("agenda", <VistaMes />)}
          />


          {/* ==================================================
              EXPEDIENTES
              ================================================== */}

          <Route
            path="expedientes"
            element={protegerModulo("expedientes", <ExpedientesListado />)}
          />

          <Route
            path="expedientes/:id"
            element={protegerModulo("expedientes", <FichaExpediente />)}
          />

          <Route
            path="expedientes-demo-glass-luxe"
            element={<FichaExpedienteDemo />}
          />

          <Route
            path="provisiones-fondos"
            element={protegerModulo("provisiones-fondos", <ProvisionesFondosPage />)}
          />

          <Route
            path="catalogos/provisiones-fondos"
            element={protegerModulo("catalogos", <ProvisionesFondosPage modoCatalogo />)}
          />

          <Route path="herramientas/utilidades/visibilidad-tablas" element={protegerModulo("seguridad", <AdministracionEmpleadoConfig seccion="visibilidad-tablas" />)} />
          <Route path="herramientas/utilidades/asignaciones" element={protegerModulo("seguridad", <AdministracionEmpleadoConfig seccion="asignaciones" />)} />
          <Route path="herramientas/utilidades/complementos-saldo" element={protegerModulo("utilidades", <ComplementosSaldo />)} />
          <Route path="herramientas/utilidades/proceso-absis" element={protegerModulo("utilidades", <ProcesoAbsis />)} />
          <Route path="herramientas/utilidades/ppad" element={protegerModulo("utilidades", <PPAD />)} />
          <Route path="herramientas/utilidades/verifacti" element={protegerModulo("utilidades", <Verifacti />)} />


          {/* ==================================================
              CTN
              ================================================== */}

          <Route
            path="ctn"
            element={protegerModulo("ctn", <Ctn />)}
          />

          <Route
            path="ctn/listado"
            element={protegerModulo("ctn", <CtnListadoPage />)}
          />

          <Route
            path="ctn/:id"
            element={protegerModulo("ctn", <CtnDetallePage />)}
          />


          {/* ==================================================
              EMPLEADOS
              ================================================== */}

          <Route
            path="empleados"
            element={protegerModulo("empleados", <EmpleadosModulo2026 />)}
          />

          <Route
            path="empleados/listado"
            element={protegerModulo("empleados", <EmpleadosListado />)}
          />

          <Route
            path="empleados/:id"
            element={protegerModulo("empleados", <EmpleadoFicha />)}
          />

          <Route
            path="empleados/:id/editar"
            element={protegerModulo("empleados", <EmpleadoEditar />)}
          />


          {/* ==================================================
              INTRANET
              ================================================== */}

          <Route
            path="intranet"
            element={protegerModulo("intranet", <Intranet />)}
          />


          {/* ==================================================
              INFORMES
              ================================================== */}

          <Route
            path="informes"
            element={protegerModulo("informes", <Informes />)}
          />
          <Route
            path="informes/:apartado"
            element={protegerModulo("informes", <Informes />)}
          />


          {/* ==================================================
              MENSAJES
              ================================================== */}

          <Route
            path="mensajes"
            element={protegerModulo("mensajes", <MensajesWrapper />)}
          />


          {/* ==================================================
              HERRAMIENTAS
              ================================================== */}

          <Route
            path="herramientas"
            element={protegerModulo("utilidades", <Herramientas />)}
          />

          <Route
            path="herramientas/importar-ctn"
            element={protegerModulo("utilidades", <ImportarCTN />)}
          />

          <Route
            path="herramientas/municipios"
            element={protegerModulo("utilidades", <Municipios />)}
          />

          <Route
            path="herramientas/importador-absis"
            element={protegerModulo("utilidades", <ImportadorAbsis />)}
          />
          <Route
            path="herramientas/importador-absis/postfirma"
            element={protegerModulo("utilidades", <ImportadorPostFirma />)}
          />

          <Route
            path="herramientas/utilidades"
            element={protegerModulo("utilidades", <Utilidades />)}
          />
          <Route path="herramientas/utilidades/modelos-documentos" element={protegerModulo("utilidades", <ModelosDocumentos />)} />
          <Route path="herramientas/utilidades/reglas-actividades-expediente" element={protegerModulo("utilidades", <ReglasActividadesExpediente />)} />
          <Route path="herramientas/utilidades/datos-molsan" element={protegerModulo("utilidades", <DatosMolsan />)} />
          <Route path="herramientas/utilidades/alta-expediente" element={protegerModulo("utilidades", <AltaExpediente />)} />

          <Route
            path="herramientas/utilidades/lectura-copias"
            element={protegerModulo("utilidades", <LecturaCopias />)}
          />

          <Route
            path="herramientas/utilidades/cambios-actividad-absis"
            element={protegerModulo("utilidades", <CambiosActividadAbsis />)}
          />

          <Route
            path="herramientas/utilidades/lectura-cancela-i"
            element={protegerModulo("utilidades", <LecturaCancelaI />)}
          />

          <Route
            path="herramientas/utilidades/accesos-notariales"
            element={protegerModulo("utilidades", <AccesosNotariales />)}
          />

          <Route
            path="catalogos"
            element={protegerModulo("catalogos", <Catalogos />)}
          />

          <Route
            path="catalogos/absis"
            element={protegerModulo("catalogos", <CatalogoAbsis />)}
          />

          <Route
            path="catalogos/oficinas"
            element={protegerModulo("catalogos", <CatalogoOficinas />)}
          />
          <Route path="catalogos/tipos-impositivos" element={protegerModulo("catalogos", <TiposImpositivos />)} />
          <Route
            path="catalogos/fichajes"
            element={protegerModulo("catalogos", <CatalogoFichajes />)}
          />
          <Route path="catalogos/mensajeria-servicios" element={protegerModulo("mensajeria", <MensajeriaMolsan vistaCatalogo />)} />

          <Route
            path="catalogos/firmas-email"
            element={protegerModulo("catalogos", <FirmasEmail />)}
          />

          <Route
            path="catalogos/correspondencia-tipificada"
            element={protegerModulo("catalogos", <CorrespondenciaTipificada />)}
          />

          {/* Alias para conservar los enlaces antiguos a Correspondencia tipificada. */}
          <Route
            path="herramientas/utilidades/correspondencia-tipificada"
            element={protegerModulo("catalogos", <CorrespondenciaTipificada />)}
          />

          <Route
            path="herramientas/honorarios-gestoria"
            element={protegerModulo("utilidades", <HonorariosGestoria />)}
          />

          <Route
            path="herramientas/entidades-bancarias"
            element={protegerModulo("utilidades", <EntidadesBancarias />)}
          />

          <Route
            path="herramientas/registros-propiedad"
            element={protegerModulo("utilidades", <RegistrosPropiedad />)}
          />

          <Route
            path="herramientas/oficinas-liquidadoras"
            element={protegerModulo("utilidades", <OficinasLiquidadoras />)}
          />

          <Route
            path="herramientas/acciones-expediente"
            element={protegerModulo("utilidades", <AccionesExpediente />)}
          />

          <Route
            path="herramientas/tipos-carga-hipotecaria"
            element={protegerModulo("utilidades", <TiposCargaHipotecaria />)}
          />

          <Route
            path="herramientas/tipos-concepto-gastos"
            element={protegerModulo("utilidades", <TiposConceptoGastos />)}
          />

          <Route
            path="herramientas/tipos-expediente"
            element={protegerModulo("utilidades", <TiposExpediente />)}
          />

          <Route
            path="herramientas/utilidades/crear-noticia"
            element={protegerModulo("intranet", <CrearNoticia />)}
          />

          <Route
            path="herramientas/utilidades/subir-documento"
            element={protegerModulo("intranet", <SubirDocumento />)}
          />

          <Route
            path="herramientas/mantenimiento-tecnico"
            element={protegerModulo("utilidades", <MantenimientoTecnico />)}
          />

          <Route
            path="herramientas/utilidades/cambiar-gestor"
            element={protegerModulo("utilidades", <CambiarGestorExpediente />)}
          />
          <Route
            path="herramientas/utilidades/reasignar-notario"
            element={protegerModulo("utilidades", <ReasignarNotarioExpediente />)}
          />
          <Route
            path="herramientas/utilidades/asignar-promociones"
            element={protegerModulo("utilidades", <AsignarExpedientesPromociones />)}
          />
          {/* ==================================================
              LOGS
              ================================================== */}

          <Route
            path="logs"
            element={protegerModulo("logs", <Logs />)}
          />


          {/* ==================================================
              NOTIFICACIONES
              ================================================== */}

          <Route
            path="notificaciones"
            element={protegerModulo("notificaciones", <Notificaciones />)}
          />


          {/* ==================================================
              FUSIONES
              ================================================== */}

          <Route
            path="/fusiones"
            element={protegerModulo("fusiones", <Fusiones />)}
          />


          {/* ==================================================
              PANEL TÉCNICO
              ================================================== */}

          <Route
            path="paneltecnico"
            element={protegerModulo("panel-tecnico", <PanelTecnico />)}
          />

          <Route
            path="paneltecnico/monitor-sistema"
            element={protegerModulo("panel-tecnico", <MonitorSistema />)}
          />

          <Route
            path="paneltecnico/monitor-realtime"
            element={protegerModulo("panel-tecnico", <MonitorRealtime />)}
          />

          <Route
            path="maestros"
            element={protegerModulo("maestros", <Maestros />)}
          />

          <Route
            path="paneltecnico/auditoria-avanzada"
            element={protegerModulo("panel-tecnico", <AuditoriaAvanzada />)}
          />

          <Route
            path="paneltecnico/logs-avanzados"
            element={protegerModulo("panel-tecnico", <LogsAvanzados />)}
          />


          {/* ==================================================
              SEGURIDAD

              IMPORTANTE:
              Seguridad queda separada de Auditoría.
              ================================================== */}

          <Route
            path="seguridad"
            element={protegerModulo("seguridad", <Seguridad />)}
          />

          <Route
            path="seguridad/usuarios"
            element={protegerModulo("seguridad", <SeguridadUsuarios />)}
          />

          <Route
            path="seguridad/roles"
            element={protegerModulo("seguridad", <SeguridadRoles />)}
          />

          <Route
            path="seguridad/modulos"
            element={protegerModulo("seguridad", <SeguridadModulos />)}
          />

          <Route
            path="seguridad/permisos"
            element={protegerModulo("seguridad", <SeguridadPermisos />)}
          />

          <Route
            path="seguridad/ficha/:id"
            element={protegerModulo("seguridad", <SeguridadFicha />)}
          />

          <Route
            path="seguridad/logs"
            element={protegerModulo("seguridad", <SeguridadLogs />)}
          />

          <Route
            path="seguridad/roles/editor"
            element={protegerModulo("seguridad", <SeguridadRolEditor />)}
          />


          {/* ==================================================
              AUDITORÍA

              Módulo independiente de Seguridad.
              ================================================== */}

          <Route
            path="auditoria"
            element={protegerModulo("auditoria", <SeguridadAuditoria />)}
          />

          {/* Alias compatible con el enlace histórico desde Utilidades. */}
          <Route
            path="seguridad/auditoria"
            element={protegerModulo("auditoria", <SeguridadAuditoria />)}
          />

        </Route>


        {/* ====================================================
            CUALQUIER OTRA RUTA → LOGIN
            ==================================================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
      </Suspense>
      </AppErrorBoundary>

    </div>

  );
}
