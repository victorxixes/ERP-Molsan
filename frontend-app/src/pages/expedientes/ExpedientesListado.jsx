import { formatEuro } from "../../utils/formatters";
import {
  useEffect,
  useState,
} from "react";
import axios from "../../api/axios";
import { useAuthStore } from "../../store/authStore";
import CarpetaDigitalModal from "../../components/expedientes/CarpetaDigitalModal";
import "./ExpedientesListado.css";

import {
  Link,
} from "react-router-dom";

import {
  obtenerListadoExpedientes,
  exportarExcelExpedientes,
  obtenerResumenExpedientes,
  obtenerAlertasControlExpedientes,
  obtenerCatalogosListadoExpedientes,
} from "../../api/expedientes";


// ============================================================
// COLUMNAS
// ============================================================

const COLUMNAS = [

  // ==========================================================
  // IDENTIFICACIÓN
  // ==========================================================

  {
    key: "id_expediente",
    label: "Nº Expediente",
    tipo: "texto",
  },

  {
    key: "promocion",
    label: "Promoción",
    tipo: "texto",
  },

  {
    key: "id",
    label: "ID",
    tipo: "numero",
  },

  {
    key: "cliente_id",
    label: "ID Cliente",
    tipo: "numero",
  },


  // ==========================================================
  // ESTADOS
  // ==========================================================

  {
    key: "estado_expediente",
    label: "Estado expediente",
    tipo: "texto",
  },

  {
    key: "estado_expediente_ancert",
    label: "Estado ANCERT",
    tipo: "texto",
  },

  {
    key: "estado_actividad",
    label: "Estado actividad",
    tipo: "texto",
  },

  {
    key: "facturacion_estado",
    label: "Estado facturación",
    tipo: "texto",
  },

  {
    key: "estado_facturas",
    label: "Facturas · estado de pago",
    tipo: "texto",
  },

  {
    key: "registral_estado",
    label: "Estado registral",
    tipo: "texto",
  },


  // ==========================================================
  // FECHAS
  // ==========================================================

  {
    key: "fecha_alta",
    label: "Fecha alta",
    tipo: "fecha",
  },

  {
    key: "fecha_firma",
    label: "Fecha firma",
    tipo: "fecha",
  },

  {
    key: "fecha_inscripcion",
    label: "Fecha inscripción",
    tipo: "fecha",
  },

  {
    key: "fecha_entregado_cliente",
    label: "Fecha entregado cliente",
    tipo: "fecha",
  },

  {
    key: "fecha_prevista_firma",
    label: "Fecha prevista firma",
    tipo: "fecha",
  },

  {
    key: "fecha_vencimiento",
    label: "Fecha vencimiento",
    tipo: "fecha",
  },

  {
    key: "fecha_sol_cgn",
    label: "Fecha solicitud CGN",
    tipo: "fecha",
  },

  {
    key: "fecha_firma_prev_val",
    label: "Firma prev. validación",
    tipo: "fecha",
  },

  {
    key: "fecha_firma_prev_cli",
    label: "Firma prev. cliente",
    tipo: "fecha",
  },

  {
    key: "fecha_inicio_actividad",
    label: "Inicio actividad",
    tipo: "fecha",
  },

  {
    key: "fecha_fin_actividad",
    label: "Fin actividad",
    tipo: "fecha",
  },

  {
    key: "fcierre_defecto",
    label: "Cierre defecto",
    tipo: "fecha",
  },

  {
    key: "facturacion_fecha",
    label: "Fecha facturación",
    tipo: "fecha",
  },

  {
    key: "registral_fecha",
    label: "Fecha registral",
    tipo: "fecha",
  },


  // ==========================================================
  // ACTIVIDAD
  // ==========================================================

  {
    key: "actividad_actual",
    label: "Actividad actual",
    tipo: "texto",
  },


  // ==========================================================
  // TITULAR
  // ==========================================================

  {
    key: "nombre_titular",
    label: "Nombre titular",
    tipo: "texto",
  },

  {
    key: "nif_titular",
    label: "NIF titular",
    tipo: "texto",
  },


  // ==========================================================
  // SOLICITANTE
  // ==========================================================

  {
    key: "nombre_solicitante",
    label: "Nombre solicitante",
    tipo: "texto",
  },

  {
    key: "nif_solicitante",
    label: "NIF solicitante",
    tipo: "texto",
  },

  {
    key: "apoderado",
    label: "Apoderado",
    tipo: "texto",
  },


  // ==========================================================
  // NOTARIO
  // ==========================================================

  {
    key: "nombre_notario",
    label: "Nombre notario",
    tipo: "texto",
  },

  {
    key: "nif_notario",
    label: "NIF notario",
    tipo: "texto",
  },

  {
    key: "notario",
    label: "Notario",
    tipo: "texto",
  },


  // ==========================================================
  // OFICINA
  // ==========================================================

  {
    key: "oficina",
    label: "Oficina",
    tipo: "texto",
  },

  {
    key: "dan",
    label: "DAN",
    tipo: "texto",
  },

  {
    key: "oficina_alta",
    label: "Oficina alta",
    tipo: "texto",
  },


  // ==========================================================
  // ECONÓMICOS
  // ==========================================================

  {
    key: "capital",
    label: "Capital",
    tipo: "moneda",
  },

  {
    key: "importe",
    label: "Importe",
    tipo: "moneda",
  },

  {
    key: "saldo_real",
    label: "Saldo real",
    tipo: "moneda",
  },

  {
    key: "saldo_disponible",
    label: "Saldo disponible",
    tipo: "moneda",
  },


  // ==========================================================
  // PROVISIÓN
  // ==========================================================

  {
    key: "id_provision",
    label: "ID provisión",
    tipo: "texto",
  },

  {
    key: "tipo_provision",
    label: "Tipo provisión",
    tipo: "texto",
  },


  // ==========================================================
  // OPERACIÓN
  // ==========================================================

  {
    key: "contrato",
    label: "Contrato",
    tipo: "texto",
  },

  {
    key: "num_solicitud_sia",
    label: "Nº solicitud SIA",
    tipo: "texto",
  },

  {
    key: "tipo_operacion",
    label: "Tipo operación",
    tipo: "texto",
  },

  {
    key: "subtipo_operacion",
    label: "Subtipo operación",
    tipo: "texto",
  },

  {
    key: "vinccanc",
    label: "VincCanc",
    tipo: "texto",
  },

  {
    key: "protocolo",
    label: "Protocolo",
    tipo: "texto",
  },


  // ==========================================================
  // GTG / BANKIA
  // ==========================================================

  {
    key: "origen_bankia",
    label: "Origen Bankia",
    tipo: "texto",
  },

  {
    key: "producto_gtg",
    label: "Producto GTG",
    tipo: "texto",
  },

  {
    key: "dt",
    label: "DT",
    tipo: "texto",
  },


  // ==========================================================
  // GESTORÍA
  // ==========================================================

  {
    key: "id_gestoria_tramite",
    label: "ID gestoría trámite",
    tipo: "texto",
  },

  {
    key: "nombre_gestoria",
    label: "Nombre gestoría",
    tipo: "texto",
  },

  {
    key: "gestoria",
    label: "Gestoría",
    tipo: "texto",
  },


  // ==========================================================
  // FINCA
  // ==========================================================

  {
    key: "finca",
    label: "Finca",
    tipo: "texto",
  },


  // ==========================================================
  // DEFECTOS
  // ==========================================================

  {
    key: "tiene_defectos_abiertos",
    label: "Defectos abiertos",
    tipo: "texto",
  },

  {
    key: "tipo_error",
    label: "Tipo error",
    tipo: "texto",
  },

  {
    key: "descripcion_error",
    label: "Descripción error",
    tipo: "texto",
  },

  {
    key: "falta_defecto",
    label: "Falta / defecto",
    tipo: "texto",
  },


  // ==========================================================
  // CGN
  // ==========================================================

  {
    key: "id_expediente_cgn",
    label: "ID expediente CGN",
    tipo: "texto",
  },


  // ==========================================================
  // ACTA
  // ==========================================================

  {
    key: "tipo_acta",
    label: "Tipo acta",
    tipo: "texto",
  },


  // ==========================================================
  // OTROS
  // ==========================================================

  {
    key: "lucy",
    label: "Lucy",
    tipo: "texto",
  },

  {
    key: "indicador_tt",
    label: "Indicador TT",
    tipo: "texto",
  },


  // ==========================================================
  // OBSERVACIONES
  // ==========================================================

  {
    key: "observaciones",
    label: "Observaciones",
    tipo: "texto",
  },

  // Documentación de la carpeta digital y documentos necesarios para iniciar el trámite.
  // Repositorios de la carpeta digital (las claves adicionales permiten
  // seleccionar cada categoría documental de CarpetaDigitalModal).
  { key: "carpeta_digital", label: "Carpeta digital", tipo: "texto" },
  { key: "documentos_absis", label: "Documentos ABSIS", tipo: "texto" },
  { key: "hoja_encargo_firmada", label: "Hoja de encargo firmada", tipo: "texto" },
  { key: "justificante_cancelacion", label: "Justificante de cancelación", tipo: "texto" },
  { key: "nota_simple_registral", label: "Nota simple registral", tipo: "texto" },
  { key: "borradores_escritura", label: "Borradores de escritura", tipo: "texto" },
  { key: "presentacion_registro_documentos", label: "Presentación Registro", tipo: "texto" },
  { key: "copia_simple_documentos", label: "Copia simple", tipo: "texto" },
  { key: "ajd_itp_documentos", label: "AJD / ITP", tipo: "texto" },
  { key: "otros_impuestos_documentos", label: "Otros impuestos", tipo: "texto" },
  { key: "hoja_inscripcion_documentos", label: "Hoja de inscripción", tipo: "texto" },
  { key: "defecto_registral", label: "Defecto registral", tipo: "texto" },
  { key: "subsanacion_defecto", label: "Subsanación del defecto", tipo: "texto" },
  { key: "escritura_digital_final_documentos", label: "Escritura digital final", tipo: "texto" },
  { key: "documento_inscripcion_documentos", label: "Documento de inscripción", tipo: "texto" },
  { key: "expediente_digital_completo_documentos", label: "Expediente digital completo", tipo: "texto" },
  { key: "factura_notarial_documentos", label: "Factura notarial", tipo: "texto" },
  { key: "factura_registral_documentos", label: "Factura registral", tipo: "texto" },
  { key: "factura_impuestos_documentos", label: "Factura impuestos", tipo: "texto" },
  { key: "honorarios_gestoria_documentos", label: "Honorarios de gestoría", tipo: "texto" },
  { key: "otra_documentacion", label: "Otra documentación", tipo: "texto" },
  { key: "emails_oficina", label: "Emails de oficina", tipo: "texto" },
  { key: "otros_documentos", label: "Otros", tipo: "texto" },

  { key: "sol", label: "SOL", tipo: "texto" },
  { key: "cs", label: "CS", tipo: "texto" },
  { key: "ns", label: "NS", tipo: "texto" },
  { key: "ultima_accion", label: "Última acción", tipo: "texto" },
  { key: "fecha_ultima_accion", label: "Fecha última acción", tipo: "fecha" },
  { key: "fecha_envio", label: "Fecha de envío", tipo: "fecha" },
  { key: "tipo_documento", label: "Tipo documento", tipo: "texto" },
  { key: "poblacion", label: "Población", tipo: "texto" },
  { key: "provincia", label: "Provincia", tipo: "texto" },
  { key: "tipo_firma", label: "Tipo de firma", tipo: "texto" },
  { key: "asiento_presentacion_libro_diario", label: "Asiento presentación / Libro diario", tipo: "texto" },
  { key: "fecha_presentacion", label: "Fecha presentación", tipo: "fecha" },
  { key: "numero_entrada", label: "Número de Entrada", tipo: "texto" },
  { key: "fecha_recogida_notario_presentacion_telematica", label: "Fecha recogida Notario o presentación telemática", tipo: "fecha" },
  { key: "copia_simple_escritura", label: "Copia simple escritura", tipo: "texto" },
  { key: "fecha_presentacion_tributaria", label: "Fecha presentación tributaria", tipo: "fecha" },
  { key: "fecha_liquidacion_tributaria", label: "Fecha liquidación tributaria", tipo: "fecha" },
  { key: "oficina_liquidadora", label: "Oficina liquidadora", tipo: "texto" },
  { key: "base_imponible", label: "Base imponible", tipo: "moneda" },
  { key: "tributacion", label: "Tributación", tipo: "texto" },
  { key: "impuesto_ajd_itp", label: "Impuesto (AJD/ITP)", tipo: "texto" },
  { key: "fecha_vencimiento_asiento", label: "Fecha vencimiento asiento", tipo: "fecha" },
  { key: "escritura_simple_cancelacion", label: "Escritura simple de cancelación", tipo: "texto" },

  // Columnas del catálogo Excel que también deben poder verse en la tabla web.
  { key: "fecha_envio_notario", label: "Fecha envío notario", tipo: "fecha" },
  { key: "fecha_solicitud_pnc", label: "Fecha solicitud PNC", tipo: "fecha" },
  { key: "numero_solicitud_pnc", label: "Número solicitud PNC", tipo: "texto" },
  { key: "idioma_documento", label: "Idioma documento", tipo: "texto" },
  { key: "formato_escritura", label: "Formato escritura", tipo: "texto" },
  { key: "tipo_tramite", label: "Tipo trámite", tipo: "texto" },
  { key: "facturacion_nombre", label: "Nombre facturación", tipo: "texto" },
  { key: "facturacion_apellidos", label: "Apellidos facturación", tipo: "texto" },
  { key: "facturacion_dni_nif", label: "DNI/NIF facturación", tipo: "texto" },
  { key: "facturacion_direccion", label: "Dirección facturación", tipo: "texto" },
  { key: "facturacion_codigo_postal", label: "Código postal facturación", tipo: "texto" },
  { key: "facturacion_poblacion", label: "Población facturación", tipo: "texto" },
  { key: "facturacion_provincia", label: "Provincia facturación", tipo: "texto" },
  { key: "facturacion_telefono", label: "Teléfono facturación", tipo: "texto" },
  { key: "facturacion_email", label: "Email facturación", tipo: "texto" },
  { key: "impuesto_ajd_itp", label: "Impuesto (AJD/ITP)", tipo: "texto" },

];


