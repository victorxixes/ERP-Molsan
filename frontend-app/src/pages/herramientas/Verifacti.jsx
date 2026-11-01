import MolsanIcon from "../../components/ui/MolsanIcon";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import "../../css/ComponentesOperativosPremium.css";

const SECCIONES = [
  { id: "resumen", label: "Resumen", icon: "◫" },
  { id: "facturas", label: "Consultar facturas", icon: "⌕" },
  { id: "crear", label: "Nueva factura", icon: "+" },
  { id: "operaciones", label: "Subsanar / anular", icon: "↻" },
  { id: "xml", label: "XML y exportaciones", icon: "⇩" },
  { id: "api", label: "API y documentación", icon: "⌘" },
];

const ENDPOINTS = [
  ["GET", "/verifactu/health", "Comprobar estado de la API key"],
  ["GET", "/verifactu/status", "Consultar el estado de un registro"],
  ["POST", "/verifactu/status", "Consultar el estado de una factura"],
  ["POST", "/verifactu/create", "Crear un registro de factura"],
  ["POST", "/verifactu/create_bulk", "Crear hasta 50 registros en lote"],
  ["PUT", "/verifactu/modify", "Subsanar un registro de facturación"],
  ["POST", "/verifactu/cancel", "Anular un registro de facturación"],
  ["POST", "/verifactu/list", "Listar facturas presentadas"],
  ["POST", "/verifactu/export", "Exportar XML por ejercicio y periodo"],
  ["POST", "/verifactu/downloadXML", "Consultar XML de una factura"],
  ["GET", "/verifactu/declaracion", "Obtener declaración responsable"],
];

function Campo({ label, value, onChange, placeholder = "", type = "text", required = false, help }) {
  return (
    <label className="verifacti-premium block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}{required && <span className="text-rose-500"> *</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
      {help && <span className="mt-1 block text-xs text-slate-400">{help}</span>}
    </label>
  );
}

