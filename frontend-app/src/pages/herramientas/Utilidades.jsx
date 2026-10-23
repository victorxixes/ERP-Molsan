import { Link } from "react-router-dom";
import "../../css/HerramientasPremium.css";

/**
 * UTILIDADES — MOLSAN ERP PREMIUM 2027
 */

export default function Utilidades() {

  return (
    <div className="utilidades-premium-page min-h-full space-y-7 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl shadow-sm">⚙️</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Utilidades del sistema</h1>
            <p className="mt-1 text-sm text-slate-500">Accede a importaciones, integraciones y herramientas de trabajo directamente desde el ERP.</p>
          </div>
        </div>
      </header>

      <Grupo titulo="Accesos y seguridad" descripcion="Administración centralizada de permisos de empleados y accesos a portales notariales.">
        <Card icon="🛡️" titulo="Accesos y seguridad de empleados" descripcion="Selecciona un empleado para administrar roles, módulos y permisos desde el centro de seguridad." link="/seguridad" destacado />
        <Card icon="🔐" titulo="Accesos notariales" descripcion="Busca una notaría y administra por separado sus accesos a NotarGest y EncargaGest, con historial de cambios." link="/herramientas/utilidades/accesos-notariales" />
      </Grupo>

      <Grupo titulo="Administración de empleados" descripcion="Configura visibilidad y asignaciones desde Utilidades, seleccionando el empleado correspondiente.">
        <Card icon="📊" titulo="Visibilidad de tablas" descripcion="Configura las columnas de Excel y la visibilidad por actividad para el empleado seleccionado." link="/herramientas/utilidades/visibilidad-tablas" destacado />
        <Card icon="⚖️" titulo="Asignaciones" descripcion="Administra las reglas de reparto y asignación de expedientes desde un panel centralizado." link="/herramientas/utilidades/asignaciones" destacado />
      </Grupo>

      <Grupo titulo="Importaciones y datos" descripcion="Carga información desde los ficheros de trabajo autorizados.">
        <Card icon="📥" titulo="Importar CTN" descripcion="Importar un Excel con información de notarías." link="/herramientas/importar-ctn" />
        <Card icon="📦" titulo="Importador ABSIS" descripcion="Importar expedientes desde el Excel matriz ABSIS." link="/herramientas/importador-absis" destacado />
      </Grupo>

      <Grupo titulo="Integraciones y comunicaciones" descripcion="Seguimiento de los procesos de intercambio de información con los sistemas de nuestros clientes.">
        <Card icon="✉️" titulo="Correspondencia tipificada" descripcion="Crea plantillas de email por proceso y genera mensajes con datos reales de la ficha del expediente." link="/herramientas/utilidades/correspondencia-tipificada" destacado />
        <Card icon="🔄" titulo="Proceso de ABSIS" descripcion="Control de expedientes enviados, errores detectados e incidencias, con buscador, acciones y exportación Excel." link="/herramientas/utilidades/proceso-absis" destacado />
        <Card icon="🧾" titulo="Verifacti" descripcion="Acceso al futuro panel de control de Verifacti para consultar la integración y el estado de los registros de facturación." link="/herramientas/utilidades/verifacti" enConstruccion />
      </Grupo>

      <Grupo titulo="Control económico" descripcion="Seguimiento de los PPAD pendientes de compensar y de los ya compensados.">
        <Card icon="🧾" titulo="Control Apoderados" descripcion="Gestiona colaboradores, revisa las relaciones mensuales de firmas reales y valida las facturas recibidas." link="/herramientas/utilidades/control-apoderados" destacado />
        <Card icon="💶" titulo="PPAD" descripcion="Consulta importes pendientes y compensados, revisa cada expediente y descarga los listados a Excel." link="/herramientas/utilidades/ppad" destacado />
      </Grupo>

      <Grupo titulo="Gestión de expedientes" descripcion="Acciones manuales y controladas sobre la asignación y el seguimiento de los expedientes.">
        <Card icon="💶" titulo="Complementos de saldo" descripcion="Consultar solicitudes de complemento de saldo, controlar su estado, revisar importes y descargar el listado a Excel." link="/herramientas/utilidades/complementos-saldo" />
        <Card icon="🔁" titulo="Cambiar gestor de expediente" descripcion="Busca un expediente por su número y reasígnalo manualmente a otro gestor, dejando constancia del cambio." link="/herramientas/utilidades/cambiar-gestor" />
      </Grupo>

      <Grupo titulo="Administración, seguridad y supervisión" descripcion="Accesos directos para administrar usuarios y revisar el estado operativo del ERP.">
        <Card icon="🧾" titulo="Auditoría" descripcion="Consultar los eventos de auditoría disponibles para tu perfil." link="/auditoria" />
        <Card icon="📜" titulo="Logs del sistema" descripcion="Revisar registros y errores registrados por la aplicación." link="/logs" />
        <Card icon="🖥️" titulo="Panel técnico" descripcion="Acceder a los paneles de supervisión del sistema y tiempo real." link="/paneltecnico" />
        <Card icon="📈" titulo="Informes" descripcion="Consultar informes y estadísticas operativas." link="/informes" />
        <Card icon="📡" titulo="Monitor en tiempo real" descripcion="Consultar la supervisión y actividad del sistema en tiempo real." link="/paneltecnico/monitor-realtime" />
        <Card icon="⚙️" titulo="Mantenimiento técnico" descripcion="Diagnóstico de base de datos, revisión de estructura y tareas técnicas controladas desde el ERP." link="/herramientas/mantenimiento-tecnico" />
      </Grupo>

      <Grupo titulo="Módulos de trabajo" descripcion="Accesos directos a los módulos operativos del ERP.">
        <Card icon="⚡" titulo="ApoderaGest" descripcion="Gestionar encargos y actividad de apoderados." link="/apoderagest" />
        <Card icon="📁" titulo="CancelaGest" descripcion="Acceder al módulo de gestión de cancelaciones." link="/cancelagest" />
        <Card icon="🌐" titulo="NotarGest" descripcion="Acceder al módulo de trabajo notarial." link="/notargest" />
        <Card icon="📋" titulo="EncargaGest" descripcion="Gestionar encargos de cancelación recibidos." link="/encargagest" />
      </Grupo>

      <Grupo titulo="Intranet y administración" descripcion="Publicación de información y herramientas de soporte integradas en el ERP.">
        <Card icon="📰" titulo="Crear noticia" descripcion="Publicar noticias para los usuarios de la intranet." link="/herramientas/utilidades/crear-noticia" />
        <Card icon="📄" titulo="Subir documento" descripcion="Publicar documentos en la intranet." link="/herramientas/utilidades/subir-documento" />
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, descripcion, children }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-800">{titulo}</h2>
        <p className="text-sm text-slate-500">{descripcion}</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

/* =========================================================
   CARD
========================================================= */

function MetricaAbsis({ titulo, valor, alerta = false }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${alerta ? "border-rose-100 bg-rose-50/60" : "border-slate-200 bg-white"}`}>
      <p className="text-[11px] font-semibold leading-4 text-slate-500">{titulo}</p>
      <p className={`mt-2 text-2xl font-bold ${alerta ? "text-rose-600" : "text-slate-800"}`}>{valor}</p>
    </div>
  );
}

function Card({
  icon,
  titulo,
  descripcion,
  link,
  destacado = false,
  enConstruccion = false,
  onClick,
}) {
  const contenido = (
    <>
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl transition-all duration-300 group-hover:scale-105 ${destacado ? "bg-blue-100 border-blue-200" : "bg-slate-50 border-slate-200"}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-800">{titulo}</h2>
            {enConstruccion && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                En construcción
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm leading-5 text-slate-500">{descripcion}</p>
          {enConstruccion && (
            <p className="mt-3 text-xs font-medium text-amber-700">
              Próximamente: registro de envíos, respuestas y cambios de estado vía API.
            </p>
          )}
        </div>
        {!enConstruccion && (
          <span className="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-blue-500">→</span>
        )}
      </div>
    </>
  );

  const clases = `group relative overflow-hidden rounded-[22px] border bg-white/80 p-5 shadow-[0_12px_35px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-300 ${enConstruccion && !onClick ? "cursor-default border-amber-200/80 bg-amber-50/30" : "cursor-pointer hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.11)] active:scale-[0.98]"} ${destacado ? "border-blue-200/80 bg-blue-50/50" : ""}`;

  if (enConstruccion && !onClick && !link) {
    return (
      <div className={clases} aria-label={`${titulo}: en construcción`}>
        {contenido}
      </div>
    );
  }

  if (onClick) {
    return <button type="button" onClick={onClick} className={`${clases} w-full text-left`}>{contenido}</button>;
  }

  return (
    <Link to={link} className={clases}>
      {contenido}
    </Link>
  );
}
