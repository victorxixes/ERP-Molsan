import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "../../api/axios";
import "../../css/ModalesHerramientasPremium.css";
import "../../css/CatalogosMaestrosPremium.css";

export default function AsignarExpedientesPromociones() {
  const [numero, setNumero] = useState("");
  const [tipos, setTipos] = useState([]);
  const [tipoId, setTipoId] = useState("");
  const [expediente, setExpediente] = useState(null);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [consultando, setConsultando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let activo = true;
    axios.get("/utilidades/tipos-promocion")
      .then(({ data }) => { if (activo) setTipos(Array.isArray(data) ? data : []); })
      .catch((err) => { if (activo) setError(err.response?.data?.detail || "No se pudo cargar el catálogo Tipos de expediente."); })
      .finally(() => { if (activo) setCargandoTipos(false); });
    return () => { activo = false; };
  }, []);

  async function consultar(event) {
    event?.preventDefault();
    setError("");
    setMensaje("");
    setExpediente(null);
    setTipoId("");
    const valor = numero.trim();
    if (!valor) {
      setError("Introduce el número de expediente.");
      return;
    }
    setConsultando(true);
    try {
      const { data } = await axios.get("/utilidades/expediente-promocion", { params: { numero_expediente: valor } });
      setExpediente(data);
      setTipoId(data.promocion_tipo_expediente_id != null ? String(data.promocion_tipo_expediente_id) : "");
    } catch (err) {
      setError(err.response?.data?.detail || "No se ha podido consultar el expediente.");
    } finally {
      setConsultando(false);
    }
  }

  async function guardar(event) {
    event.preventDefault();
    setError("");
    setMensaje("");
    if (!expediente) {
      setError("Consulta primero el expediente.");
      return;
    }
    setGuardando(true);
    try {
      const { data } = await axios.post("/utilidades/asignar-promocion", {
        numero_expediente: expediente.numero_expediente,
        tipo_expediente_id: tipoId ? Number(tipoId) : null,
      });
      setExpediente((actual) => actual ? {
        ...actual,
        promocion_tipo_expediente_id: data.promocion_tipo_expediente_id,
        promocion: data.promocion,
      } : actual);
      setTipoId(data.promocion_tipo_expediente_id != null ? String(data.promocion_tipo_expediente_id) : "");
      setMensaje(data.mensaje || "Asignación guardada correctamente.");
    } catch (err) {
      setError(err.response?.data?.detail || "No se ha podido guardar la asignación.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="herramientas-subpagina-premium min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="molsan-page-header relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">🏷️</div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Asignar expedientes a promociones</h1>
            <p className="mt-1 text-sm text-slate-500">Asocia cada expediente a un tipo activo del catálogo oficial. La ficha mostrará la promoción asignada automáticamente.</p>
          </div>
          <Link to="/herramientas/utilidades" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Volver a Utilidades</Link>
        </div>
      </header>

      {(error || mensaje) && (
        <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || mensaje}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <form onSubmit={consultar} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">1. Buscar expediente</h2>
          <p className="mt-1 text-sm text-slate-500">Introduce el número tal como aparece en la ficha del expediente.</p>
          <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="numero-expediente-promocion">Número de expediente</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input id="numero-expediente-promocion" value={numero} onChange={(event) => { setNumero(event.target.value); setExpediente(null); setTipoId(""); setMensaje(""); setError(""); }} placeholder="Ej. ALTA-24-00001" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <button type="submit" disabled={consultando} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{consultando ? "Buscando…" : "Consultar"}</button>
          </div>
          {expediente && (
            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Expediente encontrado</p>
              <p className="mt-1 font-bold text-slate-800">{expediente.numero_expediente}</p>
              <p className="mt-2 text-sm text-slate-600">Titular: <span className="font-semibold">{expediente.titular || "Sin titular indicado"}</span></p>
              <p className="mt-1 text-sm text-slate-600">Actividad actual: <span className="font-semibold">{expediente.actividad_actual || "Sin actividad indicada"}</span></p>
              <p className="mt-1 text-sm text-slate-600">Promoción actual: <span className="font-semibold">{expediente.promocion || "Sin asignar"}</span></p>
            </div>
          )}
        </form>

        <form onSubmit={guardar} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">2. Seleccionar tipo de expediente</h2>
          <p className="mt-1 text-sm text-slate-500">La promoción se toma directamente del catálogo Tipos de expediente; no se escribe manualmente en la ficha.</p>
          <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="tipo-promocion-destino">Tipo de expediente / promoción</label>
          <select id="tipo-promocion-destino" value={tipoId} onChange={(event) => { setTipoId(event.target.value); setMensaje(""); }} disabled={cargandoTipos || !expediente} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50">
            <option value="">Sin asignar promoción</option>
            {tipos.map((tipo) => <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>)}
          </select>
          {cargandoTipos && <p className="mt-2 text-xs text-slate-500">Cargando catálogo…</p>}
          {!cargandoTipos && tipos.length === 0 && <p className="mt-2 text-xs text-amber-700">El catálogo no tiene tipos activos disponibles.</p>}
          <button type="submit" disabled={guardando || !expediente || cargandoTipos} className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
            {guardando ? "Guardando asignación…" : "Guardar asignación"}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">Puedes elegir «Sin asignar promoción» para retirar la asignación actual. El cambio se refleja en la ficha y en el filtro de expedientes.</p>
        </form>
      </section>
    </div>
  );
}