// ============================================================
// COLUMNAS VISIBLES POR DEFECTO
// ============================================================

const COLUMNAS_POR_DEFECTO = [
  // Vista inicial deliberadamente sencilla: el resto de datos sigue disponible
  // desde "Columnas visibles" o al abrir la ficha del expediente.
  "id_expediente",
  "estado_expediente",
  "actividad_actual",
  "fecha_alta",
  "nombre_titular",
  "nombre_solicitante",
  "nombre_notario",
  "oficina",
];

// Campos procedentes de las columnas conocidas del Excel de ABSIS.
const COLUMNAS_EXCEL_ABSIS = [
  "id_expediente", "estado_expediente", "fecha_alta", "origen_bankia",
  "observaciones", "dt", "producto_gtg", "fecha_firma", "apoderado",
  "fecha_inscripcion", "actividad_actual", "estado_actividad",
  "fecha_inicio_actividad", "fecha_fin_actividad", "id_provision",
  "tipo_provision", "contrato", "num_solicitud_sia", "tipo_operacion",
  "subtipo_operacion", "id_gestoria_tramite", "nombre_gestoria",
  "oficina", "dan", "oficina_alta", "capital", "importe", "saldo_real",
  "saldo_disponible", "vinccanc", "protocolo", "finca",
  "nombre_solicitante", "nif_solicitante", "nombre_titular", "nif_titular",
  "nombre_notario", "nif_notario", "tiene_defectos_abiertos", "tipo_error",
  "descripcion_error", "falta_defecto", "fcierre_defecto",
  "estado_expediente_ancert", "id_expediente_cgn", "fecha_sol_cgn",
  "fecha_entregado_cliente",
];

// Repositorios de la carpeta digital. Se separan visualmente de los campos ABSIS.
const REPOSITORIOS_CARPETA_DIGITAL = [
  { key: "documentos_absis", label: "Documentos ABSIS" },
  { key: "hoja_encargo_firmada", label: "Hoja de encargo firmada" },
  { key: "justificante_cancelacion", label: "Justificante de cancelación" },
  { key: "nota_simple_registral", label: "Nota simple registral" },
  { key: "borradores_escritura", label: "Borradores escrituras" },
  { key: "presentacion_registro_documentos", label: "Presentación Registro" },
  { key: "copia_simple_documentos", label: "Copia simple" },
  { key: "ajd_itp_documentos", label: "AJD / ITP" },
  { key: "otros_impuestos_documentos", label: "Otros impuestos" },
  { key: "hoja_inscripcion_documentos", label: "Hoja de inscripción" },
  { key: "defecto_registral", label: "Defecto registral" },
  { key: "subsanacion_defecto", label: "Subsanación del defecto" },
  { key: "escritura_digital_final_documentos", label: "Escritura digital final" },
  { key: "documento_inscripcion_documentos", label: "Documento de inscripción" },
  { key: "expediente_digital_completo_documentos", label: "Expediente digital completo" },
  { key: "factura_notarial_documentos", label: "Factura notarial" },
  { key: "factura_registral_documentos", label: "Factura registral" },
  { key: "factura_impuestos_documentos", label: "Factura impuestos" },
  { key: "honorarios_gestoria_documentos", label: "Honorarios de gestoría" },
  { key: "otra_documentacion", label: "Otra documentación" },
  { key: "emails_oficina", label: "Emails de oficina" },
  { key: "otros_documentos", label: "Otros" },
];


// Normaliza las categorías para que también funcionen con documentos históricos.
function normalizarCategoriaDocumento(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CATEGORIAS_POR_REPOSITORIO = {
  documentos_absis: ["Documentos Absis", "Documentos ABSIS"],
  hoja_encargo_firmada: ["Hoja de Encargo firmada", "Hoja de encargo firmada"],
  justificante_cancelacion: ["Justificante de cancelación"],
  nota_simple_registral: ["Nota simple registral"],
  borradores_escritura: ["Escrituras/borradores", "Borradores escrituras", "Borradores de escrituras", "Borradores de escritura"],
  presentacion_registro_documentos: ["Presentación Registro", "Presentacion Registro"],
  hoja_presentacion_documentos: ["Hoja de presentación", "Hoja de presentacion", "Hoja de presentación Tacio", "Hoja de presentacion Tacio"],
  copia_simple_documentos: ["Copia simple"],
  ajd_itp_documentos: ["AJD/ITP", "AJD / ITP", "AJD ITP"],
  otros_impuestos_documentos: ["Otros impuestos"],
  hoja_inscripcion_documentos: ["Hoja de Inscripción", "Hoja de inscripcion"],
  factura_registro_documentos: ["Factura registro"],
  defecto_registral: ["Defecto registral"],
  subsanacion_defecto: ["Subsanación del defecto", "Subsanacion del defecto"],
  escritura_digital_final_documentos: ["Escritura digital final"],
  documento_inscripcion_documentos: ["Documento de inscripción", "Documento de inscripcion"],
  expediente_digital_completo_documentos: ["Expediente digital completo"],
  factura_notarial_documentos: ["Factura notarial"],
  factura_registral_documentos: ["Factura Registral", "Factura registral"],
  factura_impuestos_documentos: ["Factura impuestos"],
  honorarios_gestoria_documentos: ["Honorarios gestoría", "Honorarios gestoria"],
  otra_documentacion: ["Otra documentación", "Otra documentacion"],
  emails_oficina: ["Mails de la Oficina", "Mails de la oficina", "Emails de oficina"],
  otros_documentos: ["Otros", "Borradores escrituras y otros"],
};

function CeldaRepositorioDigital({ expedienteId, repositorioKey, valor, onAbrir }) {
  const [hover, setHover] = useState(false);
  const [cargandoDocs, setCargandoDocs] = useState(false);
  const [documentos, setDocumentos] = useState([]);
  const [errorDocs, setErrorDocs] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewNombre, setPreviewNombre] = useState("");
  const [cargandoPreview, setCargandoPreview] = useState(false);

  const cantidad = Number.parseInt(String(valor || "").match(/\d+/)?.[0] || "0", 10);
  const nombresCategoria = CATEGORIAS_POR_REPOSITORIO[repositorioKey] || [];
  const categoriasNormalizadas = nombresCategoria.map(normalizarCategoriaDocumento);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function cargarDocumentos() {
    if (documentos.length || cargandoDocs || cantidad <= 0) return;
    setCargandoDocs(true);
    setErrorDocs("");
    try {
      const id = encodeURIComponent(expedienteId);
      const { data } = await axios.get(`/expedientes/${id}/carpeta-digital`);
      const lista = Array.isArray(data) ? data : (data?.items || []);
      setDocumentos(lista.filter((doc) => categoriasNormalizadas.includes(normalizarCategoriaDocumento(doc.categoria))));
    } catch (error) {
      setErrorDocs(error?.response?.data?.detail || "No se pudieron consultar los documentos.");
    } finally {
      setCargandoDocs(false);
    }
  }

  async function previsualizar(doc) {
    if (!doc?.id) return;
    setCargandoPreview(true);
    setPreviewNombre(doc.nombre_original || "Documento");
    setErrorDocs("");
    try {
      const id = encodeURIComponent(expedienteId);
      const response = await axios.get(`/expedientes/${id}/carpeta-digital/${doc.id}/descargar`, { responseType: "blob" });
      const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: doc.tipo_mime || "application/pdf" });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (error) {
      setErrorDocs(error?.response?.data?.detail || "No se pudo previsualizar el documento.");
    } finally {
      setCargandoPreview(false);
    }
  }

  if (!cantidad) return null;

  return (
    <div className="relative inline-flex" onMouseEnter={() => { setHover(true); cargarDocumentos(); }} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        onClick={onAbrir}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors hover:shadow-sm"
        style={{ borderColor: "var(--erp-border)", color: "var(--erp-primary)", background: "var(--erp-surface)" }}
        title={`Abrir carpeta y ver ${cantidad} archivo(s)`}
        aria-label={`Abrir ${cantidad} documento(s)`}
      >
        <span aria-hidden="true">📄</span>
        <span>{cantidad > 1 ? cantidad : "PDF"}</span>
      </button>
      {hover && (
        <div className="absolute z-50 left-0 top-full mt-2 w-[min(560px,80vw)] rounded-xl border p-3 shadow-2xl" style={{ borderColor: "var(--erp-border)", background: "var(--erp-surface)", color: "var(--erp-text)" }} onMouseEnter={() => setHover(true)}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <strong className="text-xs">{REPOSITORIOS_CARPETA_DIGITAL.find((item) => item.key === repositorioKey)?.label || "Documentos"}</strong>
            <span className="text-xs" style={{ color: "var(--erp-text-soft)" }}>{cantidad} archivo(s)</span>
          </div>
          {cargandoDocs ? <p className="text-xs">Cargando documentos…</p> : errorDocs ? <p className="text-xs text-red-600">{errorDocs}</p> : documentos.length === 0 ? <p className="text-xs" style={{ color: "var(--erp-text-soft)" }}>No se han podido localizar los archivos de esta categoría.</p> : (
            <div className="grid gap-3 sm:grid-cols-[minmax(140px,0.8fr)_minmax(0,1.4fr)]">
              <div className="max-h-56 space-y-1 overflow-auto">
                {documentos.map((doc) => (
                  <button key={doc.id} type="button" onMouseEnter={() => previsualizar(doc)} onFocus={() => previsualizar(doc)} onClick={() => previsualizar(doc)} className="block w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-[var(--erp-primary-soft)]" title={doc.nombre_original || "Ver documento"}>
                    <span className="mr-1" aria-hidden="true">📄</span>{doc.nombre_original || "Documento"}
                    {doc.fecha_subida && <span className="mt-1 block text-[10px]" style={{ color: "var(--erp-text-soft)" }}>{new Date(doc.fecha_subida).toLocaleDateString("es-ES")}</span>}
                  </button>
                ))}
              </div>
              <div className="min-h-40 overflow-hidden rounded-lg border" style={{ borderColor: "var(--erp-border)" }}>
                {cargandoPreview ? <p className="p-3 text-xs">Preparando vista previa…</p> : previewUrl ? (
                  previewNombre.toLowerCase().endsWith(".pdf") || documentos.find((doc) => doc.nombre_original === previewNombre)?.tipo_mime === "application/pdf" ? (
                    <iframe title={`Vista previa de ${previewNombre}`} src={previewUrl} className="h-56 w-full" />
                  ) : <div className="p-3 text-xs">Vista previa disponible para PDF. Pulsa el icono para abrir la carpeta y descargar este archivo.</div>
                ) : <p className="p-3 text-xs" style={{ color: "var(--erp-text-soft)" }}>Pasa el ratón por un PDF para ver su contenido aquí.</p>}
              </div>
            </div>
          )}
          <p className="mt-2 text-[10px]" style={{ color: "var(--erp-text-soft)" }}>Pulsa el icono para abrir la carpeta digital completa.</p>
        </div>
      )}
    </div>
  );
}


// ============================================================
// ACTIVIDADES CONOCIDAS DE ABSIS
// ============================================================

const ACTIVIDADES_ABSIS = [

  "Documentación previa",

  "Sede notarial",

  "Sede notarial con protocolo",

  "Gestión económica",

  "Liquidación de impuestos",

  "Tramitación inscripción",

  "Defectos registrales",

  "Facturación y cierre",

];


// ============================================================
// WORKFLOW DE EXPEDIENTES
// ============================================================

const ACTIVIDADES_EXPEDIENTES = [
  { key: "documentacion-previa", label: "Documentación previa", icono: "📄", aliases: ["Documentación previa"] },
  { key: "sede-notarial", label: "Sede notarial", icono: "🏛️", aliases: ["Sede notarial", "Sede Notarial"] },
  { key: "sede-notarial-protocolo", label: "Sede notarial con protocolo", icono: "📜", aliases: ["Sede notarial con protocolo", "Sede Notarial con protocolo"] },
  { key: "gestion-economica", label: "Gestión económica", icono: "💼", aliases: ["Gestión económica", "Gestion economica"] },
  { key: "liquidacion-impuestos", label: "Liquidación de impuestos", icono: "💶", aliases: ["Liquidación de impuestos", "Liquidación impuestos", "Liquidacion de impuestos", "Liquidacion impuestos"] },
  { key: "tramitacion-inscripcion", label: "Tramitación inscripción", icono: "🏢", aliases: ["Tramitación inscripción", "Tramitacion inscripcion"] },
  { key: "defectos-registrales", label: "Defectos registrales", icono: "⚠️", aliases: ["Defectos registrales", "Defectos Registrales"] },
  { key: "facturacion-cierre", label: "Facturación y cierre", icono: "🧾", aliases: ["Facturación y cierre", "Facturacion y cierre"] },
];

