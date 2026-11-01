import { useState, useEffect } from "react";
import axios from "../../api/axios";
import "../../css/ModalesHerramientasPremium.css";

const CAMPO = "block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700";

function Metrica({ titulo, valor, detalle }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-semibold text-slate-500">{titulo}</p>
    <p className="mt-1 text-xl font-bold text-slate-800">{valor ?? "—"}</p>
    {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
  </div>;
}

export default function ImportadorPostFirma() {
  const [archivo, setArchivo] = useState(null);
  const [validacion, setValidacion] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargas, setCargas] = useState([]);
  const [cargaSeleccionada, setCargaSeleccionada] = useState("");
  const [registros, setRegistros] = useState([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [columnasInforme, setColumnasInforme] = useState([]);
  const [offset, setOffset] = useState(0);
  const TAMANO_PAGINA = 100;

  const cargarCargas = async () => {
    try {
      const respuesta = await axios.get("/utilidades/importador-absis/postfirma/cargas");
      const lista = Array.isArray(respuesta.data?.items) ? respuesta.data.items : [];
      setCargas(lista);
      setCargaSeleccionada((actual) => actual || (lista[0] ? String(lista[0].id) : ""));
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo cargar el histórico Post Firma.");
    }
  };

  const cargarRegistros = async (id = cargaSeleccionada, pagina = offset) => {
    try {
      const params = { limit: TAMANO_PAGINA, offset: pagina };
      if (id) params.carga_id = Number(id);
      const respuesta = await axios.get("/utilidades/importador-absis/postfirma/registros", { params });
      setRegistros(Array.isArray(respuesta.data?.items) ? respuesta.data.items : []);
      setTotalRegistros(Number(respuesta.data?.total || 0));
      setColumnasInforme(Array.isArray(respuesta.data?.columnas) ? respuesta.data.columnas : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo cargar el detalle del histórico Post Firma.");
    }
  };

  useEffect(() => { cargarCargas(); }, []);
  useEffect(() => { cargarRegistros(cargaSeleccionada, offset); }, [cargaSeleccionada, offset]);

  const ejecutar = async (modo) => {
    setError("");
    setResultado(null);
    if (!archivo) {
      setError("Selecciona el Excel histórico Post Firma (.xlsx).");
      return;
    }
    setCargando(true);
    const formData = new FormData();
    formData.append("fichero", archivo);
    try {
      const endpoint = modo === "validar"
        ? "/utilidades/importador-absis/postfirma/validar"
        : "/utilidades/importador-absis/postfirma";
      const respuesta = await axios.post(endpoint, formData);
      if (modo === "validar") setValidacion(respuesta.data);
      else {
        setResultado(respuesta.data);
        const listaRespuesta = await axios.get("/utilidades/importador-absis/postfirma/cargas");
        const lista = Array.isArray(listaRespuesta.data?.items) ? listaRespuesta.data.items : [];
        setCargas(lista);
        setCargaSeleccionada(String(respuesta.data?.carga_id || ""));
        setOffset(0);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo procesar el Excel Post Firma.");
    } finally {
      setCargando(false);
    }
  };

  const seleccionar = (event) => {
    const elegido = event.target.files?.[0] || null;
    setArchivo(null);
    setValidacion(null);
    setResultado(null);
    setError("");
    if (!elegido) return;
    if (!elegido.name.toLowerCase().endsWith(".xlsx")) {
      setError("El fichero debe estar en formato .xlsx.");
      event.target.value = "";
      return;
    }
    setArchivo(elegido);
  };

  const columnas = columnasInforme;
  const euros = (valor) => {
    const numero = Number(valor ?? 0);
    return Number.isFinite(numero) ? numero.toLocaleString("es-ES", { style: "currency", currency: "EUR" }) : "—";
  };

  return (
    <main className="herramientas-subpagina-premium min-h-screen space-y-5 text-slate-700">
      <header className="molsan-page-header">
        <div className="molsan-page-header__identity">
          <div className="molsan-page-header__mark">📦</div>
          <div>
            <h1 className="molsan-page-header__title">Importador ABSIS · Post Firma</h1>
            <p className="molsan-page-header__description">Carga histórica pura y aislada. Los ficheros de distintos meses permanecen separados y no se aplican a expedientes ni a los gastos operativos del ERP.</p>
          </div>
        </div>
      </header>

      <section className="erp-card p-5">
        <h2 className="text-lg font-bold text-slate-800">1. Seleccionar Excel</h2>
        <p className="mt-1 text-sm text-slate-500">Se conserva el contenido original de cada fila con datos y todas las columnas detectadas, incluida TIPOCONCEPTO cuando venga en el fichero.</p>
        <div className="mt-4 max-w-3xl">
          <label htmlFor="postfirma-excel" className="mb-2 block text-sm font-semibold text-slate-700">Fichero histórico Post Firma (.xlsx)</label>
          <input id="postfirma-excel" type="file" accept=".xlsx" onChange={seleccionar} disabled={cargando} className={CAMPO} />
          {archivo && <p className="mt-2 text-xs text-slate-500">Seleccionado: {archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-slate-500">No hay filtros por fecha, estado, concepto o IDGASTO. No se deduplican filas. Cada nueva carga, incluso si el nombre o el contenido coincide con otra, queda registrada como una carga independiente.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => ejecutar("validar")} disabled={cargando || !archivo} className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">{cargando ? "Procesando…" : "Previsualizar sin guardar"}</button>
          <button type="button" onClick={() => ejecutar("importar")} disabled={cargando || !archivo} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{cargando ? "Procesando…" : "Guardar histórico completo"}</button>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><strong>Almacenamiento aislado:</strong> esta carga no crea ni actualiza gastos, pagos o expedientes y no relaciona los IDs del cliente con los identificadores internos del ERP.</div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}
      </section>

      {validacion && <section className="erp-card space-y-4 p-5">
        <div><h2 className="text-lg font-bold text-slate-800">2. Previsualización</h2><p className="mt-1 text-sm text-emerald-700">No se han guardado cambios.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metrica titulo="Filas con datos" valor={validacion.filas_con_datos} detalle={"Filas Excel: " + (validacion.filas_excel ?? "—")} />
          <Metrica titulo="Filas vacías" valor={validacion.filas_vacias} />
          <Metrica titulo="Importe total IMPGASTO" valor={euros(validacion.suma_imp_gasto)} detalle={(validacion.filas_con_importe_valido ?? 0) + " filas con importe interpretable"} />
          <Metrica titulo="Columnas detectadas" valor={validacion.columnas_detectadas?.length ?? 0} />
        </div>
        {Array.isArray(validacion.columnas_detectadas) && <div><h3 className="mb-2 font-bold text-slate-700">Columnas detectadas en el Excel</h3><p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">{validacion.columnas_detectadas.join(" · ")}</p></div>}
        {validacion.por_estado_absis && <div><h3 className="mb-2 font-bold text-slate-700">Conteo informativo por estado (sin filtrar la carga)</h3><div className="flex flex-wrap gap-2">{Object.entries(validacion.por_estado_absis).map(([estado, cantidad]) => <span key={estado} className="rounded-lg border border-slate-200 px-3 py-2 text-xs">{estado}: <strong>{cantidad}</strong></span>)}</div></div>}
      </section>}

      {resultado && <section className="erp-card space-y-4 p-5">
        <div><h2 className="text-lg font-bold text-slate-800">Carga Post Firma guardada</h2><p className="mt-1 text-sm text-slate-500">{resultado.nota}</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metrica titulo="Filas Excel" valor={resultado.filas_excel} />
          <Metrica titulo="Filas guardadas" valor={resultado.filas_guardadas} />
          <Metrica titulo="Filas vacías" valor={resultado.filas_vacias} />
          <Metrica titulo="Columnas conservadas" valor={resultado.columnas_detectadas?.length ?? 0} />
          <Metrica titulo="ID de carga" valor={resultado.carga_id} />
        </div>
        <p className="break-all text-xs text-slate-500">Huella del fichero SHA-256: {resultado.sha256}</p>
        <button type="button" onClick={() => document.getElementById("historico-postfirma")?.scrollIntoView({ behavior: "smooth" })} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Ver histórico cargado ↓</button>
      </section>}

      <section id="historico-postfirma" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold text-slate-800">Histórico Post Firma · datos originales</h2><p className="mt-1 text-sm text-slate-500">Consulta independiente por fichero. Las filas repetidas y los meses distintos se conservan por separado.</p></div>
          <button type="button" onClick={() => { cargarCargas(); cargarRegistros(cargaSeleccionada, offset); }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">↻ Actualizar</button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div><label htmlFor="postfirma-carga" className="mb-2 block text-sm font-semibold text-slate-700">Fichero / carga</label><select id="postfirma-carga" value={cargaSeleccionada} onChange={(e) => { setCargaSeleccionada(e.target.value); setOffset(0); }} className={CAMPO}><option value="">Todas las cargas</option>{cargas.map((carga) => <option key={carga.id} value={String(carga.id)}>{"#" + carga.id + " · " + carga.nombre_archivo + " · " + carga.filas_guardadas + " filas"}</option>)}</select></div>
          <p className="text-sm text-slate-500">Registros: <strong className="text-slate-800">{totalRegistros.toLocaleString("es-ES")}</strong></p>
        </div>
        <div className="overflow-auto rounded-xl border border-slate-200"><table className="min-w-max w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-600"><tr><th className="whitespace-nowrap px-3 py-3">Carga</th><th className="whitespace-nowrap px-3 py-3">Fila Excel</th>{columnas.map((columna) => <th key={columna} className="whitespace-nowrap px-3 py-3">{columna || "(columna sin título)"}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{registros.map((fila) => <tr key={fila.id} className="hover:bg-blue-50/50"><td className="whitespace-nowrap px-3 py-2">{fila.archivo + " · #" + fila.carga_id}</td><td className="whitespace-nowrap px-3 py-2">{fila.numero_fila}</td>{columnas.map((columna) => { const valor = fila.datos?.[columna]; return <td key={columna} className="max-w-xs whitespace-nowrap px-3 py-2">{valor == null || valor === "" ? "—" : typeof valor === "object" ? JSON.stringify(valor) : String(valor)}</td>; })}</tr>)}{!registros.length && <tr><td colSpan={Math.max(2, columnas.length + 2)} className="px-4 py-8 text-center text-slate-500">Todavía no hay filas importadas en el histórico Post Firma.</td></tr>}</tbody>
        </table></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Mostrando {registros.length ? offset + 1 : 0}–{Math.min(offset + registros.length, totalRegistros)} de {totalRegistros.toLocaleString("es-ES")}</p><div className="flex gap-2"><button type="button" disabled={offset <= 0} onClick={() => setOffset((v) => Math.max(0, v - TAMANO_PAGINA))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40">← Anterior</button><button type="button" disabled={offset + TAMANO_PAGINA >= totalRegistros} onClick={() => setOffset((v) => v + TAMANO_PAGINA)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40">Siguiente →</button></div></div>
      </section>
    </main>
  );
}
