// ============================================================
// ERP SJ-2026 — Sistema de rutas principal
// ============================================================

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

/* AUTH */
import RequireAuth from "./components/auth/RequireAuth";

/* LAYOUT */
import Layout from "./layout/Layout";

/* LOGIN */
import LoginPage from "./pages/LoginPage";

/* MODULOS */
import ModulosSelector from "./pages/ModulosSelector";

import ModuloPendiente from "./pages/ModuloPendiente";

/* DASHBOARD */
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Cancelagest from "./pages/cancelagest/Cancelagest.jsx";

/* AGENDA */
import Agenda from "./pages/agenda/Agenda.jsx";
import VistaDia from "./pages/agenda/VistaDia.jsx";
import VistaSemana from "./pages/agenda/VistaSemana.jsx";
import VistaMes from "./pages/agenda/VistaMes.jsx";

/* EXPEDIENTES */
import ExpedientesListado from "./pages/expedientes/ExpedientesListado.jsx";
import FichaExpediente from "./pages/expedientes/FichaExpediente.jsx";
import ProvisionesFondosPage from "./pages/provisiones/ProvisionesFondosPage.jsx";

/* CTN */
import Ctn from "./pages/ctn/Ctn.jsx";
import CtnDetallePage from "./pages/ctn/CtnDetallePage.jsx";
import CtnListadoPage from "./pages/ctn/CtnListadoPage.jsx";

/* EMPLEADOS */
import EmpleadosModulo2026 from "./pages/empleados/EmpleadosModulo2026.jsx";
import EmpleadosListado from "./pages/empleados/EmpleadosListado.jsx";
import EmpleadoFicha from "./pages/empleados/EmpleadoFicha.jsx";
import EmpleadoEditar from "./pages/empleados/EmpleadoEditar.jsx";

/* INTRANET */
import Intranet from "./pages/intranet/Intranet.jsx";

/* MENSAJES */
import Mensajes from "./pages/mensajes/Mensajes.jsx";

/* HERRAMIENTAS */
import Herramientas from "./pages/herramientas/Herramientas.jsx";
import ImportarCTN from "./pages/herramientas/ImportarCTN.jsx";
import ImportadorAbsis from "./pages/herramientas/importador_absis";
import Utilidades from "./pages/herramientas/Utilidades.jsx";
import Catalogos from "./pages/herramientas/Catalogos.jsx";
import CatalogoAbsis from "./pages/herramientas/CatalogoAbsis.jsx";
import CorrespondenciaTipificada from "./pages/herramientas/CorrespondenciaTipificada.jsx";
import HonorariosGestoria from "./pages/herramientas/HonorariosGestoria.jsx";
import CrearNoticia from "./pages/herramientas/CrearNoticia.jsx";
import SubirDocumento from "./pages/herramientas/SubirDocumento.jsx";
import Informes from "./pages/informes/Informes.jsx";
import MantenimientoTecnico from "./pages/herramientas/MantenimientoTecnico.jsx";
import CambiarGestorExpediente from "./pages/herramientas/CambiarGestorExpediente.jsx";
import ComplementosSaldo from "./pages/herramientas/ComplementosSaldo.jsx";
import ProcesoAbsis from "./pages/herramientas/ProcesoAbsis.jsx";
import PPAD from "./pages/herramientas/PPAD.jsx";
import Verifacti from "./pages/herramientas/Verifacti.jsx";

/* LOGS */
import Logs from "./pages/logs/Logs.jsx";

/* NOTIFICACIONES */
import Notificaciones from "./pages/notificaciones/Notificaciones.jsx";

/* MUNICIPIOS */
import Municipios from "./pages/herramientas/Municipios.jsx";

/* ENTIDADES BANCARIAS */
import EntidadesBancarias from "./pages/herramientas/EntidadesBancarias.jsx";

/* REGISTROS DE LA PROPIEDAD */
import RegistrosPropiedad from "./pages/herramientas/RegistrosPropiedad.jsx";

/* OFICINAS LIQUIDADORAS */
import OficinasLiquidadoras
  from "./pages/herramientas/OficinasLiquidadoras.jsx";

/* ACCIONES DEL EXPEDIENTE */
import AccionesExpediente
  from "./pages/herramientas/AccionesExpediente.jsx";

/* PANEL TÉCNICO */
import PanelTecnico from "./pages/paneltecnico/PanelTecnico.jsx";
import MonitorSistema from "./pages/paneltecnico/MonitorSistema.jsx";
import MonitorRealtime from "./pages/paneltecnico/MonitorRealtime.jsx";
import AuditoriaAvanzada from "./pages/paneltecnico/AuditoriaAvanzada.jsx";
import LogsAvanzados from "./pages/paneltecnico/LogsAvanzados.jsx";

