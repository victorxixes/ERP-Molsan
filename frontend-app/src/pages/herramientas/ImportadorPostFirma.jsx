import { useState, useEffect } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import axios from "../../api/axios";

const CAMPO = "block w-full px-3 py-2.5";

function Metrica({ titulo, valor, detalle }) {
  return <div className="molsan-stat-card p-4">
    <p>{titulo}</p>
    <p className="mt-1">{valor ?? "—"}</p>
    {detalle && <p className="mt-1">{detalle}</p>}
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
    <main className="erp-page min-h-full min-w-0 space-y-5">
      <MolsanPageHeader mark="PF" title="Importador Post Firma" description="Carga y consulta el histórico ABSIS sin aplicarlo a expedientes ni a gastos operativos." />

      <section className="erp-card p-5 md:p-6">
        <h2>1. Seleccionar Excel</h2>
        <p className="mt-1">Se conserva el contenido original de cada fila con datos y todas las columnas detectadas, incluida TIPOCONCEPTO cuando venga en el fichero.</p>
        <div className="mt-4 max-w-3xl">
          <label htmlFor="postfirma-excel" className="mb-2 block">Fichero histórico Post Firma (.xlsx)</label>
          <input id="postfirma-excel" type="file" accept=".xlsx" onChange={seleccionar} disabled={cargando} className={CAMPO} />
          {archivo && <p className="mt-2">Seleccionado: {archivo.name} · {(archivo.size / 1024 / 1024).toFixed(2)} MB</p>}
        </div>
        <p className="mt-3 max-w-3xl">No hay filtros por fecha, estado, concepto o IDGASTO. No se deduplican filas. Cada nueva carga, incluso si el nombre o el contenido coincide con otra, queda registrada como una carga independiente.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => ejecutar("validar")} disabled={cargando || !archivo} className="px-4 py-2.5">{cargando ? "Procesando…" : "Previsualizar sin guardar"}</button>
          <button type="button" onClick={() => ejecutar("importar")} disabled={cargando || !archivo} className="px-4 py-2.5">{cargando ? "Procesando…" : "Guardar histórico completo"}</button>
        </div>
        <div className="molsan-panel mt-4 p-3"><strong>Almacenamiento aislado:</strong> esta carga no crea ni actualiza gastos, pagos o expedientes y no relaciona los IDs del cliente con los identificadores internos del ERP.</div>
        {error && <div role="alert" className="mt-4 p-4">{error}</div>}
      </section>

      {validacion && <section className="erp-card space-y-4 p-5 md:p-6">
        <div><h2>2. Previsualización</h2><p className="mt-1">No se han guardado cambios.</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metrica titulo="Filas con datos" valor={validacion.filas_con_datos} detalle={"Filas Excel: " + (validacion.filas_excel ?? "—")} />
          <Metrica titulo="Filas vacías" valor={validacion.filas_vacias} />
          <Metrica titulo="Importe total IMPGASTO" valor={euros(validacion.suma_imp_gasto)} detalle={(validacion.filas_con_importe_valido ?? 0) + " filas con importe interpretable"} />
          <Metrica titulo="Columnas detectadas" valor={validacion.columnas_detectadas?.length ?? 0} />
        </div>
        {Array.isArray(validacion.columnas_detectadas) && <div><h3 className="mb-2">Columnas detectadas en el Excel</h3><p className="p-3">{validacion.columnas_detectadas.join(" · ")}</p></div>}
        {validacion.por_estado_absis && <div><h3 className="mb-2">Conteo informativo por estado (sin filtrar la carga)</h3><div className="flex flex-wrap gap-2">{Object.entries(validacion.por_estado_absis).map(([estado, cantidad]) => <span key={estado} className="px-3 py-2">{estado}: <strong>{cantidad}</strong></span>)}</div></div>}
      </section>}

      {resultado && <section className="space-y-4 p-5 md:p-6">
        <div><h2>Carga Post Firma guardada</h2><p className="mt-1">{resultado.nota}</p></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metrica titulo="Filas Excel" valor={resultado.filas_excel} />
          <Metrica titulo="Filas guardadas" valor={resultado.filas_guardadas} />
          <Metrica titulo="Filas vacías" valor={resultado.filas_vacias} />
          <Metrica titulo="Columnas conservadas" valor={resultado.columnas_detectadas?.length ?? 0} />
          <Metrica titulo="ID de carga" valor={resultado.carga_id} />
        </div>
        <p className="break-all">Huella del fichero SHA-256: {resultado.sha256}</p>
        <button type="button" onClick={() => document.getElementById("historico-postfirma")?.scrollIntoView({ behavior: "smooth" })} className="px-4 py-2.5">Ver histórico cargado ↓</button>
      </section>}

      <section id="historico-postfirma" className="erp-card space-y-4 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2>Histórico Post Firma · datos originales</h2><p className="mt-1">Consulta independiente por fichero. Las filas repetidas y los meses distintos se conservan por separado.</p></div>
          <button type="button" onClick={() => { cargarCargas(); cargarRegistros(cargaSeleccionada, offset); }} className="px-3 py-2">↻ Actualizar</button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div><label htmlFor="postfirma-carga" className="mb-2 block">Fichero / carga</label><select id="postfirma-carga" value={cargaSeleccionada} onChange={(e) => { setCargaSeleccionada(e.target.value); setOffset(0); }} className={CAMPO}><option value="">Todas las cargas</option>{cargas.map((carga) => <option key={carga.id} value={String(carga.id)}>{"#" + carga.id + " · " + carga.nombre_archivo + " · " + carga.filas_guardadas + " filas"}</option>)}</select></div>
          <p>Registros: <strong>{totalRegistros.toLocaleString("es-ES")}</strong></p>
        </div>
        <div className="overflow-auto"><table className="min-w-max w-full">
          <thead className="sticky top-0 z-10"><tr><th className="whitespace-nowrap px-3 py-3">Carga</th><th className="whitespace-nowrap px-3 py-3">Fila Excel</th>{columnas.map((columna) => <th key={columna} className="whitespace-nowrap px-3 py-3">{columna || "(columna sin título)"}</th>)}</tr></thead>
          <tbody>{registros.map((fila) => <tr key={fila.id}><td className="whitespace-nowrap px-3 py-2">{fila.archivo + " · #" + fila.carga_id}</td><td className="whitespace-nowrap px-3 py-2">{fila.numero_fila}</td>{columnas.map((columna) => { const valor = fila.datos?.[columna]; return <td key={columna} className="max-w-xs whitespace-nowrap px-3 py-2">{valor == null || valor === "" ? "—" : typeof valor === "object" ? JSON.stringify(valor) : String(valor)}</td>; })}</tr>)}{!registros.length && <tr><td colSpan={Math.max(2, columnas.length + 2)} className="px-4 py-8">Todavía no hay filas importadas en el histórico Post Firma.</td></tr>}</tbody>
        </table></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><p>Mostrando {registros.length ? offset + 1 : 0}–{Math.min(offset + registros.length, totalRegistros)} de {totalRegistros.toLocaleString("es-ES")}</p><div className="flex gap-2"><button type="button" disabled={offset <= 0} onClick={() => setOffset((v) => Math.max(0, v - TAMANO_PAGINA))} className="px-3 py-2">← Anterior</button><button type="button" disabled={offset + TAMANO_PAGINA >= totalRegistros} onClick={() => setOffset((v) => v + TAMANO_PAGINA)} className="px-3 py-2">Siguiente →</button></div></div>
      </section>
    </main>
  );
}
