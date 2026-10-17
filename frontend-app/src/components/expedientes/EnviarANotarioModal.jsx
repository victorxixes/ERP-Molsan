import { useCallback, useEffect, useState } from "react";

import AutocompleteNotario from "../agenda/AutocompleteNotario";
import CarpetaDigitalModal from "./CarpetaDigitalModal";
import axios from "../../api/axios";

// ============================================================
// ERP MOLSAN — ENVÍO A NOTARIO + DATOS DE FACTURACIÓN
// PREMIUM 2027
// ============================================================

const FORM_INICIAL = {
  escritura_firmada: "No",
  fecha_envio: "",
  idioma: "Catalán",

  fecha_solicitud_pnc: "",
  numero_solicitud_pnc: "",

  fecha_firma: "",
  protocolo: "",

  fecha_prevista_firma: "",
  hora_prevista_firma: "09:00",

  notario: null,
  tipo_documento: "",

  // Datos de operación enlazados al expediente
  contrato: "",
  capital: "",
  tipo_operacion: "",
  subtipo_operacion: "",
  importe: "",

  // NUEVOS CAMPOS
  formato_escritura: "Papel",
  tipo_tramite: "Telemático",

  // DATOS DE FACTURACIÓN EDITABLES
  facturacion_nombre: "",
  facturacion_apellidos: "",
  facturacion_dni_nif: "",
  facturacion_direccion: "",
  facturacion_codigo_postal: "",
  facturacion_poblacion: "",
  facturacion_provincia: "",
  facturacion_telefono: "",
  facturacion_email: "",
};

function fechaHoy() {
  const ahora = new Date();
  const year = ahora.getFullYear();
  const month = String(ahora.getMonth() + 1).padStart(2, "0");
  const day = String(ahora.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sumarUnaHora(hora) {
  if (!hora) return "";

  const partes = String(hora).split(":");
  if (partes.length < 2) return "";

  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  if (Number.isNaN(horas) || Number.isNaN(minutos)) {
    return "";
  }

  const totalMinutos = horas * 60 + minutos + 60;

  if (totalMinutos >= 24 * 60) return "";

  const horasFinal = Math.floor(totalMinutos / 60);
  const minutosFinal = totalMinutos % 60;

  return `${String(horasFinal).padStart(2, "0")}:${String(
    minutosFinal
  ).padStart(2, "0")}`;
}

function formatearFecha(valor) {
  if (!valor) return "—";

  const texto = String(valor);

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [year, month, day] = texto.split("-");
    return `${day}/${month}/${year}`;
  }

  return texto;
}

function obtenerValor(objeto, ...claves) {
  for (const clave of claves) {
    const valor = objeto?.[clave];

    if (valor !== undefined && valor !== null && valor !== "") {
      return String(valor);
    }
  }

  return "";
}

function crearFormularioDesdeExpediente(expediente) {
  const nombreNotario = obtenerValor(
    expediente,
    "nombre_notario",
    "notario"
  );
  const partesNombre = nombreNotario.split(/\s+/).filter(Boolean);
  const horaGuardada = obtenerValor(expediente, "hora_prevista_firma");
  const firmaValor = expediente?.escritura_firmada;
  const escrituraFirmada =
    firmaValor === true ||
    ["sí", "si", "true", "1"].includes(String(firmaValor ?? "").trim().toLowerCase());

  return {
    ...FORM_INICIAL,
    escritura_firmada: escrituraFirmada ? "Sí" : "No",
    fecha_envio:
      obtenerValor(expediente, "fecha_envio_notario", "fecha_envio") || fechaHoy(),
    idioma:
      obtenerValor(expediente, "idioma_documento", "idioma") || FORM_INICIAL.idioma,
    fecha_solicitud_pnc: obtenerValor(expediente, "fecha_solicitud_pnc"),
    numero_solicitud_pnc: obtenerValor(expediente, "numero_solicitud_pnc"),
    fecha_firma: obtenerValor(expediente, "fecha_firma"),
    protocolo: obtenerValor(expediente, "protocolo"),
    fecha_prevista_firma: obtenerValor(expediente, "fecha_prevista_firma"),
    hora_prevista_firma: horaGuardada ? horaGuardada.slice(0, 5) : FORM_INICIAL.hora_prevista_firma,
    notario: nombreNotario
      ? {
          id: expediente?.notario_id ?? null,
          nombre: partesNombre[0] || "",
          apellidos: partesNombre.slice(1).join(" "),
          nif: obtenerValor(expediente, "nif_notario"),
          municipio: obtenerValor(expediente, "poblacion"),
          provincia: obtenerValor(expediente, "provincia"),
          apoderado: obtenerValor(expediente, "apoderado"),
          tipo_firma: obtenerValor(expediente, "tipo_firma"),
        }
      : null,
    tipo_documento: obtenerValor(expediente, "tipo_documento"),
    contrato: obtenerValor(expediente, "contrato"),
    capital: obtenerValor(expediente, "capital"),
    tipo_operacion: obtenerValor(expediente, "tipo_operacion"),
    subtipo_operacion: obtenerValor(expediente, "subtipo_operacion"),
    importe: obtenerValor(expediente, "importe"),
    formato_escritura:
      obtenerValor(expediente, "formato_escritura") || FORM_INICIAL.formato_escritura,
    tipo_tramite:
      obtenerValor(expediente, "tipo_tramite") || FORM_INICIAL.tipo_tramite,
    facturacion_nombre: obtenerValor(expediente, "facturacion_nombre", "nombre_facturacion"),
    facturacion_apellidos: obtenerValor(expediente, "facturacion_apellidos", "apellidos_facturacion"),
    facturacion_dni_nif: obtenerValor(expediente, "facturacion_dni_nif", "dni_facturacion", "nif_facturacion"),
    facturacion_direccion: obtenerValor(expediente, "facturacion_direccion", "direccion_facturacion"),
    facturacion_codigo_postal: obtenerValor(expediente, "facturacion_codigo_postal", "codigo_postal_facturacion"),
    facturacion_poblacion: obtenerValor(expediente, "facturacion_poblacion", "poblacion_facturacion"),
    facturacion_provincia: obtenerValor(expediente, "facturacion_provincia", "provincia_facturacion"),
    facturacion_telefono: obtenerValor(expediente, "facturacion_telefono", "telefono_facturacion"),
    facturacion_email: obtenerValor(expediente, "facturacion_email", "email_facturacion"),
  };
}

function clasesInput(extra = "") {
  return `
    w-full rounded-xl border border-slate-300 bg-white
    px-3 py-2.5 text-sm text-slate-700 outline-none
    transition
    focus:border-[var(--erp-primary)]
    focus:ring-2 focus:ring-[var(--erp-primary-soft)]
    disabled:cursor-not-allowed disabled:bg-slate-100
    disabled:opacity-70
    ${extra}
  `;
}

function CampoTexto({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder = "",
  required = false,
  autoComplete,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>

      <input
        type={type}
        value={value ?? ""}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={clasesInput()}
      />
    </div>
  );
}

function CampoAutomatico({ label, valor }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <div className="flex min-h-[42px] items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-600">
        {valor || "—"}
      </div>
    </div>
  );
}

