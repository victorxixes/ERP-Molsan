import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * UTILIDADES — MOLSAN ERP PREMIUM 2027
 */

export default function Utilidades() {
  const [absisAbierto, setAbsisAbierto] = useState(false);
  const [actividadAbsis, setActividadAbsis] = useState("pendientes");
  const [busquedaAbsis, setBusquedaAbsis] = useState("");

  return (
    <div className="min-h-full space-y-7 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl shadow-sm">⚙️</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Utilidades del sistema</h1>
            <p className="mt-1 text-sm text-slate-500">Gestiona los catálogos, importaciones y herramientas de trabajo directamente desde el ERP.</p>
          </div>
        </div>
      </header>

      <Grupo titulo="Maestros y catálogos" descripcion="Datos comunes utilizados por los expedientes y los procesos de la gestoría.">
        <Card icon="🏘️" titulo="Municipios" descripcion="Comunidades autónomas, provincias y municipios." link="/herramientas/municipios" />
        <Card icon="🏦" titulo="Entidades bancarias" descripcion="Entidades, códigos europeos, LEI, categorías y direcciones." link="/herramientas/entidades-bancarias" />
        <Card icon="🏛️" titulo="Oficinas liquidadoras" descripcion="Gestionar oficinas liquidadoras y sus datos asociados." link="/herramientas/oficinas-liquidadoras" />
        <Card icon="📚" titulo="Registros de la propiedad" descripcion="Gestionar registros de la propiedad." link="/herramientas/registros-propiedad" />
        <Card icon="📋" titulo="Acciones del expediente" descripcion="Catálogo de acciones y actividades de los expedientes." link="/herramientas/acciones-expediente" />
        <Card icon="🏠" titulo="Tipos de carga hipotecaria" descripcion="Catálogo de tipos de carga hipotecaria." link="/herramientas/tipos-carga-hipotecaria" />
        <Card icon="🧾" titulo="Tipos de conceptos de gastos" descripcion="Catálogo de conceptos de gastos." link="/herramientas/tipos-concepto-gastos" />
        <Card icon="💶" titulo="Honorarios de gestoría" descripcion="Crear y modificar las tarifas que se aplican al registrar pagos de honorarios." link="/herramientas/honorarios-gestoria" destacado />
      </Grupo>

      <Grupo titulo="Importaciones y datos" descripcion="Carga información desde los ficheros de trabajo autorizados.">
        <Card icon="📥" titulo="Importar CTN" descripcion="Importar un Excel con información de notarías." link="/herramientas/importar-ctn" />
        <Card icon="📦" titulo="Importador ABSIS" descripcion="Importar expedientes desde el Excel matriz ABSIS." link="/herramientas/importador-absis" destacado />
      </Grupo>

      <Grupo titulo="Integraciones y comunicaciones" descripcion="Seguimiento de los procesos de intercambio de información con los sistemas de nuestros clientes.">
        <Card icon="🔄" titulo="Proceso de ABSIS" descripcion="Control visual de actividades pendientes de envío, incidencias y seguimiento de encargos ABSIS." onClick={() => setAbsisAbierto((abierto) => !abierto)} destacado />
      </Grupo>

      {absisAbierto && (
        <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <header className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">Proceso de ABSIS</h2>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">En construcción</span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">Vista previa de interfaz</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">Consulta de actividades, encargos pendientes e incidencias de envío. La conexión operativa con ABSIS aún está pendiente.</p>
            </div>
            <button type="button" onClick={() => setAbsisAbierto(false)} className="self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cerrar ×</button>
          </header>

          <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(260px,0.78fr)_minmax(0,2fr)] lg:p-6">
            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Actividades pendientes de envío ABSIS</h3>
                <label className="mt-4 block text-xs font-semibold text-slate-600" htmlFor="buscar-expediente-absis">Buscar expediente en las actividades</label>
                <div className="relative mt-1.5">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                  <input id="buscar-expediente-absis" value={busquedaAbsis} onChange={(e) => setBusquedaAbsis(e.target.value)} placeholder="N.º de expediente…" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">El filtro se aplicará a los encargos de la actividad seleccionada cuando se conecten los datos reales.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricaAbsis titulo="Total expedientes" valor="—" />
                <MetricaAbsis titulo="Expedientes con errores" valor="—" alerta />
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-white px-4 py-3">
                  <h3 className="text-sm font-bold text-slate-800">Fase de la actividad</h3>
                </div>
                {[
                  { id: "pendientes", titulo: "Pendientes de envío", detalle: "Por enviar a ABSIS", icono: "◷" },
                  { id: "errores", titulo: "Envíos con errores", detalle: "Requieren revisión", icono: "!" },
                  { id: "enviados", titulo: "Enviados / respuesta", detalle: "Seguimiento de respuesta", icono: "↗" },
                ].map((item) => (
                  <button key={item.id} type="button" onClick={() => setActividadAbsis(item.id)} className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3.5 text-left last:border-b-0 transition ${actividadAbsis === item.id ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "bg-white hover:bg-slate-50"}`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${item.id === "errores" ? "bg-rose-50 text-rose-600" : actividadAbsis === item.id ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{item.icono}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800">{item.titulo}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{item.detalle}</span>
                    </span>
                    <span className="mt-1 text-xs text-slate-400">›</span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{actividadAbsis === "errores" ? "Expedientes con incidencias ABSIS" : actividadAbsis === "enviados" ? "Seguimiento de envíos ABSIS" : "Actividades pendientes de envío"}</h3>
                  <p className="mt-1 text-xs text-slate-500">Listado de trabajo · pendiente de conectar con el servicio ABSIS</p>
                </div>
                <span className="self-start rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Sin conexión operativa</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {["Expediente", "ID envío", "ID ABSIS", "Tipo de cancelación", "Fecha de creación", "Fecha de la incidencia", "Tipo de incidencia", "Acciones"].map((nombre) => <th key={nombre} className="border-b border-slate-200 px-3 py-3 font-bold">{nombre}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl">🔎</div>
                        <p className="mt-3 font-semibold text-slate-700">{busquedaAbsis.trim() ? "Búsqueda preparada" : "Todavía no hay datos conectados"}</p>
                        <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">{busquedaAbsis.trim() ? `El expediente «${busquedaAbsis.trim()}» se buscará en esta fase cuando esté disponible el endpoint de consulta.` : "Esta tabla mostrará los encargos reales de la fase seleccionada, sus identificadores ABSIS, las fechas y las incidencias detectadas."}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] text-slate-500">Acciones previstas: eliminar encargo · reintentar envío · consultar información de gestión realizada en ABSIS.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled title="Disponible cuando se conecte ABSIS" className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400">Eliminar encargo</button>
                  <button type="button" disabled title="Disponible cuando se conecte ABSIS" className="cursor-not-allowed rounded-lg bg-blue-300 px-3 py-2 text-xs font-semibold text-white">Reintentar envío</button>
                  <button type="button" disabled title="Disponible cuando se conecte ABSIS" className="cursor-not-allowed rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400">Información de gestión ABSIS</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <Grupo titulo="Gestión de expedientes" descripcion="Acciones manuales y controladas sobre la asignación y el seguimiento de los expedientes.">
        <Card icon="🔁" titulo="Cambiar gestor de expediente" descripcion="Busca un expediente por su número y reasígnalo manualmente a otro gestor, dejando constancia del cambio." link="/herramientas/utilidades/cambiar-gestor" />
      </Grupo>

      <Grupo titulo="Administración, seguridad y supervisión" descripcion="Accesos directos para administrar usuarios y revisar el estado operativo del ERP.">
        <Card icon="🛡️" titulo="Seguridad" descripcion="Administrar usuarios, roles, módulos y permisos." link="/seguridad" />
        <Card icon="🧾" titulo="Auditoría" descripcion="Consultar los eventos de auditoría disponibles para tu perfil." link="/auditoria" />
        <Card icon="📜" titulo="Logs del sistema" descripcion="Revisar registros y errores registrados por la aplicación." link="/logs" />
        <Card icon="🖥️" titulo="Panel técnico" descripcion="Acceder a los paneles de supervisión del sistema y tiempo real." link="/paneltecnico" />
        <Card icon="📈" titulo="Informes" descripcion="Consultar informes y estadísticas operativas." link="/informes" />
      </Grupo>

      <Grupo titulo="Intranet y administración" descripcion="Publicación de información y herramientas de soporte integradas en el ERP.">
        <Card icon="📰" titulo="Crear noticia" descripcion="Publicar noticias para los usuarios de la intranet." link="/herramientas/utilidades/crear-noticia" />
        <Card icon="📄" titulo="Subir documento" descripcion="Publicar documentos en la intranet." link="/herramientas/utilidades/subir-documento" />
        <Card icon="🛠️" titulo="Mantenimiento técnico" descripcion="Diagnóstico de base de datos, revisión de estructura y tareas técnicas controladas desde el ERP. También disponible en el menú Más." link="/herramientas/mantenimiento-tecnico" />
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

  if (enConstruccion && !onClick) {
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