/* SEGURIDAD */
import Seguridad from "./pages/seguridad/Seguridad.jsx";
import SeguridadUsuarios from "./pages/seguridad/SeguridadUsuarios.jsx";
import SeguridadRoles from "./pages/seguridad/SeguridadRoles.jsx";
import SeguridadModulos from "./pages/seguridad/SeguridadModulos.jsx";
import SeguridadPermisos from "./pages/seguridad/SeguridadPermisos.jsx";
import SeguridadFicha from "./pages/seguridad/SeguridadFicha.jsx";
import SeguridadLogs from "./pages/seguridad/SeguridadLogs.jsx";
import SeguridadRolEditor from "./pages/seguridad/SeguridadRolEditor.jsx";

/* AUDITORÍA */
import SeguridadAuditoria from "./pages/seguridad/SeguridadAuditoria.jsx";

/* MAESTROS */
import Maestros from "./pages/maestros/Maestros.jsx";

/* FUSIONES */
import Fusiones from "./pages/fusiones/Fusiones";

/* REAL TIME */
import RealtimeGlobal from "./components/realtime/RealtimeGlobal";

/* TIPOS DE CARGA HIPOTECARIA */
import TiposCargaHipotecaria
  from "./pages/herramientas/TiposCargaHipotecaria.jsx";

/* TIPOS DE CONCEPTOS DE GASTOS */
import TiposConceptoGastos
  from "./pages/herramientas/TiposConceptoGastos.jsx";

/* APODERAGEST */
import ApoderaGest 
  from "./pages/apoderagest/ApoderaGest.jsx";
import NotarGest from "./pages/notargest/NotarGest.jsx";
import EncargaGest from "./pages/encargagest/EncargaGest.jsx";
import EncargaGestWorkspace from "./pages/encargagest/EncargaGestWorkspace.jsx";


/**
 * ============================================================
 * WRAPPER MENSAJES
 * ============================================================
 */

