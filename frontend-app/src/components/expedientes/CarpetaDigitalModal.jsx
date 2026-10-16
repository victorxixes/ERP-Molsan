import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";

// Se conservan las categorías del repositorio actual para no romper
// los documentos ya almacenados.
const BLOQUES = [
  {
    id: "documentacion-previa",
    titulo: "Documentación previa",
    descripcion: "Documentación del banco y requisitos anteriores a la firma.",
    categorias: [
      { etiqueta: "Documentos ABSIS", categoria: "Documentos Absis" },
      { etiqueta: "Hoja de encargo firmada", categoria: "Hoja de Encargo firmada" },
      { etiqueta: "Justificante de cancelación", categoria: "Justificante de cancelación" },
      { etiqueta: "Nota simple registral", categoria: "Nota simple registral" },
      { etiqueta: "Borradores de escritura", categoria: "Escrituras/borradores" },
    ],
  },
  {
    id: "sede-notarial",
    titulo: "Sede notarial",
    descripcion: "Documentos preparados, firmados o recibidos en la fase notarial.",
    categorias: [
      { etiqueta: "Presentación Registro", categoria: "Presentación Registro" },
      { etiqueta: "Copia simple", categoria: "Copia simple" },
    ],
  },
  {
    id: "liquidacion-impuestos",
    titulo: "Liquidación de impuestos",
    descripcion: "Justificantes y documentación de la liquidación tributaria.",
    categorias: [
      { etiqueta: "AJD / ITP", categoria: "AJD/ITP" },
      { etiqueta: "Otros impuestos", categoria: "Otros impuestos" },
    ],
  },
  {
    id: "tramitacion-inscripcion",
    titulo: "Tramitación inscripción",
    descripcion: "Documentación que acredita la inscripción registral.",
    categorias: [{ etiqueta: "Hoja de inscripción", categoria: "Hoja de Inscripción" }],
  },
  {
    id: "defectos-registrales",
    titulo: "Defectos registrales",
    descripcion: "Calificación registral y documentos de subsanación.",
    categorias: [
      { etiqueta: "Defecto registral", categoria: "Defecto registral" },
      { etiqueta: "Subsanación del defecto", categoria: "Subsanación del defecto" },
    ],
  },
  {
    id: "facturacion-cierre",
    titulo: "Facturación y cierre",
    descripcion: "Escritura final, facturas y justificantes para completar y cerrar el expediente.",
    categorias: [
      { etiqueta: "Escritura digital final", categoria: "Escritura digital final" },
      { etiqueta: "Documento de inscripción (archivo anterior)", categoria: "Documento de inscripción" },
      { etiqueta: "Expediente digital completo (archivo anterior)", categoria: "Expediente digital completo" },
      { etiqueta: "Factura notarial", categoria: "Factura notarial" },
      { etiqueta: "Factura registral", categoria: "Factura Registral" },
      { etiqueta: "Factura impuestos (categoría anterior)", categoria: "Factura impuestos" },
      { etiqueta: "Honorarios de gestoría", categoria: "Honorarios gestoría" },
      { etiqueta: "Otros pagos", categoria: "Otros pagos" },
      { etiqueta: "Otros documentos económicos (categoría anterior)", categoria: "Otros documentos económicos" },
    ],
  },
];

const CATEGORIAS_OTROS = [
  { etiqueta: "Otra documentación", categoria: "Otra documentación" },
  { etiqueta: "Emails de oficina", categoria: "Mails de la Oficina" },
];

const BASE = (id) => "/expedientes/" + encodeURIComponent(id) + "/carpeta-digital";

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolverBloque(actividadId) {
  const valor = normalizar(actividadId);
  if (!valor) return null;
  if (valor.includes("documentacion-previa")) return BLOQUES[0];
  if (valor.includes("sede-notarial")) return BLOQUES[1];
  return BLOQUES.find((bloque) => valor === bloque.id || valor.includes(bloque.id)) || null;
}