function Resumen({ label, valor }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-0.5 break-words text-sm font-semibold text-slate-700">
        {valor || "—"}
      </div>
    </div>
  );
}

function TituloSeccion({ titulo, descripcion }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
      {descripcion && (
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {descripcion}
        </p>
      )}
    </div>
  );
}

export default function EnviarANotarioModal({
  expediente,
  cuantiaFincas = "",
  onClose,
  onGuardar,
}) {
  const [form, setForm] = useState(() =>
    crearFormularioDesdeExpediente(expediente)
  );

  // Lista de documentos de escritura. El primero conserva la cuantía
  // procedente de Fincas y Registros; los adicionales tienen cuantía propia.
  const [documentosEscritura, setDocumentosEscritura] = useState(() => {
    const inicial = crearFormularioDesdeExpediente(expediente);
    const cuantiaFincasDisponible =
      cuantiaFincas !== "" && cuantiaFincas !== null && cuantiaFincas !== undefined;
    const cuantiaInicial = cuantiaFincasDisponible
      ? String(cuantiaFincas)
      : String(expediente?.cuantia ?? expediente?.finca_cuantia ?? "");
    const guardados = Array.isArray(expediente?.documentos_escritura)
      ? expediente.documentos_escritura
      : [];

    if (guardados.length) {
      return guardados.map((documento, indice) => ({
        id: documento?.id ?? indice + 1,
        tipo_documento: String(documento?.tipo_documento ?? ""),
        cuantia: documento?.cuantia === null || documento?.cuantia === undefined || documento?.cuantia === ""
          ? (indice === 0 ? cuantiaInicial : "")
          : String(documento.cuantia),
      }));
    }

    return [{ id: 1, tipo_documento: inicial.tipo_documento || "", cuantia: cuantiaInicial }];
  });

  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [loadingTipos, setLoadingTipos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // CARGAR TIPOS DE DOCUMENTO
  // ==========================================================

  useEffect(() => {
    let activo = true;

    async function cargarTiposDocumento() {
      try {
        setLoadingTipos(true);

        const response = await axios.get(
          "/tipos-carga-hipotecaria/opciones"
        );

        if (!activo) return;

        setTiposDocumento(
          Array.isArray(response?.data) ? response.data : []
        );
      } catch (err) {
        console.error("ERROR CARGANDO TIPOS DE DOCUMENTO:", err);

        if (activo) {
          setError(
            err?.response?.data?.detail ||
              err?.response?.data?.message ||
              "No se han podido cargar los tipos de documento."
          );
        }
      } finally {
        if (activo) setLoadingTipos(false);
      }
    }

    cargarTiposDocumento();

    return () => {
      activo = false;
    };
  }, []);

  // ==========================================================
  // CERRAR CON ESC
  // ==========================================================

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [loading, onClose]);

  // ==========================================================
  // CAMBIAR CAMPOS
  // ==========================================================

  const cambiarCampo = useCallback((campo, valor) => {
    setForm((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setError("");
  }, []);

  const cambiarEscrituraFirmada = useCallback((valor) => {
    setForm((actual) => ({
      ...actual,
      escritura_firmada: valor,
      ...(valor === "No"
        ? {
            fecha_firma: "",
            protocolo: "",
          }
        : {}),
    }));

    setError("");
  }, []);

  const seleccionarNotario = useCallback((notarioSeleccionado) => {
    if (!notarioSeleccionado) {
      setForm((actual) => ({ ...actual, notario: null }));
      setError("");
      return;
    }

    // Normalizamos nombres alternativos usados por el catálogo CTN para que
    // la selección rellene siempre NIF, apoderado, firma, población y provincia.
    const nombreCompleto = String(
      notarioSeleccionado.nombre ??
      notarioSeleccionado.nombre_notario ??
      notarioSeleccionado.nombres ??
      notarioSeleccionado.notario ??
      ""
    ).trim();
    const apellidosRecibidos = String(
      notarioSeleccionado.apellidos ??
      notarioSeleccionado.apellido ??
      notarioSeleccionado.apellidos_notario ??
      ""
    ).trim();
    const partesNombre = nombreCompleto.split(/\s+/).filter(Boolean);
    const nombre = apellidosRecibidos
      ? String(notarioSeleccionado.nombre ?? notarioSeleccionado.nombres ?? nombreCompleto).trim()
      : (partesNombre.length < 2 ? nombreCompleto : partesNombre.shift());
    const apellidos = apellidosRecibidos || partesNombre.join(" ");

    const normalizado = {
      ...notarioSeleccionado,
      id: Number(
        notarioSeleccionado.id ??
        notarioSeleccionado.notario_id ??
        notarioSeleccionado.id_notario ??
        0
      ),
      nombre: nombre || "",
      apellidos: apellidos || "",
      nif: notarioSeleccionado.nif ?? notarioSeleccionado.nif_notario ?? notarioSeleccionado.documento ?? "",
      municipio: notarioSeleccionado.municipio ?? notarioSeleccionado.poblacion ?? notarioSeleccionado.localidad ?? "",
      provincia: notarioSeleccionado.provincia ?? notarioSeleccionado.provincia_notario ?? "",
      apoderado: notarioSeleccionado.apoderado ?? notarioSeleccionado.nombre_apoderado ?? "",
      tipo_firma: notarioSeleccionado.tipo_firma ?? notarioSeleccionado.tipoFirma ?? notarioSeleccionado.tipo_firma_notarial ?? "",
    };

    setForm((actual) => ({ ...actual, notario: normalizado }));
    setError("");
  }, []);

  const cambiarDatoNotario = useCallback((campo, valor) => {
    setForm((actual) => ({
      ...actual,
      notario: actual.notario
        ? { ...actual.notario, [campo]: valor }
        : null,
    }));
    setError("");
  }, []);

  // ==========================================================
  // GUARDAR ENVÍO Y DATOS DEL EXPEDIENTE
  // ==========================================================

  const guardar = useCallback(async () => {
    if (loading) return;

    setError("");

    if (!expediente?.id_expediente) {
      setError("No se ha podido identificar el expediente.");
      return;
    }

    if (!form.fecha_envio) {
      setError("La Fecha de envío es obligatoria.");
      return;
    }

    if (!["Catalán", "Castellano"].includes(form.idioma)) {
      setError("Selecciona el idioma del documento.");
      return;
    }

    if (!form.fecha_solicitud_pnc) {
      setError("La Fecha Solicitud PNC es obligatoria.");
      return;
    }

    if (!form.numero_solicitud_pnc.trim()) {
      setError("El Nº de Solicitud es obligatorio.");
      return;
    }

    if (!form.notario?.id || !Number.isFinite(Number(form.notario.id)) || Number(form.notario.id) <= 0) {
      setError("Busca y selecciona un notario válido del catálogo. No introduzcas un ID manual ni uses 0.");
      return;
    }

    if (!documentosEscritura.length || documentosEscritura.some((documento) => !documento.tipo_documento)) {
      setError("Selecciona el tipo de documento para cada documento añadido.");
      return;
    }

    if (!form.formato_escritura) {
      setError("Selecciona el formato de escritura.");
      return;
    }

    if (!form.tipo_tramite) {
      setError("Selecciona el tipo de trámite.");
      return;
    }

    if (!form.fecha_prevista_firma) {
      setError("Indica la Fecha prevista de firma.");
      return;
    }

    if (!form.hora_prevista_firma) {
      setError("Indica la Hora prevista de firma.");
      return;
    }

    if (!sumarUnaHora(form.hora_prevista_firma)) {
      setError(
        "La hora prevista de firma no puede ser posterior a las 23:00 porque la cita tendrá una duración inicial de una hora."
      );
      return;
    }

    if (form.fecha_prevista_firma < form.fecha_envio) {
      setError(
        "La Fecha prevista de firma no puede ser anterior a la Fecha de envío."
      );
      return;
    }

    if (form.fecha_solicitud_pnc > form.fecha_envio) {
      setError(
        "La Fecha Solicitud PNC no puede ser posterior a la Fecha de envío."
      );
      return;
    }

    if (form.escritura_firmada === "Sí") {
      if (!form.fecha_firma) {
        setError("Indica la Fecha de firma.");
        return;
      }

      if (!form.protocolo.trim()) {
        setError("Indica el Protocolo.");
        return;
      }

      if (form.fecha_envio > form.fecha_firma) {
        setError(
          "La Fecha de envío no puede ser posterior a la Fecha de firma."
        );
        return;
      }
    }

    const nombreNotario =
      `${form.notario.nombre || ""} ${
        form.notario.apellidos || ""
      }`.trim();

    // Datos del envío + datos editables de facturación.
    const payload = {
      id_expediente: expediente.id_expediente,

      escritura_firmada: form.escritura_firmada === "Sí",
      fecha_envio: form.fecha_envio,
      idioma_documento: form.idioma,

      fecha_solicitud_pnc: form.fecha_solicitud_pnc,
      numero_solicitud_pnc: form.numero_solicitud_pnc.trim(),

      fecha_firma:
        form.escritura_firmada === "Sí"
          ? form.fecha_firma
          : null,

      protocolo:
        form.escritura_firmada === "Sí"
          ? form.protocolo.trim()
          : null,

      fecha_prevista_firma: form.fecha_prevista_firma,
      hora_prevista_firma: form.hora_prevista_firma,

      notario_id: form.notario.id,
      nombre_notario: nombreNotario,
      nif_notario: form.notario.nif || "",
      notario: nombreNotario,
      apoderado: form.notario.apoderado || "",
      tipo_firma: form.notario.tipo_firma || "",
      tipo_documento: documentosEscritura[0]?.tipo_documento || form.tipo_documento,
      contrato: form.contrato.trim(),
      capital: form.capital === "" ? null : Number(form.capital),
      tipo_operacion: form.tipo_operacion.trim(),
      subtipo_operacion: form.subtipo_operacion.trim(),
      importe: form.importe === "" ? null : Number(form.importe),
      cuantia: documentosEscritura[0]?.cuantia ?? (cuantiaFincas !== "" && cuantiaFincas !== null && cuantiaFincas !== undefined
        ? cuantiaFincas
        : (expediente?.cuantia ?? expediente?.finca_cuantia ?? "")),
      // Se envía también la lista completa para que cada documento conserve su cuantía.
      documentos_escritura: documentosEscritura.map(({ tipo_documento, cuantia }) => ({
        tipo_documento,
        cuantia,
      })),

      // NUEVOS CAMPOS
      formato_escritura: form.formato_escritura,
      tipo_tramite: form.tipo_tramite,

      poblacion: form.notario.municipio || "",
      provincia: form.notario.provincia || "",

      // DATOS DE FACTURACIÓN
      facturacion_nombre: form.facturacion_nombre.trim(),
      facturacion_apellidos: form.facturacion_apellidos.trim(),
      facturacion_dni_nif: form.facturacion_dni_nif.trim(),
      facturacion_direccion: form.facturacion_direccion.trim(),
      facturacion_codigo_postal:
        form.facturacion_codigo_postal.trim(),
      facturacion_poblacion: form.facturacion_poblacion.trim(),
      facturacion_provincia: form.facturacion_provincia.trim(),
      facturacion_telefono: form.facturacion_telefono.trim(),
      facturacion_email: form.facturacion_email.trim(),
    };

    try {
      setLoading(true);

      console.log("ENVÍO A NOTARIO — INICIO");
      console.log("EXPEDIENTE:", expediente.id_expediente);
      console.log("PAYLOAD EXPEDIENTE:", payload);

      // El endpoint de envío a notario guarda los datos del expediente
      // y crea/actualiza la cita de Agenda en una única operación.
      // No hacemos un segundo POST a /agenda/ para evitar duplicados.
      await onGuardar(payload);

      console.log("ENVÍO A NOTARIO — COMPLETADO");
      onClose();
    } catch (err) {
      console.error("ERROR ENVIANDO EXPEDIENTE A NOTARIO:", err);
      console.error("RESPONSE:", err?.response?.data);
      console.error("STATUS:", err?.response?.status);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "No se ha podido completar el envío a notario."
      );
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    expediente,
    form,
    documentosEscritura,
    onGuardar,
    onClose,
  ]);

  if (!expediente) return null;

  const notario = form.notario;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-3"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div
        className="flex h-[97vh] max-h-[98vh] w-[99vw] max-w-[2200px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-800 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* CABECERA */}

        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--erp-primary-soft)] text-xl">
              🏛️
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                Envío a notario
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Expediente{" "}
                <strong>{expediente.id_expediente}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* CONTENIDO: DOCUMENTACIÓN PREVIA A LA IZQUIERDA + FORMULARIO */}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-4 2xl:px-5">
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.25fr)] xl:gap-5 2xl:gap-6">
            {/* COLUMNA IZQUIERDA — DOCUMENTACIÓN PREVIA COMPARTIDA CON CARPETA DIGITAL */}
            <aside className="min-w-0">
              <div className="mb-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">📂</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900">Documentación previa</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">Adjunta y consulta los documentos necesarios para preparar el envío al notario.</p>
                    <p className="mt-1 text-[11px] font-semibold text-indigo-700">Los archivos se guardan también en la Carpeta Digital del expediente.</p>
                  </div>
                </div>
              </div>

              <CarpetaDigitalModal
                expedienteId={expediente.id_expediente}
                modoActividad
                actividadId="documentacion-previa"
              />
            </aside>

            {/* COLUMNA DERECHA — DATOS DEL ENVÍO Y FACTURACIÓN */}
            <div className="min-w-0">
              <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2 xl:gap-4 2xl:gap-6">
            {/* COLUMNA IZQUIERDA — ENVÍO AL NOTARIO */}

            <div className="min-w-0 space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <TituloSeccion
                  titulo="1. Envío al notario"
                  descripcion="Datos del envío, solicitud PNC y situación de la escritura."
                />

                <div className="mb-5">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    ¿La escritura está firmada?
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    {["No", "Sí"].map((opcion) => {
                      const activa =
                        form.escritura_firmada === opcion;

                      return (
                        <button
                          key={opcion}
                          type="button"
                          disabled={loading}
                          onClick={() =>
                            cambiarEscrituraFirmada(opcion)
                          }
                          className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                            activa
                              ? "border-[var(--erp-primary)] bg-[var(--erp-primary-soft)] text-[var(--erp-primary)]"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opcion === "Sí" ? "✓ Sí" : "○ No"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CampoTexto
                    label="Fecha de envío"
                    type="date"
                    required
                    value={form.fecha_envio}
                    disabled={loading}
                    onChange={(v) => cambiarCampo("fecha_envio", v)}
                  />

                  <CampoTexto
                    label="Fecha Solicitud PNC"
                    type="date"
                    required
                    value={form.fecha_solicitud_pnc}
                    disabled={loading}
                    onChange={(v) =>
                      cambiarCampo("fecha_solicitud_pnc", v)
                    }
                  />

                  <div className="sm:col-span-2">
                    <CampoTexto
                      label="N.º de Solicitud"
                      required
                      value={form.numero_solicitud_pnc}
                      disabled={loading}
                      placeholder="Número de solicitud PNC"
                      onChange={(v) =>
                        cambiarCampo("numero_solicitud_pnc", v)
                      }
                    />
                  </div>
                </div>
              </section>

              {/* FECHAS Y HORA DE FIRMA */}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <TituloSeccion
                  titulo="2. Planificación de la firma"
                  descripcion="El envío guardará la planificación y el backend creará o actualizará la cita de Agenda."
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CampoTexto
                    label="Fecha prevista de firma"
                    type="date"
                    required
                    value={form.fecha_prevista_firma}
                    disabled={loading}
                    onChange={(v) =>
                      cambiarCampo("fecha_prevista_firma", v)
                    }
                  />

                  <CampoTexto
                    label="Hora prevista de firma"
                    type="time"
                    required
                    value={form.hora_prevista_firma}
                    disabled={loading}
                    onChange={(v) =>
                      cambiarCampo("hora_prevista_firma", v)
                    }
                  />

                  {form.escritura_firmada === "Sí" && (
                    <>
                      <CampoTexto
                        label="Fecha de firma"
                        type="date"
                        required
                        value={form.fecha_firma}
                        disabled={loading}
                        onChange={(v) =>
                          cambiarCampo("fecha_firma", v)
                        }
                      />

                      <CampoTexto
                        label="Protocolo"
                        required
                        value={form.protocolo}
                        disabled={loading}
                        placeholder="Número de protocolo"
                        onChange={(v) =>
                          cambiarCampo("protocolo", v)
                        }
                      />
                    </>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-xs leading-relaxed text-blue-800">
                  <strong>Agenda:</strong> la cita tendrá una
                  duración inicial de una hora. Se comprobará si
                  ya existe una cita para este expediente y fecha.
                </div>
              </section>

              {/* NOTARIO */}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <TituloSeccion
                  titulo="3. Datos del notario"
                  descripcion="Selecciona el notario desde el catálogo CTN."
                />

                <AutocompleteNotario
                  value={notario}
                  disabled={loading}
                  onSelect={seleccionarNotario}
                />

                {notario && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => seleccionarNotario(null)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✕ Quitar notario y buscar otro
                    </button>
                  </div>
                )}

                {notario && (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <CampoTexto
                      label="Apoderado"
                      value={notario.apoderado || ""}
                      disabled={loading}
                      onChange={(v) => cambiarDatoNotario("apoderado", v)}
                    />

                    <CampoTexto
                      label="Tipo de firma"
                      value={notario.tipo_firma || ""}
                      disabled={loading}
                      onChange={(v) => cambiarDatoNotario("tipo_firma", v)}
                    />

                    <CampoTexto
                      label="NIF notario"
                      value={notario.nif || ""}
                      disabled={loading}
                      onChange={(v) => cambiarDatoNotario("nif", v)}
                    />

                    <CampoTexto
                      label="Población notario"
                      value={notario.municipio || ""}
                      disabled={loading}
                      onChange={(v) => cambiarDatoNotario("municipio", v)}
                    />

                    <div className="sm:col-span-2">
                      <CampoTexto
                        label="Provincia notario"
                        value={notario.provincia || ""}
                        disabled={loading}
                        onChange={(v) => cambiarDatoNotario("provincia", v)}
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* TIPO DE DOCUMENTO Y NUEVOS CAMPOS */}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <TituloSeccion
                  titulo="4. Tipo de documento"
                  descripcion="Selecciona el documento, el formato de escritura y la modalidad de tramitación."
                />

                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <CampoTexto label="Contrato" value={form.contrato} disabled={loading} onChange={(v) => cambiarCampo("contrato", v)} placeholder="N.º de contrato" />
                  <CampoTexto label="Capital (€)" value={form.capital} disabled={loading} type="number" onChange={(v) => cambiarCampo("capital", v)} placeholder="0,00" />
                  <CampoTexto label="Tipo de operación" value={form.tipo_operacion} disabled={loading} onChange={(v) => cambiarCampo("tipo_operacion", v)} placeholder="Ej. Cancelación sin provisión" />
                  <CampoTexto label="Subtipo de operación" value={form.subtipo_operacion} disabled={loading} onChange={(v) => cambiarCampo("subtipo_operacion", v)} placeholder="Ej. Crédito abierto" />
                  <CampoTexto label="Importe (€)" value={form.importe} disabled={loading} type="number" onChange={(v) => cambiarCampo("importe", v)} placeholder="0,00" />
                </div>

                <div className="space-y-4">
                  {documentosEscritura.map((documento, indice) => (
                    <div
                      key={documento.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-700">
                          Documento {indice + 1}
                        </span>
                        {indice > 0 && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setDocumentosEscritura((actuales) => actuales.filter((item) => item.id !== documento.id))}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            Quitar documento
                          </button>
                        )}
                      </div>

                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Tipo de documento <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={documento.tipo_documento}
                        disabled={loading || loadingTipos}
                        onChange={(event) => {
                          const valor = event.target.value;
                          setDocumentosEscritura((actuales) => actuales.map((item) => item.id === documento.id ? { ...item, tipo_documento: valor } : item));
                          if (indice === 0) cambiarCampo("tipo_documento", valor);
                        }}
                        className={clasesInput()}
                      >
                        <option value="">
                          {loadingTipos ? "Cargando tipos de documento..." : "Seleccionar tipo de documento"}
                        </option>
                        {tiposDocumento.map((tipo) => (
                          <option key={tipo.id} value={tipo.nombre}>{tipo.nombre}</option>
                        ))}
                      </select>

                      <div className="mt-3">
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                          Cuantía
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={documento.cuantia}
                          disabled={loading}
                          placeholder="Cuantía de este documento (€)"
                          onChange={(event) => setDocumentosEscritura((actuales) => actuales.map((item) => item.id === documento.id ? { ...item, cuantia: event.target.value } : item))}
                          className={clasesInput()}
                        />
                        {indice === 0 && (
                          <p className="mt-1 text-xs text-slate-500">Se propone el importe de Fincas y Registros; puedes corregirlo antes de guardar.</p>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={loading || loadingTipos}
                    onClick={() => setDocumentosEscritura((actuales) => [...actuales, { id: Date.now(), tipo_documento: "", cuantia: "" }])}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--erp-primary)]/30 bg-[var(--erp-primary-soft)] px-4 py-2.5 text-sm font-bold text-[var(--erp-primary)] transition hover:opacity-80 disabled:opacity-50"
                  >
                    <span className="text-lg leading-none">+</span> Añadir otro documento y cuantía
                  </button>
                </div>

                {/* FORMATO DE ESCRITURA */}

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Formato de escritura
                    <span className="text-red-500"> *</span>
                  </label>

                  <select
                    value={form.formato_escritura}
                    disabled={loading}
                    onChange={(event) =>
                      cambiarCampo(
                        "formato_escritura",
                        event.target.value
                      )
                    }
                    className={clasesInput()}
                  >
                    <option value="Papel">Papel</option>
                    <option value="Digital">Digital</option>
                  </select>
                </div>

                {/* TIPO DE TRÁMITE */}

                <div className="mt-4">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Tipo de trámite
                    <span className="text-red-500"> *</span>
                  </label>

                  <select
                    value={form.tipo_tramite}
                    disabled={loading}
                    onChange={(event) =>
                      cambiarCampo(
                        "tipo_tramite",
                        event.target.value
                      )
                    }
                    className={clasesInput()}
                  >
                    <option value="Telemático">Telemático</option>
                    <option value="Presencial">Presencial</option>
                  </select>
                </div>
              </section>
            </div>

            {/* COLUMNA DERECHA — FACTURACIÓN */}

            <div className="min-w-0">
              <section className="rounded-2xl border border-[var(--erp-primary)]/20 bg-slate-50/70 p-4 sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--erp-primary-soft)] text-lg">
                    🧾
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Datos de facturación
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Revisa y completa los datos de facturación.
                      Todos estos campos son editables.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <CampoTexto
                    label="Nombre"
                    value={form.facturacion_nombre}
                    disabled={loading}
                    autoComplete="given-name"
                    onChange={(v) =>
                      cambiarCampo("facturacion_nombre", v)
                    }
                  />

                  <CampoTexto
                    label="Apellidos"
                    value={form.facturacion_apellidos}
                    disabled={loading}
                    autoComplete="family-name"
                    onChange={(v) =>
                      cambiarCampo("facturacion_apellidos", v)
                    }
                  />

                  <CampoTexto
                    label="DNI / NIF de facturación"
                    value={form.facturacion_dni_nif}
                    disabled={loading}
                    autoComplete="off"
                    placeholder="DNI o NIF"
                    onChange={(v) =>
                      cambiarCampo("facturacion_dni_nif", v)
                    }
                  />

                  <CampoTexto
                    label="Dirección"
                    value={form.facturacion_direccion}
                    disabled={loading}
                    autoComplete="street-address"
                    placeholder="Calle, número, piso..."
                    onChange={(v) =>
                      cambiarCampo("facturacion_direccion", v)
                    }
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CampoTexto
                      label="Código postal"
                      value={form.facturacion_codigo_postal}
                      disabled={loading}
                      autoComplete="postal-code"
                      onChange={(v) =>
                        cambiarCampo(
                          "facturacion_codigo_postal",
                          v
                        )
                      }
                    />

                    <CampoTexto
                      label="Población"
                      value={form.facturacion_poblacion}
                      disabled={loading}
                      autoComplete="address-level2"
                      onChange={(v) =>
                        cambiarCampo("facturacion_poblacion", v)
                      }
                    />
                  </div>

                  <CampoTexto
                    label="Provincia"
                    value={form.facturacion_provincia}
                    disabled={loading}
                    autoComplete="address-level1"
                    onChange={(v) =>
                      cambiarCampo("facturacion_provincia", v)
                    }
                  />

                  <CampoTexto
                    label="Teléfono"
                    type="tel"
                    value={form.facturacion_telefono}
                    disabled={loading}
                    autoComplete="tel"
                    onChange={(v) =>
                      cambiarCampo("facturacion_telefono", v)
                    }
                  />

                  <CampoTexto
                    label="Email"
                    type="email"
                    value={form.facturacion_email}
                    disabled={loading}
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    onChange={(v) =>
                      cambiarCampo("facturacion_email", v)
                    }
                  />

                  {/* IDIOMA DEBAJO DEL EMAIL */}

                  <div className="border-t border-slate-200 pt-4">
                    <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Idioma del documento
                      <span className="text-red-500"> *</span>
                    </label>

                    <select
                      value={form.idioma}
                      disabled={loading}
                      onChange={(event) =>
                        cambiarCampo("idioma", event.target.value)
                      }
                      className={clasesInput()}
                    >
                      <option value="Catalán">Catalán</option>
                      <option value="Castellano">Castellano</option>
                    </select>

                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                      Selecciona el idioma en el que debe
                      prepararse el documento.
                    </p>
                  </div>
                </div>
              </section>

              {/* RESUMEN DE FACTURACIÓN */}

              <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <h3 className="mb-3 text-sm font-bold text-slate-800">
                  Resumen de facturación
                </h3>

                <div className="space-y-2 text-sm text-slate-600">
                  <p className="break-words">
                    <strong className="text-slate-700">
                      Nombre:
                    </strong>{" "}
                    {`${form.facturacion_nombre} ${form.facturacion_apellidos}`.trim() ||
                      "—"}
                  </p>

                  <p className="break-words">
                    <strong className="text-slate-700">
                      DNI / NIF:
                    </strong>{" "}
                    {form.facturacion_dni_nif || "—"}
                  </p>

                  <p className="break-words">
                    <strong className="text-slate-700">
                      Dirección:
                    </strong>{" "}
                    {form.facturacion_direccion || "—"}
                  </p>

                  <p className="break-words">
                    <strong className="text-slate-700">
                      Código postal y población:
                    </strong>{" "}
                    {[
                      form.facturacion_codigo_postal,
                      form.facturacion_poblacion,
                    ]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </p>

                  <p className="break-words">
                    <strong className="text-slate-700">
                      Provincia:
                    </strong>{" "}
                    {form.facturacion_provincia || "—"}
                  </p>

                  <p className="break-words">
                    <strong className="text-slate-700">
                      Teléfono:
                    </strong>{" "}
                    {form.facturacion_telefono || "—"}
                  </p>

                  <p className="break-words">
                    <strong className="text-slate-700">
                      Email:
                    </strong>{" "}
                    {form.facturacion_email || "—"}
                  </p>

                  <p className="break-words">
                    <strong className="text-slate-700">
                      Idioma:
                    </strong>{" "}
                    {form.idioma}
                  </p>
                </div>
              </section>
            </div>
              </div>
            </div>
          </div>

          {/* RESUMEN GENERAL */}

          <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wide text-slate-500">
              Resumen del envío
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Resumen
                label="Expediente"
                valor={expediente.id_expediente}
              />

              <Resumen
                label="Notario"
                valor={
                  `${notario?.nombre || ""} ${
                    notario?.apellidos || ""
                  }`.trim()
                }
              />

              <Resumen
                label="Notario otorgante (firma real)"
                valor={obtenerValor(expediente, "notario_otorgante") || "Pendiente de confirmar firma"}
              />

              <Resumen
                label="Tipo de documento"
                valor={form.tipo_documento}
              />

              <Resumen
                label="Cuantía"
                valor={String(cuantiaFincas !== "" && cuantiaFincas !== null && cuantiaFincas !== undefined
                  ? cuantiaFincas
                  : (expediente?.cuantia ?? expediente?.finca_cuantia ?? "—"))}
              />

              <Resumen
                label="Formato de escritura"
                valor={form.formato_escritura}
              />

              <Resumen
                label="Tipo de trámite"
                valor={form.tipo_tramite}
              />

              <Resumen
                label="Fecha de envío"
                valor={formatearFecha(form.fecha_envio)}
              />

              <Resumen
                label="Fecha Solicitud PNC"
                valor={formatearFecha(form.fecha_solicitud_pnc)}
              />

              <Resumen
                label="N.º de Solicitud"
                valor={form.numero_solicitud_pnc}
              />

              <Resumen
                label="Fecha prevista de firma"
                valor={formatearFecha(form.fecha_prevista_firma)}
              />

              <Resumen
                label="Hora prevista"
                valor={form.hora_prevista_firma}
              />

              <Resumen
                label="Fin previsto"
                valor={
                  sumarUnaHora(form.hora_prevista_firma) || "—"
                }
              />

              <Resumen
                label="Modalidad de firma"
                valor={notario?.tipo_firma}
              />

              <Resumen
                label="Idioma"
                valor={form.idioma}
              />

              <Resumen
                label="Escritura firmada"
                valor={form.escritura_firmada}
              />
            </div>
          </section>

          {/* ERROR */}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700"
            >
              {error}
            </div>
          )}
        </div>

        {/* PIE FIJO */}

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <p className="self-center text-xs text-slate-400">
            Los campos con <span className="text-red-500">*</span>{" "}
            son obligatorios.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={
                loading ||
                !form.notario ||
                !documentosEscritura.length ||
                documentosEscritura.some((documento) => !documento.tipo_documento) ||
                !form.formato_escritura ||
                !form.tipo_tramite ||
                !form.idioma ||
                !form.fecha_envio ||
                !form.fecha_solicitud_pnc ||
                !form.numero_solicitud_pnc.trim() ||
                !form.fecha_prevista_firma ||
                !form.hora_prevista_firma
              }
              onClick={guardar}
              className="rounded-xl bg-[var(--erp-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Enviar a notario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
