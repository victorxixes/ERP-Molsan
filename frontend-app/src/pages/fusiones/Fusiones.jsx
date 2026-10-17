import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";

/**
 * ============================================================
 * FUSIONES — MOLSAN ERP
 * Panel de gestión de fusiones
 * ============================================================
 *
 * Diseño:
 * - Adaptado al estilo Premium del ERP
 * - Sin dependencias externas
 * - Responsive
 * - Preparado para conectar posteriormente con API
 * ============================================================
 */


/**
 * ============================================================
 * ICONOS
 * ============================================================
 */

const Icon = ({ type, size = 20 }) => {

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (type) {

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );

    case "warning":
      return (
        <svg {...common}>
          <path d="M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 16h.01" />
        </svg>
      );

    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8.1 8.1 0 0 0-15.5-3" />
          <path d="M4 4v5h5" />
          <path d="M4 13a8.1 8.1 0 0 0 15.5 3" />
          <path d="M20 20v-5h-5" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "merge":
      return (
        <svg {...common}>
          <path d="M7 3v5c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V3" />
          <path d="M7 21v-5c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4v5" />
          <path d="M4 3h6" />
          <path d="M14 21h6" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
};


/**
 * ============================================================
 * BADGE
 * ============================================================
 */

function Badge({ children, variant = "neutral" }) {

  const variants = {

    blue:
      "bg-blue-50 text-blue-700 border-blue-200",

    green:
      "bg-emerald-50 text-emerald-700 border-emerald-200",

    amber:
      "bg-amber-50 text-amber-700 border-amber-200",

    red:
      "bg-red-50 text-red-700 border-red-200",

    neutral:
      "bg-slate-50 text-slate-600 border-slate-200",

  };

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        min-w-[28px]
        px-2
        py-0.5
        rounded-full
        border
        text-[11px]
        font-bold
        ${variants[variant] || variants.neutral}
      `}
    >
      {children}
    </span>
  );
}


/**
 * ============================================================
 * KPI
 * ============================================================
 */

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  variant = "blue",
}) {

  const styles = {

    blue: {
      icon: "bg-blue-50 text-blue-600",
      value: "text-slate-900",
    },

    green: {
      icon: "bg-emerald-50 text-emerald-600",
      value: "text-emerald-700",
    },

    amber: {
      icon: "bg-amber-50 text-amber-600",
      value: "text-amber-700",
    },

    red: {
      icon: "bg-red-50 text-red-600",
      value: "text-red-700",
    },

  };

  const style = styles[variant] || styles.blue;

  return (
    <div
      className="
        bg-white
        border
        border-[var(--erp-border)]
        rounded-2xl
        shadow-sm
        p-5
        transition-all
        duration-200
        hover:shadow-md
      "
    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <div
            className="
              text-xs
              font-semibold
              uppercase
              tracking-wide
              text-[var(--erp-text-soft)]
            "
          >
            {title}
          </div>

          <div
            className={`
              mt-2
              text-3xl
              font-bold
              tracking-tight
              ${style.value}
            `}
          >
            {value}
          </div>

          {subtitle && (
            <div
              className="
                mt-1
                text-xs
                text-[var(--erp-text-soft)]
              "
            >
              {subtitle}
            </div>
          )}

        </div>

        <div
          className={`
            w-11
            h-11
            rounded-xl
            flex
            items-center
            justify-center
            flex-shrink-0
            ${style.icon}
          `}
        >
          <Icon type={icon} size={21} />
        </div>

      </div>

    </div>
  );
}


/**
 * ============================================================
 * DATOS INICIALES
 *
 * Posteriormente se sustituirán por API.
 * ============================================================
 */

const fusionesIniciales = [
  {
    id: 1,
    expedienteOrigen: "EXP-2026-001245",
    expedienteDestino: "EXP-2026-001876",
    tipo: "Expediente → Expediente",
    fecha: "05/10/2026",
    usuario: "Administrador",
    estado: "Pendiente",
  },
  {
    id: 2,
    expedienteOrigen: "EXP-2026-001112",
    expedienteDestino: "EXP-2026-001542",
    tipo: "Expediente → Expediente",
    fecha: "04/10/2026",
    usuario: "Administrador",
    estado: "Completada",
  },
  {
    id: 3,
    expedienteOrigen: "EXP-2026-000987",
    expedienteDestino: "EXP-2026-001321",
    tipo: "Expediente → Expediente",
    fecha: "03/10/2026",
    usuario: "Administrador",
    estado: "Completada",
  },
  {
    id: 4,
    expedienteOrigen: "EXP-2026-000765",
    expedienteDestino: "EXP-2026-001002",
    tipo: "Expediente → Expediente",
    fecha: "01/10/2026",
    usuario: "Administrador",
    estado: "Incidencia",
  },
];


/**
 * ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================
 */

export default function Fusiones() {

  const [busqueda, setBusqueda] = useState("");

  const [estado, setEstado] = useState("Todos");

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [expedienteOrigen, setExpedienteOrigen] =
    useState("");

  const [expedienteDestino, setExpedienteDestino] =
    useState("");

  const [fusiones, setFusiones] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [errorSolicitudes, setErrorSolicitudes] = useState("");

  const fusionesFiltradas = useMemo(() => {
    const texto = String(busqueda || "").trim().toLowerCase();
    const normalizarEstado = (valor) => {
      const e = String(valor || "Pendiente").trim().toLowerCase();
      if (["pendiente", "nueva", "nuevo"].includes(e)) return "Pendiente";
      if (["en curso", "en_curso", "presentada", "en tramitación", "en tramitacion"].includes(e)) return "En curso";
      if (["aceptada", "completada", "completado"].includes(e)) return "Aceptada";
      if (["desestimada", "incidencia", "rechazada"].includes(e)) return "Desestimada";
      if (["facturada", "facturadas"].includes(e)) return "Facturadas";
      return valor || "Pendiente";
    };

    return fusiones.filter((fusion) => {
      const coincideTexto = !texto || [
        fusion.id,
        fusion.expedienteOrigen,
        fusion.expedienteDestino,
        fusion.registro,
        fusion.numeroEntrada,
        fusion.tipoFactura,
        fusion.estado,
      ].some((valor) => String(valor ?? "").toLowerCase().includes(texto));
      const coincideEstado = estado === "Todos" ||
        (estado === "Facturadas"
          ? /factura/i.test(String(fusion.tipoFactura || "")) || normalizarEstado(fusion.estado) === "Facturadas"
          : normalizarEstado(fusion.estado) === estado);
      return coincideTexto && coincideEstado;
    });
  }, [fusiones, busqueda, estado]);

  useEffect(() => {
    let activo = true;
    const cargarSolicitudes = async () => {
      setCargandoSolicitudes(true);
      setErrorSolicitudes("");
      try {
        const respuesta = await axios.get("/fusiones/solicitudes");
        const items = Array.isArray(respuesta?.data?.items) ? respuesta.data.items : [];
        if (!activo) return;
        setFusiones(items.map((item) => ({
          id: item.id,
          expedienteOrigen: item.numero_expediente || "—",
          expedienteDestino: item.registro || "—",
          fecha: item.creado_en ? new Date(item.creado_en).toLocaleDateString("es-ES") : "—",
          usuario: "Solicitud desde CancelaGest",
          estado: item.estado || "Pendiente",
          tipoFactura: item.tipo_factura,
          importe: item.importe,
        })));
      } catch (error) {
        if (activo) setErrorSolicitudes(
          typeof error?.response?.data?.detail === "string"
            ? error.response.data.detail
            : "No se han podido cargar las solicitudes de fusión."
        );
      } finally {
        if (activo) setCargandoSolicitudes(false);
      }
    };
    cargarSolicitudes();
    return () => { activo = false; };
  }, []);

  const contarEstado = (valor) => fusiones.filter((f) => {
    const e = String(f.estado || "Pendiente").toLowerCase();
    if (valor === "Pendiente") return e === "pendiente" || e === "nueva";
    if (valor === "En curso") return e === "en curso" || e === "en_curso" || e === "presentada";
    if (valor === "Aceptada") return e === "aceptada" || e === "completada";
    if (valor === "Desestimada") return e === "desestimada" || e === "incidencia";
    if (valor === "Facturadas") return e === "facturada" || e === "facturadas";
    return false;
  }).length;

  const aplicarFiltroEstado = (valor) => {
    setEstado(valor);
    setBusqueda("");
  };

  const cargarDeNuevo = async () => {
    setCargandoSolicitudes(true);
    setErrorSolicitudes("");
    try {
      const respuesta = await axios.get("/fusiones/solicitudes");
      const items = Array.isArray(respuesta?.data?.items) ? respuesta.data.items : [];
      setFusiones(items.map((item) => ({
        id: item.id,
        expedienteOrigen: item.numero_expediente || "—",
        expedienteDestino: item.registro || "—",
        registro: item.registro || "",
        numeroEntrada: item.numero_entrada || "",
        fecha: item.creado_en ? new Date(item.creado_en).toLocaleDateString("es-ES") : "—",
        usuario: "Solicitud desde CancelaGest",
        estado: item.estado || "Pendiente",
        tipoFactura: item.tipo_factura,
        importe: item.importe,
      })));
    } catch (error) {
      setErrorSolicitudes(typeof error?.response?.data?.detail === "string" ? error.response.data.detail : "No se han podido cargar las solicitudes de fusión.");
    } finally {
      setCargandoSolicitudes(false);
    }
  };

  return (
    <div className="w-full bg-white px-3 py-3 text-[12px] text-slate-700">
      <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2 text-[11px] text-blue-800">
        <div>Inicio&nbsp; / &nbsp;Gestión&nbsp; / &nbsp;Fusiones</div>
        <strong className="text-blue-600 italic">Fusión</strong>
      </div>

      {errorSolicitudes && <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-red-700">{errorSolicitudes}</div>}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-sm border border-slate-300">
            <header className="bg-[#087cf0] px-3 py-2.5 text-[12px] font-medium text-white">Solicitudes de fusión</header>
            {[
              ["Pendiente", "Pendientes de revisar", "#087cf0"],
              ["En curso", "En tramitación", "#17a2b8"],
              ["Aceptada", "Aceptadas / completadas", "#28a745"],
              ["Desestimada", "Desestimadas / con incidencia", "#dc3545"],
            ].map(([valor, etiqueta, color]) => (
              <button key={valor} type="button" onClick={() => aplicarFiltroEstado(estado === valor ? "Todos" : valor)} className={`flex w-full items-center justify-between border-t border-slate-200 px-3 py-2 text-left text-[11px] hover:bg-slate-50 ${estado === valor ? "bg-blue-50 font-bold" : "bg-white"}`}>
                <span>{etiqueta}</span><span className="min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold text-white" style={{backgroundColor:color}}>{contarEstado(valor)}</span>
              </button>
            ))}
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300">
            <header className="bg-[#6c757d] px-3 py-2.5 text-[12px] font-medium text-white">Búsqueda de solicitudes</header>
            <form className="space-y-2 p-3" onSubmit={(event) => { event.preventDefault(); setEstado("Todos"); }}>
              <label className="grid grid-cols-[100px_1fr] items-center gap-2"><span className="font-semibold">ID</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="ID, expediente o registro" className="h-7 w-full max-w-[260px] rounded-sm border border-slate-300 px-2 text-[11px] outline-none focus:border-blue-500" /></label>
              <label className="grid grid-cols-[100px_1fr] items-center gap-2"><span className="font-semibold">Estado</span><select value={estado} onChange={(e) => setEstado(e.target.value)} className="h-7 w-full max-w-[260px] rounded-sm border border-slate-300 bg-white px-2 text-[11px]"><option value="Todos">Todos los estados</option><option value="Pendiente">Pendiente</option><option value="En curso">En curso</option><option value="Aceptada">Aceptada</option><option value="Desestimada">Desestimada</option><option value="Facturadas">Facturadas</option></select></label>
              <div className="border-t border-dotted border-slate-300 pt-2"><button type="submit" className="rounded-sm bg-[#087cf0] px-3 py-1.5 text-[11px] text-white hover:bg-blue-700"><Icon type="search" size={12} /> Buscar</button></div>
            </form>
          </section>
        </div>

        <div className="space-y-5">
          <section className="overflow-hidden rounded-sm border border-slate-300">
            <header className="bg-[#343a40] px-3 py-2.5 text-[12px] font-medium text-white">Búsqueda por recursos</header>
            <form className="space-y-2 p-3" onSubmit={(event) => { event.preventDefault(); setEstado("Todos"); }}>
              <label className="grid grid-cols-[120px_1fr] items-center gap-2"><span className="font-semibold">Expediente</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="N.º de expediente" className="h-7 w-full max-w-[260px] rounded-sm border border-slate-300 px-2 text-[11px] outline-none focus:border-blue-500" /></label>
              <label className="grid grid-cols-[120px_1fr] items-center gap-2"><span className="font-semibold">Registro</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Registro de la propiedad" className="h-7 w-full max-w-[260px] rounded-sm border border-slate-300 px-2 text-[11px] outline-none focus:border-blue-500" /></label>
              <label className="grid grid-cols-[120px_1fr] items-center gap-2"><span className="font-semibold">Núm. entrada</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Número de entrada" className="h-7 w-full max-w-[260px] rounded-sm border border-slate-300 px-2 text-[11px] outline-none focus:border-blue-500" /></label>
              <div className="border-t border-dotted border-slate-300 pt-2"><button type="submit" className="rounded-sm bg-[#087cf0] px-3 py-1.5 text-[11px] text-white hover:bg-blue-700"><Icon type="search" size={12} /> Buscar</button></div>
            </form>
          </section>

          <section className="overflow-hidden rounded-sm border border-slate-300">
            <header className="bg-[#17a2b8] px-3 py-2.5 text-[12px] font-medium text-white">Solicitudes recibidas</header>
            {[
              ["Todos", "Todas las solicitudes", "#17a2b8"],
              ["Pendiente", "Nuevas solicitudes", "#087cf0"],
              ["Facturadas", "Facturas / pre-facturas", "#28a745"],
            ].map(([valor, etiqueta, color]) => (
              <button key={valor} type="button" onClick={() => aplicarFiltroEstado(valor)} className="flex w-full items-center justify-between border-t border-slate-200 bg-white px-3 py-2 text-left text-[11px] hover:bg-slate-50">
                <span>{etiqueta}</span><span className="min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold text-white" style={{backgroundColor:color}}>{valor === "Todos" ? fusiones.length : valor === "Facturadas" ? fusiones.filter((f) => /factura/i.test(f.tipoFactura || "")).length : contarEstado(valor)}</span>
              </button>
            ))}
          </section>
        </div>
      </div>

      <section className="mt-5 overflow-hidden rounded-sm border border-slate-300">
        <header className="flex flex-wrap items-center justify-between gap-2 bg-[#6c757d] px-3 py-2.5 text-[12px] font-medium text-white">
          <span>Listado de solicitudes de fusión</span>
          <button type="button" onClick={cargarDeNuevo} disabled={cargandoSolicitudes} className="rounded-sm border border-white/50 px-2 py-1 text-[11px] hover:bg-white/10 disabled:opacity-50"><Icon type="refresh" size={12} /> Actualizar</button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[11px]">
            <thead className="bg-slate-100 text-slate-700"><tr>
              {["ID", "Expediente", "Registro", "Núm. entrada", "Factura", "Fecha", "Estado"].map((titulo) => <th key={titulo} className="border-b border-slate-300 px-3 py-2 font-semibold">{titulo}</th>)}
            </tr></thead>
            <tbody>
              {fusionesFiltradas.map((fusion) => <tr key={fusion.id} className="border-b border-slate-200 hover:bg-blue-50/40">
                <td className="px-3 py-2">{fusion.id}</td><td className="px-3 py-2 font-semibold">{fusion.expedienteOrigen}</td><td className="px-3 py-2">{fusion.registro || fusion.expedienteDestino || "—"}</td><td className="px-3 py-2">{fusion.numeroEntrada || "—"}</td><td className="px-3 py-2">{fusion.tipoFactura || "—"}</td><td className="px-3 py-2">{fusion.fecha}</td><td className="px-3 py-2"><Badge variant={/aceptada|completada/i.test(fusion.estado) ? "green" : /incidencia|desestimada/i.test(fusion.estado) ? "red" : "amber"}>{fusion.estado || "Pendiente"}</Badge></td>
              </tr>)}
              {!fusionesFiltradas.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">{cargandoSolicitudes ? "Cargando solicitudes…" : "No hay solicitudes que coincidan con la búsqueda."}</td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="flex justify-between border-t border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600"><span>Mostrando {fusionesFiltradas.length} de {fusiones.length} solicitudes</span><span>Molsan ERP · Fusiones</span></footer>
      </section>
    </div>
  );
}
