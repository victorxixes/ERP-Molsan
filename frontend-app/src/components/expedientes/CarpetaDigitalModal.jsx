import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";
import "../../css/ModalesHerramientasPremium.css";

// Se conservan las categorías del repositorio actual para no romper
// los documentos ya almacenados.
const BLOQUES = [
  {
    id: "documentacion-previa",
    titulo: "Documentación general y previa",
    descripcion: "Documentación general y requisitos anteriores a la firma.",
    categorias: [
      { etiqueta: "Documentos ABSIS", categoria: "Documentos Absis" },
      { etiqueta: "Hoja de encargo firmada", categoria: "Hoja de Encargo firmada" },
      { etiqueta: "Justificante de cancelación", categoria: "Justificante de cancelación" },
      { etiqueta: "Nota simple registral", categoria: "Nota simple registral" },
      { etiqueta: "Borradores escrituras", categoria: "Borradores escrituras" },
      { etiqueta: "Otra documentación", categoria: "Otra documentación" },
      { etiqueta: "Emails de oficina", categoria: "Mails de la Oficina" },
      { etiqueta: "Otros", categoria: "Otros" },
    ],
  },
  {
    id: "sede-notarial",
    titulo: "Sede notarial",
    descripcion: "Documentos preparados, firmados o recibidos en la fase notarial.",
    categorias: [
      { etiqueta: "Hoja de presentación", categoria: "Hoja de presentación" },
      { etiqueta: "Copia simple", categoria: "Copia simple" },
    ],
  },
  {
    id: "gestion-economica",
    titulo: "Gestión económica",
    descripcion: "Facturas, honorarios y documentación económica complementaria.",
    categorias: [
      { etiqueta: "Factura notarial", categoria: "Factura notarial" },
      { etiqueta: "Factura registro", categoria: "Factura registro" },
      { etiqueta: "Factura impuestos", categoria: "Factura impuestos" },
      { etiqueta: "Honorarios de gestoría", categoria: "Honorarios gestoría" },
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
    categorias: [
      { etiqueta: "Hoja de inscripción", categoria: "Hoja de Inscripción" },
      { etiqueta: "Factura registro", categoria: "Factura registro" },
    ],
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
    titulo: "Cierre del expediente",
    descripcion: "Acceso a todos los repositorios digitales del expediente y recopilación final.",
    categorias: [
      { etiqueta: "Expediente digital completo", categoria: "Expediente digital completo" },
    ],
  },
];

const CATEGORIAS_OTROS = [];

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
  onPagar,
  onLiquidar,
  onFacturar,
  generandoFacturacion = false,
  facturaEmitida = false,
  formularioPago = null,
  panelLibroPagos = null,
  formularioEnvioNotario = null,
  ocultarPanelEnvioNotario = false,
}) {
  const empleadoSesion = useAuthStore((state) => state.empleado);
  const [expedienteDatos, setExpedienteDatos] = useState(null);
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
  const [datosExpedienteFechas, setDatosExpedienteFechas] = useState(null);
  const [fechasSlaActividad, setFechasSlaActividad] = useState({ fecha_inicio: "", fecha_fin: "" });
  const [guardandoFechasSla, setGuardandoFechasSla] = useState(false);
  const [errorFechasSla, setErrorFechasSla] = useState("");
  const [mensajeFechasSla, setMensajeFechasSla] = useState("");

  // Las fechas pertenecen a la ficha del expediente; este modal se abre desde
  // el listado sin recibir esos datos como props, por eso se cargan aquí.
  useEffect(() => {
    let activo = true;
    setDatosExpedienteFechas(null);
    if (!expedienteId || !modoActividad || !["liquidacion-impuestos", "tramitacion-inscripcion"].includes(actividadId)) {
      return () => { activo = false; };
    }
    axios.get(`/expedientes/${encodeURIComponent(expedienteId)}`)
      .then(({ data }) => {
        if (!activo) return;
        setDatosExpedienteFechas(data?.expediente || data?.item || data || null);
      })
      .catch(() => {
        if (activo) setDatosExpedienteFechas(null);
      });
    return () => { activo = false; };
  }, [expedienteId, modoActividad, actividadId]);

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

  useEffect(() => {
    let activo = true;
    setExpedienteDatos(null);
    if (!expedienteId) return () => { activo = false; };
    axios.get(`/expedientes/${encodeURIComponent(expedienteId)}`)
      .then(({ data }) => {
        if (activo) setExpedienteDatos(data?.expediente || data?.item || data || null);
      })
      .catch(() => {
        if (activo) setExpedienteDatos(null);
      });
    return () => { activo = false; };
  }, [expedienteId]);

  useEffect(() => {
    let activo = true;
    setFechasSlaActividad({ fecha_inicio: "", fecha_fin: "" });
    setErrorFechasSla("");
    setMensajeFechasSla("");
    if (!modoActividad || !expedienteId || !actividadId) return () => { activo = false; };
    axios.get(`/informes-sla/fechas/${encodeURIComponent(expedienteId)}/${encodeURIComponent(actividadId)}`)
      .then(({ data }) => {
        if (activo) setFechasSlaActividad({ fecha_inicio: String(data?.fecha_inicio || "").slice(0, 10), fecha_fin: String(data?.fecha_fin || "").slice(0, 10) });
      })
      .catch((e) => { if (activo) setErrorFechasSla(e?.response?.data?.detail || "No se pudieron cargar las fechas SLA de esta actividad."); });
    return () => { activo = false; };
  }, [expedienteId, modoActividad, actividadId]);

  const guardarFechasSlaActividad = async () => {
    if (!expedienteId || !actividadId || guardandoFechasSla) return;
    setGuardandoFechasSla(true);
    setErrorFechasSla("");
    setMensajeFechasSla("");
    try {
      await axios.put(`/informes-sla/fechas/${encodeURIComponent(expedienteId)}/${encodeURIComponent(actividadId)}`, {
        fecha_inicio: fechasSlaActividad.fecha_inicio || null,
        fecha_fin: fechasSlaActividad.fecha_fin || null,
      });
      setMensajeFechasSla("Fechas de actividad guardadas.");
    } catch (e) {
      setErrorFechasSla(e?.response?.data?.detail || "No se pudieron guardar las fechas SLA.");
    } finally {
      setGuardandoFechasSla(false);
    }
  };

  const bloqueActividad = useMemo(() => resolverBloque(actividadId), [actividadId]);
  const esCancelacionSinProvision = normalizar(tipoOperacion) === "cancelacion-sin-provision";
  const bloquesVisibles = useMemo(() => {
    if (!modoActividad) return BLOQUES;
    // En Documentación previa se muestran los dos repositorios digitales compartidos
    // con la carpeta del expediente, sin duplicar ni almacenar archivos en el modal.
    const bloque = bloqueActividad || BLOQUES[0];
    // La actividad «Sede notarial» no tiene carpeta digital propia.
    // «Sede notarial con protocolo» conserva sus repositorios específicos.
    if (bloque.id === "sede-notarial" && !normalizar(actividadId).includes("protocolo")) return [];
    const bloqueAjustado = bloque.id === "documentacion-previa"
      ? {
          ...bloque,
          titulo: "Documentación general y previa",
          descripcion: "Documentos requeridos para esta actividad.",
          categorias: [
            { etiqueta: "Documentos ABSIS", categoria: "Documentos Absis" },
            { etiqueta: "Hoja de encargo firmada", categoria: "Hoja de Encargo firmada" },
            { etiqueta: "Justificante de cancelación", categoria: "Justificante de cancelación" },
            { etiqueta: "Nota simple registral", categoria: "Nota simple registral" },
          ],
        }
      : bloque.id === "facturacion-cierre"
        ? {
            ...bloque,
            titulo: "Cierre del expediente",
            descripcion: "Incluye todos los repositorios digitales y el expediente digital completo.",
            categorias: [...BLOQUES.flatMap((item) => item.categorias), ...CATEGORIAS_OTROS]
              // "Factura registral" y "Factura registro" son el mismo repositorio.
              // En Cierre se conserva un único nombre canónico: "Factura registro".
              .filter((item) => item.categoria !== "Factura registral" && item.categoria !== "Factura Registral")
              .filter((item, index, lista) => lista.findIndex((otro) => otro.categoria === item.categoria) === index),
          }
        : esCancelacionSinProvision && bloque.id === "sede-notarial"
          ? { ...bloque, categorias: bloque.categorias.filter((item) => item.categoria !== "Presentación Registro") }
          : bloque;
    // Cierre del expediente muestra todos los repositorios solo en la carpeta digital.
    // El panel "Datos de actividad" y su repositorio permanecen sin cambios.
    if (bloque.id === "facturacion-cierre") return [bloqueAjustado];
    if (!Array.isArray(configRepositorios)) return [bloqueAjustado];
    const clavePorCategoria = {
      "Documentos Absis": "documentos_absis",
      "Hoja de Encargo firmada": "hoja_encargo_firmada",
      "Justificante de cancelación": "justificante_cancelacion",
      "Nota simple registral": "nota_simple_registral",
      "Escrituras/borradores": "borradores_escritura",
      "Borradores escrituras": "borradores_escritura",
      "Presentación Registro": "presentacion_registro_documentos",
      "Hoja de presentación": "hoja_presentacion_documentos",
      "Copia simple": "copia_simple_documentos",
      "AJD/ITP": "ajd_itp_documentos",
      "Otros impuestos": "otros_impuestos_documentos",
      "Hoja de Inscripción": "hoja_inscripcion_documentos",
      "Factura registro": "factura_registro_documentos",
      "Defecto registral": "defecto_registral",
      "Subsanación del defecto": "subsanacion_defecto",
      "Escritura digital final": "escritura_digital_final_documentos",
      "Documento de inscripción": "documento_inscripcion_documentos",
      "Expediente digital completo": "expediente_digital_completo_documentos",
      "Factura notarial": "factura_notarial_documentos",
      "Factura Registral": "factura_registral_documentos",
      "Factura registral": "factura_registral_documentos",
      "Factura impuestos": "factura_impuestos_documentos",
      "Honorarios gestoría": "honorarios_gestoria_documentos",
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
        const repositorioNuevoRequerido = (
          bloque.id === "documentacion-previa"
          && ["Borradores escrituras", "Otra documentación", "Mails de la Oficina", "Otros"].includes(item.categoria)
        ) || (
          bloque.id === "gestion-economica"
          && ["Honorarios gestoría", "Otros"].includes(item.categoria)
        );
        const repositoriosSedeProtocolo = bloque.id === "sede-notarial"
          && normalizar(actividadId).includes("protocolo")
          && ["Hoja de presentación", "Hoja de presentación Tacio", "Copia simple"].includes(item.categoria);
        const repositorioCierreExpediente = bloque.id === "facturacion-cierre" && item.categoria === "Expediente digital completo";
        return (configRepositorios.includes(repositorioClave) || repositorioNuevoRequerido || repositoriosSedeProtocolo || repositorioCierreExpediente
          || (bloque.id === "tramitacion-inscripcion" && item.categoria === "Factura registro"))
          && !(bloque.id === "documentacion-previa" && item.categoria === "Presentación Registro")
          && !(esCancelacionSinProvision && bloque.id === "sede-notarial" && item.categoria === "Presentación Registro");
      }),
    }];
  }, [modoActividad, actividadId, bloqueActividad, configRepositorios, esCancelacionSinProvision]);

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
      const documentosNuevos = [];
      for (const archivo of archivos) {
        const data = new FormData();
        data.append("archivo", archivo);
        data.append("categoria", categoria);
        const respuestaSubida = await axios.post(BASE(expedienteId), data);
        if (respuestaSubida?.data) documentosNuevos.push(respuestaSubida.data);
      }
      const lista = await cargar();
      // Solo la carpeta de la actividad Gestión económica genera obligaciones.
      // Adjuntar el documento nunca lo marca como pagado ni descuenta provisión.
      const categoriasEconomicas = ["factura-notarial", "factura-registro", "factura-registral", "factura-impuestos", "ajd-itp", "otros-impuestos"];
      if (modoActividad && normalizar(actividadId) === "gestion-economica" && categoriasEconomicas.includes(normalizar(categoria))) {
        let idInternoExpediente = expedienteDatos?.id;
        if (!idInternoExpediente) {
          const detalleExpediente = await axios.get(`/expedientes/${encodeURIComponent(expedienteId)}`);
          const datosDetalle = detalleExpediente?.data?.expediente || detalleExpediente?.data?.item || detalleExpediente?.data || null;
          idInternoExpediente = datosDetalle?.id;
        }
        if (!idInternoExpediente) {
          throw new Error("No se ha podido identificar el expediente interno para vincular la factura a Gestión económica.");
        }
        for (const documento of documentosNuevos) {
          await axios.post(`/expedientes/${encodeURIComponent(idInternoExpediente)}/gastos/vincular-documento`, {
            documento_carpeta_id: documento.id,
            categoria: documento.categoria || categoria,
            nombre_documento: documento.nombre_original || documento.nombre || "Documento económico",
            fecha: String(documento.fecha_subida || "").slice(0, 10) || null,
          });
        }
      }
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
    (categoria) => {
      const normalizarCategoria = (valor) => normalizar(valor).replace(/-/g, " ").replace(/\\s+/g, " ").trim();
      const categoriaNormalizada = normalizarCategoria(categoria);
      return documentos.filter((doc) => {
        const categoriaDocumento = normalizarCategoria(doc.categoria || doc.categoria_nombre || doc.tipo_documento);
        // Los nombres de categoría no deben depender de mayúsculas, minúsculas o tildes.
        if (categoriaDocumento === categoriaNormalizada) return true;
        // Conserva visibles los archivos subidos con los nombres del repositorio anterior.
        if (categoriaNormalizada === "hoja de presentacion") {
          return ["hoja de presentacion", "hoja de presentacion tacio"].includes(categoriaDocumento);
        }
        if (categoriaNormalizada === "borradores escrituras") {
          return ["escrituras/borradores", "borradores de escrituras", "borradores de escritura"].includes(categoriaDocumento);
        }
        if (categoriaNormalizada === "factura registro") {
          // Muestra también documentos históricos guardados como "Factura registral",
          // sin duplicar el repositorio en la vista de Cierre del expediente.
          return ["factura registro", "factura registral"].includes(categoriaDocumento);
        }
        if (categoriaNormalizada === "otros") {
          return categoriaDocumento === "borradores escrituras y otros";
        }
        return false;
      });
    },
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

  const notaIntegracionRepositorio = (categoria) => {
    // normalizar() convierte espacios en guiones; las claves deben seguir ese formato.
    const clave = normalizar(categoria);
    if (clave === "hoja-de-inscripcion") return "Pendiente API Registradores";
    if ([
      "hoja-de-encargo-firmada",
      "justificante-de-cancelacion",
      "nota-simple-registral",
      "copia-simple",
      "factura-notarial",
      "factura-registro",
      "factura-impuestos",
      "honorarios-gestoria",
      "ajd-itp",
      "defecto-registral",
      "expediente-digital-completo",
    ].includes(clave)) {
      return "Pendiente API ABSIS";
    }
    return "";
  };

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
          {notaIntegracionRepositorio(categoria) && (
            <div role="note" className="w-full rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-extrabold tracking-wide text-amber-800">
              {notaIntegracionRepositorio(categoria)}
            </div>
          )}
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
          <p className="mt-2 text-[10px] text-slate-400">{busquedaDocumento ? "Sin coincidencias con la búsqueda." : "No hay ficheros en este repositorio del expediente."}</p>
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
        {abierto && <div className={"grid grid-cols-1 gap-2 border-t border-slate-100 bg-slate-50/50 p-2 sm:p-3 " + (modoActividad ? "" : "sm:grid-cols-2 xl:grid-cols-4")}>{bloque.categorias.map(renderCategoria)}</div>}
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
              {modoActividad && (
                <section className="mb-3 rounded-xl border border-blue-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div><h4 className="text-xs font-extrabold text-slate-800">⏱️ Control SLA · {bloqueActividad?.titulo || actividadId}</h4><p className="mt-0.5 text-[10px] text-slate-500">Fechas propias de esta actividad; no se comparten con las demás fases.</p></div>
                    <button type="button" onClick={guardarFechasSlaActividad} disabled={guardandoFechasSla} className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50">{guardandoFechasSla ? "Guardando…" : "Guardar fechas"}</button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="block text-[10px] font-bold text-slate-500">Inicio actividad<input type="date" value={fechasSlaActividad.fecha_inicio} disabled={guardandoFechasSla} onChange={(e) => setFechasSlaActividad((v) => ({ ...v, fecha_inicio: e.target.value, fecha_fin: v.fecha_fin && e.target.value && v.fecha_fin < e.target.value ? "" : v.fecha_fin }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
                    <label className="block text-[10px] font-bold text-slate-500">Fin actividad<input type="date" min={fechasSlaActividad.fecha_inicio || undefined} value={fechasSlaActividad.fecha_fin} disabled={guardandoFechasSla} onChange={(e) => setFechasSlaActividad((v) => ({ ...v, fecha_fin: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-normal text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>
                  </div>
                  {errorFechasSla && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-2.5 py-2 text-[11px] text-rose-700">{errorFechasSla}</p>}
                  {mensajeFechasSla && <p role="status" className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] text-emerald-700">{mensajeFechasSla}</p>}
                </section>
              )}
              {modoActividad && actividadId === "documentacion-previa" && false ? (
                <div className="flex h-full min-h-[250px] flex-col overflow-y-auto rounded-xl border border-indigo-100 bg-white shadow-sm">
                  <header className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/70 px-3 py-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-extrabold text-indigo-950">✉️ Datos de envío a notario</h4>
                      <p className="mt-0.5 text-[11px] text-slate-500">Información sincronizada con el expediente y el modal de envío a notario</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAbrirEnvioNotario?.()}
                      title="Aviso: el formulario sigue siendo editable. La transmisión real a ABSIS está pendiente de integración; abrir o guardar el envío no confirma que ABSIS lo haya recibido."
                      aria-label="Abrir envío a notario. Aviso: la transmisión real a ABSIS está pendiente de integración."
                      className="shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      ✉️ Abrir envío a notario <span aria-hidden="true">ⓘ</span>
                    </button>
                  </header>
                  {(() => {
                    const d = datosEnvioNotario || {};
                    const valor = (...claves) => {
                      for (const clave of claves) {
                        const v = d?.[clave];
                        if (v !== undefined && v !== null && v !== "") return v;
                      }
                      return "";
                    };
                    const moneda = (v) => v === "" || v === null || v === undefined
                      ? ""
                      : (Number.isFinite(Number(v)) ? new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(v)) : v);
                    const fecha = (v) => {
                      if (!v) return "";
                      const s = String(v);
                      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                        const [y, m, dia] = s.split("-");
                        return `${dia}/${m}/${y}`;
                      }
                      return s;
                    };
                    const firma = valor("escritura_firmada");
                    const urgente = valor("firma_urgente");
                    const secciones = [
                      {
                        titulo: "📨 Envío y estado de la firma",
                        descripcion: "Estado actual y fechas registradas",
                        campos: [
                          ["Fecha de envío", fecha(valor("fecha_envio_notario", "fecha_envio", "fecha_envio_notaria"))],
                          ["¿Escritura firmada?", firma === true || ["sí", "si", "true", "1"].includes(String(firma).toLowerCase()) ? "Sí" : (firma === false || ["no", "false", "0"].includes(String(firma).toLowerCase()) ? "No" : "")],
                          ["Firma urgente", urgente === true || ["sí", "si", "true", "1"].includes(String(urgente).toLowerCase()) ? "Sí" : (urgente === false || ["no", "false", "0"].includes(String(urgente).toLowerCase()) ? "No" : "")],
                          ["Fecha de firma", fecha(valor("fecha_firma"))],
                        ],
                      },
                      {
                        titulo: "🏛️ Notario y apoderado",
                        descripcion: "Datos de la notaría y responsable de la firma",
                        campos: [
                          ["Notario", valor("nombre_notario", "notario")],
                          ["NIF notario", valor("nif_notario", "notario_nif")],
                          ["Población notario", valor("poblacion", "poblacion_notario", "municipio_notario")],
                          ["Provincia notario", valor("provincia", "provincia_notario")],
                          ["Apoderado", valor("apoderado", "apoderado_s")],
                        ],
                      },
                      {
                        titulo: "🗓️ Planificación de la firma",
                        descripcion: "Tipo de firma y planificación horaria",
                        campos: [
                          ["Tipo de firma", valor("tipo_firma")],
                          ["Fecha prevista", fecha(valor("fecha_prevista_firma"))],
                          ["Hora prevista", valor("hora_prevista_firma")],
                          ["Fin previsto", valor("hora_fin_prevista_firma", "fin_previsto")],
                          ["Protocolo", valor("protocolo")],
                        ],
                      },
                      {
                        titulo: "📄 Operación y documentación",
                        descripcion: "Características del documento y del trámite",
                        campos: [
                          ["Tipo de documento", valor("tipo_documento")],
                          ["Formato de escritura", valor("formato_escritura")],
                          ["Tipo de trámite", valor("tipo_tramite")],
                          ["Tipo de operación", valor("tipo_operacion", "tipoOperacion", "operacion")],
                          ["Subtipo de operación", valor("subtipo_operacion")],
                          ["Documento 1", Array.isArray(d.documentos_escritura) ? d.documentos_escritura[0]?.tipo_documento : valor("tipo_documento")],
                          ["Cuantía documento 1", Array.isArray(d.documentos_escritura) ? moneda(d.documentos_escritura[0]?.cuantia) : moneda(valor("cuantia", "capital_documento_notarial", "capital"))],
                          ["Otros documentos", Array.isArray(d.documentos_escritura) && d.documentos_escritura.length > 1 ? d.documentos_escritura.slice(1).map(x => x?.tipo_documento).filter(Boolean).join(", ") : valor("otros_documentos")],
                        ],
                      },
                      {
                        titulo: "💶 Datos económicos y registrales",
                        descripcion: "Referencias del préstamo, importe y finca",
                        campos: [
                          ["Contrato", valor("contrato")],
                          ["Capital", moneda(valor("capital_documento_notarial", "capital"))],
                          ["Importe", moneda(valor("importe"))],
                          ["Finca", valor("finca", "finca_registral", "numero_finca")],
                        ],
                      },
                      {
                        titulo: "🧾 Datos de facturación",
                        descripcion: "Datos identificativos y de contacto de facturación",
                        campos: [
                          ["Nombre", valor("facturacion_nombre", "nombre_facturacion")],
                          ["Apellidos", valor("facturacion_apellidos", "apellidos_facturacion")],
                          ["DNI/NIF", valor("facturacion_dni_nif", "dni_facturacion", "nif_facturacion")],
                          ["Dirección", valor("facturacion_direccion", "direccion_facturacion")],
                          ["Código postal", valor("facturacion_codigo_postal", "codigo_postal_facturacion")],
                          ["Población", valor("facturacion_poblacion", "poblacion_facturacion")],
                          ["Provincia", valor("facturacion_provincia", "provincia_facturacion")],
                          ["Teléfono", valor("facturacion_telefono", "telefono_facturacion")],
                          ["Email", valor("facturacion_email", "email_facturacion")],
                          ["Empleado", [true, "true", "1", "si", "sí"].includes(String(valor("facturacion_empleado") ?? "false").trim().toLowerCase()) ? "Sí" : "No"],
                          ["Idioma del documento", valor("idioma_documento", "idioma")],
                        ],
                      },
                      {
                        titulo: "📝 Información adicional",
                        descripcion: "Referencias de solicitud y notas",
                        campos: [
                          ["Nº solicitud SIA", valor("numero_solicitud_sia", "n_solicitud_sia", "numero_solicitud_pnc")],
                          ["Observaciones", valor("observaciones")],
                        ],
                      },
                    ];
                    return (
                      <div className="space-y-3 p-3">
                        {secciones.map((seccion) => (
                          <section key={seccion.titulo} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                              <h5 className="text-xs font-extrabold text-slate-800">{seccion.titulo}</h5>
                              <p className="mt-0.5 text-[10px] text-slate-500">{seccion.descripcion}</p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                              {seccion.campos.map(([etiqueta, dato]) => (
                                <div key={etiqueta} className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{etiqueta}</p>
                                  <p className="mt-0.5 break-words text-xs font-semibold text-slate-800">{dato !== null && dato !== undefined && dato !== "" ? String(dato) : "—"}</p>
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    );
                  })()}
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
              ? "grid min-h-[300px] grid-cols-1 gap-2 transition-[grid-template-columns] duration-300 lg:h-[800px] lg:min-h-[800px] lg:max-h-[800px] " + (ocultarPanelEnvioNotario || (normalizar(actividadId).includes("sede-notarial") && !normalizar(actividadId).includes("protocolo")) ? "lg:grid-cols-[minmax(0,1fr)]" : panelDocumentosVisible ? "lg:grid-cols-[minmax(190px,0.38fr)_minmax(0,1.62fr)]" : "lg:grid-cols-[0_minmax(0,1fr)]")
              : "grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 sm:p-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]"}
          >
            <div
              className={"flex min-h-0 min-w-0 flex-col overflow-hidden transition-[opacity,transform] duration-300 " + (modoActividad && normalizar(actividadId).includes("sede-notarial") && !normalizar(actividadId).includes("protocolo") ? "hidden" : modoActividad && !panelDocumentosVisible && !ocultarPanelEnvioNotario ? "hidden lg:flex" : "")}
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
                  {!modoActividad && CATEGORIAS_OTROS.length > 0 && (
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
              <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
                <header className="flex items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/70 px-3 py-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-indigo-950">
                      {actividadId === "documentacion-previa" || actividadId === "sede-notarial" ? "✉️ Envío al notario" : String(actividadId || "").includes("protocolo") ? "📋 Datos · Sede notarial con protocolo" : `📋 Datos · ${bloqueActividad?.titulo || "Actividad"}`}
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
                    {actividadId === "sede-notarial" && (
                      <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onAbrirEnvioNotario?.(); }} className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-2 text-[10px] font-extrabold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        ✉️ Envío al notario
                      </button>
                    )}
                  </div>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-3">
                  {(actividadId === "documentacion-previa" || actividadId === "sede-notarial") && formularioEnvioNotario ? formularioEnvioNotario : ((actividadId === "documentacion-previa" || actividadId === "sede-notarial") ? (
                    <div className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-2 2xl:grid-cols-2">
                      {[
                        {
                          titulo: "1. Envío al notario",
                          campos: [
                            ["Fecha de envío", datosEnvioNotario?.fecha_envio_notario || datosEnvioNotario?.fecha_envio],
                            ["¿Escritura firmada?", datosEnvioNotario?.escritura_firmada === true ? "Sí" : datosEnvioNotario?.escritura_firmada === false ? "No" : datosEnvioNotario?.escritura_firmada],
                            ["Firma urgente", datosEnvioNotario?.firma_urgente ? "Sí" : "No"],
                            ["Tipo de firma", datosEnvioNotario?.tipo_firma],
                            ["Fin previsto", datosEnvioNotario?.hora_fin_prevista_firma],
                          ],
                        },
                        {
                          titulo: "2. Tipo de documento",
                          campos: [
                            ["Tipo de documento", datosEnvioNotario?.tipo_documento],
                            ["Formato de escritura", datosEnvioNotario?.formato_escritura],
                            ["Tipo de trámite", datosEnvioNotario?.tipo_tramite],
                            ["Tipo operación", datosEnvioNotario?.tipo_operacion],
                            ["Documento 1", datosEnvioNotario?.documentos_escritura?.[0]?.tipo_documento || datosEnvioNotario?.tipo_documento],
                            ["Cuantía documento 1", datosEnvioNotario?.documentos_escritura?.[0]?.cuantia || datosEnvioNotario?.cuantia],
                            ["Importe (€)", datosEnvioNotario?.importe],
                            ["Finca", datosEnvioNotario?.finca || datosEnvioNotario?.finca_registral || datosEnvioNotario?.numero_finca],
                          ],
                        },
                        {
                          titulo: "3. Datos del notario",
                          campos: [
                            ["Notario", datosEnvioNotario?.nombre_notario || datosEnvioNotario?.notario],
                            ["NIF notario", datosEnvioNotario?.nif_notario],
                            ["Población notario", datosEnvioNotario?.poblacion],
                            ["Provincia notario", datosEnvioNotario?.provincia],
                            ["Apoderado", datosEnvioNotario?.apoderado],
                          ],
                        },
                        {
                          titulo: "4. Datos de facturación",
                          campos: [
                            ["Nombre", datosEnvioNotario?.facturacion_nombre],
                            ["Apellidos", datosEnvioNotario?.facturacion_apellidos],
                            ["DNI / NIF", datosEnvioNotario?.facturacion_dni_nif],
                            ["Dirección", datosEnvioNotario?.facturacion_direccion],
                            ["Código postal", datosEnvioNotario?.facturacion_codigo_postal],
                            ["Población", datosEnvioNotario?.facturacion_poblacion],
                            ["Provincia", datosEnvioNotario?.facturacion_provincia],
                            ["Teléfono", datosEnvioNotario?.facturacion_telefono],
                            ["Email", datosEnvioNotario?.facturacion_email],
                            ["Empleado", [true, "true", "1", "si", "sí"].includes(String(datosEnvioNotario?.facturacion_empleado ?? datosPanelActividad?.facturacion_empleado ?? expedienteDatos?.facturacion_empleado ?? false).trim().toLowerCase()) ? "Sí" : "No"],
                            ["Idioma del documento", datosEnvioNotario?.idioma_documento || datosEnvioNotario?.idioma],
                          ],
                        },
                      ].map((seccion) => (
                        <section key={seccion.titulo} className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <h5 className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-extrabold text-slate-800">{seccion.titulo}</h5>
                          <div className="space-y-0 px-2.5 py-1.5">
                            {seccion.campos.map(([etiqueta, valor]) => (
                              <div key={etiqueta} className="min-w-0 border-b border-slate-100 py-1.5 last:border-b-0">
                                <p className="text-[10px] font-bold text-slate-500">{etiqueta}</p>
                                <p className="break-words text-[11px] font-semibold text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : (
                    (["liquidacion-impuestos", "tramitacion-inscripcion", "defectos-registrales", "facturacion-cierre"].includes(actividadId)) ? (
                      <div className={`grid min-w-0 grid-cols-1 items-start gap-3 ${actividadId === "facturacion-cierre" ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}>
                        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <h5 className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-extrabold text-slate-800">📋 Datos · {bloqueActividad?.titulo || ({ "liquidacion-impuestos": "Liquidación de impuestos", "tramitacion-inscripcion": "Tramitación inscripción", "defectos-registrales": "Defectos registrales", "facturacion-cierre": "Cierre del expediente" }[actividadId] || "Datos de actividad")}</h5>
                          <div className="grid min-w-0 grid-cols-1 gap-1.5 px-2.5 py-2 sm:grid-cols-2 xl:grid-cols-1">

                            {actividadId === "facturacion-cierre" && (
                              <div className="min-w-0 rounded-md border border-indigo-100 bg-indigo-50/70 px-2 py-2">
                                <p className="text-[10px] font-bold text-indigo-700">Fecha de cierre</p>
                                <p className="break-words text-[12px] font-extrabold text-slate-900">{(() => { const fecha = datosPanelActividad?.fecha_fin_actividad || expedienteDatos?.fecha_fin_actividad || datosPanelActividad?.fecha_liquidacion || expedienteDatos?.fecha_liquidacion; if (!fecha) return "Pendiente de cierre"; const s = String(fecha).slice(0, 10); const partes = s.split("-"); return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : s; })()}</p>
                              </div>
                            )}
                            {camposPanelActividad
                              .filter((campo) => !["fecha_inicio_actividad", "fecha_fin_actividad"].includes(campo.key))
                              .map((campo) => {
                                const valor = datosPanelActividad?.[campo.key];
                                return (
                                  <div key={campo.key} className="min-w-0 rounded-md border border-slate-100 bg-slate-50/60 px-2 py-1.5">
                                    <p className="text-[10px] font-bold text-slate-500">{campo.label}</p>
                                    <p className="break-words text-[11px] font-semibold text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</p>
                                  </div>
                                );
                              })}
                            {camposPanelActividad.filter((campo) => !["fecha_inicio_actividad", "fecha_fin_actividad"].includes(campo.key)).length === 0 && <p className="text-xs text-slate-500">Los campos específicos de esta actividad aparecerán aquí.</p>}
                          </div>
                        </section>
                        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <h5 className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-extrabold text-slate-800">Datos notariales y de presentación</h5>
                          <div className="space-y-0 px-2.5 py-1.5">
                            {[
                              ["Notario", datosEnvioNotario?.nombre_notario || datosEnvioNotario?.notario?.nombre || datosPanelActividad?.nombre_notario || datosPanelActividad?.notario],
                              ["NIF notario", datosEnvioNotario?.nif_notario || datosEnvioNotario?.notario?.nif || datosPanelActividad?.nif_notario || datosPanelActividad?.notario_nif],
                              ["Tipo de escritura", datosEnvioNotario?.tipo_escritura || datosEnvioNotario?.tipo_documento || datosPanelActividad?.tipo_escritura || datosPanelActividad?.tipo_documento],
                              ["Formato de escritura", datosEnvioNotario?.formato_escritura || datosPanelActividad?.formato_escritura || datosPanelActividad?.formato_escritura_notarial],
                              ["Fecha firma", datosEnvioNotario?.fecha_firma || datosEnvioNotario?.fecha_real_firma || datosPanelActividad?.fecha_firma || datosPanelActividad?.fecha_real_firma],
                              ["Protocolo", datosEnvioNotario?.protocolo || datosPanelActividad?.protocolo || datosPanelActividad?.numero_protocolo],
                            ].map(([etiqueta, valor]) => (
                              <div key={etiqueta} className="min-w-0 border-b border-slate-100 py-1.5 last:border-b-0">
                                <p className="text-[10px] font-bold text-slate-500">{etiqueta}</p>
                                <p className="break-words text-[11px] font-semibold text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                        {actividadId !== "facturacion-cierre" && (
                        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <h5 className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-extrabold text-slate-800">Datos de facturación</h5>
                          <div className="space-y-0 px-2.5 py-1.5">
                            {[
                              ["Nombre", datosPanelActividad?.facturacion_nombre || datosPanelActividad?.nombre_facturacion || datosPanelActividad?.nombre_cliente_facturacion],
                              ["Apellidos", datosPanelActividad?.facturacion_apellidos || datosPanelActividad?.apellidos_facturacion || datosPanelActividad?.apellidos_cliente_facturacion],
                              ["DNI / NIF de facturación", datosPanelActividad?.facturacion_dni_nif || datosPanelActividad?.dni_facturacion || datosPanelActividad?.nif_facturacion],
                              ["Dirección", datosPanelActividad?.facturacion_direccion || datosPanelActividad?.direccion_facturacion || datosPanelActividad?.direccion_cliente_facturacion],
                              ["Código postal", datosPanelActividad?.facturacion_codigo_postal || datosPanelActividad?.codigo_postal_facturacion || datosPanelActividad?.cp_facturacion],
                              ["Población", datosPanelActividad?.facturacion_poblacion || datosPanelActividad?.poblacion_facturacion || datosPanelActividad?.municipio_facturacion],
                              ["Provincia", datosPanelActividad?.facturacion_provincia || datosPanelActividad?.provincia_facturacion],
                              ["Teléfono", datosPanelActividad?.facturacion_telefono || datosPanelActividad?.telefono_facturacion || datosPanelActividad?.telefono_cliente_facturacion],
                              ["Email", datosPanelActividad?.facturacion_email || datosPanelActividad?.email_facturacion || datosPanelActividad?.correo_facturacion],
                              ["Empleado", [true, "true", "1", "si", "sí"].includes(String(datosPanelActividad?.facturacion_empleado ?? expedienteDatos?.facturacion_empleado ?? false).trim().toLowerCase()) ? "Sí" : "No"],
                            ].map(([etiqueta, valor]) => (
                              <div key={etiqueta} className="min-w-0 border-b border-slate-100 py-1.5 last:border-b-0">
                                <p className="text-[10px] font-bold text-slate-500">{etiqueta}</p>
                                <p className="break-words text-[11px] font-semibold text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    ) : String(actividadId || "").includes("protocolo") ? (
                      <div className="grid w-full min-w-0 grid-cols-2 items-start gap-3">
                        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <h5 className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-extrabold text-slate-800">Datos notariales y de presentación</h5>
                          <div className="space-y-0 px-2.5 py-1.5">
                            {[
                              // Los datos se leen del envío a notario y se muestran en el formato común de actividad.
                              ["Notario", datosEnvioNotario?.nombre_notario || datosEnvioNotario?.notario?.nombre || datosPanelActividad?.nombre_notario || datosPanelActividad?.notario],
                              ["NIF notario", datosEnvioNotario?.nif_notario || datosEnvioNotario?.notario?.nif || datosPanelActividad?.nif_notario || datosPanelActividad?.notario_nif],
                              ["Tipo de escritura", datosEnvioNotario?.tipo_escritura || datosEnvioNotario?.tipo_documento || datosPanelActividad?.tipo_escritura || datosPanelActividad?.tipo_documento],
                              ["Tipo de firma", datosEnvioNotario?.tipo_firma || datosEnvioNotario?.notario?.tipo_firma || datosPanelActividad?.tipo_firma],
                              ["Formato de escritura", datosEnvioNotario?.formato_escritura || datosPanelActividad?.formato_escritura],
                              ["Fecha firma", datosEnvioNotario?.fecha_firma || datosPanelActividad?.fecha_firma],
                              ["Protocolo", datosEnvioNotario?.protocolo || datosPanelActividad?.protocolo],
                              ["Asiento presentación", datosPanelActividad?.asiento_presentacion || datosPanelActividad?.asiento_presentacion_libro_diario],
                              ["Libro diario", datosPanelActividad?.libro_diario || datosPanelActividad?.asiento_presentacion_libro_diario],
                              ["Fecha presentación", datosPanelActividad?.fecha_presentacion],
                              ["Número de entrada", datosPanelActividad?.numero_entrada],
                              ["Fecha recogida notario o presentación telemática", datosPanelActividad?.fecha_recogida_notario_presentacion_telematica || datosPanelActividad?.fecha_recogida_notario_o_presentacion_telematica],
                            ].map(([etiqueta, valor]) => (
                              <div key={etiqueta} className="min-w-0 border-b border-slate-100 py-1.5 last:border-b-0">
                                <p className="text-[10px] font-bold text-slate-500">{etiqueta}</p>
                                <p className="break-words text-[11px] font-semibold text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                        <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <h5 className="border-b border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-extrabold text-slate-800">Datos de facturación</h5>
                          <div className="space-y-0 px-2.5 py-1.5">
                            {[
                              ["Nombre", datosPanelActividad?.facturacion_nombre || datosPanelActividad?.nombre_facturacion || datosPanelActividad?.nombre_cliente_facturacion],
                              ["Apellidos", datosPanelActividad?.facturacion_apellidos || datosPanelActividad?.apellidos_facturacion],
                              ["DNI / NIF de facturación", datosPanelActividad?.facturacion_dni_nif || datosPanelActividad?.dni_facturacion || datosPanelActividad?.nif_facturacion],
                              ["Dirección", datosPanelActividad?.facturacion_direccion || datosPanelActividad?.direccion_facturacion],
                              ["Código postal", datosPanelActividad?.facturacion_codigo_postal || datosPanelActividad?.codigo_postal_facturacion],
                              ["Población", datosPanelActividad?.facturacion_poblacion || datosPanelActividad?.poblacion_facturacion],
                              ["Provincia", datosPanelActividad?.facturacion_provincia || datosPanelActividad?.provincia_facturacion],
                              ["Teléfono", datosPanelActividad?.facturacion_telefono || datosPanelActividad?.telefono_facturacion],
                              ["Email", datosPanelActividad?.facturacion_email || datosPanelActividad?.email_facturacion],
                              ["Empleado", [true, "true", "1", "si", "sí"].includes(String(datosPanelActividad?.facturacion_empleado ?? expedienteDatos?.facturacion_empleado ?? false).trim().toLowerCase()) ? "Sí" : "No"],
                            ].map(([etiqueta, valor]) => (
                              <div key={etiqueta} className="min-w-0 border-b border-slate-100 py-1.5 last:border-b-0">
                                <p className="text-[10px] font-bold text-slate-500">{etiqueta}</p>
                                <p className="break-words text-[11px] font-semibold text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                        )}
                      </div>
                    ) : (
                    actividadId === "gestion-economica" ? (
                      <>
                      <div className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-2">
                        {[
                          {
                            titulo: "Datos de facturación",
                            campos: [
                              ["Nombre", datosPanelActividad?.facturacion_nombre],
                              ["Apellidos", datosPanelActividad?.facturacion_apellidos],
                              ["DNI / NIF de facturación", datosPanelActividad?.facturacion_dni_nif || datosPanelActividad?.dni_facturacion || datosPanelActividad?.nif_facturacion],
                              ["Dirección", datosPanelActividad?.facturacion_direccion || datosPanelActividad?.direccion_facturacion],
                              ["Código postal", datosPanelActividad?.facturacion_codigo_postal || datosPanelActividad?.codigo_postal_facturacion],
                              ["Población", datosPanelActividad?.facturacion_poblacion || datosPanelActividad?.poblacion_facturacion],
                              ["Provincia", datosPanelActividad?.facturacion_provincia || datosPanelActividad?.provincia_facturacion],
                              ["Teléfono", datosPanelActividad?.facturacion_telefono || datosPanelActividad?.telefono_facturacion],
                              ["Email", datosPanelActividad?.facturacion_email || datosPanelActividad?.email_facturacion],
                              ["Empleado", [true, "true", "1", "si", "sí"].includes(String(datosPanelActividad?.facturacion_empleado ?? expedienteDatos?.facturacion_empleado ?? false).trim().toLowerCase()) ? "Sí" : "No"],
                            ],
                          },
                          {
                            titulo: "Tipo de documento",
                            campos: [
                              ["Contrato", datosPanelActividad?.contrato],
                              ["Capital (€)", datosPanelActividad?.capital],
                              ["Tipo de operación", datosPanelActividad?.tipo_operacion || datosPanelActividad?.tipoOperacion || datosPanelActividad?.operacion],
                              ["Subtipo de operación", datosPanelActividad?.subtipo_operacion],
                              ["Idioma del documento", datosPanelActividad?.idioma_documento || datosPanelActividad?.idioma],
                              ["Importe (€)", datosPanelActividad?.importe],
                              ["Documento 1 · Tipo de documento", datosPanelActividad?.documentos_escritura?.[0]?.tipo_documento || datosPanelActividad?.tipo_documento],
                              ["Documento 1 · Cuantía (€)", datosPanelActividad?.documentos_escritura?.[0]?.cuantia_documento ?? datosPanelActividad?.documentos_escritura?.[0]?.cuantia ?? datosPanelActividad?.cuantia_documento ?? datosPanelActividad?.cuantia ?? datosPanelActividad?.capital],
                              ["Formato de escritura", datosPanelActividad?.formato_escritura],
                              ["Tipo de trámite", datosPanelActividad?.tipo_tramite],
                            ],
                          },
                        ].map((seccion) => (
                          <section key={seccion.titulo} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            <h5 className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-800">{seccion.titulo}</h5>
                            <div className="grid min-w-0 grid-cols-1 gap-1.5 px-3 py-2 sm:grid-cols-2 2xl:grid-cols-3">
                              {seccion.campos.map(([etiqueta, valor]) => (
                                <div key={etiqueta} className="flex min-w-0 flex-col items-start gap-0.5 rounded-md border border-slate-100 bg-slate-50/60 px-2 py-1.5">
                                  <span className="text-[10px] font-bold leading-tight text-slate-500">{etiqueta}</span>
                                  <span className="min-w-0 break-words text-[11px] font-semibold leading-snug text-slate-800">{valor !== null && valor !== undefined && valor !== "" ? String(valor) : "—"}</span>
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>

                      {actividadId === "gestion-economica" && panelLibroPagos}
                      {formularioPago}
                      </>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
                        {camposPanelActividad
                          .filter((campo) => !["fecha_inicio_actividad", "fecha_fin_actividad"].includes(campo.key))
                          .filter((campo) => !(normalizar(actividadId).includes("sede-notarial") && normalizar(actividadId).includes("protocolo") && normalizar(campo.label) === "tipo-firma"))
                          .map((campo) => {
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
                         {actividadId === "facturacion-cierre" && (
                           <div className="mt-2 min-w-0 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2">
                             <p className="text-[10px] font-bold text-indigo-700">Fecha de cierre (fecha de liquidación)</p>
                             <p className="break-words text-xs font-extrabold text-slate-900">
                               {(() => {
                                 const fecha = datosPanelActividad?.fecha_fin_actividad || expedienteDatos?.fecha_fin_actividad || datosPanelActividad?.fecha_liquidacion || expedienteDatos?.fecha_liquidacion;
                                 if (!fecha) return "—";
                                 const valorFecha = String(fecha).slice(0, 10);
                                 const partes = valorFecha.split("-");
                                 return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valorFecha;
                               })()}
                             </p>
                           </div>
                         )}
                      </div>
                    )
                  )))}
                  {actividadId === "facturacion-cierre" && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onLiquidar?.()}
                          disabled={!onLiquidar || !facturaEmitida}
                          className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-40"
                          title={facturaEmitida ? "Revisar provisión, movimientos y confirmar el cierre" : "Primero debes generar y guardar la factura de honorarios"}
                        >
                          ⚖️ Liquidar
                        </button>
                      </div>
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