function MensajesWrapper() {

  const empleado = useAuthStore(
    (s) => s.empleado
  );

  if (!empleado || !empleado.id) {

    return (
      <div className="p-6 text-white/70">
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


/**
 * ============================================================
 * APP
 * ============================================================
 */

export default function App() {

  const empleado = useAuthStore((state) => state.empleado);
  const token = useAuthStore((state) => state.token);

  return (

    <div className="animate-fade-in">

      {empleado && token ? <RealtimeGlobal /> : null}

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
            element={<ApoderaGest />}
          />

                <Route
          path="cancelagest"
          element={<RequireAuth><Cancelagest /></RequireAuth>}
        />
        
        <Route

        
          path="encargagest"

        
          element={<EncargaGest />}

        
        />
        
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
          element={<NotarGest />}
        />
        <Route
          path="encargagest-notario"
          element={<EncargaGest />}
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
            element={<Dashboard />}
          />

          <Route
            path="dashboard"
            element={<Dashboard />}
          />


          {/* ==================================================
              AGENDA
              ================================================== */}

          <Route
            path="agenda"
            element={<Agenda />}
          />

          <Route
            path="agenda/dia"
            element={<VistaDia />}
          />

          <Route
            path="agenda/semana"
            element={<VistaSemana />}
          />

          <Route
            path="agenda/mes"
            element={<VistaMes />}
          />


          {/* ==================================================
              EXPEDIENTES
              ================================================== */}

          <Route
            path="expedientes"
            element={<ExpedientesListado />}
          />

          <Route
            path="expedientes/:id"
            element={<FichaExpediente />}
          />

          <Route
            path="provisiones-fondos"
            element={<ProvisionesFondosPage />}
          />

          <Route path="herramientas/utilidades/complementos-saldo" element={<ComplementosSaldo />} />
          <Route path="herramientas/utilidades/proceso-absis" element={<ProcesoAbsis />} />
          <Route path="herramientas/utilidades/ppad" element={<PPAD />} />
          <Route path="herramientas/utilidades/verifacti" element={<Verifacti />} />


          {/* ==================================================
              CTN
              ================================================== */}

          <Route
            path="ctn"
            element={<Ctn />}
          />

          <Route
            path="ctn/listado"
            element={<CtnListadoPage />}
          />

          <Route
            path="ctn/:id"
            element={<CtnDetallePage />}
          />


          {/* ==================================================
              EMPLEADOS
              ================================================== */}

          <Route
            path="empleados"
            element={<EmpleadosModulo2026 />}
          />

          <Route
            path="empleados/listado"
            element={<EmpleadosListado />}
          />

          <Route
            path="empleados/:id"
            element={<EmpleadoFicha />}
          />

          <Route
            path="empleados/:id/editar"
            element={<EmpleadoEditar />}
          />


          {/* ==================================================
              INTRANET
              ================================================== */}

          <Route
            path="intranet"
            element={<Intranet />}
          />


          {/* ==================================================
              INFORMES
              ================================================== */}

          <Route
            path="informes"
            element={<Informes />}
          />


          {/* ==================================================
              MENSAJES
              ================================================== */}

          <Route
            path="mensajes"
            element={<MensajesWrapper />}
          />


          {/* ==================================================
              HERRAMIENTAS
              ================================================== */}

          <Route
            path="herramientas"
            element={<Herramientas />}
          />

          <Route
            path="herramientas/importar-ctn"
            element={<ImportarCTN />}
          />

          <Route
            path="herramientas/municipios"
            element={<Municipios />}
          />

          <Route
            path="herramientas/importador-absis"
            element={<ImportadorAbsis />}
          />

          <Route
            path="herramientas/utilidades"
            element={<Utilidades />}
          />

          <Route
            path="catalogos"
            element={<Catalogos />}
          />

          <Route
            path="catalogos/absis"
            element={<CatalogoAbsis />}
          />

          <Route
            path="herramientas/utilidades/correspondencia-tipificada"
            element={<CorrespondenciaTipificada />}
          />

          <Route
            path="herramientas/honorarios-gestoria"
            element={<HonorariosGestoria />}
          />

          <Route
            path="herramientas/entidades-bancarias"
            element={<EntidadesBancarias />}
          />

          <Route
            path="herramientas/registros-propiedad"
            element={<RegistrosPropiedad />}
          />

          <Route
            path="herramientas/oficinas-liquidadoras"
            element={<OficinasLiquidadoras />}
          />

          <Route
            path="herramientas/acciones-expediente"
            element={<AccionesExpediente />}
          />

          <Route
            path="herramientas/tipos-carga-hipotecaria"
            element={<TiposCargaHipotecaria />}
          />

          <Route
            path="herramientas/tipos-concepto-gastos"
            element={<TiposConceptoGastos />}
          />

          <Route
            path="herramientas/utilidades/crear-noticia"
            element={<CrearNoticia />}
          />

          <Route
            path="herramientas/utilidades/subir-documento"
            element={<SubirDocumento />}
          />

          <Route
            path="herramientas/mantenimiento-tecnico"
            element={<MantenimientoTecnico />}
          />

          <Route
            path="herramientas/utilidades/cambiar-gestor"
            element={<CambiarGestorExpediente />}
          />    
          {/* ==================================================
              LOGS
              ================================================== */}

          <Route
            path="logs"
            element={<Logs />}
          />


          {/* ==================================================
              NOTIFICACIONES
              ================================================== */}

          <Route
            path="notificaciones"
            element={<Notificaciones />}
          />


          {/* ==================================================
              FUSIONES
              ================================================== */}

          <Route
            path="/fusiones"
            element={<Fusiones />}
          />


          {/* ==================================================
              PANEL TÉCNICO
              ================================================== */}

          <Route
            path="paneltecnico"
            element={<PanelTecnico />}
          />

          <Route
            path="paneltecnico/monitor-sistema"
            element={<MonitorSistema />}
          />

          <Route
            path="paneltecnico/monitor-realtime"
            element={<MonitorRealtime />}
          />

          <Route
            path="maestros"
            element={<Maestros />}
          />

          <Route
            path="paneltecnico/auditoria-avanzada"
            element={<AuditoriaAvanzada />}
          />

          <Route
            path="paneltecnico/logs-avanzados"
            element={<LogsAvanzados />}
          />


          {/* ==================================================
              SEGURIDAD

              IMPORTANTE:
              Seguridad queda separada de Auditoría.
              ================================================== */}

          <Route
            path="seguridad"
            element={<Seguridad />}
          />

          <Route
            path="seguridad/usuarios"
            element={<SeguridadUsuarios />}
          />

          <Route
            path="seguridad/roles"
            element={<SeguridadRoles />}
          />

          <Route
            path="seguridad/modulos"
            element={<SeguridadModulos />}
          />

          <Route
            path="seguridad/permisos"
            element={<SeguridadPermisos />}
          />

          <Route
            path="seguridad/ficha/:id"
            element={<SeguridadFicha />}
          />

          <Route
            path="seguridad/logs"
            element={<SeguridadLogs />}
          />

          <Route
            path="seguridad/roles/editor"
            element={<SeguridadRolEditor />}
          />


          {/* ==================================================
              AUDITORÍA

              Módulo independiente de Seguridad.
              ================================================== */}

          <Route
            path="auditoria"
            element={<SeguridadAuditoria />}
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

    </div>

  );
}