// ============================================================
// COLUMNAS ESPECÍFICAS POR ACTIVIDAD
// ============================================================

const COLUMNAS_BASE_ACTIVIDAD = [
  "id_expediente",
  "estado_expediente",
  "estado_actividad",
  "fecha_alta",
  "actividad_actual",
  "nombre_titular",
  "nif_titular",
  "nombre_solicitante",
  "nif_solicitante",
  "nombre_notario",
  "nif_notario",
  "oficina",
  "capital",
  "saldo_disponible",
  "contrato",
  "tipo_operacion",
  "observaciones",
];

const COLUMNAS_DOCUMENTACION_PREVIA = [
  "id_expediente",
  "fecha_alta",
  "oficina",
  "estado_expediente",
  "nombre_solicitante",
  "nif_solicitante",
  "contrato",
  "capital",
  "tipo_operacion",
  "importe",
  "observaciones",
  "carpeta_digital",
  "documentos_absis",
  "hoja_encargo_firmada",
  "justificante_cancelacion",
  "nota_simple_registral",
];

const COLUMNAS_SEDE_NOTARIAL = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "fecha_envio",
  "apoderado",
  "tipo_documento",
  "poblacion",
  "provincia",
  "tipo_firma",
  "sol",
  "cs",
  "ns",
  "ultima_accion",
  "fecha_ultima_accion",
];

const COLUMNAS_SEDE_NOTARIAL_PROTOCOLO = [
  ...COLUMNAS_SEDE_NOTARIAL,
  "fecha_firma",
  "protocolo",
  "asiento_presentacion_libro_diario",
  "fecha_presentacion",
  "numero_entrada",
  "fecha_recogida_notario_presentacion_telematica",
  "copia_simple_escritura",
];

const COLUMNAS_LIQUIDACION_IMPUESTOS = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "ultima_accion",
  "fecha_ultima_accion",
  "fecha_presentacion_tributaria",
  "fecha_liquidacion_tributaria",
  "oficina_liquidadora",
  "base_imponible",
  "tributacion",
  "impuesto_ajd_itp",
];

const COLUMNAS_GESTION_ECONOMICA = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "finca",
  "subtipo_operacion",
  "num_solicitud_sia",
];

const COLUMNAS_TRAMITACION_INSCRIPCION = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "ultima_accion",
  "fecha_ultima_accion",
  "fecha_presentacion",
  "fecha_vencimiento_asiento",
  "fecha_inscripcion",
  "escritura_simple_cancelacion",
];

const COLUMNAS_DEFECTOS_REGISTRALES = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "tiene_defectos_abiertos",
  "tipo_error",
  "descripcion_error",
  "falta_defecto",
  "fcierre_defecto",
  "fecha_vencimiento",
  "ultima_accion",
  "fecha_ultima_accion",
];

const COLUMNAS_FACTURACION_CIERRE = [
  ...COLUMNAS_BASE_ACTIVIDAD,
  "fecha_firma",
  "fecha_inscripcion",
  "facturacion_estado",
  "facturacion_fecha",
  "fecha_entregado_cliente",
  "fecha_fin_actividad",
  "saldo_real",
  "saldo_disponible",
];

const COLUMNAS_POR_ACTIVIDAD = {
  "documentacion-previa": COLUMNAS_DOCUMENTACION_PREVIA,
  "sede-notarial": COLUMNAS_SEDE_NOTARIAL,
  "sede-notarial-protocolo": COLUMNAS_SEDE_NOTARIAL_PROTOCOLO,
  "gestion-economica": COLUMNAS_GESTION_ECONOMICA,
  "liquidacion-impuestos": COLUMNAS_LIQUIDACION_IMPUESTOS,
  "tramitacion-inscripcion": COLUMNAS_TRAMITACION_INSCRIPCION,
  "defectos-registrales": COLUMNAS_DEFECTOS_REGISTRALES,
  "facturacion-cierre": COLUMNAS_FACTURACION_CIERRE,
};

function obtenerColumnasActividad(actividad) {
  return COLUMNAS_POR_ACTIVIDAD[actividad] || COLUMNAS_POR_DEFECTO;
}

