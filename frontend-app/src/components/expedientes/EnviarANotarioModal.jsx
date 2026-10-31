import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import AutocompleteNotario from "../agenda/AutocompleteNotario";
import axios from "../../api/axios";
import useAccessibleDialog from "../ui/useAccessibleDialog";

// ============================================================
// ENVÍO A NOTARIO + DATOS DE FACTURACIÓN
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
  hora_fin_prevista_firma: "10:00",
  firma_urgente: false,

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
  facturacion_empleado: "No",
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

function normalizarMunicipio(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
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
  const horaFinGuardada = obtenerValor(expediente, "hora_fin_prevista_firma");
  const firmaValor = expediente?.escritura_firmada;
  const escrituraFirmada =
    firmaValor === true ||
    ["sí", "si", "true", "1"].includes(String(firmaValor ?? "").trim().toLowerCase()) ||
    Boolean(expediente?.fecha_firma || String(expediente?.protocolo ?? "").trim());

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
    hora_fin_prevista_firma: horaFinGuardada ? horaFinGuardada.slice(0, 5) : (horaGuardada ? sumarUnaHora(horaGuardada.slice(0, 5)) : FORM_INICIAL.hora_fin_prevista_firma),
    firma_urgente: ["true","1","si","sí"].includes(String(obtenerValor(expediente, "firma_urgente")).trim().toLowerCase()),
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
    capital: obtenerValor(expediente, "capital_documento_notarial", "capital"),
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
    facturacion_empleado: [true, "true", "1", "si", "sí", "yes"].includes(String(expediente?.facturacion_empleado ?? "false").trim().toLowerCase()) ? "Sí" : "No",
  };
}