export default function CarpetaDigitalModal({
  expedienteId,
  onClose,
  modoActividad = false,
  actividadId,
  onDocumentosChange,
}) {
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState("");
  const [bloquesAbiertos, setBloquesAbiertos] = useState({ "documentacion-previa": true });
  const [otrosAbierto, setOtrosAbierto] = useState(false);

  // Visor a la derecha: se puede ocultar y ampliar a pantalla casi completa.
  const [visorVisible, setVisorVisible] = useState(true);
  const [visorExpandido, setVisorExpandido] = useState(false);
  const [bloqueVisorExpandido, setBloqueVisorExpandido] = useState(null);
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState(null);
  const [urlVistaPrevia, setUrlVistaPrevia] = useState("");
  const [cargandoVistaPrevia, setCargandoVistaPrevia] = useState(false);

  const bloqueActividad = useMemo(() => resolverBloque(actividadId), [actividadId]);
  const bloquesVisibles = useMemo(() => {
    if (!modoActividad) return BLOQUES;
    // En modo actividad se muestra solo la actividad seleccionada.
    // Si aún no se pasa actividadId, se mantiene la compatibilidad con la
    // llamada anterior y se muestra Documentación previa.
    return [bloqueActividad || BLOQUES[0]];
  }, [modoActividad, bloqueActividad]);

  useEffect(() => {
    if (!bloqueActividad) return;
    setBloquesAbiertos((prev) => ({ ...prev, [bloqueActividad.id]: true }));
  }, [bloqueActividad]);

  useEffect(() => {
    return () => {
      if (urlVistaPrevia) URL.revokeObjectURL(urlVistaPrevia);
    };
  }, [urlVistaPrevia]);

  const cargar = useCallback(async () => {
    if (!expedienteId) {
      setError("No se ha encontrado el identificador del expediente.");
      setCargando(false);
      return [];
    }
    try {
      setCargando(true);
      setError("");
      const res = await axios.get(BASE(expedienteId));
      const lista = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setDocumentos(lista);
      onDocumentosChange?.(lista);
      return lista;
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudieron cargar los documentos.");
      return [];
    } finally {
      setCargando(false);
    }
  }, [expedienteId, onDocumentosChange]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function verDocumento(doc) {
    setError("");
    setCargandoVistaPrevia(true);
    setDocumentoVistaPrevia(doc);
    setUrlVistaPrevia("");
    setVisorVisible(true);
    try {
      const res = await axios.get(`${BASE(expedienteId)}/${doc.id}/descargar`, {
        responseType: "blob",
      });
      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: "application/pdf" });
      setUrlVistaPrevia(URL.createObjectURL(blob));
    } catch (e) {
      setDocumentoVistaPrevia(null);
      setError(e?.response?.data?.detail || "No se pudo abrir el documento.");
    } finally {
      setCargandoVistaPrevia(false);
    }
  }

  function cerrarVisor() {
    setDocumentoVistaPrevia(null);
    setUrlVistaPrevia("");
    setCargandoVistaPrevia(false);
    setVisorExpandido(false);
    setBloqueVisorExpandido(null);
  }

  async function subir(event, categoria) {
    const archivos = Array.from(event.target.files || []);
    event.target.value = "";
    if (!archivos.length) return;

    setSubiendo(categoria);
    setError("");
    try {
      for (const archivo of archivos) {
        const data = new FormData();
        data.append("archivo", archivo);
        data.append("categoria", categoria);
        await axios.post(BASE(expedienteId), data);
      }
      const lista = await cargar();
      const subidos = lista.filter((doc) => doc.categoria === categoria);
      if (subidos.length) {
        const ultimo = [...subidos].sort((a, b) =>
          new Date(b.fecha_subida || 0).getTime() - new Date(a.fecha_subida || 0).getTime()
        )[0];
        await verDocumento(ultimo);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar uno de los archivos.");
    } finally {
      setSubiendo("");
    }
  }

  async function descargar(doc) {
    setError("");
    try {
      const res = await axios.get(`${BASE(expedienteId)}/${doc.id}/descargar`, {
        responseType: "blob",
      });
      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = doc.nombre_original || "documento";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo descargar el documento.");
    }
  }

  async function eliminar(doc) {
    if (!window.confirm(`¿Eliminar el archivo «${doc.nombre_original}»?`)) return;
    try {
      setError("");
      await axios.delete(`${BASE(expedienteId)}/${doc.id}`);
      if (documentoVistaPrevia?.id === doc.id) cerrarVisor();
      await cargar();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo eliminar el documento.");
    }
  }

  const porCategoria = useCallback(
    (categoria) => documentos.filter((doc) => doc.categoria === categoria),
    [documentos]
  );
  const bytes = (n) => {
    const numero = Number(n || 0);
    if (numero < 1024) return `${numero} B`;
    if (numero < 1048576) return `${(numero / 1024).toFixed(1)} KB`;
    return `${(numero / 1048576).toFixed(1)} MB`;
  };
  const contarBloque = (bloque) => bloque.categorias.reduce(
    (suma, item) => suma + porCategoria(item.categoria).length,
    0
  );
  const totalArchivos = documentos.length;
  const categoriasVisibles = bloquesVisibles.flatMap((bloque) => bloque.categorias);
  const totalCategoriasVisibles = categoriasVisibles.reduce(
    (suma, item) => suma + porCategoria(item.categoria).length,
    0
  );

  const renderCategoria = ({ etiqueta, categoria }) => {
    const lista = porCategoria(categoria);
    return (
      <article key={categoria} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-800">{etiqueta}</h4>
            <p className="mt-0.5 text-xs text-slate-500">{lista.length} archivo(s)</p>
          </div>
          <span className={`inline-flex min-w-8 justify-center rounded-full px-2.5 py-1 text-xs font-extrabold ${
            lista.length ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}>{lista.length}</span>
        </div>

        <label className={`mt-3 inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-bold transition ${
          subiendo === categoria
            ? "cursor-wait border-slate-200 bg-slate-100 text-slate-500"
            : "cursor-pointer border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        }`}>
          {subiendo === categoria ? "Guardando archivo…" : "＋ Adjuntar PDF"}
          <input
            className="hidden"
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={(event) => subir(event, categoria)}
            disabled={!!subiendo}
          />
        </label>

        {lista.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100">
            {lista.map((doc) => (
              <li key={doc.id} className={`flex min-w-0 flex-wrap items-center gap-2 rounded-lg py-2 ${
                documentoVistaPrevia?.id === doc.id ? "bg-indigo-50/70 px-2" : ""
              }`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-700" title={doc.nombre_original}>
                    {doc.nombre_original}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {bytes(doc.tamano_bytes || 0)}
                    {doc.fecha_subida ? ` · ${new Date(doc.fecha_subida).toLocaleString("es-ES")}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => verDocumento(doc)} className="rounded-md px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                  Ver a la derecha
                </button>
                <button type="button" onClick={() => descargar(doc)} className="rounded-md px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100" title="Descargar">
                  ↓
                </button>
                <button type="button" onClick={() => eliminar(doc)} className="rounded-md px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50" title="Eliminar">
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-400">
            Todavía no hay archivos. Usa «Adjuntar PDF» para incorporarlo aquí.
          </p>
        )}
      </article>
    );
  };

  const renderBloque = (bloque) => {
    const abierto = !!bloquesAbiertos[bloque.id];
    const cantidad = contarBloque(bloque);
    const visorAmpliadoAqui = visorExpandido && bloqueVisorExpandido === bloque.id;
    return (
      <section key={bloque.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setBloquesAbiertos((prev) => ({ ...prev, [bloque.id]: !prev[bloque.id] }))}
          aria-expanded={abierto}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition ${
            abierto ? "bg-slate-50" : "bg-white hover:bg-slate-50"
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
              cantidad ? "bg-emerald-100 text-emerald-700" : "bg-indigo-50 text-indigo-700"
            }`}>{cantidad}</span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold text-slate-900">{bloque.titulo}</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">{bloque.descripcion}</span>
            </span>
          </span>
          <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600" aria-hidden="true">
            {abierto ? "⌃ Ocultar" : "⌄ Expandir"}
          </span>
        </button>

        {abierto && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:p-4">
            <div className={`grid items-start gap-3 ${visorVisible ? "2xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]" : "grid-cols-1"}`}>
              <div className={`grid min-w-0 gap-3 ${modoActividad ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"}`}>
                {bloque.categorias.map(renderCategoria)}
              </div>

              {visorVisible ? (
                <aside className={`${visorAmpliadoAqui ? "fixed inset-3 z-[10500]" : "min-w-0"}`}>
                  <div className={`flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm ${
                    visorAmpliadoAqui ? "h-full max-h-[calc(100vh-1.5rem)]" : "2xl:sticky 2xl:top-3"
                  }`}>
                    <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">▤</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-extrabold text-slate-800">Visor de documentos</h4>
                        <p className="truncate text-[11px] text-slate-500" title={documentoVistaPrevia?.nombre_original || "Sin documento seleccionado"}>
                          {documentoVistaPrevia?.nombre_original || "Selecciona «Ver a la derecha» en un archivo"}
                        </p>
                      </div>
                      <button type="button" onClick={() => {
                          const ampliar = !(visorExpandido && bloqueVisorExpandido === bloque.id);
                          setVisorExpandido(ampliar);
                          setBloqueVisorExpandido(ampliar ? bloque.id : null);
                        }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" title={visorAmpliadoAqui ? "Reducir visor" : "Ampliar visor"}>
                        {visorAmpliadoAqui ? "Reducir" : "⛶ Ampliar"}
                      </button>
                      <button type="button" onClick={() => { setVisorVisible(false); setVisorExpandido(false); setBloqueVisorExpandido(null); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" title="Ocultar visor">
                        Ocultar
                      </button>
                    </header>
                    <div className="min-h-[360px] flex-1 overflow-hidden bg-slate-100 p-2 sm:p-3">
                      {cargandoVistaPrevia ? (
                        <div className="flex min-h-[340px] items-center justify-center text-sm text-slate-500">Cargando documento…</div>
                      ) : urlVistaPrevia && documentoVistaPrevia ? (
                        <iframe title={`Vista previa: ${documentoVistaPrevia.nombre_original || "documento"}`} src={urlVistaPrevia} className={`w-full rounded-lg border border-slate-200 bg-white ${visorAmpliadoAqui ? "h-[calc(100vh-7rem)]" : "h-[440px] 2xl:h-[calc(100vh-18rem)] 2xl:min-h-[460px]"}`} />
                      ) : (
                        <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
                          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">📄</span>
                          <p className="text-sm font-bold text-slate-700">Vista previa</p>
                          <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Adjunta un PDF o pulsa «Ver a la derecha» en uno de los documentos para consultarlo aquí sin salir de la actividad.</p>
                        </div>
                      )}
                    </div>
                    {documentoVistaPrevia && (
                      <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2">
                        <span className="min-w-0 truncate text-[11px] text-slate-500">{documentoVistaPrevia.nombre_original}</span>
                        <div className="flex shrink-0 gap-2">
                          <button type="button" onClick={() => descargar(documentoVistaPrevia)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Descargar</button>
                          <button type="button" onClick={cerrarVisor} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Cerrar PDF</button>
                        </div>
                      </footer>
                    )}
                  </div>
                </aside>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-3">
                  <p className="text-xs text-slate-500">El visor está oculto. Puedes seguir adjuntando y gestionando documentos.</p>
                  <button type="button" onClick={() => setVisorVisible(true)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
                    Mostrar visor a la derecha
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    );
  };

  const otrosCantidad = CATEGORIAS_OTROS.reduce((suma, item) => suma + porCategoria(item.categoria).length, 0);

  return (
    <>
      <div
        className={modoActividad ? "w-full space-y-3" : "fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"}
        onMouseDown={(event) => {
          if (!modoActividad && event.target === event.currentTarget) onClose?.();
        }}
      >
        <section
          role={modoActividad ? undefined : "dialog"}
          aria-modal={modoActividad ? undefined : "true"}
          aria-label="Carpeta digital del expediente"
          className={modoActividad
            ? "w-full space-y-3"
            : "flex max-h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"}
        >
          {!modoActividad ? (
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">MOLSAN ERP · Documentación</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Carpeta digital</h2>
                <p className="text-xs text-slate-500">Expediente {expedienteId || "—"} · {totalArchivos} archivo(s)</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">✕ Cerrar</button>
            </header>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Documentos de {bloqueActividad?.titulo || "la actividad"}</h3>
                <p className="mt-0.5 text-xs text-slate-500">Adjunta a la izquierda y consulta el PDF a la derecha.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{totalCategoriasVisibles} archivo(s) en esta actividad</span>
                <button type="button" onClick={() => setVisorVisible((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  {visorVisible ? "Ocultar visor" : "Mostrar visor"}
                </button>
              </div>
            </div>
          )}

          <div className={modoActividad ? "space-y-3" : "min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"}>
            {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            {cargando ? (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Cargando documentos…</p>
            ) : (
              <>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-900">
                  <strong>Carpeta documental del expediente.</strong> Cada actividad puede plegarse o desplegarse. Adjunta PDF, selecciónalo para verlo a la derecha y oculta o amplía el visor cuando lo necesites.
                </div>
                {bloquesVisibles.map(renderBloque)}
                {!modoActividad && (
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <button type="button" onClick={() => setOtrosAbierto((v) => !v)} aria-expanded={otrosAbierto} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${otrosCantidad ? "bg-emerald-100 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>{otrosCantidad}</span>
                        <span>
                          <span className="block text-sm font-extrabold text-slate-900">Otros</span>
                          <span className="mt-0.5 block text-xs text-slate-500">Documentación complementaria y comunicaciones de oficina.</span>
                        </span>
                      </span>
                      <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600">{otrosAbierto ? "⌃ Ocultar" : "⌄ Expandir"}</span>
                    </button>
                    {otrosAbierto && <div className="grid gap-3 border-t border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-2 sm:p-4">{CATEGORIAS_OTROS.map(renderCategoria)}</div>}
                  </section>
                )}
              </>
            )}
          </div>
        </section>
      </div>

    </>
  );
}