function normalizarActividad(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function actividadCoincide(definicion, valor) {
  const normalizada = normalizarActividad(valor);
  return [definicion.label, ...(definicion.aliases || [])]
    .some((alias) => normalizarActividad(alias) === normalizada);
}


// ============================================================
// FORMATEAR VALOR
// ============================================================

function formatearValor(
  valor,
  tipo
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {

    return "—";

  }


  // ==========================================================
  // FECHA
  // ==========================================================

  if (
    tipo === "fecha"
  ) {

    const texto =
      String(valor);


    const coincidenciaFecha = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (coincidenciaFecha) {
      const [, year, month, day] = coincidenciaFecha;
      return `${day}/${month}/${year}`;
    }


    return texto;

  }


  // ==========================================================
  // NÚMERO
  // ==========================================================

  if (tipo === "moneda") {
    return formatEuro(valor);
  }

  if (
    tipo === "numero"
  ) {

    const numero =
      Number(valor);


    if (
      Number.isNaN(
        numero
      )
    ) {

      return String(valor);

    }


    return new Intl.NumberFormat(
      "es-ES",
      {
        maximumFractionDigits: 2,
      }
    ).format(
      numero
    );

  }


  return String(valor);

}


// ============================================================
// ESTILO DE ETIQUETAS DE ESTADO
// ============================================================

function estiloEstado(valor) {
  const estado = String(valor || "").trim().toLocaleLowerCase("es-ES");

  // Códigos oficiales de Estado expediente: distinguirlos de un vistazo.
  if (estado === "rst") return { background: "#f3e8ff", color: "#6b21a8", borderColor: "#d8b4fe" };
  if (estado === "pva") return { background: "#dbeafe", color: "#1d4ed8", borderColor: "#93c5fd" };

  if (/vencid|bloquead|error|rechaz|defecto|urgente|atrasad/.test(estado)) return { background: "#fef2f2", color: "#991b1b", borderColor: "#fecaca" };
  if (/pendient|espera|revis|tramit|proceso/.test(estado)) return { background: "#fffbeb", color: "#92400e", borderColor: "#fde68a" };
  if (/finaliz|cerrad|complet|inscrit|entregad|facturad|pagad|realizad|firmad|correcto/.test(estado)) return { background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0" };
  return { background: "var(--erp-surface-soft)", color: "var(--erp-text)", borderColor: "var(--erp-border)" };
}

// ============================================================
// FORMATEAR NÚMERO
// ============================================================

function formatearNumero(
  valor
) {

  return new Intl.NumberFormat(
    "es-ES"
  ).format(
    Number(valor || 0)
  );

}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ExpedientesListado() {
  const empleadoSesion = useAuthStore((state) => state.empleado);
  const [configuracionesVisibilidad, setConfiguracionesVisibilidad] = useState([]);
  const [carpetaDigitalSeleccionada, setCarpetaDigitalSeleccionada] = useState(null);

  useEffect(() => {
    let vigente = true;
    const empleadoId = empleadoSesion?.empleado_id ?? empleadoSesion?.id;
    if (!empleadoId) return () => { vigente = false; };
    axios.get("/expedientes/configuracion-visibilidad", { params: { empleado_id: empleadoId, ambito: "efectiva" } })
      .then(({ data }) => {
        if (vigente) setConfiguracionesVisibilidad(Array.isArray(data?.configuraciones) ? data.configuraciones : []);
      })
      .catch((error) => {
        console.error("No se ha podido cargar la configuración de visibilidad.");
        if (vigente) setConfiguracionesVisibilidad([]);
      });
    return () => { vigente = false; };
  }, [empleadoSesion?.empleado_id, empleadoSesion?.id]);

  // ==========================================================
  // DATOS
  // ==========================================================

  const [
    expedientes,
    setExpedientes,
  ] = useState([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");

  // ==========================================================
  // ACTUALIZACIÓN REALTIME
  // ==========================================================

  const [
    recargaRealtime,
    setRecargaRealtime,
  ] = useState(0);

  const [alertasControl, setAlertasControl] = useState([]);
  const [loadingAlertasControl, setLoadingAlertasControl] = useState(true);
  const [mostrarAyudaControlPlazos, setMostrarAyudaControlPlazos] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState("");
  const [totalesEstadosDiferenciales, setTotalesEstadosDiferenciales] = useState({ PVA: 0, RST: 0 });

  // ==========================================================
  // INTERFAZ
  // ==========================================================

  const [
    mostrarFiltros,
    setMostrarFiltros,
  ] = useState(false);
  // ==========================================================
  // FILTROS EDITABLES — FILTROS AVANZADOS DEFINITIVOS
  // ==========================================================
  const [busquedaRapida, setBusquedaRapida] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [filtroNumeroExpediente, setFiltroNumeroExpediente] = useState("");
  const [filtroOficina, setFiltroOficina] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [filtroNifTitular, setFiltroNifTitular] = useState("");
  const [filtroNombreTitular, setFiltroNombreTitular] = useState("");
  const [filtroNifSolicitante, setFiltroNifSolicitante] = useState("");
  const [filtroNombreSolicitante, setFiltroNombreSolicitante] = useState("");
  const [filtroNotario, setFiltroNotario] = useState("");
  const [filtroNifNotario, setFiltroNifNotario] = useState("");
  const [filtroFinca, setFiltroFinca] = useState("");
  const [filtroRegistroPropiedad, setFiltroRegistroPropiedad] = useState("");
  const [filtroSaldoReal, setFiltroSaldoReal] = useState("");
  const [filtroSaldoDisponible, setFiltroSaldoDisponible] = useState("");
  const [filtroImporte, setFiltroImporte] = useState("");
  const [filtroObservaciones, setFiltroObservaciones] = useState("");
  const [filtroPromocion, setFiltroPromocion] = useState("");
  const [filtroEstadoActividad, setFiltroEstadoActividad] = useState("");
  const [filtroActividad, setFiltroActividad] = useState("");
  const [filtroEstadoExpediente, setFiltroEstadoExpediente] = useState("");
  const [filtroOrigenBankia, setFiltroOrigenBankia] = useState("");
  const [filtroProductoGtg, setFiltroProductoGtg] = useState("");
  const [filtroApoderado, setFiltroApoderado] = useState("");
  const [filtroTipoProvision, setFiltroTipoProvision] = useState("");
  const [filtroTipoOperacion, setFiltroTipoOperacion] = useState("");
  const [filtroSubtipoOperacion, setFiltroSubtipoOperacion] = useState("");
  const [filtroNombreGestoria, setFiltroNombreGestoria] = useState("");
  const [filtroOficinaAlta, setFiltroOficinaAlta] = useState("");
  const [filtroDan, setFiltroDan] = useState("");
  const [filtroTipoError, setFiltroTipoError] = useState("");
  const [filtroEstadoExpedienteAncert, setFiltroEstadoExpedienteAncert] = useState("");
  const [filtroTipoActa, setFiltroTipoActa] = useState("");
  const [filtroContrato, setFiltroContrato] = useState("");
  const [filtroTipoFirma, setFiltroTipoFirma] = useState("");
  const [filtroTipoDocumento, setFiltroTipoDocumento] = useState("");
  const [filtroProvincia, setFiltroProvincia] = useState("");
  const [filtroPoblacion, setFiltroPoblacion] = useState("");
  const [filtroTributacion, setFiltroTributacion] = useState("");
  const [filtroEstadoRegistral, setFiltroEstadoRegistral] = useState("");
  const [filtroEstadoFacturacion, setFiltroEstadoFacturacion] = useState("");
  const [filtroTieneDefectosAbiertos, setFiltroTieneDefectosAbiertos] = useState("");
  const [filtroFaltaDefecto, setFiltroFaltaDefecto] = useState("");

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    numeroExpediente: "",
    oficina: "", fechaInicio: "", fechaFin: "",
    nifTitular: "", nombreTitular: "",
    nifSolicitante: "", nombreSolicitante: "",
    notario: "", nifNotario: "", finca: "",
    registroPropiedad: "", saldoReal: "", saldoDisponible: "",
    importe: "", observaciones: "", promocion: "", estadoActividad: "",
    actividad: "", estadoExpediente: "",
    origenBankia: "", productoGtg: "", apoderado: "",
    tipoProvision: "", tipoOperacion: "", subtipoOperacion: "",
    nombreGestoria: "", oficinaAlta: "", dan: "",
    tipoError: "", estadoExpedienteAncert: "", tipoActa: "",
    contrato: "", tipoFirma: "", tipoDocumento: "", provincia: "",
    poblacion: "", tributacion: "", estadoRegistral: "", estadoFacturacion: "",
    tieneDefectosAbiertos: "",
    faltaDefecto: "",
  });


  // ==========================================================
  // PAGINACIÓN
  // ==========================================================

  const [
    pagina,
    setPagina,
  ] = useState(1);


  const [
    totalPaginas,
    setTotalPaginas,
  ] = useState(1);


  const [
    totalExpedientes,
    setTotalExpedientes,
  ] = useState(0);


  const porPagina = 20;


  // ==========================================================
  // ORDENACIÓN
  // ==========================================================

  const [
    ordenMultiple,
    setOrdenMultiple,
  ] = useState([]);


  // ==========================================================
  // ACTIVIDADES
  // ==========================================================

  const [
    actividades,
    setActividades,
  ] = useState([]);

  // Catálogos globales: no se calculan con los 20 expedientes de la página actual.
  const [catalogosListado, setCatalogosListado] = useState({
    registros: [],
    estados_actividad: [],
    estados_expediente: [],
    actividades: [],
    oficinas: [],
    oficinas_alta: [],
    dans: [],
    origenes_bankia: [],
    productos_gtg: [],
    apoderados: [],
    tipos_provision: [],
    contratos: [],
    tipos_operacion: [],
    subtipos_operacion: [],
    gestorias: [],
    tipos_error: [],
    defectos_abiertos: [],
    falta_defecto: [],
    estados_ancert: [],
    tipos_acta: [],
    tipos_firma: [],
    tipos_documento: [],
    provincias: [],
    poblaciones: [],
    tributaciones: [],
    estados_registrales: [],
    estados_facturacion: [],
    dts: [],
    vinccancs: [],
    lucys: [],
    notarios: [],
  });


  const [
    totalActividades,
    setTotalActividades,
  ] = useState(0);


  const [
    loadingActividades,
    setLoadingActividades,
  ] = useState(true);


  const [
    errorActividades,
    setErrorActividades,
  ] = useState("");


  // ==========================================================
  // ACTIVIDAD SELECCIONADA EN EL SIDEBAR
  // ==========================================================

  const [
    actividadSeleccionada,
    setActividadSeleccionada,
  ] = useState("");


  // ==========================================================
  // COLUMNAS VISIBLES
  // ==========================================================

  const [
    columnasVisibles,
    setColumnasVisibles,
  ] = useState(
    COLUMNAS_POR_DEFECTO
  );

  useEffect(() => {
    if (!actividadSeleccionada) {
      setColumnasVisibles(COLUMNAS_POR_DEFECTO);
      return;
    }
    const normalizar = (valor) => String(valor || "").trim().toLocaleLowerCase("es")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Los grids guardan la clave de actividad, no la etiqueta visible.
    const definicion = ACTIVIDADES_EXPEDIENTES.find((item) =>
      item.key === actividadSeleccionada ||
      [item.label, ...(item.aliases || [])].some((alias) => normalizar(alias) === normalizar(actividadSeleccionada))
    );
    const config = definicion && configuracionesVisibilidad.find((item) => item.actividad_key === definicion.key);
    if (config) {
      const columnasBase = Array.isArray(config.excel_columns) && config.excel_columns.length
        ? config.excel_columns
        : (definicion ? obtenerColumnasActividad(definicion.key) : COLUMNAS_POR_DEFECTO);
      const repositoriosSeleccionados = Array.isArray(config.repositorios)
        ? config.repositorios.filter((key) => REPOSITORIOS_CARPETA_DIGITAL.some((item) => item.key === key))
        : [];
      setColumnasVisibles([...new Set([...columnasBase, ...repositoriosSeleccionados])]);
    } else if (definicion) {
      setColumnasVisibles(obtenerColumnasActividad(definicion.key));
    }
  }, [actividadSeleccionada, configuracionesVisibilidad]);


  // ==========================================================
  // ESCUCHAR REALTIME DE EXPEDIENTES
  // ==========================================================

  useEffect(() => {

    const manejarRealtime =
      (event) => {

        const data =
          event?.detail;


        if (
          !data ||
          data.modulo !==
            "expedientes" ||
          data.evento !==
            "importacion_finalizada"
        ) {

          return;

        }


        // No registramos el contenido del evento de importación en consola:
        // puede contener datos identificativos de expedientes.

        setRecargaRealtime(
          (valor) =>
            valor + 1
        );

      };


    window.addEventListener(
      "erp:realtime",
      manejarRealtime
    );


    return () => {

      window.removeEventListener(
        "erp:realtime",
        manejarRealtime
      );

    };

  }, []);


  // ==========================================================
  // CARGAR LISTADO
  // ==========================================================

  useEffect(() => {

    let activo = true;


    async function cargar() {

      setLoading(true);

      setError("");


      try {

        const res =
          await obtenerListadoExpedientes({

            pagina,

            porPagina,

            numeroExpediente: filtrosAplicados.numeroExpediente || undefined,
            busqueda: busquedaAplicada || undefined,
            oficina: filtrosAplicados.oficina || undefined,
            fechaInicio: filtrosAplicados.fechaInicio || undefined,
            fechaFin: filtrosAplicados.fechaFin || undefined,
            nifTitular: filtrosAplicados.nifTitular || undefined,
            nombreTitular: filtrosAplicados.nombreTitular || undefined,
            nifSolicitante: filtrosAplicados.nifSolicitante || undefined,
            nombreSolicitante: filtrosAplicados.nombreSolicitante || undefined,
            notario: filtrosAplicados.notario || undefined,
            nifNotario: filtrosAplicados.nifNotario || undefined,
            finca: filtrosAplicados.finca || undefined,
            registroPropiedad: filtrosAplicados.registroPropiedad || undefined,
            saldoReal: filtrosAplicados.saldoReal !== "" ? Number(filtrosAplicados.saldoReal) : undefined,
            saldoDisponible: filtrosAplicados.saldoDisponible !== "" ? Number(filtrosAplicados.saldoDisponible) : undefined,
            importe: filtrosAplicados.importe !== "" ? Number(filtrosAplicados.importe) : undefined,
            observaciones: filtrosAplicados.observaciones || undefined,
            promocion: filtrosAplicados.promocion || undefined,
            estadoActividad: filtrosAplicados.estadoActividad || undefined,
            actividadActual: filtrosAplicados.actividad || undefined,
            alerta: alertaSeleccionada || undefined,
            estadoExpediente: filtrosAplicados.estadoExpediente || undefined,
            origenBankia: filtrosAplicados.origenBankia || undefined,
            productoGtg: filtrosAplicados.productoGtg || undefined,
            apoderado: filtrosAplicados.apoderado || undefined,
            tipoProvision: filtrosAplicados.tipoProvision || undefined,
            tipoOperacion: filtrosAplicados.tipoOperacion || undefined,
            subtipoOperacion: filtrosAplicados.subtipoOperacion || undefined,
            nombreGestoria: filtrosAplicados.nombreGestoria || undefined,
            oficinaAlta: filtrosAplicados.oficinaAlta || undefined,
            dan: filtrosAplicados.dan || undefined,
            tipoError: filtrosAplicados.tipoError || undefined,
            estadoExpedienteAncert: filtrosAplicados.estadoExpedienteAncert || undefined,
            tipoActa: filtrosAplicados.tipoActa || undefined,
            contrato: filtrosAplicados.contrato || undefined,
            tipoFirma: filtrosAplicados.tipoFirma || undefined,
            tipoDocumento: filtrosAplicados.tipoDocumento || undefined,
            provincia: filtrosAplicados.provincia || undefined,
            poblacion: filtrosAplicados.poblacion || undefined,
            tributacion: filtrosAplicados.tributacion || undefined,
            estadoRegistral: filtrosAplicados.estadoRegistral || undefined,
            estadoFacturacion: filtrosAplicados.estadoFacturacion || undefined,
            tieneDefectosAbiertos: filtrosAplicados.tieneDefectosAbiertos || undefined,
            faltaDefecto: filtrosAplicados.faltaDefecto || undefined,

            ordenMultiple:
              ordenMultiple.length > 0
                ? JSON.stringify(
                    ordenMultiple
                  )
                : undefined,

          });


        if (!activo) {

          return;

        }


        setExpedientes(
          Array.isArray(
            res?.items
          )
            ? res.items
            : []
        );


        setTotalExpedientes(
          Number(
            res?.total || 0
          )
        );


        setTotalPaginas(
          Math.max(
            1,
            Number(
              res?.total_paginas ||
              1
            )
          )
        );

      } catch (
        err
      ) {

        console.error("No se han podido cargar los expedientes.");


        if (activo) {

          setError(
            err?.response?.data?.detail ||
            "No se han podido cargar los expedientes."
          );


          setExpedientes([]);

          setTotalExpedientes(0);

          setTotalPaginas(1);

        }

      } finally {

        if (activo) {

          setLoading(false);

        }

      }

    }


    cargar();


    return () => {

      activo = false;

    };

  }, [
    pagina,
    filtrosAplicados,
    ordenMultiple,
    recargaRealtime,
    alertaSeleccionada,
    busquedaAplicada,
  ]);


  // ==========================================================
  // CARGAR CONTROLES DE GESTIÓN (RECUENTOS GLOBALES)
  // ==========================================================

  useEffect(() => {
    let activo = true;

    async function cargarAlertasControl() {
      setLoadingAlertasControl(true);
      try {
        const res = await obtenerAlertasControlExpedientes();
        if (activo) {
          setAlertasControl(Array.isArray(res?.alertas) ? res.alertas : []);
        }
      } catch (err) {
        console.error("No se han podido cargar los controles de expedientes.");
        if (activo) setAlertasControl([]);
      } finally {
        if (activo) setLoadingAlertasControl(false);
      }
    }

    cargarAlertasControl();
    return () => { activo = false; };
  }, [recargaRealtime]);

  // ==========================================================
  // RECUENTOS DE ESTADOS DIFERENCIALES (NO SON ACTIVIDADES NI SLA)
  // ==========================================================
  useEffect(() => {
    let activo = true;
    async function cargarEstadosDiferenciales() {
      try {
        const [pendientes, retencion] = await Promise.all([
          obtenerListadoExpedientes({ pagina: 1, porPagina: 1, estadoExpediente: "PVA" }),
          obtenerListadoExpedientes({ pagina: 1, porPagina: 1, estadoExpediente: "RST" }),
        ]);
        if (activo) setTotalesEstadosDiferenciales({
          PVA: Number(pendientes?.total || 0),
          RST: Number(retencion?.total || 0),
        });
      } catch (err) {
        if (activo) setTotalesEstadosDiferenciales({ PVA: 0, RST: 0 });
        console.error("No se han podido cargar los recuentos de estados diferenciales.");
      }
    }
    cargarEstadosDiferenciales();
    return () => { activo = false; };
  }, [recargaRealtime]);

  // ==========================================================
  // CARGAR CATÁLOGOS GLOBALES PARA FILTROS
  // ==========================================================

  useEffect(() => {
    let activo = true;

    async function cargarCatalogosListado() {
      try {
        const res = await obtenerCatalogosListadoExpedientes();
        if (!activo) return;
        setCatalogosListado({
          registros: Array.isArray(res?.registros) ? res.registros : [],
          estados_actividad: Array.isArray(res?.estados_actividad) ? res.estados_actividad : [],
          estados_expediente: Array.isArray(res?.estados_expediente) ? res.estados_expediente : [],
          actividades: Array.isArray(res?.actividades) ? res.actividades : [],
          oficinas: Array.isArray(res?.oficinas) ? res.oficinas : [],
          oficinas_alta: Array.isArray(res?.oficinas_alta) ? res.oficinas_alta : [],
          dans: Array.isArray(res?.dans) ? res.dans : [],
          origenes_bankia: Array.isArray(res?.origenes_bankia) ? res.origenes_bankia : [],
          productos_gtg: Array.isArray(res?.productos_gtg) ? res.productos_gtg : [],
          apoderados: Array.isArray(res?.apoderados) ? res.apoderados : [],
          tipos_provision: Array.isArray(res?.tipos_provision) ? res.tipos_provision : [],
          contratos: Array.isArray(res?.contratos) ? res.contratos : [],
          tipos_operacion: Array.isArray(res?.tipos_operacion) ? res.tipos_operacion : [],
          subtipos_operacion: Array.isArray(res?.subtipos_operacion) ? res.subtipos_operacion : [],
          gestorias: Array.isArray(res?.gestorias) ? res.gestorias : [],
          tipos_error: Array.isArray(res?.tipos_error) ? res.tipos_error : [],
          defectos_abiertos: Array.isArray(res?.defectos_abiertos) ? res.defectos_abiertos : [],
          falta_defecto: Array.isArray(res?.falta_defecto) ? res.falta_defecto : [],
          estados_ancert: Array.isArray(res?.estados_ancert) ? res.estados_ancert : [],
          tipos_acta: Array.isArray(res?.tipos_acta) ? res.tipos_acta : [],
          tipos_firma: Array.isArray(res?.tipos_firma) ? res.tipos_firma : [],
          tipos_documento: Array.isArray(res?.tipos_documento) ? res.tipos_documento : [],
          provincias: Array.isArray(res?.provincias) ? res.provincias : [],
          poblaciones: Array.isArray(res?.poblaciones) ? res.poblaciones : [],
          tributaciones: Array.isArray(res?.tributaciones) ? res.tributaciones : [],
          estados_registrales: Array.isArray(res?.estados_registrales) ? res.estados_registrales : [],
          estados_facturacion: Array.isArray(res?.estados_facturacion) ? res.estados_facturacion : [],
          dts: Array.isArray(res?.dts) ? res.dts : [],
          vinccancs: Array.isArray(res?.vinccancs) ? res.vinccancs : [],
          lucys: Array.isArray(res?.lucys) ? res.lucys : [],
          notarios: Array.isArray(res?.notarios) ? res.notarios : [],
        });
      } catch (err) {
        console.error("No se han podido cargar los catálogos del listado.");
        if (activo) {
          setCatalogosListado({
            registros: [],
            estados_actividad: [],
            estados_expediente: [],
            actividades: [],
            oficinas: [], oficinas_alta: [], dans: [], origenes_bankia: [],
            productos_gtg: [], apoderados: [], tipos_provision: [], contratos: [],
            tipos_operacion: [], subtipos_operacion: [], gestorias: [], tipos_error: [], defectos_abiertos: [],
            falta_defecto: [], estados_ancert: [], tipos_acta: [], tipos_firma: [], tipos_documento: [],
            provincias: [], poblaciones: [], tributaciones: [], estados_registrales: [],
            estados_facturacion: [], dts: [], vinccancs: [], lucys: [], notarios: [],
          });
        }
      }
    }

    cargarCatalogosListado();
    return () => { activo = false; };
  }, [recargaRealtime]);

  // ==========================================================
  // CARGAR RESUMEN DE ACTIVIDADES
  // ==========================================================

  useEffect(() => {

    let activo = true;


    async function cargarActividades() {

      setLoadingActividades(true);

      setErrorActividades("");


      try {

        const res =
          await obtenerResumenExpedientes();


        if (!activo) {

          return;

        }


        setTotalActividades(
          Number(
            res?.total || 0
          )
        );


        // ======================================================
        // FORMATO ARRAY
        // ======================================================

        if (
          Array.isArray(
            res?.actividades
          )
        ) {

          const actividadesNormalizadas =
            res.actividades

              .map(
                (item) => ({

                  actividad:
                    item?.actividad ??
                    item?.nombre ??
                    item?.actividad_actual ??
                    "Sin actividad",

                  total:
                    Number(
                      item?.total ??
                      item?.cantidad ??
                      item?.count ??
                      0
                    ),

                })
              )

              .filter(
                (item) =>
                  item.total >= 0
              );


          actividadesNormalizadas.sort(
            (a, b) => {

              const indiceA =
                ACTIVIDADES_ABSIS.findIndex(
                  (nombre) =>
                    nombre.toLowerCase() ===
                    String(
                      a.actividad
                    ).toLowerCase()
                );


              const indiceB =
                ACTIVIDADES_ABSIS.findIndex(
                  (nombre) =>
                    nombre.toLowerCase() ===
                    String(
                      b.actividad
                    ).toLowerCase()
                );


              if (
                indiceA !== -1 &&
                indiceB !== -1
              ) {

                return (
                  indiceA -
                  indiceB
                );

              }


              if (
                indiceA !== -1
              ) {

                return -1;

              }


              if (
                indiceB !== -1
              ) {

                return 1;

              }


              return (
                b.total -
                a.total
              );

            }
          );


          setActividades(
            actividadesNormalizadas
          );


          return;

        }


        // ======================================================
        // FORMATO OBJETO
        // ======================================================

        if (
          res?.actividades &&
          typeof res.actividades ===
            "object" &&
          !Array.isArray(
            res.actividades
          )
        ) {

          const actividadesNormalizadas =
            Object.entries(
              res.actividades
            )
              .map(
                ([actividad, total]) => ({

                  actividad,

                  total:
                    Number(
                      total || 0
                    ),

                })
              );


          actividadesNormalizadas.sort(
            (a, b) =>
              b.total -
              a.total
          );


          setActividades(
            actividadesNormalizadas
          );


          return;

        }


        setActividades([]);


        setErrorActividades(
          "El backend no está devolviendo el resumen por actividad."
        );

      } catch (
        err
      ) {

        console.error("No se han podido cargar las actividades del expediente.");


        if (activo) {

          setActividades([]);

          setTotalActividades(0);


          setErrorActividades(
            err?.response?.data?.detail ||
            "No se han podido cargar las actividades."
          );

        }

      } finally {

        if (activo) {

          setLoadingActividades(false);

        }

      }

    }


    cargarActividades();


    return () => {

      activo = false;

    };

  }, [
    recargaRealtime,
  ]);


  // ==========================================================
  // APLICAR FILTROS
  // ==========================================================

  const aplicarFiltros = () => {
    setBusquedaAplicada(busquedaRapida.trim());
    setFiltrosAplicados({
      numeroExpediente: filtroNumeroExpediente.trim(),
      oficina: filtroOficina.trim(),
      fechaInicio: filtroFechaInicio,
      fechaFin: filtroFechaFin,
      nifTitular: filtroNifTitular.trim(),
      nombreTitular: filtroNombreTitular.trim(),
      nifSolicitante: filtroNifSolicitante.trim(),
      nombreSolicitante: filtroNombreSolicitante.trim(),
      notario: filtroNotario.trim(),
      nifNotario: filtroNifNotario.trim(),
      finca: filtroFinca.trim(),
      registroPropiedad: filtroRegistroPropiedad,
      saldoReal: filtroSaldoReal,
      saldoDisponible: filtroSaldoDisponible,
      importe: filtroImporte,
      observaciones: filtroObservaciones.trim(),
      promocion: filtroPromocion.trim(),
      estadoActividad: filtroEstadoActividad,
      actividad: filtroActividad,
      estadoExpediente: filtroEstadoExpediente.trim(),
      origenBankia: filtroOrigenBankia,
      productoGtg: filtroProductoGtg,
      apoderado: filtroApoderado,
      tipoProvision: filtroTipoProvision,
      tipoOperacion: filtroTipoOperacion,
      subtipoOperacion: filtroSubtipoOperacion,
      nombreGestoria: filtroNombreGestoria,
      oficinaAlta: filtroOficinaAlta,
      dan: filtroDan,
      tipoError: filtroTipoError,
      estadoExpedienteAncert: filtroEstadoExpedienteAncert,
      tipoActa: filtroTipoActa,
      contrato: filtroContrato,
      tipoFirma: filtroTipoFirma,
      tipoDocumento: filtroTipoDocumento,
      provincia: filtroProvincia,
      poblacion: filtroPoblacion,
      tributacion: filtroTributacion,
      estadoRegistral: filtroEstadoRegistral,
      estadoFacturacion: filtroEstadoFacturacion,
      tieneDefectosAbiertos: filtroTieneDefectosAbiertos,
      faltaDefecto: filtroFaltaDefecto,
    });
    setPagina(1);
    setError("");
  };


  // ==========================================================
  // LIMPIAR FILTROS
  // ==========================================================

  const limpiarFiltros = () => {
    setBusquedaRapida("");
    setBusquedaAplicada("");
    setAlertaSeleccionada("");
    setActividadSeleccionada("");
    setColumnasVisibles(COLUMNAS_POR_DEFECTO);
    setFiltroNumeroExpediente("");
    setFiltroOficina("");
    setFiltroFechaInicio("");
    setFiltroFechaFin("");
    setFiltroNifTitular("");
    setFiltroNombreTitular("");
    setFiltroNifSolicitante("");
    setFiltroNombreSolicitante("");
    setFiltroNotario("");
    setFiltroNifNotario("");
    setFiltroFinca("");
    setFiltroRegistroPropiedad("");
    setFiltroSaldoReal("");
    setFiltroSaldoDisponible("");
    setFiltroImporte("");
    setFiltroObservaciones("");
    setFiltroPromocion("");
    setFiltroEstadoActividad("");
    setFiltroActividad("");
    setFiltroEstadoExpediente("");
    setFiltroOrigenBankia("");
    setFiltroProductoGtg("");
    setFiltroApoderado("");
    setFiltroTipoProvision("");
    setFiltroTipoOperacion("");
    setFiltroSubtipoOperacion("");
    setFiltroNombreGestoria("");
    setFiltroOficinaAlta("");
    setFiltroDan("");
    setFiltroTipoError("");
    setFiltroEstadoExpedienteAncert("");
    setFiltroTipoActa("");
    setFiltroContrato("");
    setFiltroTipoFirma("");
    setFiltroTipoDocumento("");
    setFiltroProvincia("");
    setFiltroPoblacion("");
    setFiltroTributacion("");
    setFiltroEstadoRegistral("");
    setFiltroEstadoFacturacion("");
    setFiltroTieneDefectosAbiertos("");
    setFiltroFaltaDefecto("");
    setFiltrosAplicados({
      numeroExpediente: "",
      oficina: "", fechaInicio: "", fechaFin: "",
      nifTitular: "", nombreTitular: "",
      nifSolicitante: "", nombreSolicitante: "",
      notario: "", nifNotario: "", finca: "",
      registroPropiedad: "", saldoReal: "", saldoDisponible: "",
      importe: "", observaciones: "", promocion: "", estadoActividad: "",
      actividad: "", estadoExpediente: "",
      origenBankia: "", productoGtg: "", apoderado: "",
      tipoProvision: "", tipoOperacion: "", subtipoOperacion: "",
      nombreGestoria: "", oficinaAlta: "", dan: "",
      tipoError: "", estadoExpedienteAncert: "", tipoActa: "",
      contrato: "", tipoFirma: "", tipoDocumento: "", provincia: "",
      poblacion: "", tributacion: "", estadoRegistral: "", estadoFacturacion: "",
      tieneDefectosAbiertos: "",
      faltaDefecto: "",
    });
    setPagina(1);
    setError("");
  };


  // ==========================================================
  // ORDENAR
  // ==========================================================

  const ordenar = (
    columna,
    shiftKey
  ) => {

    // ========================================================
    // ORDENACIÓN SIMPLE
    // ========================================================

    if (!shiftKey) {

      const actual =
        ordenMultiple[0];


      if (
        actual &&
        actual.columna ===
          columna
      ) {

        if (actual.direccion === "asc") {
          setOrdenMultiple([{ columna, direccion: "desc" }]);
        } else {
          setOrdenMultiple([]);
        }

      } else {

        setOrdenMultiple([

          {

            columna,

            direccion:
              "asc",

          },

        ]);

      }


      setPagina(1);

      return;

    }


    // ========================================================
    // ORDENACIÓN MÚLTIPLE
    // ========================================================

    const indice =
      ordenMultiple.findIndex(
        (orden) =>
          orden.columna ===
          columna
      );


    if (
      indice !== -1
    ) {

      setOrdenMultiple((actual) => {
        const seleccionado = actual[indice];
        if (seleccionado?.direccion === "desc") {
          return actual.filter((_, index) => index !== indice);
        }
        return actual.map((orden, index) => index === indice ? { ...orden, direccion: "desc" } : orden);
      });

    } else {

      setOrdenMultiple(
        (actual) => [

          ...actual,

          {

            columna,

            direccion:
              "asc",

          },

        ]
      );

    }


    setPagina(1);

  };


  // ==========================================================
  // ICONO ORDEN
  // ==========================================================

  const iconoOrden =
    (
      columna
    ) => {

      const indice =
        ordenMultiple.findIndex(
          (orden) =>
            orden.columna ===
            columna
        );


      if (
        indice === -1
      ) {

        return "↕";

      }


      const orden =
        ordenMultiple[
          indice
        ];


      const flecha =
        orden.direccion ===
        "asc"
          ? "↑"
          : "↓";


      if (
        ordenMultiple.length >
        1
      ) {

        return (
          `${flecha}${indice + 1}`
        );

      }


      return flecha;

    };


  // ==========================================================
  // EXPORTAR EXCEL
  // ==========================================================

  const exportarExcel =
    async () => {

      try {

        setError("");


        await exportarExcelExpedientes({
          numeroExpediente: filtrosAplicados.numeroExpediente || undefined,
          busqueda: busquedaAplicada || undefined,
          oficina: filtrosAplicados.oficina || undefined,
          fechaInicio: filtrosAplicados.fechaInicio || undefined,
          fechaFin: filtrosAplicados.fechaFin || undefined,
          nifTitular: filtrosAplicados.nifTitular || undefined,
          nombreTitular: filtrosAplicados.nombreTitular || undefined,
          nifSolicitante: filtrosAplicados.nifSolicitante || undefined,
          nombreSolicitante: filtrosAplicados.nombreSolicitante || undefined,
          notario: filtrosAplicados.notario || undefined,
          nifNotario: filtrosAplicados.nifNotario || undefined,
          finca: filtrosAplicados.finca || undefined,
          registroPropiedad: filtrosAplicados.registroPropiedad || undefined,
          saldoReal: filtrosAplicados.saldoReal !== "" ? Number(filtrosAplicados.saldoReal) : undefined,
          saldoDisponible: filtrosAplicados.saldoDisponible !== "" ? Number(filtrosAplicados.saldoDisponible) : undefined,
          importe: filtrosAplicados.importe !== "" ? Number(filtrosAplicados.importe) : undefined,
          observaciones: filtrosAplicados.observaciones || undefined,
          estadoActividad: filtrosAplicados.estadoActividad || undefined,
          actividadActual: filtrosAplicados.actividad || undefined,
          configActividad: actividadSeleccionada || undefined,
          estadoExpediente: filtrosAplicados.estadoExpediente || undefined,
          alerta: alertaSeleccionada || undefined,
          origenBankia: filtrosAplicados.origenBankia || undefined,
          productoGtg: filtrosAplicados.productoGtg || undefined,
          apoderado: filtrosAplicados.apoderado || undefined,
          tipoProvision: filtrosAplicados.tipoProvision || undefined,
          tipoOperacion: filtrosAplicados.tipoOperacion || undefined,
          subtipoOperacion: filtrosAplicados.subtipoOperacion || undefined,
          nombreGestoria: filtrosAplicados.nombreGestoria || undefined,
          oficinaAlta: filtrosAplicados.oficinaAlta || undefined,
          dan: filtrosAplicados.dan || undefined,
          tipoError: filtrosAplicados.tipoError || undefined,
          estadoExpedienteAncert: filtrosAplicados.estadoExpedienteAncert || undefined,
          tipoActa: filtrosAplicados.tipoActa || undefined,
          contrato: filtrosAplicados.contrato || undefined,
          tipoFirma: filtrosAplicados.tipoFirma || undefined,
          tipoDocumento: filtrosAplicados.tipoDocumento || undefined,
          provincia: filtrosAplicados.provincia || undefined,
          poblacion: filtrosAplicados.poblacion || undefined,
          tributacion: filtrosAplicados.tributacion || undefined,
          estadoRegistral: filtrosAplicados.estadoRegistral || undefined,
          estadoFacturacion: filtrosAplicados.estadoFacturacion || undefined,
          tieneDefectosAbiertos: filtrosAplicados.tieneDefectosAbiertos || undefined,
          faltaDefecto: filtrosAplicados.faltaDefecto || undefined,
        });

      } catch (
        err
      ) {

        console.error("No se ha podido exportar el Excel de expedientes.");


        setError(
          err?.response?.data?.detail ||
          "No se ha podido exportar el Excel."
        );

      }

    };


  // ==========================================================
  // COLUMNAS ACTIVAS
  // ==========================================================

  const columnasActivas =
    COLUMNAS.filter(
      (columna, indice, catalogo) =>
        (columna.key === "estado_facturas" || columnasVisibles.includes(columna.key)) &&
        catalogo.findIndex((item) => item.key === columna.key) === indice
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div
      className="
        erp-page
        molsan-page
        expedientes-page
        min-h-full
        w-full
        p-0

        text-[var(--erp-text)]

        space-y-6

        animate-fade-in
      "
      aria-busy={loading}
    >


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div
          className="
            w-full

            bg-red-50

            border
            border-red-200

            rounded-xl

            p-4

            text-red-700
          "
        >
          {error}
        </div>

      )}


      {/* Área principal de trabajo de expedientes */}

      <main className="molsan-page-stack min-w-0 w-full">
        <header className="molsan-page-header expedientes-page__header">
          <div className="molsan-page-header__identity">
            <div className="expedientes-page__header-icon molsan-page-header__mark" aria-hidden="true">EXP</div>
            <div className="min-w-0">
              <p className="expedientes-page__eyebrow molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</p>
              <h1 className="molsan-page-header__title">Expedientes</h1>
              <p className="molsan-page-header__description">
                Consulta, seguimiento y control de la tramitación de expedientes.
              </p>
            </div>
          </div>
          <div className="molsan-page-header__actions">
            <span className="expedientes-page__header-note">Gestión y seguimiento</span>
          </div>
        </header>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-4">
      {/* SLA GLOBAL: CIRCUITOS DIFERENCIADOS */}
      <section className="erp-card space-y-3 p-4 sm:p-5" aria-label="SLA global por circuito">
        <div>
          <h3 className="text-base font-bold text-[var(--erp-text)]">SLA global por circuito</h3>
          <p className="text-sm text-[var(--erp-text-soft)]">Controles independientes de los plazos de cada actividad. Pulsa un circuito para ver sus expedientes fuera de plazo.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[
            {
              key: "sla_caixabank",
              titulo: "Circuito CaixaBank",
              descripcion: "Propia entidad · Vinculada propia entidad",
              plazo: "40 días",
              icono: "🏦",
              borde: "#2563eb",
              fondo: "rgba(37, 99, 235, 0.07)",
            },
            {
              key: "sla_otra_entidad",
              titulo: "Circuito otra entidad",
              descripcion: "Vinculada otra entidad · Otra entidad",
              plazo: "70 días",
              icono: "🏢",
              borde: "#b7791f",
              fondo: "rgba(183, 121, 31, 0.08)",
            },
          ].map((circuito) => {
            const alerta = alertasControl.find((item) => item.key === circuito.key);
            const total = Number(alerta?.total || 0);
            const activa = alertaSeleccionada === circuito.key;
            return (
              <button
                key={circuito.key}
                type="button"
                aria-pressed={activa}
                onClick={() => {
                  const seleccionar = activa ? "" : circuito.key;
                  setAlertaSeleccionada(seleccionar);
                  setActividadSeleccionada("");
                  setFiltroActividad("");
                  setFiltrosAplicados((actual) => ({ ...actual, actividad: "" }));
                  setColumnasVisibles(COLUMNAS_POR_DEFECTO);
                  setPagina(1);
                }}
                className="erp-card border p-4 text-left focus:outline-none focus:ring-2 focus:ring-[var(--erp-primary)]"
                style={{
                  borderColor: activa ? circuito.borde : "var(--erp-border)",
                  background: activa ? circuito.fondo : "var(--erp-surface)",
                  boxShadow: activa ? `0 0 0 1px ${circuito.borde}` : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: circuito.fondo }}>{circuito.icono}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-[var(--erp-text)]">{circuito.titulo}</div>
                      <div className="mt-1 text-xs text-[var(--erp-text-soft)]">{circuito.descripcion}</div>
                    </div>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap" style={{ borderColor: circuito.borde, color: circuito.borde }}>{circuito.plazo}</span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div className="text-3xl font-bold tabular-nums" style={{ color: circuito.borde }}>
                      {loadingAlertasControl ? "—" : formatearNumero(total)}
                    </div>
                    <div className="text-xs text-[var(--erp-text-soft)]">expedientes fuera de plazo</div>
                  </div>
                  <div className="text-sm font-semibold" style={{ color: circuito.borde }}>
                    {activa ? "Circuito seleccionado ✓" : "Ver expedientes →"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-[var(--erp-text-soft)]">Se calcula desde la fecha de envío hasta Fin actividad o la fecha actual si sigue abierto. Hipotecario y Crédito Stock quedan excluidos.</p>
        </section>

      {/* ESTADOS DIFERENCIALES: son estados del expediente, no actividades ni SLA */}
      <section className="erp-card space-y-3 p-4 sm:p-5" aria-label="Estados diferenciales del expediente">
        <div>
          <h3 className="text-base font-bold text-[var(--erp-text)]">Estados diferenciales</h3>
          <p className="text-sm text-[var(--erp-text-soft)]">Estos filtros se basan en el estado del expediente. No son actividades y no calculan SLA.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { codigo: "PVA", titulo: "Pendientes de Validar", icono: "🔎", borde: "#2563eb", fondo: "rgba(37, 99, 235, 0.08)" },
            { codigo: "RST", titulo: "Retención", icono: "⏸️", borde: "#7e22ce", fondo: "rgba(126, 34, 206, 0.08)" },
          ].map((estado) => {
            const activa = filtrosAplicados.estadoExpediente.trim().toLocaleUpperCase("es-ES") === estado.codigo;
            return (
              <button
                key={estado.codigo}
                type="button"
                aria-pressed={activa}
                onClick={() => {
                  const seleccionar = activa ? "" : estado.codigo;
                  setAlertaSeleccionada("");
                  setActividadSeleccionada("");
                  setFiltroActividad("");
                  setFiltroEstadoExpediente(seleccionar);
                  setFiltrosAplicados((actual) => ({ ...actual, estadoExpediente: seleccionar, actividad: "" }));
                  setColumnasVisibles(COLUMNAS_POR_DEFECTO);
                  setPagina(1);
                }}
                className="erp-card min-h-[116px] border p-4 text-left focus:outline-none focus:ring-2 focus:ring-[var(--erp-primary)]"
                style={{ background: activa ? estado.fondo : "var(--erp-surface)", borderColor: activa ? estado.borde : "var(--erp-border)", boxShadow: activa ? `0 0 0 1px ${estado.borde}` : undefined }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: estado.fondo }}>{estado.icono}</span>
                  <span className="text-3xl font-extrabold tabular-nums" style={{ color: estado.borde }}>{loading ? "…" : formatearNumero(totalesEstadosDiferenciales[estado.codigo])}</span>
                </div>
                <div className="mt-3 font-bold text-[var(--erp-text)]">{estado.titulo}</div>
                <div className="mt-1 text-xs text-[var(--erp-text-soft)]">Estado ABSIS: {estado.codigo}</div>
                <div className="mt-2 text-xs font-semibold" style={{ color: activa ? estado.borde : "var(--erp-text-soft)" }}>{activa ? "Estado seleccionado · pulsa para quitar" : "Ver expedientes →"}</div>
              </button>
            );
          })}
        </div>
      </section>
      {/* Acciones principales: agrupadas justo debajo de los bloques de tarjetas */}
      <section className="w-full flex flex-wrap items-center justify-start gap-2 -mt-2" aria-label="Acciones de expedientes">
        <button type="button" onClick={exportarExcel} disabled={loading} className="rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50" style={{ background: "var(--erp-success)" }}>📊 Exportar Excel</button>
        <button type="button" onClick={() => setMostrarFiltros(true)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: "var(--erp-border)", color: "var(--erp-text)", background: "var(--erp-surface)" }}>🔎 Filtros avanzados</button>
        <button
          type="button"
          onClick={() => setMostrarAyudaControlPlazos(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--erp-primary)]"
          style={{ borderColor: "var(--erp-border)", background: "var(--erp-surface)", color: "var(--erp-primary)" }}
        >
          📌 Ver Control de plazos
        </button>
      </section>
        </div>
        <div className="min-w-0 xl:col-span-8">
      {/* GRIDS DE ACTIVIDAD */}
      <section className="erp-card space-y-3 p-4 sm:p-5" aria-label="Expedientes por actividad">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div><h3 className="text-base font-bold text-[var(--erp-text)]">{(configuracionesVisibilidad.find((item) => item.actividad_key === actividadSeleccionada)?.nombre_tabla) || "Expedientes por actividad"}</h3><p className="text-sm text-[var(--erp-text-soft)]">Pulsa un grid para ver debajo la tabla con los expedientes de esa actividad.</p></div>
          {actividadSeleccionada && <button type="button" onClick={() => { setActividadSeleccionada(""); setAlertaSeleccionada(""); setColumnasVisibles(COLUMNAS_POR_DEFECTO); setFiltroActividad(""); setFiltrosAplicados((actual) => ({ ...actual, actividad: "" })); setPagina(1); }} className="self-start rounded-lg border px-3 py-2 text-sm font-semibold" style={{ borderColor: "var(--erp-border)", color: "var(--erp-primary)", background: "var(--erp-surface)" }}>Ver todas las actividades</button>}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {ACTIVIDADES_EXPEDIENTES.map((actividad) => {
            const total = actividades.filter((item) => actividadCoincide(actividad, item?.actividad)).reduce((suma, item) => suma + Number(item?.total || 0), 0);
            const reglaPlazo = {
              "sede-notarial": { alerta: "sede_notarial", etiqueta: (cantidad) => `Fuera de plazo (>5 días): ${cantidad}` },
              "sede-notarial-protocolo": { alerta: "sede_notarial_protocolo", etiqueta: (cantidad) => `Fuera de plazo (>2 días): ${cantidad}` },
              "liquidacion-impuestos": { alerta: "liquidacion_pendiente", etiqueta: (cantidad) => `Fuera de plazo (>2 días): ${cantidad}` },
              "tramitacion-inscripcion": { alerta: "inscripcion_30_dias", etiqueta: (cantidad) => `Fuera de plazo (>23 días): ${cantidad}` },
              "defectos-registrales": { alerta: "defectos_vencidos", etiqueta: (cantidad) => `Fuera de plazo (>60 días): ${cantidad}` },
              "facturacion-cierre": { alerta: "facturacion_cierre", etiqueta: (cantidad) => `Fuera de plazo (>5 días): ${cantidad}` },
            }[actividad.key];
            const alertaPlazo = reglaPlazo ? alertasControl.find((item) => item.key === reglaPlazo.alerta) : null;
            const cantidadPlazo = Number(alertaPlazo?.total || 0);
            const activa = actividadSeleccionada === actividad.key;
            return <button key={actividad.key} type="button" aria-pressed={activa}
              onClick={() => {
                const encontrado = actividades.find((item) => actividadCoincide(actividad, item?.actividad));
                const valorBackend = encontrado?.actividad || actividad.label;
                setActividadSeleccionada(activa ? "" : actividad.key); setAlertaSeleccionada("");
                setColumnasVisibles(activa ? COLUMNAS_POR_DEFECTO : obtenerColumnasActividad(actividad.key));
                setFiltroActividad(activa ? "" : valorBackend);
                setFiltrosAplicados((actual) => ({ ...actual, actividad: activa ? "" : valorBackend })); setPagina(1);
              }}
              className="erp-card min-h-[148px] border p-4 text-left focus:outline-none focus:ring-2 focus:ring-[var(--erp-primary)]"
              style={{ background: activa ? "var(--erp-primary-soft)" : "var(--erp-surface)", borderColor: activa ? "var(--erp-primary)" : "var(--erp-border)", boxShadow: activa ? "0 0 0 1px var(--erp-primary)" : undefined }}>
              <div className="flex items-start justify-between gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: activa ? "rgba(59,130,246,.14)" : "var(--erp-surface-soft)" }}>{actividad.icono}</span><span className="text-3xl font-extrabold tabular-nums" style={{ color: activa ? "var(--erp-primary)" : "var(--erp-text)" }}>{loadingActividades ? "…" : formatearNumero(total)}</span></div>
              <div className="mt-3 text-sm font-bold leading-snug text-[var(--erp-text)]">{actividad.label}</div>
              <div className="mt-3">
                {loadingAlertasControl ? (
                  <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold" style={{ borderColor: "var(--erp-border)", color: "var(--erp-text-soft)" }}>Calculando plazos…</span>
                ) : reglaPlazo ? (
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${cantidadPlazo > 0 ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
                    {cantidadPlazo > 0 ? "⚠ " : "✓ "}{reglaPlazo.etiqueta(formatearNumero(cantidadPlazo))}
                  </span>
                ) : (
                  actividad.key !== "documentacion-previa" ? (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold" style={{ borderColor: "var(--erp-border)", color: "var(--erp-text-soft)", background: "var(--erp-surface-soft)" }}>Sin alerta de plazo</span>
                  ) : null
                )}
              </div>
              <div className="mt-2 text-xs font-semibold" style={{ color: activa ? "var(--erp-primary)" : "var(--erp-text-soft)" }}>{activa ? "Actividad seleccionada · pulsa para quitar" : "Ver expedientes →"}</div>
            </button>;
          })}
        </div>
      </section>
      {/* BÚSQUEDA FÁCIL: ocupa todo el ancho disponible */}
      <section
        className="erp-card w-full p-3 sm:p-4 space-y-2"
        style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)" }}
        aria-label="Buscar expedientes"
      >
        <div>
          <h3 className="text-base font-bold text-[var(--erp-text)]">¿Qué expediente necesitas?</h3>
          <p className="mt-1 text-sm text-[var(--erp-text-soft)]">
            Escribe cualquier dato que conozcas: número, nombre, NIF, notario, oficina, finca o registro.
          </p>
        </div>
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setBusquedaAplicada(busquedaRapida.trim());
            setPagina(1);
          }}
        >
          <div className="relative min-w-0 flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg" aria-hidden="true">🔎</span>
            <input
              type="search"
              value={busquedaRapida}
              onChange={(event) => setBusquedaRapida(event.target.value)}
              placeholder="Ej.: 2026-00123, María García, notario, finca…"
              aria-label="Buscar en todos los datos de los expedientes"
              className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none focus:ring-2"
              style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)", color: "var(--erp-text)" }}
            />
          </div>
          <button type="submit" className="rounded-xl px-5 py-3 text-sm font-bold text-white" style={{ background: "var(--erp-primary)" }}>
            Buscar
          </button>
          {(busquedaRapida || busquedaAplicada) && (
            <button type="button" onClick={() => { setBusquedaRapida(""); setBusquedaAplicada(""); setPagina(1); }} className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: "var(--erp-border)", color: "var(--erp-text)" }}>
              Limpiar búsqueda
            </button>
          )}
        </form>
        {busquedaAplicada && (
          <p className="text-xs text-[var(--erp-text-soft)]" role="status">
            Búsqueda activa: <strong>{busquedaAplicada}</strong>. Puedes combinarla con los filtros avanzados.
          </p>
        )}
      </section>
        </div>
      </div>

      {/* ======================================================
          TABLA
      ====================================================== */}

      <section
        className="
          erp-card

          w-full

          p-2
          sm:p-3

          shadow-sm
        "
      >

        {loading ? (

          <div
            className="
              text-[var(--erp-text-soft)]

              animate-pulse

              py-16

              text-center
            "
          >
            Cargando expedientes…
          </div>

        ) : expedientes.length === 0 ? (

          <div
            className="
              text-[var(--erp-text-soft)]

              py-16

              text-center
            "
          >
            {busquedaAplicada || alertaSeleccionada || Object.values(filtrosAplicados).some(Boolean)
              ? "No encontramos expedientes con esos datos. Prueba con menos palabras o limpia algún filtro."
              : "Todavía no hay expedientes para mostrar."}
          </div>

        ) : (

          <div
            className="
              expedientes-table-scroll
              molsan-table-wrap
              overflow-auto

              rounded-xl

              border
              border-[var(--erp-border)]

              bg-[var(--erp-surface)]
            "
          >

            <table
              className="
                molsan-table
                min-w-max

                w-full

                text-sm

                text-[var(--erp-text)]
              "
            >

              <thead>

                <tr
                  className="
                    text-left

                    bg-[var(--erp-primary)]
                  "
                >

                  {columnasActivas.map(
                    (
                      columna
                    ) => (

                      <th
                        key={
                          columna.key
                        }

                        className="
                          px-4
                          py-3

                          cursor-pointer
                          select-none

                          whitespace-nowrap

                          text-white

                          font-semibold

                          border-b
                          border-white/20

                          sticky
                          top-0

                          bg-[var(--erp-primary)]

                          z-10

                          hover:bg-[var(--erp-primary-dark)]
                        "

                        onClick={(
                          event
                        ) =>
                          ordenar(
                            columna.key,
                            event.shiftKey
                          )
                        }

                        title={
                          "Clic para ordenar. " +
                          "Shift + clic para añadir " +
                          "ordenación múltiple."
                        }
                      >

                        <div
                          className="
                            flex
                            items-center

                            gap-2
                          "
                        >

                          <span>
                            {
                              columna.label
                            }
                          </span>


                          <span
                            className="
                              text-white/70

                              text-xs
                            "
                          >
                            {
                              iconoOrden(
                                columna.key
                              )
                            }
                          </span>

                        </div>

                      </th>

                    )
                  )}




                </tr>

              </thead>


              <tbody>

                {expedientes.map(
                  (
                    expediente,
                    indice
                  ) => (

                    <tr
                      key={
                        expediente.id_expediente ||
                        expediente.id ||
                        indice
                      }

                      className="
                        bg-[var(--erp-surface)]

                        border-t
                        border-[var(--erp-border)]

                        hover:bg-[var(--erp-primary-soft)]

                        transition-colors
                      "
                    >

                      {columnasActivas.map(
                        (
                          columna
                        ) => (

                          <td
                            key={
                              columna.key
                            }

                            className={REPOSITORIOS_CARPETA_DIGITAL.some((item) => item.key === columna.key)
                              ? "relative px-4 py-3 whitespace-nowrap max-w-[400px] overflow-visible text-[var(--erp-text)]"
                              : "px-4 py-3 whitespace-nowrap max-w-[400px] overflow-hidden text-ellipsis text-[var(--erp-text)]"
                            }

                            title={
                              expediente[
                                columna.key
                              ] ?? ""
                            }
                          >

                            {REPOSITORIOS_CARPETA_DIGITAL.some((item) => item.key === columna.key) ? (
                              <CeldaRepositorioDigital
                                expedienteId={expediente.id_expediente || expediente.id}
                                repositorioKey={columna.key}
                                valor={expediente[columna.key]}
                                onAbrir={() => setCarpetaDigitalSeleccionada({
                                  expedienteId: expediente.id_expediente || expediente.id,
                                  actividadId: actividadSeleccionada,
                                })}
                              />
                            ) : columna.key === "carpeta_digital" ? (
                              Number.parseInt(String(expediente[columna.key] || "").match(/\d+/)?.[0] || "0", 10) > 0 ? (
                                <button type="button" onClick={() => setCarpetaDigitalSeleccionada({ expedienteId: expediente.id_expediente || expediente.id, actividadId: actividadSeleccionada })} className="rounded-lg border px-2 py-1 text-xs font-semibold" style={{ borderColor: "var(--erp-border)", color: "var(--erp-primary)" }}>📂 {expediente[columna.key]}</button>
                              ) : null
                            ) : columna.key === "id_expediente" ? (
                              <Link to={`/expedientes/${encodeURIComponent(expediente.id_expediente || expediente.id || "")}`} className="font-extrabold text-[var(--erp-primary)] underline-offset-2 hover:underline" title={`Abrir ficha del expediente ${expediente.id_expediente || expediente.id || ""}`}>
                                {formatearValor(expediente[columna.key], columna.tipo)}
                              </Link>
                            ) : ["estado_expediente", "estado_actividad", "facturacion_estado", "registral_estado", "estado_facturas"].includes(columna.key) && expediente[columna.key] ? (
                              <span className="inline-flex max-w-[220px] items-center rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-normal" style={estiloEstado(expediente[columna.key])} title={String(expediente[columna.key])}>
                                {formatearValor(expediente[columna.key], columna.tipo)}
                              </span>
                            ) : formatearValor(expediente[columna.key], columna.tipo)}

                          </td>

                        )
                      )}




                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>


      {/* ======================================================
          INFORMACIÓN DE PAGINACIÓN
      ====================================================== */}

      <div
        className="
          w-full

          flex

          flex-col

          sm:flex-row

          items-center
          justify-between

          gap-3

          text-sm

          text-[var(--erp-text-soft)]
        "
      >

        <span>

          Total de expedientes:{" "}

          <strong
            className="
              text-[var(--erp-text)]
            "
          >
            {
              formatearNumero(
                totalExpedientes
              )
            }
          </strong>

        </span>


        <span>

          Mostrando{" "}

          <strong
            className="
              text-[var(--erp-text)]
            "
          >
            {
              expedientes.length
            }
          </strong>

          {" "}en esta página

        </span>

      </div>


      {/* ======================================================
          PAGINACIÓN
      ====================================================== */}

      <div
        className="
          w-full

          flex
          flex-col

          sm:flex-row

          items-center
          justify-center

          gap-4
        "
      >

        <button
          type="button"

          disabled={
            pagina <= 1 ||
            loading
          }

          onClick={() =>
            setPagina(
              (actual) =>
                Math.max(
                  1,
                  actual - 1
                )
            )
          }

          className="
            px-4
            py-2

            rounded-xl

            bg-white

            border
            border-[var(--erp-border)]

            text-[var(--erp-text)]

            hover:bg-[var(--erp-surface-soft)]

            transition

            disabled:opacity-40

            disabled:cursor-not-allowed
          "
        >
          Anterior
        </button>


        <span
          className="
            text-[var(--erp-text-soft)]
          "
        >

          Página{" "}

          <strong
            className="
              text-[var(--erp-text)]
            "
          >
            {
              pagina
            }
          </strong>

          {" "}de{" "}

          <strong
            className="
              text-[var(--erp-text)]
            "
          >
            {
              totalPaginas
            }
          </strong>

        </span>


        <button
          type="button"

          disabled={
            pagina >=
              totalPaginas ||
            loading
          }

          onClick={() =>
            setPagina(
              (actual) =>
                Math.min(
                  totalPaginas,
                  actual + 1
                )
            )
          }

          className="
            px-4
            py-2

            rounded-xl

            bg-white

            border
            border-[var(--erp-border)]

            text-[var(--erp-text)]

            hover:bg-[var(--erp-surface-soft)]

            transition

            disabled:opacity-40

            disabled:cursor-not-allowed
          "
        >
          Siguiente
        </button>

      </div>

      </main>

      {/* ======================================================
          MODAL — FILTROS AVANZADOS
      ====================================================== */}

      {mostrarFiltros && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-filtros-titulo"
        >
          <button
            type="button"
            aria-label="Cerrar filtros avanzados"
            onClick={() => setMostrarFiltros(false)}
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-sm"
          />

          <section
            className="relative z-10 w-full max-w-5xl max-h-[88vh] overflow-y-auto rounded-3xl border shadow-2xl"
            style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)" }}
          >
            <div
              className="sticky top-0 z-10 px-6 py-5 border-b flex items-start justify-between gap-4"
              style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)" }}
            >
              <div>
                <h3 id="modal-filtros-titulo" className="text-xl font-bold" style={{ color: "var(--erp-text)" }}>
                  Filtros avanzados
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--erp-text-soft)" }}>
                  Empieza por los datos que conozcas. Puedes combinar varios criterios; los campos están agrupados por tema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarFiltros(false)}
                className="shrink-0 w-10 h-10 rounded-xl border text-lg font-semibold transition hover:bg-[var(--erp-surface-soft)]"
                style={{ borderColor: "var(--erp-border)", color: "var(--erp-text-soft)" }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="md:col-span-2 xl:col-span-3 border-b pb-2" style={{ borderColor: "var(--erp-border)" }}><h4 className="text-sm font-bold" style={{ color: "var(--erp-text)" }}>Identificación y fechas</h4><p className="text-xs mt-1" style={{ color: "var(--erp-text-soft)" }}>Localiza el expediente por número, oficina o fecha de alta.</p></div>
              <FiltroInput label="N.º expediente" value={filtroNumeroExpediente} onChange={setFiltroNumeroExpediente} placeholder="Número completo o parte del expediente" />
              <FiltroSelect label="Oficina" value={filtroOficina} onChange={setFiltroOficina} options={catalogosListado.oficinas} emptyLabel="Todas las oficinas" />
              <FiltroInput label="Fecha de alta desde" type="date" value={filtroFechaInicio} onChange={setFiltroFechaInicio} />
              <FiltroInput label="Fecha de alta hasta" type="date" value={filtroFechaFin} onChange={setFiltroFechaFin} />
              <div className="md:col-span-2 xl:col-span-3 border-b pb-2 mt-2" style={{ borderColor: "var(--erp-border)" }}><h4 className="text-sm font-bold" style={{ color: "var(--erp-text)" }}>Personas y notaría</h4><p className="text-xs mt-1" style={{ color: "var(--erp-text-soft)" }}>Titular, solicitante y notario asociados al expediente.</p></div>
              <FiltroInput label="NIF titular" value={filtroNifTitular} onChange={setFiltroNifTitular} placeholder="NIF / CIF titular" />
              <FiltroInput label="Nombre titular" value={filtroNombreTitular} onChange={setFiltroNombreTitular} placeholder="Nombre o razón social" />
              <FiltroInput label="NIF solicitante" value={filtroNifSolicitante} onChange={setFiltroNifSolicitante} placeholder="NIF / CIF solicitante" />
              <FiltroInput label="Nombre solicitante" value={filtroNombreSolicitante} onChange={setFiltroNombreSolicitante} placeholder="Nombre o razón social" />
              <FiltroSelect label="Notario" value={filtroNotario} onChange={setFiltroNotario} options={catalogosListado.notarios} emptyLabel="Todos los notarios" />
              <FiltroInput label="NIF notario" value={filtroNifNotario} onChange={setFiltroNifNotario} placeholder="NIF notario" />
              <div className="md:col-span-2 xl:col-span-3 border-b pb-2 mt-2" style={{ borderColor: "var(--erp-border)" }}><h4 className="text-sm font-bold" style={{ color: "var(--erp-text)" }}>Registro y economía</h4><p className="text-xs mt-1" style={{ color: "var(--erp-text-soft)" }}>Finca, registro, importes, observaciones y estado de tramitación.</p></div>
              <FiltroInput label="Finca" value={filtroFinca} onChange={setFiltroFinca} placeholder="Número o referencia de finca" />
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--erp-text)" }}>Registro de la Propiedad</label>
                <select value={filtroRegistroPropiedad} onChange={(event) => setFiltroRegistroPropiedad(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)", color: "var(--erp-text)" }}>
                  <option value="">Todos los registros</option>
                  {(catalogosListado.registros.length ? catalogosListado.registros : [...new Set(expedientes.map((item) => item.registro_propiedad || item.nombre_registro || item.registro).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b, "es"))).map((registro) => <option key={registro} value={registro}>{registro}</option>)}
                </select>
                <p className="text-xs mt-1" style={{ color: "var(--erp-text-soft)" }}>Opciones del catálogo completo de registros, independientemente de la página del listado.</p>
              </div>
              <FiltroInput label="Saldo real" type="number" value={filtroSaldoReal} onChange={setFiltroSaldoReal} placeholder="Importe exacto" />
              <FiltroInput label="Saldo disponible" type="number" value={filtroSaldoDisponible} onChange={setFiltroSaldoDisponible} placeholder="Importe exacto" />
              <FiltroInput label="Importe" type="number" value={filtroImporte} onChange={setFiltroImporte} placeholder="Importe exacto" />
              <FiltroInput label="Observaciones" value={filtroObservaciones} onChange={setFiltroObservaciones} placeholder="Texto a buscar" />
              <FiltroInput label="Promoción" value={filtroPromocion} onChange={setFiltroPromocion} placeholder="Referencia interna" />
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--erp-text)" }}>Estado actividad</label>
                <select value={filtroEstadoActividad} onChange={(event) => setFiltroEstadoActividad(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)", color: "var(--erp-text)" }}>
                  <option value="">Todos los estados</option>
                  {(catalogosListado.estados_actividad.length ? catalogosListado.estados_actividad : [...new Set(expedientes.map((item) => item.estado_actividad).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b, "es"))).map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--erp-text)" }}>Actividad actual</label>
                <select value={filtroActividad} onChange={(event) => setFiltroActividad(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)", color: "var(--erp-text)" }}>
                  <option value="">Todas las actividades</option>
                  {(catalogosListado.actividades.length ? catalogosListado.actividades : actividades).map((item) => <option key={item.actividad} value={item.actividad}>{item.actividad}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--erp-text)" }}>Estado expediente</label>
                <select value={filtroEstadoExpediente} onChange={(event) => setFiltroEstadoExpediente(event.target.value)} className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)", color: "var(--erp-text)" }}>
                  <option value="">Todos los estados</option>
                  {(catalogosListado.estados_expediente.length ? catalogosListado.estados_expediente : [...new Set(expedientes.map((item) => item.estado_expediente).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b, "es"))).map((estado) => <option key={estado} value={estado}>{estado}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 xl:col-span-3 border-b pb-2 mt-2" style={{ borderColor: "var(--erp-border)" }}>
                <h4 className="text-sm font-bold" style={{ color: "var(--erp-text)" }}>Clasificación ABSIS</h4>
                <p className="text-xs mt-1" style={{ color: "var(--erp-text-soft)" }}>Filtros de categorías importadas; puedes combinarlos entre sí.</p>
              </div>
              <FiltroSelect label="Origen Bankia" value={filtroOrigenBankia} onChange={setFiltroOrigenBankia} options={catalogosListado.origenes_bankia} emptyLabel="Todos los orígenes" />
              <FiltroSelect label="Producto GTG" value={filtroProductoGtg} onChange={setFiltroProductoGtg} options={catalogosListado.productos_gtg} emptyLabel="Todos los productos" />
              <FiltroSelect label="Apoderado" value={filtroApoderado} onChange={setFiltroApoderado} options={catalogosListado.apoderados} emptyLabel="Todos los apoderados" />
              <FiltroSelect label="Tipo provisión" value={filtroTipoProvision} onChange={setFiltroTipoProvision} options={catalogosListado.tipos_provision} emptyLabel="Todos los tipos" />
              <FiltroSelect label="Tipo operación" value={filtroTipoOperacion} onChange={setFiltroTipoOperacion} options={catalogosListado.tipos_operacion} emptyLabel="Todas las operaciones" />
              <FiltroSelect label="Subtipo operación" value={filtroSubtipoOperacion} onChange={setFiltroSubtipoOperacion} options={catalogosListado.subtipos_operacion} emptyLabel="Todos los subtipos" />
              <FiltroSelect label="Gestoría" value={filtroNombreGestoria} onChange={setFiltroNombreGestoria} options={catalogosListado.gestorias} emptyLabel="Todas las gestorías" />
              <FiltroSelect label="Oficina de alta" value={filtroOficinaAlta} onChange={setFiltroOficinaAlta} options={catalogosListado.oficinas_alta} emptyLabel="Todas las oficinas" />
              <FiltroSelect label="DAN" value={filtroDan} onChange={setFiltroDan} options={catalogosListado.dans} emptyLabel="Todos los DAN" />
              <FiltroSelect label="Tipo de defecto/error" value={filtroTipoError} onChange={setFiltroTipoError} options={catalogosListado.tipos_error} emptyLabel="Todos los tipos" />
              <FiltroSelect label="Tiene defectos abiertos" value={filtroTieneDefectosAbiertos} onChange={setFiltroTieneDefectosAbiertos} options={catalogosListado.defectos_abiertos} emptyLabel="Todos los valores" />
              <FiltroSelect label="FALTADEFECTO · ¿Tiene defecto?" value={filtroFaltaDefecto} onChange={setFiltroFaltaDefecto} options={catalogosListado.falta_defecto} emptyLabel="Sí o no" />
              <FiltroSelect label="Estado ANCERT" value={filtroEstadoExpedienteAncert} onChange={setFiltroEstadoExpedienteAncert} options={catalogosListado.estados_ancert} emptyLabel="Todos los estados ANCERT" />
              <FiltroSelect label="Tipo de acta" value={filtroTipoActa} onChange={setFiltroTipoActa} options={catalogosListado.tipos_acta} emptyLabel="Todos los tipos de acta" />
              <FiltroSelect label="Contrato" value={filtroContrato} onChange={setFiltroContrato} options={catalogosListado.contratos} emptyLabel="Todos los contratos" />
              <FiltroSelect label="Tipo de firma" value={filtroTipoFirma} onChange={setFiltroTipoFirma} options={catalogosListado.tipos_firma} emptyLabel="Todos los tipos de firma" />
              <FiltroSelect label="Tipo de documento" value={filtroTipoDocumento} onChange={setFiltroTipoDocumento} options={catalogosListado.tipos_documento} emptyLabel="Todos los documentos" />
              <FiltroSelect label="Provincia" value={filtroProvincia} onChange={setFiltroProvincia} options={catalogosListado.provincias} emptyLabel="Todas las provincias" />
              <FiltroSelect label="Población" value={filtroPoblacion} onChange={setFiltroPoblacion} options={catalogosListado.poblaciones} emptyLabel="Todas las poblaciones" />
              <FiltroSelect label="Tributación" value={filtroTributacion} onChange={setFiltroTributacion} options={catalogosListado.tributaciones} emptyLabel="Todas las tributaciones" />
              <FiltroSelect label="Estado registral" value={filtroEstadoRegistral} onChange={setFiltroEstadoRegistral} options={catalogosListado.estados_registrales} emptyLabel="Todos los estados registrales" />
              <FiltroSelect label="Estado facturación" value={filtroEstadoFacturacion} onChange={setFiltroEstadoFacturacion} options={catalogosListado.estados_facturacion} emptyLabel="Todos los estados de facturación" />
            </div>

            <div className="px-6 py-4 border-t flex flex-wrap items-center justify-end gap-3" style={{ borderColor: "var(--erp-border)", background: "var(--erp-surface-soft)" }}>
              <button
                type="button"
                onClick={limpiarFiltros}
                className="px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:shadow-sm"
                style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)", color: "var(--erp-text)" }}
              >
                Limpiar filtros
              </button>
              <button
                type="button"
                onClick={aplicarFiltros}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md"
                style={{ background: "var(--erp-primary)" }}
              >
                Aplicar filtros
              </button>
            </div>
          </section>
        </div>
      )}

      {mostrarAyudaControlPlazos && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setMostrarAyudaControlPlazos(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="titulo-control-plazos" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-600">MOLSAN ERP · Expedientes</p>
                <h2 id="titulo-control-plazos" className="mt-1 text-lg font-extrabold text-slate-900">📌 Control de plazos</h2>
              </div>
              <button type="button" onClick={() => setMostrarAyudaControlPlazos(false)} aria-label="Cerrar" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">✕</button>
            </header>
            <div className="space-y-3 px-5 py-5 text-sm leading-6 text-slate-700">
              <p>Los recuentos por actividad son independientes del SLA global:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Sede notarial: 5 días.</li>
                <li>Sede notarial con protocolo: 2 días.</li>
                <li>Liquidación de impuestos: 2 días.</li>
                <li>Tramitación inscripción: 23 días.</li>
                <li>Defectos registrales: 60 días.</li>
                <li>Liquidación y cierre: 5 días.</li>
                <li>Documentación previa no tiene plazo de vencimiento.</li>
              </ul>
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-semibold text-amber-900">SLA global superado: {formatearNumero(Number(alertasControl.find((item) => item.key === "sla_global")?.total || 0))} expedientes.</p>
              <p>El SLA global se calcula desde el envío hasta Fin actividad o hoy: 40 días para Propia entidad/Vinculada propia entidad y 70 días para Vinculada otra entidad/Otra entidad. Hipotecario y Crédito Stock se excluyen.</p>
            </div>
            <footer className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3">
              <button type="button" onClick={() => setMostrarAyudaControlPlazos(false)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">Cerrar</button>
            </footer>
          </section>
        </div>
      )}

      {carpetaDigitalSeleccionada && (
        <CarpetaDigitalModal
          expedienteId={carpetaDigitalSeleccionada.expedienteId}
          modoActividad={Boolean(carpetaDigitalSeleccionada.actividadId)}
          actividadId={carpetaDigitalSeleccionada.actividadId}
          tipoOperacion={carpetaDigitalSeleccionada.tipo_operacion || carpetaDigitalSeleccionada.tipoOperacion || carpetaDigitalSeleccionada.operacion}
          onClose={() => setCarpetaDigitalSeleccionada(null)}
        />
      )}
    </div>

  );
}


// ============================================================
// FILTRO INPUT
// ============================================================

function FiltroSelect({ label, value, onChange, options = [], emptyLabel = "Todos" }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: "var(--erp-text)" }}>{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
        style={{ background: "var(--erp-surface)", borderColor: "var(--erp-border)", color: "var(--erp-text)" }}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function FiltroInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {

  return (

    <div>

      <label
        className="
          block

          text-sm
          font-medium

          text-[var(--erp-text)]

          mb-1
        "
      >
        {label}
      </label>


      <input
        type={type}

        placeholder={placeholder}

        value={value}

        onChange={(event) =>
          onChange(
            event.target.value
          )
        }

        className="
          w-full

          px-3
          py-2.5

          rounded-xl

          bg-[var(--erp-surface)]

          border
          border-[var(--erp-border)]

          text-[var(--erp-text)]

          placeholder:text-[var(--erp-text-soft)]

          outline-none

          focus:border-[var(--erp-primary)]

          focus:ring-2

          focus:ring-[var(--erp-primary-soft)]

          transition
        "
      />

    </div>

  );

}