function clasesInput(extra = "") {
  return `
    w-full 
    px-2.5 py-2 
    
    
    disabled:cursor-not-allowed 
    
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
      <label className="mb-1 block">
        {label}
        {required && <span> *</span>}
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
      <label className="mb-1 block uppercase">
        {label}
      </label>

      <div className="flex min-h-[42px] items-center px-3">
        {valor || "—"}
      </div>
    </div>
  );
}

function TituloSeccion({ titulo, descripcion }) {
  return (
    <div className="mb-3">
      <h3>{titulo}</h3>
      {descripcion && (
        <p className="mt-1">
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
  inline = false,
}) {
  const [form, setForm] = useState(() =>
    crearFormularioDesdeExpediente({
      ...expediente,
      capital:
        cuantiaFincas !== null && cuantiaFincas !== undefined && cuantiaFincas !== ""
          ? cuantiaFincas
          : (expediente?.capital_documento_notarial ?? expediente?.capital),
    })
  );

  const dialogRef = useRef(null);


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
          ? cuantiaInicial
          : String(documento.cuantia),
      }));
    }

    return [{ id: 1, tipo_documento: inicial.tipo_documento || "", cuantia: cuantiaInicial }];
  });

  const [documentosCarpeta, setDocumentosCarpeta] = useState([]);
  const [cargandoDocumentosCarpeta, setCargandoDocumentosCarpeta] = useState(false);
  const [repositorioAbierto, setRepositorioAbierto] = useState("");

  const [municipios, setMunicipios] = useState([]);
  const [municipiosAbierto, setMunicipiosAbierto] = useState(false);
  const [municipiosLoading, setMunicipiosLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useAccessibleDialog({
    open: !inline,
    onClose: () => {
      if (!loading) onClose?.();
    },
    dialogRef,
  });

  // ==========================================================
  useEffect(() => {
    let activo = true;
    if (!expediente?.id_expediente) return () => { activo = false; };
    setCargandoDocumentosCarpeta(true);
    axios.get("/expedientes/" + encodeURIComponent(expediente.id_expediente) + "/carpeta-digital")
      .then(({ data }) => {
        if (activo) setDocumentosCarpeta(Array.isArray(data) ? data : data?.items || []);
      })
      .catch(() => { if (activo) setDocumentosCarpeta([]); })
      .finally(() => { if (activo) setCargandoDocumentosCarpeta(false); });
    return () => { activo = false; };
  }, [expediente?.id_expediente]);

  // MUNICIPIOS: POBLACIÓN AUTOCOMPLETADA Y PROVINCIA VINCULADA
  // ==========================================================

  useEffect(() => {
    let activo = true;

    async function cargarMunicipios() {
      setMunicipiosLoading(true);
      try {
        const response = await axios.get("/municipios");
        if (!activo) return;

        const lista = Array.isArray(response?.data) ? response.data : [];
        setMunicipios(lista);

        // En expedientes antiguos, sincronizamos la provincia solo si la
        // población guardada coincide con un municipio del catálogo.
        setForm((actual) => {
          const coincidencia = lista.find(
            (item) =>
              normalizarMunicipio(item.municipio) ===
              normalizarMunicipio(actual.facturacion_poblacion)
          );
          if (!coincidencia) return actual;
          return {
            ...actual,
            facturacion_poblacion: coincidencia.municipio,
            facturacion_provincia: coincidencia.provincia,
          };
        });
      } catch (err) {
        console.error("No se ha podido cargar el catálogo de municipios.");
      } finally {
        if (activo) setMunicipiosLoading(false);
      }
    }

    cargarMunicipios();
    return () => {
      activo = false;
    };
  }, []);

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
    const firmaYaRegistrada = Boolean(
      expediente?.fecha_firma || String(expediente?.protocolo ?? "").trim()
    );
    if (firmaYaRegistrada && valor === "No") {
      setError("La firma ya está registrada. No se puede borrar desde el envío ordinario.");
      return;
    }

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
  }, [expediente?.fecha_firma, expediente?.protocolo]);

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

    if (!["Catalán", "Castellano"].includes(form.idioma)) {
      setError("Selecciona el idioma del documento.");
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
      fecha_envio: form.fecha_envio || null,
      fecha_solicitud_pnc: form.fecha_solicitud_pnc || null,
      numero_solicitud_pnc: String(form.numero_solicitud_pnc || "").trim() || null,
      fecha_prevista_firma: form.fecha_prevista_firma || null,
      hora_prevista_firma: form.hora_prevista_firma || null,
      hora_fin_prevista_firma: form.hora_fin_prevista_firma || null,
      idioma_documento: form.idioma,

      fecha_firma:
        form.escritura_firmada === "Sí"
          ? form.fecha_firma
          : null,

      protocolo:
        form.escritura_firmada === "Sí"
          ? form.protocolo.trim()
          : null,
      firma_urgente: Boolean(form.firma_urgente),

      notario_id: form.notario.id,
      nombre_notario: nombreNotario,
      nif_notario: form.notario.nif || "",
      notario: nombreNotario,
      apoderado: form.notario.apoderado || "",
      tipo_firma: form.notario.tipo_firma || "",
      tipo_documento: documentosEscritura[0]?.tipo_documento || form.tipo_documento,
      contrato: form.contrato.trim(),
      capital_documento_notarial: form.capital === "" ? null : Number(form.capital),
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
      facturacion_empleado: form.facturacion_empleado === "Sí",
    };

    try {
      setLoading(true);

      // El endpoint de envío a notario guarda los datos del expediente
      // y crea/actualiza la cita de Agenda en una única operación.
      // No hacemos un segundo POST a /agenda/ para evitar duplicados.
      await onGuardar(payload);

      onClose();
    } catch (err) {
      console.error("No se ha podido completar el envío a notario.", err?.response?.status ?? "sin estado HTTP");

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

  const contenido = (
    <div className={inline ? "w-full min-w-0" : "molsan-modal-overlay expediente-operativo-modal fixed inset-0 z-[10050] flex items-center justify-center p-2 sm:p-3"} onMouseDown={(event) => { if (!inline && event.target === event.currentTarget && !loading) onClose(); }}>
      <div ref={dialogRef} tabIndex={inline ? undefined : -1} role={inline ? undefined : "dialog"} aria-modal={inline ? undefined : true} aria-label={inline ? undefined : "Envío de expediente a notario"} className={inline ? "flex w-full min-w-0 flex-col overflow-hidden" : "expediente-operativo-modal-panel flex h-[97vh] max-h-[98vh] w-[min(98vw,1750px)] max-w-[1750px] flex-col overflow-hidden"} onMouseDown={(event) => event.stopPropagation()}>

        {!inline && (
          <div className="flex shrink-0 items-center justify-end px-5 py-3 sm:px-7">
            <button type="button" disabled={loading} onClick={onClose} aria-label="Cerrar modal" className="flex h-9 w-9 shrink-0 items-center justify-center">✕</button>
          </div>
        )}

        {/* CONTENIDO: DOCUMENTACIÓN PREVIA A LA IZQUIERDA + FORMULARIO */}

        <div className={inline ? "min-h-0 w-full px-3 py-4 sm:px-4" : "min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-4 2xl:px-5"}>
          <div className="grid grid-cols-1 items-start gap-3">
            {/* COLUMNA DERECHA — DATOS DEL ENVÍO Y FACTURACIÓN */}
            <div className="min-w-0">
              <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-5 xl:gap-3">
            {/* BLOQUES EN UNA FILA EN PANTALLAS GRANDES; SE ADAPTAN A 2 O 1 COLUMNA */}

            <div className="contents">
              <section className="min-w-0 p-3">
                <TituloSeccion
                  titulo="Envío al notario"
                  descripcion="Indica la fecha en que se envía el expediente al notario. Los datos de solicitud PNC y planificación de firma se gestionan desde ApoderaGest."
                />

                <div className="grid grid-cols-1 items-start gap-3">
                  <div className="min-w-0">
                    <CampoTexto
                      label="Fecha de envío"
                      type="date"
                      value={form.fecha_envio}
                      disabled={loading}
                      required
                      onChange={(valor) => cambiarCampo("fecha_envio", valor)}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block">
                      ¿La escritura está firmada?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["No", "Sí"].map((opcion) => {
                        const activa = form.escritura_firmada === opcion;
                        return (
                          <button
                            key={opcion}
                            type="button"
                            disabled={loading}
                            onClick={() => cambiarEscrituraFirmada(opcion)}
                            className={`px-2 py-2 ${
 activa
 ? ""
 : ""
 }`}
                          >
                            {opcion === "Sí" ? "✓ Sí" : "○ No"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1 block">
                      Firma urgente
                    </label>
                    <div className="flex min-h-[42px] items-center px-3 py-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(form.firma_urgente)}
                          disabled={loading}
                          onChange={(event) => cambiarCampo("firma_urgente", event.target.checked)}
                        />
                        <span>Marcar como urgente</span>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              {/* DATOS DEL NOTARIO */}
              {/* NOTARIO */}

              <section className="min-w-0 p-3 xl:col-span-2">
                <TituloSeccion
                  titulo="Datos del notario"
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
                      className="px-3 py-2"
                    >
                      ✕ Quitar notario y buscar otro
                    </button>
                  </div>
                )}

                {notario && (

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              </section>              {/* TIPO DE DOCUMENTO Y NUEVOS CAMPOS */}

              <section className="min-w-0 p-3 xl:col-span-2">
                <TituloSeccion
                  titulo="Tipo de documento"
                  descripcion="Selecciona el documento, el formato de escritura y la modalidad de tramitación."
                />

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="min-w-0 space-y-3">
                  <CampoTexto label="Contrato" value={form.contrato} disabled={loading} onChange={(v) => cambiarCampo("contrato", v)} placeholder="Contrato de Fincas y Registros" />
                  <CampoTexto label="Tipo de operación" value={form.tipo_operacion} disabled={loading} onChange={(v) => cambiarCampo("tipo_operacion", v)} placeholder="Tipo de operación" />
                  <CampoTexto label="Importe con provisión (€)" value={form.importe} disabled={loading} type="number" onChange={(v) => cambiarCampo("importe", v)} placeholder="0,00" />
                  <div>
                    <label className="mb-1 block">
                      Formato de escritura <span>*</span>
                    </label>
                    <select
                      value={form.formato_escritura}
                      disabled={loading}
                      onChange={(event) => cambiarCampo("formato_escritura", event.target.value)}
                      className={clasesInput()}
                    >
                      <option value="Papel">Papel</option>
                      <option value="Digital">Digital</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block">
                      Tipo de trámite <span>*</span>
                    </label>
                    <select
                      value={form.tipo_tramite}
                      disabled={loading}
                      onChange={(event) => cambiarCampo("tipo_tramite", event.target.value)}
                      className={clasesInput()}
                    >
                      <option value="Telemático">Telemático</option>
                      <option value="Presencial">Presencial</option>
                    </select>
                  </div>
                  </div>
                  <div className="min-w-0">
                <div className="space-y-4">
                  {documentosEscritura.map((documento, indice) => (
                    <div
                      key={documento.id}
                      className="p-3 sm:p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span>
                          Documento {indice + 1}
                        </span>
                        {documentosEscritura.length > 1 && (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setDocumentosEscritura((actuales) => actuales.filter((item) => item.id !== documento.id))}
                            className="px-3 py-1.5"
                          >
                            Quitar documento
                          </button>
                        )}
                      </div>

                      <label className="mb-1 block">
                        Tipo de documento <span>*</span>
                      </label>
                      <select
                        value={documento.tipo_documento}
                        disabled={loading}
                        onChange={(event) => {
                          const valor = event.target.value;
                          setDocumentosEscritura((actuales) => actuales.map((item) => item.id === documento.id ? { ...item, tipo_documento: valor } : item));
                          if (indice === 0) cambiarCampo("tipo_documento", valor);
                        }}
                        className={clasesInput()}
                      >
                        <option value="">
                          Seleccionar tipo de documento
                        </option>
                        {[
                          "Cancelación de condición resolutoria",
                          "Cancelación de condición resolutoria adicional",
                          "Cancelación de préstamo o crédito",
                          "Cancelación de préstamo o crédito adicional",
                          "Cancelación de usufructo",
                          "Cancelación de embargo",
                          "Cancelación de embargo adicional",
                          "Cancelación parcial y liberación de finca",
                          "Cancelación parcial y liberación de garantía",
                          "Cancelación por certificación de cargas",
                          "Cancelación por instancia condición resolutoria",
                          "Devolución mandamiento de cancelación",
                          "Mandamiento judicial",
                          "Mandamiento judicial de cancelación",
                          "Préstamo hipotecario",
                        ].map((tipo) => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>

                      <div className="mt-3">
                        <label className="mb-1 block">
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
                          <p className="mt-1">Se propone el importe de Fincas y Registros; puedes corregirlo antes de guardar.</p>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setDocumentosEscritura((actuales) => ([
                      ...actuales,
                      { id: Date.now(), tipo_documento: "", cuantia: "" },
                    ]))}
                    className="w-full px-3 py-2.5"
                  >
                    + Añadir otro documento de escritura
                  </button>

                  <div className="mt-3">
                    <label className="mb-1 block">
                      Idioma del documento
                      <span> *</span>
                    </label>
                    <select
                      value={form.idioma}
                      disabled={loading}
                      onChange={(event) => cambiarCampo("idioma", event.target.value)}
                      className={clasesInput()}
                    >
                      <option value="Catalán">Catalán</option>
                      <option value="Castellano">Castellano</option>
                    </select>
                  </div>





                </div>
                  </div>
                </div>
              </section>


            </div>

            {/* DATOS DE FACTURACIÓN — CUARTO BLOQUE: ocupa todo el ancho disponible */}

            <div className="min-w-0 w-full col-span-full">
              <section className="w-full min-w-0 p-4 sm:p-5">
                <div className="mb-5 flex items-start gap-3">
                  <div>
                    <h3>
                      Datos de facturación
                    </h3>
                    <p className="mt-1">
                      Revisa y completa los datos de facturación.
                      Todos estos campos son editables.
                    </p>
                  </div>
                </div>

                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <label className="mb-1 block">¿El cliente es empleado?</label>
                    <select value={form.facturacion_empleado} disabled={loading} onChange={(event) => cambiarCampo("facturacion_empleado", event.target.value)} className={clasesInput()}>
                      <option value="No">No</option>
                      <option value="Sí">Sí — descuento del 50 % en honorarios</option>
                    </select>
                    <p className="mt-1">Si seleccionas Sí, se aplicará el descuento de empleado en la factura de gestoría.</p>
                  </div>
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

                  <CampoTexto
                    label="Código postal"
                      value={form.facturacion_codigo_postal}
                      disabled={loading}
                      autoComplete="postal-code"
                      onChange={(v) => {
                        const cp = String(v || "").trim();
                        const coincidencias = municipios.filter((item) =>
                          (item.codigos_postales || []).includes(cp)
                        );
                        setForm((actual) => ({
                          ...actual,
                          facturacion_codigo_postal: v,
                          ...(coincidencias.length === 1 ? {
                            facturacion_poblacion: coincidencias[0].municipio,
                            facturacion_provincia: coincidencias[0].provincia,
                          } : {}),
                        }));
                        setError("");
                      }}
                    />

                    <div className="relative min-w-0">
                      <label className="mb-1 block">
                        Población
                      </label>
                      <input
                        type="text"
                        value={form.facturacion_poblacion ?? ""}
                        disabled={loading}
                        autoComplete="off"
                        placeholder={municipiosLoading ? "Cargando municipios..." : "Escribe para buscar un municipio"}
                        onFocus={() => setMunicipiosAbierto(true)}
                        onChange={(event) => {
                          const valor = event.target.value;
                          const coincidencia = municipios.find(
                            (item) => normalizarMunicipio(item.municipio) === normalizarMunicipio(valor)
                          );
                          setForm((actual) => ({
                            ...actual,
                            facturacion_poblacion: valor,
                            facturacion_provincia: coincidencia ? coincidencia.provincia : "",
                          }));
                          setMunicipiosAbierto(true);
                          setError("");
                        }}
                        onBlur={() => {
                          setTimeout(() => setMunicipiosAbierto(false), 120);
                        }}
                        className={clasesInput()}
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={municipiosAbierto}
                        aria-label="Población de facturación"
                      />
                      {municipiosAbierto && !loading && form.facturacion_poblacion.trim() && (
                        <div
                          role="listbox"
                          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto p-1"
                        >
                          {municipios
                            .filter((item) =>
                              normalizarMunicipio(item.municipio).includes(normalizarMunicipio(form.facturacion_poblacion)) ||
                              normalizarMunicipio(item.provincia).includes(normalizarMunicipio(form.facturacion_poblacion))
                            )
                            .slice(0, 10)
                            .map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                role="option"
                                aria-selected={normalizarMunicipio(item.municipio) === normalizarMunicipio(form.facturacion_poblacion)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setForm((actual) => ({
                                    ...actual,
                                    facturacion_poblacion: item.municipio,
                                    facturacion_provincia: item.provincia,
                                    facturacion_codigo_postal: item.codigo_postal_principal || (item.codigos_postales || [])[0] || actual.facturacion_codigo_postal,
                                  }));
                                  setMunicipiosAbierto(false);
                                  setError("");
                                }}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2"
                              >
                                <span>{item.municipio}</span>
                                <span>{item.provincia}</span>
                              </button>
                            ))}
                          {municipios.filter((item) =>
                            normalizarMunicipio(item.municipio).includes(normalizarMunicipio(form.facturacion_poblacion)) ||
                            normalizarMunicipio(item.provincia).includes(normalizarMunicipio(form.facturacion_poblacion))
                          ).length === 0 && (
                            <p className="px-3 py-2">
                              No se encuentra en el catálogo. Comprueba la población en Utilidades → Municipios.
                            </p>
                          )}
                        </div>
                      )}
                      <p className="mt-1">
                        {municipiosLoading
                          ? "Cargando catálogo de municipios…"
                          : "Selecciona un municipio para completar automáticamente la provincia."}
                      </p>
                    </div>

                  <CampoTexto
                    label="Provincia"
                    value={form.facturacion_provincia}
                    disabled={loading || municipios.some((item) =>
                      normalizarMunicipio(item.municipio) === normalizarMunicipio(form.facturacion_poblacion)
                    )}
                    autoComplete="address-level1"
                    onChange={(v) => cambiarCampo("facturacion_provincia", v)}
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

                </div>
              </section>


            </div>
              </div>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div
              role="alert"
              className="mt-5 px-4 py-3"
            >
              {error}
            </div>
          )}
        </div>

        {/* PIE FIJO */}

        <div className="flex shrink-0 flex-col-reverse gap-3 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <p className="self-center">
            Los campos con <span>*</span>{" "}
            son obligatorios.
          </p>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {!inline && <button type="button" disabled={loading} onClick={onClose} className="px-5 py-2.5">Cancelar</button>}

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
                !form.fecha_envio
              }
              onClick={guardar}
              className="px-5 py-2.5"
            >
              {loading ? "Guardando..." : "Enviar a notario"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return inline ? contenido : createPortal(contenido, document.body);
}
