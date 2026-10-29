import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../css/HerramientasPremium.css";

const DOCUMENTOS_INICIALES = [
  { id: "solicitud", nombre: "Hoja de solicitud", detalle: "Debe estar incorporada en la carpeta digital del resumen del expediente." },
  { id: "justificante", nombre: "Justificante de cancelación", detalle: "Nombre vigente del documento; sustituye la denominación genérica «certificado de cancelación»." },
  { id: "nota_simple", nombre: "Nota simple", detalle: "Debe estar incorporada en la carpeta digital del resumen del expediente." },
];

export default function ReglasActividadesExpediente() {
  const [documentos, setDocumentos] = useState(
    Object.fromEntries(DOCUMENTOS_INICIALES.map((d) => [d.id, true]))
  );
  const [validarFechaEnvio, setValidarFechaEnvio] = useState(true);
  const [avisoFacturacion, setAvisoFacturacion] = useState(true);
  const [exigirNotario, setExigirNotario] = useState(true);
  const [exigirTipoDocumento, setExigirTipoDocumento] = useState(true);
  const [mensaje, setMensaje] = useState("");

  const documentosActivos = useMemo(
    () => DOCUMENTOS_INICIALES.filter((d) => documentos[d.id]).length,
    [documentos]
  );

  const guardarVista = () => {
    setMensaje("Vista previa actualizada. El guardado persistente y la aplicación automática en expedientes requieren completar el backend.");
  };

  return (
    <main className="utilidades-premium-page min-h-full space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl">⚙️</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Configuración del expediente</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Reglas de actividades expediente</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Define los documentos, campos y validaciones que deben cumplirse en cada fase del expediente. Esta primera regla cubre Documentación previa y el envío a notaría.</p>
            </div>
          </div>
          <Link to="/herramientas/utilidades" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Volver a Utilidades</Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Resumen icono="📂" titulo="Actividad inicial" valor="Documentación previa" />
        <Resumen icono="📄" titulo="Documentos requeridos" valor={`${documentosActivos} de ${DOCUMENTOS_INICIALES.length}`} />
        <Resumen icono="📨" titulo="Siguiente paso" valor="Envío a notario" />
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Regla 01</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">Documentación previa → Envío a notario</h2>
            <p className="mt-1 text-sm text-slate-500">Los tres documentos deben existir en la carpeta digital del resumen del expediente para dar por preparada la documentación.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Borrador de configuración</span>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">1. Documentos necesarios</h3>
              <p className="mt-1 text-sm text-slate-500">Selecciona los documentos que deben estar presentes antes del envío.</p>
            </div>
            <div className="space-y-3">
              {DOCUMENTOS_INICIALES.map((doc) => (
                <label key={doc.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30">
                  <input type="checkbox" checked={Boolean(documentos[doc.id])} onChange={(e) => { setDocumentos((actual) => ({ ...actual, [doc.id]: e.target.checked })); setMensaje(""); }} className="mt-1 h-4 w-4 accent-indigo-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{doc.nombre}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">{doc.detalle}</span>
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${documentos[doc.id] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{documentos[doc.id] ? "Requerido" : "Opcional"}</span>
                </label>
              ))}
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-5 text-blue-900">
              <strong>Condición de avance</strong>
              <p className="mt-1">El envío a notaría queda preparado cuando están los documentos marcados como requeridos. La comprobación automática de la carpeta digital deberá conectarse a la lógica real del expediente.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">2. Validaciones del envío a notario</h3>
              <p className="mt-1 text-sm text-slate-500">Condiciones que deben comprobarse al preparar el envío.</p>
            </div>

            <Opcion
              checked={validarFechaEnvio}
              onChange={(v) => { setValidarFechaEnvio(v); setMensaje(""); }}
              titulo="Validar fecha de envío frente al protocolo"
              descripcion="Si la escritura ya está firmada, la fecha de envío no puede ser posterior a la fecha del protocolo. Si todavía no está firmada, se permite introducir la fecha de envío."
            />
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">Datos de facturación</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">No bloqueantes</span>
                <span className="text-xs text-slate-500">Pendientes de cumplimentar</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-500">No serán obligatorios para permitir el envío, pero el sistema debe advertir si faltan datos de facturación para que se completen.</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={avisoFacturacion} onChange={(e) => { setAvisoFacturacion(e.target.checked); setMensaje(""); }} className="h-4 w-4 accent-indigo-600" />
                Mostrar aviso si faltan datos de facturación
              </label>
            </div>
            <Opcion
              checked={exigirNotario}
              onChange={(v) => { setExigirNotario(v); setMensaje(""); }}
              titulo="Exigir notario informado"
              descripcion="No permitir completar el envío si no se ha indicado el notario."
            />
            <Opcion
              checked={exigirTipoDocumento}
              onChange={(v) => { setExigirTipoDocumento(v); setMensaje(""); }}
              titulo="Exigir tipo de documento"
              descripcion="No permitir completar el envío si falta el tipo de documento."
            />
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">3. Integración con ICAM I / ABSIS</p>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">La API debe enviar los campos y los repositorios digitales de la ventana modal «Datos de actividad». Esta integración queda identificada como trabajo técnico pendiente; todavía no se realiza ningún envío externo desde esta pantalla.</p>
            </div>
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Pendiente de desarrollo API</span>
          </div>
        </div>
      </section>

      {mensaje && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">{mensaje}</div>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-slate-500">Esta vista permite revisar la estructura de la regla. Los cambios son temporales en esta versión y no se guardan en la base de datos ni modifican expedientes.</p>
        <button type="button" onClick={guardarVista} className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700">Revisar configuración</button>
      </div>
    </main>
  );
}

function Resumen({ icono, titulo, valor }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-xl">{icono}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{titulo}</p>
          <p className="mt-1 text-base font-bold text-slate-800">{valor}</p>
        </div>
      </div>
    </div>
  );
}

function Opcion({ checked, onChange, titulo, descripcion }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" />
      <span>
        <span className="block text-sm font-semibold text-slate-800">{titulo}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-500">{descripcion}</span>
      </span>
    </label>
  );
}