function Panel({ title, description, children, action }) {
  return (
    <section className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/90 shadow-[0_12px_35px_rgba(15,23,42,0.055)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div><h2 className="font-bold text-slate-800">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Metric({ icon, label, value, hint }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><MolsanIcon name={icon} size={36} /></div>
    <div className="mt-3 text-xl font-bold text-slate-800">{value}</div><p className="mt-1 text-xs text-slate-400">{hint}</p>
  </div>;
}

function EstadoPendiente({ children = "Pendiente de conectar el backend" }) {
  return <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{children}</span>;
}

export default function Verifacti() {
  const [seccion, setSeccion] = useState("resumen");
  const [aviso, setAviso] = useState("");
  const [consulta, setConsulta] = useState({ ejercicio: String(new Date().getFullYear()), periodo: String(new Date().getMonth() + 1).padStart(2, "0"), serie: "", numero: "", fecha: "" });
  const [nueva, setNueva] = useState({ serie: "MOLSAN", numero: "", fecha: new Date().toISOString().slice(0, 10), tipo: "F1", descripcion: "", total: "", nif: "", nombre: "" });
  const [operacion, setOperacion] = useState({ serie: "", numero: "", fecha: "", rechazo: false });
  const [xml, setXml] = useState({ ejercicio: String(new Date().getFullYear()), periodo: String(new Date().getMonth() + 1).padStart(2, "0"), serie: "", numero: "" });
  const [preview, setPreview] = useState(null);

  const payloadConsulta = useMemo(() => ({
    ejercicio: consulta.ejercicio,
    periodo: consulta.periodo,
    ...(consulta.serie ? { serie: consulta.serie } : {}),
    ...(consulta.numero ? { numero: consulta.numero } : {}),
    ...(consulta.fecha ? { fecha_expedicion: consulta.fecha } : {}),
  }), [consulta]);

  function preparar(tipo, payload) {
    setPreview({ tipo, payload });
    setAviso("Vista previa preparada. No se ha enviado ninguna petición a Verifacti.");
  }

  function cambiarSeccion(id) {
    setSeccion(id);
    setAviso("");
    setPreview(null);
  }

  return (
    <div className="molsan-page-stack herramientas-subpagina-premium min-h-full animate-fadeIn">
      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark" aria-hidden="true"><MolsanIcon name="receipt" size={20} /></div>
          <div className="min-w-0">
            <div className="molsan-page-header__eyebrow flex flex-wrap items-center gap-2">MOLSAN ERP · INTEGRACIONES <EstadoPendiente /></div>
            <h1 className="molsan-page-header__title">Verifacti</h1>
            <p className="molsan-page-header__description">Panel de control de facturación electrónica y registros VERI*FACTU.</p>
          </div>
        </div>
        <div className="molsan-page-header__actions">
          <a href="https://www.verifacti.com/docs" target="_blank" rel="noreferrer" className="molsan-btn molsan-btn--primary">Documentación oficial <span>↗</span></a>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[245px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[22px] border border-slate-200/80 bg-white/90 p-3 shadow-sm">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Panel de control</p>
          <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-1">
            {SECCIONES.map((item) => <button key={item.id} type="button" onClick={() => cambiarSeccion(item.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${seccion === item.id ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 text-lg">{item.icon}</span><span>{item.label}</span>
            </button>)}
          </nav>
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
            <p className="text-xs font-bold text-amber-900">Modo de preparación</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">Los formularios permiten preparar y revisar los datos. Para consultar o enviar datos reales hace falta conectar el backend y configurar la API key de forma segura.</p>
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          {seccion === "resumen" && <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <Metric icon="plug" label="Conexión API" value="Sin conectar" hint="La clave API aún no está configurada" />
              <Metric icon="file" label="Facturas consultadas" value="—" hint="Disponible al activar la conexión" />
              <Metric icon="☑️" label="Registros aceptados" value="—" hint="Pendiente de consulta a Verifacti" />
              <Metric icon="⚠️" label="Incidencias" value="—" hint="Sin datos reales todavía" />
            </div>
            <Panel title="Centro de control" description="Accesos a las operaciones contempladas en la API oficial de Verifacti.">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  ["⌕", "Consultar facturas", "Buscar por ejercicio, periodo, serie o número.", "facturas"],
                  ["＋", "Registrar factura", "Preparar los campos de una nueva factura.", "crear"],
                  ["↻", "Subsanaciones y anulaciones", "Preparar una operación sobre un registro existente.", "operaciones"],
                  ["download", "XML y exportaciones", "Consultar XML de una factura o preparar una exportación.", "xml"],
                ].map(([icon, title, desc, id]) => <button key={id} onClick={() => cambiarSeccion(id)} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40">
                  <MolsanIcon name={icon} size={40} /><span><strong className="block text-sm text-slate-800">{title}</strong><span className="mt-1 block text-sm leading-5 text-slate-500">{desc}</span></span><span className="ml-auto text-slate-300">→</span>
                </button>)}
              </div>
            </Panel>
            <Panel title="Estado de la integración" description="Resumen de lo que falta para activar el servicio en MOLSAN ERP.">
              <div className="space-y-3">
                {[
                  ["01", "Crear configuración segura de credenciales", "Guardar la API key en el backend, nunca en el navegador."],
                  ["02", "Implementar conexión desde el backend", "Consultar GET /verifactu/health y tratar respuestas y errores."],
                  ["03", "Conectar las consultas y operaciones", "Listar facturas, revisar estados y consultar XML."],
                  ["04", "Validar en entorno de pruebas", "Comprobar los flujos antes de habilitar envíos reales."],
                ].map(([n, title, desc]) => <div key={n} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{n}</span><div><p className="text-sm font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-sm text-slate-500">{desc}</p></div><span className="ml-auto mt-1 text-xs text-amber-600">Pendiente</span></div>)}
              </div>
            </Panel>
          </>}

          {seccion === "facturas" && <Panel title="Consulta de facturas" description="La API permite listar facturas presentadas y filtrar por ejercicio, periodo y datos de factura.">
            <form onSubmit={(e) => { e.preventDefault(); preparar("POST /verifactu/list", payloadConsulta); }} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="Ejercicio" value={consulta.ejercicio} onChange={(v) => setConsulta({ ...consulta, ejercicio: v })} required />
              <Campo label="Periodo (01–12)" value={consulta.periodo} onChange={(v) => setConsulta({ ...consulta, periodo: v })} required />
              <Campo label="Serie" value={consulta.serie} onChange={(v) => setConsulta({ ...consulta, serie: v })} placeholder="Opcional" />
              <Campo label="Número de factura" value={consulta.numero} onChange={(v) => setConsulta({ ...consulta, numero: v })} placeholder="Opcional" />
              <Campo label="Fecha expedición" value={consulta.fecha} onChange={(v) => setConsulta({ ...consulta, fecha: v })} placeholder="DD-MM-AAAA" help="Opcional, según formato de la API" />
              <div className="flex items-end"><button className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700" type="submit">Preparar consulta</button></div>
            </form>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Nota: si se indica serie o número, la API aplica requisitos de combinación entre ambos campos. El botón solo prepara la petición; todavía no consulta a Verifacti.</p>
          </Panel>}

          {seccion === "crear" && <Panel title="Preparar una nueva factura" description="Formulario inicial basado en los campos principales del endpoint POST /verifactu/create.">
            <form onSubmit={(e) => { e.preventDefault(); preparar("POST /verifactu/create", { serie: nueva.serie, numero: nueva.numero, fecha_expedicion: nueva.fecha, tipo_factura: nueva.tipo, descripcion: nueva.descripcion, importe_total: nueva.total, ...(nueva.nif ? { nif: nueva.nif } : {}), ...(nueva.nombre ? { nombre: nueva.nombre } : {}) }); }} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="Serie" value={nueva.serie} onChange={(v) => setNueva({ ...nueva, serie: v })} />
              <Campo label="Número" value={nueva.numero} onChange={(v) => setNueva({ ...nueva, numero: v })} required />
              <Campo label="Fecha expedición" type="date" value={nueva.fecha} onChange={(v) => setNueva({ ...nueva, fecha: v })} required help="Verifacti indica que debe ser la fecha actual al crear." />
              <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de factura *</span><select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm"><option value="F1">F1 · Factura</option><option value="F2">F2 · Simplificada</option><option value="R1">R1 · Rectificativa</option><option value="R2">R2 · Rectificativa</option><option value="R3">R3 · Rectificativa</option><option value="R4">R4 · Rectificativa</option><option value="R5">R5 · Rectificativa</option></select></label>
              <Campo label="Descripción" value={nueva.descripcion} onChange={(v) => setNueva({ ...nueva, descripcion: v })} required placeholder="Descripción de la operación" />
              <Campo label="Importe total (€)" value={nueva.total} onChange={(v) => setNueva({ ...nueva, total: v })} required placeholder="0.00" />
              <Campo label="NIF cliente" value={nueva.nif} onChange={(v) => setNueva({ ...nueva, nif: v })} placeholder="Opcional" />
              <Campo label="Nombre / razón social" value={nueva.nombre} onChange={(v) => setNueva({ ...nueva, nombre: v })} placeholder="Opcional" />
              <div className="flex items-end"><button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Revisar datos</button></div>
            </form>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Importante: este formulario es una maqueta de preparación, no emite facturas ni las comunica con la AEAT. Antes de activar el envío habrá que completar y validar las líneas, impuestos, destinatario y demás campos exigidos por el esquema de Verifacti.</div>
          </Panel>}

          {seccion === "operaciones" && <Panel title="Subsanar o anular un registro" description="Prepara los datos de identificación del registro. Estas operaciones solo se habilitarán tras conectar y validar el backend.">
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-800">Subsanar factura</h3><p className="mt-1 text-sm text-slate-500">PUT /verifactu/modify · Para corregir un registro cuando corresponda subsanación.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold text-slate-800">Anular factura</h3><p className="mt-1 text-sm text-slate-500">POST /verifactu/cancel · Para comunicar la anulación de un registro existente.</p></div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); preparar("Datos comunes para subsanación/anulación", { serie: operacion.serie, numero: operacion.numero, fecha_expedicion: operacion.fecha, rechazo_previo: operacion.rechazo ? "S" : "N" }); }} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="Serie" value={operacion.serie} onChange={(v) => setOperacion({ ...operacion, serie: v })} />
              <Campo label="Número de factura" value={operacion.numero} onChange={(v) => setOperacion({ ...operacion, numero: v })} required />
              <Campo label="Fecha expedición" value={operacion.fecha} onChange={(v) => setOperacion({ ...operacion, fecha: v })} required placeholder="DD-MM-AAAA" />
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-700"><input type="checkbox" checked={operacion.rechazo} onChange={(e) => setOperacion({ ...operacion, rechazo: e.target.checked })} className="h-4 w-4 accent-blue-600" /> El registro fue rechazado previamente</label>
              <div className="flex items-center"><button type="submit" className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Preparar datos</button></div>
            </form>
            <p className="mt-4 text-xs leading-5 text-slate-500">La selección de la operación final y la validación legal de sus campos se realizarán antes de permitir cualquier envío real.</p>
          </Panel>}

          {seccion === "xml" && <Panel title="XML y exportaciones" description="La API permite exportar XML por ejercicio/periodo y recuperar los XML de una factura por serie y número.">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <form onSubmit={(e) => { e.preventDefault(); preparar("POST /verifactu/export", { ejercicio: xml.ejercicio, periodo: xml.periodo }); }} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">Exportar XML por periodo</h3>
                <div className="grid grid-cols-2 gap-3"><Campo label="Ejercicio" value={xml.ejercicio} onChange={(v) => setXml({ ...xml, ejercicio: v })} required /><Campo label="Periodo" value={xml.periodo} onChange={(v) => setXml({ ...xml, periodo: v })} required /></div>
                <p className="text-xs leading-5 text-slate-500">Las URL de descarga que devuelve Verifacti tienen caducidad limitada; se deberá gestionar la paginación si hay muchos ficheros.</p>
                <button className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100" type="submit">Preparar exportación</button>
              </form>
              <form onSubmit={(e) => { e.preventDefault(); preparar("POST /verifactu/downloadXML", { serie: xml.serie, numero: xml.numero }); }} className="space-y-4 rounded-2xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800">XML de una factura</h3>
                <Campo label="Serie" value={xml.serie} onChange={(v) => setXml({ ...xml, serie: v })} />
                <Campo label="Número de factura" value={xml.numero} onChange={(v) => setXml({ ...xml, numero: v })} required />
                <p className="text-xs leading-5 text-slate-500">La respuesta puede contener varios registros XML asociados a una misma serie y número.</p>
                <button className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100" type="submit">Preparar consulta XML</button>
              </form>
            </div>
          </Panel>}

          {seccion === "api" && <Panel title="API de Verifacti" description="Listado de endpoints identificados en la documentación oficial.">
            <div className="mb-4 flex flex-wrap items-center gap-2"><span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">Base URL</span><code className="break-all rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-cyan-200">https://api.verifacti.com</code></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Método</th><th className="px-3 py-3">Endpoint</th><th className="px-3 py-3">Uso</th></tr></thead><tbody>{ENDPOINTS.map(([method, endpoint, desc]) => <tr key={endpoint} className="border-b border-slate-100 last:border-0"><td className="px-3 py-3"><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${method === "GET" ? "bg-emerald-50 text-emerald-700" : method === "POST" ? "bg-blue-50 text-blue-700" : method === "PUT" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-700"}`}>{method}</span></td><td className="px-3 py-3 font-mono text-xs text-slate-700">{endpoint}</td><td className="px-3 py-3 text-slate-500">{desc}</td></tr>)}</tbody></table></div>
            <div className="mt-5 flex flex-wrap gap-3"><a href="https://www.verifacti.com/docs" target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Abrir documentación completa ↗</a><a href="https://www.verifacti.com/" target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Web de Verifacti ↗</a></div>
          </Panel>}

          {aviso && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{aviso}</div>}
          {preview && <Panel title="Vista previa de la petición" description={preview.tipo}>
            <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-emerald-200">{JSON.stringify(preview.payload, null, 2)}</pre>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">Vista previa local · no se ha enviado ningún dato externo.</span><button type="button" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(preview.payload, null, 2)); setAviso("JSON copiado si el navegador permite el acceso al portapapeles. No se ha enviado a Verifacti."); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Copiar JSON</button></div>
          </Panel>}
        </main>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-400">
        <span>Verifacti · Panel de control MOLSAN ERP</span><Link to="/herramientas/utilidades" className="font-semibold text-blue-600 hover:text-blue-700">← Volver a Utilidades</Link>
      </footer>
    </div>
  );
}
