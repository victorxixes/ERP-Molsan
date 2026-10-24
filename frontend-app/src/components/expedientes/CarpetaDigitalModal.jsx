import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";
import "../../css/ModalesHerramientasPremium.css";

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
      { etiqueta: "Borradores escrituras", categoria: "Borradores escrituras" },
      { etiqueta: "Otros", categoria: "Otros" },
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
    id: "gestion-economica",
    titulo: "Gestión económica",
    descripcion: "Repositorios de documentación económica y complementaria del expediente.",
    categorias: [
      { etiqueta: "Borradores escrituras", categoria: "Borradores escrituras" },
      { etiqueta: "Otros", categoria: "Otros" },
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
  { etiqueta: "Otros", categoria: "Otros" },
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
  tipoOperacion,
  onDocumentosChange,
  datosEnvioNotario,
  datosPanelActividad,
  camposPanelActividad = [],
  onAbrirEnvioNotario,
  ocultarPanelEnvioNotario = false,
}) {
  const empleadoSesion = useAuthStore((state) => state.empleado);
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [subiendo, setSubiendo] = useState("");
  const [bloquesAbiertos, setBloquesAbiertos] = useState({ "documentacion-previa": true });
  const [otrosAbierto, setOtrosAbierto] = useState(false);
  // En modo actividad, la carpeta puede plegarse horizontalmente hacia la izquierda
  // para dejar más ancho al panel de datos/envío a notario.
  const [panelDocumentosVisible, setPanelDocumentosVisible] = useState(true);

  // Visor a la derecha: se puede ocultar y ampliar a pantalla casi completa.
  const [visorVisible, setVisorVisible] = useState(true);
  const [visorExpandido, setVisorExpandido] = useState(false);
  const [bloqueVisorExpandido, setBloqueVisorExpandido] = useState(null);
  const [documentoVistaPrevia, setDocumentoVistaPrevia] = useState(null);
  const [urlVistaPrevia, setUrlVistaPrevia] = useState("");
  const [cargandoVistaPrevia, setCargandoVistaPrevia] = useState(false);
  const [configRepositorios, setConfigRepositorios] = useState(null);
  const [busquedaDocumento, setBusquedaDocumento] = useState("");
  const [actividadPrincipal, setActividadPrincipal] = useState("documentacion-previa");

  useEffect(() => {
    let activo = true;
    setConfigRepositorios(null);
    if (!modoActividad || !actividadId) return () => { activo = false; };
    axios.get("/expedientes/configuracion-visibilidad", { params: { empleado_id: empleadoSesion?.empleado_id ?? empleadoSesion?.id, ambito: "efectiva" } })
      .then(({ data }) => {
        if (!activo) return;
        const configuracion = (data?.configuraciones || []).find((item) => item.actividad_key === actividadId);
        if (configuracion && Array.isArray(configuracion.repositorios)) {
          setConfigRepositorios(configuracion.repositorios);
        }
      })
      .catch(() => {
        // Si no se puede cargar la configuración, mantener la visibilidad actual.
      });
    return () => { activo = false; };
  }, [modoActividad, actividadId, empleadoSesion?.empleado_id, empleadoSesion?.id]);

  const bloqueActividad = useMemo(() => resolverBloque(actividadId), [actividadId]);
  const esCancelacionSinProvision = normalizar(tipoOperacion) === "cancelacion-sin-provision";
  const bloquesVisibles = useMemo(() => {
    if (!modoActividad) return BLOQUES;
    // En modo actividad se muestra solo el circuito y los repositorios configurados.
    const bloque = bloqueActividad || BLOQUES[0];
    const bloqueAjustado = esCancelacionSinProvision && bloque.id === "sede-notarial"
      ? { ...bloque, categorias: bloque.categorias.filter((item) => item.categoria !== "Presentación Registro") }
      : bloque;
    if (!Array.isArray(configRepositorios)) return [bloqueAjustado];
    const clavePorCategoria = {
      "Documentos Absis": "documentos_absis",
      "Hoja de Encargo firmada": "hoja_encargo_firmada",
      "Justificante de cancelación": "justificante_cancelacion",
      "Nota simple registral": "nota_simple_registral",
      "Escrituras/borradores": "borradores_escritura",
      "Borradores escrituras": "borradores_escritura",
      "Presentación Registro": "presentacion_registro_documentos",
      "Copia simple": "copia_simple_documentos",
      "AJD/ITP": "ajd_itp_documentos",
      "Otros impuestos": "otros_impuestos_documentos",
      "Hoja de Inscripción": "hoja_inscripcion_documentos",
      "Defecto registral": "defecto_registral",
      "Subsanación del defecto": "subsanacion_defecto",
      "Escritura digital final": "escritura_digital_final_documentos",
      "Documento de inscripción": "documento_inscripcion_documentos",
      "Expediente digital completo": "expediente_digital_completo_documentos",
      "Factura notarial": "factura_notarial_documentos",
      "Factura Registral": "factura_registral_documentos",
      "Factura impuestos": "factura_impuestos_documentos",
      "Honorarios gestoría": "honorarios_gestoria_documentos",
      "Otros pagos": "otros_pagos_documentos",
      "Otros documentos económicos": "otros_documentos_economicos",
      "Otra documentación": "otra_documentacion",
      "Mails de la Oficina": "emails_oficina",
      "Otros": "otros_documentos",
    };
    // La configuración puede asignar cualquier repositorio a cualquier actividad,
    // por lo que se filtra sobre el catálogo completo, no solo sobre el bloque histórico.
    const todasLasCategorias = [...BLOQUES.flatMap((item) => item.categorias), ...CATEGORIAS_OTROS];
    const categoriasUnicas = todasLasCategorias.filter((item, index, lista) =>
      lista.findIndex((otra) => otra.categoria === item.categoria) === index
    );
    return [{
      ...bloqueAjustado,
      categorias: categoriasUnicas.filter((item) => {
        const repositorioClave = clavePorCategoria[item.categoria];
        const repositorioNuevoRequerido = ["documentacion-previa", "gestion-economica"].includes(bloque.id)
          && ["Borradores escrituras", "Otros"].includes(item.categoria);
        return (configRepositorios.includes(repositorioClave) || repositorioNuevoRequerido)
          && !(esCancelacionSinProvision && bloque.id === "sede-notarial" && item.categoria === "Presentación Registro");
      }),
    }];
  }, [modoActividad, bloqueActividad, configRepositorios, esCancelacionSinProvision]);

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
    (categoria) => documentos.filter((doc) => {
      if (doc.categoria === categoria) return true;
      // Conserva visibles los archivos subidos con los nombres del repositorio anterior.
      if (categoria === "Borradores escrituras") {
        return ["Escrituras/borradores", "Borradores de escrituras", "Borradores de escritura"].includes(doc.categoria);
      }
      if (categoria === "Otros") {
        return doc.categoria === "Borradores escrituras y otros";
      }
      return false;
    }),
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
    const lista = porCategoria(categoria).filter((doc) => {
      const q = normalizar(busquedaDocumento);
      return !q || normalizar(`${etiqueta} ${doc.nombre_original || ""} ${doc.categoria || ""}`).includes(q);
    });
    const totalCategoria = porCategoria(categoria).length;
    return (
      <article key={categoria} className="w-full max-w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1">
            <h4 className="max-w-full text-xs font-bold text-slate-800">{etiqueta}</h4>
            <p className="whitespace-nowrap text-[10px] text-slate-500">{totalCategoria} archivo(s)</p>
          </div>
          <label className={`inline-flex shrink-0 cursor-pointer items-center rounded-md border px-2 py-1 text-[11px] font-bold ${subiendo === categoria ? "border-slate-200 bg-slate-100 text-slate-500" : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}>
            {subiendo === categoria ? "Subiendo…" : "＋ Adjuntar"}
            <input className="hidden" type="file" accept=".pdf,application/pdf" multiple onChange={(event) => subir(event, categoria)} disabled={!!subiendo} />
          </label>
        </div>
        {lista.length > 0 ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {lista.map((doc) => (
              <li key={doc.id} className={`flex min-w-0 flex-wrap items-center gap-2 rounded-md px-1 py-2 ${documentoVistaPrevia?.id === doc.id ? "bg-indigo-50" : ""}`}>
                <button type="button" onClick={() => verDocumento(doc)} className="min-w-0 flex-1 text-left" title={doc.nombre_original}>
                  <span className="block truncate text-xs font-semibold text-slate-700">{doc.nombre_original}</span>
                  <span className="block text-[10px] text-slate-400">{bytes(doc.tamano_bytes || 0)}{doc.fecha_subida ? ` · ${new Date(doc.fecha_subida).toLocaleString("es-ES")}` : ""}</span>
                </button>
                <button type="button" onClick={() => verDocumento(doc)} className="rounded-md px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100">Ver</button>
                <button type="button" onClick={() => descargar(doc)} className="rounded-md px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100" title="Descargar">↓</button>
                <button type="button" onClick={() => eliminar(doc)} className="rounded-md px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50" title="Eliminar">✕</button>
              </li>
            ))}
          </ul>
        ) : totalCategoria === 0 ? (
          <p className="mt-2 text-[10px] text-slate-400">{busquedaDocumento ? "Sin coincidencias con la búsqueda." : "Sin documentos adjuntos."}</p>
        ) : null}
      </article>
    );
  };

  const renderBloque = (bloque) => {
    const abierto = !!bloquesAbiertos[bloque.id];
    const cantidad = contarBloque(bloque);
    return (
      <section key={bloque.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <button type="button" onClick={() => { if (modoActividad) setPanelDocumentosVisible(false); else setBloquesAbiertos((prev) => ({ ...prev, [bloque.id]: !prev[bloque.id] })); }} aria-expanded={modoActividad ? panelDocumentosVisible : abierto} title={modoActividad ? "Ocultar carpeta digital hacia la izquierda" : abierto ? "Contraer repositorios" : "Mostrar repositorios"} className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition ${abierto ? "bg-slate-50" : "bg-white hover:bg-slate-50"}`}>
          <span className="flex min-w-0 items-center gap-3">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${cantidad ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{cantidad}</span>
            <span className="min-w-0"><span className="block text-sm font-extrabold text-slate-900">{bloque.titulo}</span><span className="block truncate text-[11px] font-normal text-slate-500">{bloque.descripcion}</span></span>
          </span>
          <span className="shrink-0 text-xs font-bold text-slate-500">{modoActividad ? "‹" : abierto ? "⌃" : "⌄"}</span>
        </button>
        {abierto && <div className="grid grid-cols-1 gap-2 border-t border-slate-100 bg-slate-50/50 p-2 sm:grid-cols-2 xl:grid-cols-4 sm:p-3">{bloque.categorias.map(renderCategoria)}</div>}
      </section>
    );
  };

  const renderVisor = () => (
    <aside className={`flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm ${visorExpandido ? "fixed inset-3 z-[10500] h-[calc(100vh-1.5rem)]" : "h-full"}`}>
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">▤</span>
        <div className="min-w-0 flex-1"><h4 className="text-sm font-extrabold text-slate-800">Visor de documentos</h4><p className="truncate text-[11px] text-slate-500" title={documentoVistaPrevia?.nombre_original || "Sin documento seleccionado"}>{documentoVistaPrevia?.nombre_original || "Selecciona un archivo de la lista"}</p></div>
        <button type="button" onClick={() => setVisorExpandido((v) => !v)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" title={visorExpandido ? "Reducir visor" : "Ampliar visor"}>{visorExpandido ? "Reducir" : "⛶ Ampliar"}</button>
        <button type="button" onClick={() => { if (modoActividad) cerrarVisor(); else { setVisorVisible(false); setVisorExpandido(false); } }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50" title={modoActividad ? "Cerrar visor" : "Ocultar visor"}>{modoActividad ? "✕ Cerrar" : "Ocultar"}</button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden bg-slate-100 p-2 sm:p-3">
        {cargandoVistaPrevia ? <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-slate-500">Cargando documento…</div> : urlVistaPrevia && documentoVistaPrevia ? (
          <iframe title={`Vista previa: ${documentoVistaPrevia.nombre_original || "documento"}`} src={urlVistaPrevia} className="h-full min-h-[360px] w-full rounded-lg border border-slate-200 bg-white" />
        ) : <div className="flex h-full min-h-[300px] flex-col items-center justify-center px-6 text-center"><span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">📄</span><p className="text-sm font-bold text-slate-700">Vista previa</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">Selecciona un PDF en el panel izquierdo. El visor permanecerá visible mientras navegas por la lista.</p></div>}
      </div>
      {documentoVistaPrevia && <footer className="flex items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2"><span className="min-w-0 truncate text-[11px] text-slate-500">{documentoVistaPrevia.nombre_original}</span><div className="flex shrink-0 gap-2"><button type="button" onClick={() => descargar(documentoVistaPrevia)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Descargar</button><button type="button" onClick={cerrarVisor} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Cerrar PDF</button></div></footer>}
    </aside>
  );
  const otrosCantidad = CATEGORIAS_OTROS.reduce((suma, item) => suma + porCategoria(item.categoria).length, 0);

  if (!modoActividad) {
    const bloquePrincipal = BLOQUES.find((bloque) => bloque.id === actividadPrincipal);
    const seleccionOtros = actividadPrincipal === "otros";
    const cantidadActividad = (bloque) => contarBloque(bloque);
    const seleccionarActividad = (id) => {
      setActividadPrincipal(id);
      if (id !== "otros") {
        setBloquesAbiertos((prev) => ({ ...prev, [id]: true }));
      } else {
        setOtrosAbierto(true);
      }
    };

    return (
      <div
        className="carpeta-digital-premium panel-modal-premium fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-2 sm:p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <section role="dialog" aria-modal="true" aria-label="Carpeta digital del expediente" className="flex max-h-[96vh] w-full max-w-[1800px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">MOLSAN ERP · Documentación</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Carpeta digital</h2>
              <p className="text-xs text-slate-500">Expediente {expedienteId || "—"} · {totalArchivos} archivo(s)</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 sm:inline-flex">{BLOQUES.length} actividades + Otros</span>
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">✕ Cerrar</button>
            </div>
          </header>

          {error && <div role="alert" className="mx-3 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:mx-4">{error}</div>}

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 sm:p-4 lg:grid-cols-[190px_minmax(220px,0.72fr)_minmax(320px,1fr)] lg:overflow-hidden">
            <nav aria-label="Actividades de la carpeta digital" className="min-w-0 space-y-2 lg:overflow-y-auto lg:pr-1">
              <p className="px-1 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Actividades</p>
              {BLOQUES.map((bloque) => {
                const cantidad = cantidadActividad(bloque);
                const activo = actividadPrincipal === bloque.id;
                return (
                  <button key={bloque.id} type="button" onClick={() => seleccionarActividad(bloque.id)} aria-current={activo ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${activo ? "border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${cantidad ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{cantidad}</span>
                    <span className="min-w-0 flex-1"><span className={`block text-xs font-extrabold ${activo ? "text-indigo-900" : "text-slate-700"}`}>{bloque.titulo}</span><span className="mt-0.5 block text-[10px] text-slate-500">{bloque.categorias.length} categorías</span></span>
                    <span className={`text-xs ${activo ? "text-indigo-600" : "text-slate-400"}`}>›</span>
                  </button>
                );
              })}
              <div className="my-2 border-t border-slate-200" />
              <button type="button" onClick={() => seleccionarActividad("otros")} aria-current={seleccionOtros ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${seleccionOtros ? "border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-100" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${otrosCantidad ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{otrosCantidad}</span>
                <span className="min-w-0 flex-1"><span className={`block text-xs font-extrabold ${seleccionOtros ? "text-indigo-900" : "text-slate-700"}`}>Otros</span><span className="mt-0.5 block text-[10px] text-slate-500">Documentación complementaria</span></span>
                <span className={`text-xs ${seleccionOtros ? "text-indigo-600" : "text-slate-400"}`}>›</span>
              </button>
            </nav>

            <section className="flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900">{seleccionOtros ? "Otros" : bloquePrincipal?.titulo}</h3>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">{seleccionOtros ? "Documentación complementaria y comunicaciones, separadas del circuito de actividades." : bloquePrincipal?.descripcion}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">{seleccionOtros ? otrosCantidad : cantidadActividad(bloquePrincipal || BLOQUES[0])} archivo(s)</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input type="search" value={busquedaDocumento} onChange={(event) => setBusquedaDocumento(event.target.value)} placeholder="Buscar documentos…" aria-label="Buscar documentos por nombre" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" />
                  <button type="button" onClick={() => setVisorVisible((v) => !v)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50">{visorVisible ? "Ocultar visor" : "Mostrar visor"}</button>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50/60 p-2 sm:p-3">
                {cargando ? (
                  <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Cargando documentos…</p>
                ) : seleccionOtros ? (
                  <div className="space-y-2">{CATEGORIAS_OTROS.map(renderCategoria)}</div>
                ) : bloquePrincipal ? (
                  <div className="space-y-2">{renderBloque(bloquePrincipal)}</div>
                ) : null}
                {!cargando && (seleccionOtros
                  ? CATEGORIAS_OTROS.every((item) => porCategoria(item.categoria).length === 0)
                  : bloquePrincipal && contarBloque(bloquePrincipal) === 0) && (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-[11px] text-slate-500">Esta sección todavía no tiene documentos. Puedes adjuntarlos desde cada categoría.</p>
                )}
              </div>
            </section>

            <section className="min-h-[250px] min-w-0 w-full overflow-hidden">
              {modoActividad && actividadId === "documentacion-previa" ? (
                <div className="flex h-full min-h-[250px] flex-col overflow-y-auto rounded-xl border border-indigo-100 bg-white shadow-sm">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/70 px-3 py-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-indigo-950">✉️ Datos de envío a notario</h4>
                      <p className="text-[10px] text-slate-500">Resumen del expediente y de la operación · 4 columnas</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAbrirEnvioNotario?.()}
                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-extrabold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      ✉️ Envío al notario
                    </button>
                  </header>
                  <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Fecha de envío", datosEnvioNotario?.fecha_envio_notario || datosEnvioNotario?.fecha_envio || datosEnvioNotario?.fecha_envio_notaria],
                      ["Notario", datosEnvioNotario?.nombre_notario || datosEnvioNotario?.notario],
                      ["NIF notario", datosEnvioNotario?.nif_notario || datosEnvioNotario?.notario_nif],
                      ["Apoderado", datosEnvioNotario?.apoderado || datosEnvioNotario?.apoderado_s],
                      ["Tipo de firma", datosEnvioNotario?.tipo_firma],
                      ["Tipo de documento", datosEnvioNotario?.tipo_documento],
                      ["Fecha prevista de firma", datosEnvioNotario?.fecha_prevista_firma],
                      ["Hora prevista", datosEnvioNotario?.hora_prevista_firma],
                      ["Tipo de operación", datosEnvioNotario?.tipo_operacion || datosEnvioNotario?.tipoOperacion || datosEnvioNotario?.operacion],
                      ["Subtipo operación", datosEnvioNotario?.subtipo_operacion],
                      ["Contrato", datosEnvioNotario?.contrato],
                      ["Capital", datosEnvioNotario?.capital_documento_notarial || datosEnvioNotario?.capital],
                      ["Importe", datosEnvioNotario?.importe === null || datosEnvioNotario?.importe === undefined || datosEnvioNotario?.importe === "" ? "" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(datosEnvioNotario.importe))],
                      ["Finca", datosEnvioNotario?.finca || datosEnvioNotario?.finca_registral || datosEnvioNotario?.numero_finca],
                      ["Nº solicitud SIA", datosEnvioNotario?.numero_solicitud_sia || datosEnvioNotario?.n_solicitud_sia],
                      ["Observaciones", datosEnvioNotario?.observaciones],
                    ].map(([etiqueta, valor]) => (
                      <div key={etiqueta} className="min-w-0 rounded-md bg-slate-50 px-2 py-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{etiqueta}</p>
                        <p className="break-words text-[11px] font-semibold text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : visorVisible ? renderVisor() : (
                <div className="flex h-full min-h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center">
                  <span className="mb-3 text-2xl">▤</span>
                  <p className="text-xs text-slate-500">El visor está oculto.</p>
                  <button type="button" onClick={() => setVisorVisible(true)} className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">Mostrar visor</button>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    );
  }

  return (
    <>
      <div
        className={modoActividad ? "carpeta-digital-premium panel-modal-premium w-full space-y-3" : "carpeta-digital-premium panel-modal-premium fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6"}
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
          {!modoActividad && (
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">MOLSAN ERP · Documentación</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">Carpeta digital</h2>
                <p className="text-xs text-slate-500">Expediente {expedienteId || "—"} · {totalArchivos} archivo(s)</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">✕ Cerrar</button>
            </header>
          )}

          <div
            className={modoActividad
              ? "grid min-h-[300px] grid-cols-1 gap-2 transition-[grid-template-columns] duration-300 " + (ocultarPanelEnvioNotario ? "lg:grid-cols-[minmax(0,1fr)]" : panelDocumentosVisible ? "lg:grid-cols-[minmax(160px,0.30fr)_minmax(0,1.70fr)]" : "lg:grid-cols-[0_minmax(0,1fr)]")
              : "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]"}
          >
            <div
              className={"flex min-h-0 min-w-0 flex-col overflow-hidden transition-[opacity,transform] duration-300 " + (modoActividad && !panelDocumentosVisible && !ocultarPanelEnvioNotario ? "hidden lg:flex" : "")}
              style={modoActividad ? {
                minWidth: 0,
                width: "100%",
                opacity: panelDocumentosVisible || ocultarPanelEnvioNotario ? 1 : 0,
                transform: panelDocumentosVisible || ocultarPanelEnvioNotario ? "translateX(0)" : "translateX(-28px)",
                pointerEvents: panelDocumentosVisible || ocultarPanelEnvioNotario ? "auto" : "none",
              } : undefined}
            >
              {!modoActividad && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={busquedaDocumento}
                    onChange={(event) => setBusquedaDocumento(event.target.value)}
                    placeholder="Buscar documento por nombre…"
                    aria-label="Buscar documento por nombre"
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                  />
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600">{totalArchivos} archivo(s)</span>
                </div>
              )}
              {error && <div role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
              {cargando ? (
                <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Cargando documentos…</p>
              ) : (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {bloquesVisibles.map(renderBloque)}
                  {!modoActividad && (
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <button type="button" onClick={() => setOtrosAbierto((v) => !v)} aria-expanded={otrosAbierto} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${otrosCantidad ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{otrosCantidad}</span>
                          <span><span className="block text-sm font-extrabold text-slate-900">Otros</span><span className="block text-[11px] text-slate-500">Documentación complementaria y comunicaciones.</span></span>
                        </span>
                        <span className="text-xs font-bold text-slate-500">{otrosAbierto ? "⌃" : "⌄"}</span>
                      </button>
                      {otrosAbierto && <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-2">{CATEGORIAS_OTROS.map(renderCategoria)}</div>}
                    </section>
                  )}
                </div>
              )}
            </div>
            {modoActividad && !ocultarPanelEnvioNotario && (
              <aside className="flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
                <header className="flex items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/70 px-3 py-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-indigo-950">
                      {actividadId === "documentacion-previa" ? "✉️ Datos de envío a notario" : `📋 Datos · ${bloqueActividad?.titulo || "Actividad"}`}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {actividadId === "documentacion-previa" ? "Resumen de la información del expediente" : "Información específica de esta actividad"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                    {modoActividad && !ocultarPanelEnvioNotario && !panelDocumentosVisible && (
                      <button type="button" onClick={() => setPanelDocumentosVisible(true)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-extrabold text-slate-700 hover:bg-slate-50" title="Mostrar carpeta digital desde la izquierda">
                        › Carpeta digital
                      </button>
                    )}
                    {actividadId === "documentacion-previa" && (
                      <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onAbrirEnvioNotario?.(); }} className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-2 text-[10px] font-extrabold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        ✉️ Envío al notario
                      </button>
                    )}
                  </div>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {actividadId === "documentacion-previa" ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                      {[
                        ["Fecha de envío", datosEnvioNotario?.fecha_envio_notario || datosEnvioNotario?.fecha_envio],
                        ["¿Escritura firmada?", datosEnvioNotario?.escritura_firmada === true ? "Sí" : datosEnvioNotario?.escritura_firmada === false ? "No" : datosEnvioNotario?.escritura_firmada],
                        ["Firma urgente", datosEnvioNotario?.firma_urgente ? "Sí" : "No"],
                        ["Notario", datosEnvioNotario?.nombre_notario || datosEnvioNotario?.notario],
                        ["NIF notario", datosEnvioNotario?.nif_notario],
                        ["Apoderado", datosEnvioNotario?.apoderado],
                        ["Tipo de firma", datosEnvioNotario?.tipo_firma],
                        ["Población notario", datosEnvioNotario?.poblacion],
                        ["Provincia notario", datosEnvioNotario?.provincia],
                        ["Tipo de documento", datosEnvioNotario?.tipo_documento],
                        ["Formato de escritura", datosEnvioNotario?.formato_escritura],
                        ["Tipo de trámite", datosEnvioNotario?.tipo_tramite],
                        ["Fecha prevista de firma", datosEnvioNotario?.fecha_prevista_firma],
                        ["Hora prevista", datosEnvioNotario?.hora_prevista_firma],
                        ["Fin previsto", datosEnvioNotario?.hora_fin_prevista_firma],
                        ["Fecha firma", datosEnvioNotario?.fecha_firma],
                        ["Protocolo", datosEnvioNotario?.protocolo],
                        ["Contrato", datosEnvioNotario?.contrato],
                        ["Capital (€)", datosEnvioNotario?.capital_documento_notarial || datosEnvioNotario?.capital],
                        ["Importe (€)", datosEnvioNotario?.importe],
                        ["Finca", datosEnvioNotario?.finca || datosEnvioNotario?.finca_registral || datosEnvioNotario?.numero_finca],
                        ["Tipo operación", datosEnvioNotario?.tipo_operacion],
                        ["Subtipo operación", datosEnvioNotario?.subtipo_operacion],
                        ["Documento 1", datosEnvioNotario?.documentos_escritura?.[0]?.tipo_documento || datosEnvioNotario?.tipo_documento],
                        ["Cuantía documento 1", datosEnvioNotario?.documentos_escritura?.[0]?.cuantia || datosEnvioNotario?.cuantia],
                        ["Otros documentos", Array.isArray(datosEnvioNotario?.documentos_escritura) ? datosEnvioNotario.documentos_escritura.slice(1).map((doc) => doc?.tipo_documento).filter(Boolean).join(", ") : ""],
                        ["Nº solicitud SIA", datosEnvioNotario?.numero_solicitud_sia || datosEnvioNotario?.n_solicitud_sia],
                        ["Observaciones", datosEnvioNotario?.observaciones],
                        ["Nombre facturación", datosEnvioNotario?.facturacion_nombre],
                        ["Apellidos facturación", datosEnvioNotario?.facturacion_apellidos],
                        ["DNI / NIF facturación", datosEnvioNotario?.facturacion_dni_nif],
                        ["Dirección facturación", datosEnvioNotario?.facturacion_direccion],
                        ["Código postal", datosEnvioNotario?.facturacion_codigo_postal],
                        ["Población facturación", datosEnvioNotario?.facturacion_poblacion],
                        ["Provincia facturación", datosEnvioNotario?.facturacion_provincia],
                        ["Teléfono facturación", datosEnvioNotario?.facturacion_telefono],
                        ["Email facturación", datosEnvioNotario?.facturacion_email],
                        ["Idioma del documento", datosEnvioNotario?.idioma_documento || datosEnvioNotario?.idioma],
                      ].map(([etiqueta, valor]) => (
                        <div key={etiqueta} className="min-w-0 border-b border-slate-100 pb-1.5">
                          <p className="text-[10px] font-bold text-slate-500">{etiqueta}</p>
                          <p className="break-words text-[11px] font-semibold text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                      {camposPanelActividad.map((campo) => {
                        const valor = datosPanelActividad?.[campo.key];
                        return (
                          <div key={campo.key} className="min-w-0 border-b border-slate-100 pb-1.5">
                            <p className="text-[10px] font-bold text-slate-500">{campo.label}</p>
                            <p className="break-words text-[11px] font-semibold text-slate-800">
                              {valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}
                            </p>
                          </div>
                        );
                      })}
                      {camposPanelActividad.length === 0 && <p className="text-xs text-slate-500">Los campos específicos de esta actividad aparecerán aquí.</p>}
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </section>
      </div>

      {modoActividad && documentoVistaPrevia && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Visor de documento">
          <div className="h-[88vh] max-h-[900px] w-full max-w-6xl">
            {renderVisor()}
          </div>
        </div>
      )}

    </>
  );
}
