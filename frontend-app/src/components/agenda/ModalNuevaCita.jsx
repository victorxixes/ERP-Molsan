import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

import AutocompleteNotario from "./AutocompleteNotario";

import { obtenerNotaria } from "../../api/ctn";

import SelectSJ from "../ui/SelectSJ";
import useAccessibleDialog from "../ui/useAccessibleDialog";


const TIPOS_CITA = [
  "Firma notarial",
  "Reunión",
  "Visita",
  "Otros",
];


// ============================================================
// NORMALIZAR TIPO DE FIRMA
// ============================================================

const normalizarTipoFirma = (
  vc
) => {

  const v =
    String(vc || "")
      .trim()
      .toUpperCase();

  return (
    v === "SI" ||
    v === "VC" ||
    v === "VIDEOCONFERENCIA"
  )
    ? "Videoconferencia"
    : "Presencial";
};


// ============================================================
// NORMALIZAR NOTARIO
// ============================================================

const normalizarNotario = (
  n,
  tipoFirmaOverride = null,
  distanciaKmOverride = null
) => {

  const tipoFirma =
    tipoFirmaOverride ||
    normalizarTipoFirma(
      n?.vc
    );

  const distanciaKm =
    distanciaKmOverride ??
    n?.distancia_km ??
    null;


  return {

    id:
      n?.id ??
      null,

    codigo:
      n?.codigo ||
      "",

    nombre:
      n?.nombre ||
      "",

    apellidos:
      n?.apellidos ||
      "",

    nif:
      n?.nif ||
      "",

    telefono:
      n?.telefono ||
      "",

    provincia:
      n?.provincia ||
      "",

    municipio:
      n?.municipio ||
      "",

    cp:
      n?.cp ||
      "",

    direccion:
      n?.direccion ||
      "",

    vc:
      n?.vc ||
      "",

    apoderado:
      n?.apoderado_s ||
      n?.apoderado ||
      "",

    observacion:
      n?.observacion ||
      "",

    lat:
      n?.lat ??
      null,

    lng:
      n?.lng ??
      null,

    distancia_km:
      distanciaKm,

    tipo_firma:
      tipoFirma,
  };
};


// ============================================================
// FORMULARIO INICIAL
// ============================================================

const FORM_INICIAL = {

  hora_inicio:
    "",

  hora_fin:
    "",

  tipo_cita:
    "",

  notario_id:
    null,

  tipo_firma:
    "",

  apoderado_visible:
    "",

  observaciones:
    "",
};


export default function ModalNuevaCita({
  fecha,
  modo,
  cita,
  onClose,
  onGuardar,
  onDelete,
}) {

  const soloLectura =
    modo === "ver";

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    form,
    setForm,
  ] = useState(
    FORM_INICIAL
  );

  const [
    notarioSeleccionado,
    setNotarioSeleccionado,
  ] = useState(null);

  const dialogRef = useRef(null);
  useAccessibleDialog({
    open: Boolean(fecha),
    onClose: () => { if (!loading) onClose?.(); },
    dialogRef,
  });


  // ==========================================================
  // CAMBIAR CAMPO
  // ==========================================================

  const handleChange =
    useCallback(
      (
        campo,
        valor
      ) => {

        if (soloLectura)
          return;

        if (campo === "tipo_cita" && valor !== "Firma notarial") {
          // Las citas no notariales no deben conservar datos de firma.
          setNotarioSeleccionado(null);
          setForm((actual) => ({
            ...actual,
            tipo_cita: valor,
            notario_id: null,
            tipo_firma: "",
            apoderado_visible: "",
          }));
        } else {
          setForm(
            (actual) => ({
              ...actual,
              [campo]: valor,
            })
          );
        }

        setError("");

      },
      [soloLectura]
    );


  // ==========================================================
  // CARGAR CITA
  // ==========================================================

  useEffect(() => {

    if (!fecha)
      return;

    setError("");

    if (
      modo === "crear"
    ) {

      setForm(
        FORM_INICIAL
      );

      setNotarioSeleccionado(
        null
      );

      return;
    }

    if (!cita)
      return;


    // ========================================================
    // FORMULARIO
    // ========================================================

    setForm({

      hora_inicio:
        cita.hora_inicio ||
        "",

      hora_fin:
        cita.hora_fin ||
        "",

      tipo_cita:
        cita.tipo_cita ||
        "",

      notario_id:
        cita.notario_id ||
        null,

      tipo_firma:
        typeof cita.tipo_firma ===
        "string"
          ? cita.tipo_firma
          : "",

      apoderado_visible:
        cita.apoderado_nombre ||
        "",

      observaciones:
        cita.observaciones ||
        "",
    });


    // ========================================================
    // SIN NOTARIO
    // ========================================================

    if (
      !cita.notario_id
    ) {

      setNotarioSeleccionado(
        null
      );

      return;
    }


    let cancelado =
      false;


    // ========================================================
    // OBTENER NOTARÍA COMPLETA
    // ========================================================

    obtenerNotaria(
      cita.notario_id
    )

      .then((res) => {

        if (cancelado)
          return;

        const n =
          res?.data;

        if (!n) {

          setNotarioSeleccionado(
            null
          );

          return;
        }


        const notarioCompleto =
          normalizarNotario(
            n,
            cita.tipo_firma,
            cita.distancia_km
          );


        setNotarioSeleccionado(
          notarioCompleto
        );


        setForm(
          (actual) => ({

            ...actual,

            tipo_firma:
              notarioCompleto.tipo_firma,

            apoderado_visible:
              cita.apoderado_nombre ||
              notarioCompleto.apoderado ||
              "",

            observaciones:
              cita.observaciones ||
              notarioCompleto.observacion ||
              "",
          })
        );

      })

      .catch((err) => {

        if (cancelado)
          return;

        console.error(
          "ERROR CARGANDO NOTARIO:",
          err
        );

        setNotarioSeleccionado(
          null
        );

      });


    return () => {

      cancelado = true;

    };

  }, [
    modo,
    cita,
    fecha,
  ]);


  // ==========================================================
  // GUARDAR
  // ==========================================================

  const guardar =
    useCallback(
      async () => {

        if (
          soloLectura ||
          loading
        ) {
          return;
        }

        setError("");


        if (
          !form.hora_inicio
        ) {

          setError(
            "Indica la hora de inicio."
          );

          return;
        }


        if (
          !form.hora_fin
        ) {

          setError(
            "Indica la hora de fin."
          );

          return;
        }


        if (
          form.hora_fin <=
          form.hora_inicio
        ) {

          setError(
            "La hora de fin debe ser posterior a la hora de inicio."
          );

          return;
        }


        if (
          !form.tipo_cita
        ) {

          setError(
            "Selecciona el tipo de cita."
          );

          return;
        }


        const fechaNormalizada =
          typeof fecha ===
          "string"
            ? fecha
            : fecha?.toLocaleDateString(
                "sv-SE"
              );


        if (!fechaNormalizada) {

          setError(
            "La fecha de la cita no es válida."
          );

          return;
        }


        // ====================================================
        // PAYLOAD
        // ====================================================
        //
        // IMPORTANTE:
        // NO enviamos distancia_km desde aquí.
        //
        // El backend lo calcula directamente a partir
        // de las coordenadas de la notaría.
        //
        // De esta forma el dato queda centralizado y
        // no depende del navegador.
        // ====================================================

        const payload = {

          fecha:
            fechaNormalizada,

          hora_inicio:
            form.hora_inicio ||
            "",

          hora_fin:
            form.hora_fin ||
            "",

          tipo_cita:
            form.tipo_cita ||
            "",

          notario_id:
            form.notario_id ||
            null,

          tipo_firma:
            typeof form.tipo_firma ===
            "string"
              ? form.tipo_firma
              : "",

          apoderado:
            form.apoderado_visible ||
            "",

          observaciones:
            form.observaciones ||
            "",
        };


        try {

          setLoading(true);

          await onGuardar(
            payload
          );

        } catch (err) {

          console.error(
            "ERROR AL GUARDAR CITA:",
            err
          );

          setError(
            err?.response?.data
              ?.detail ||
              err?.message ||
              "No se pudo guardar la cita."
          );

        } finally {

          setLoading(false);

        }

      },
      [
        soloLectura,
        loading,
        form,
        fecha,
        onGuardar,
      ]
    );


  // ==========================================================
  // SELECCIONAR NOTARIO
  // ==========================================================

  const seleccionarNotario =
    useCallback(
      (n) => {

        if (
          soloLectura ||
          !n
        ) {
          return;
        }


        const notarioCompleto =
          normalizarNotario(
            n,
            n.tipo_firma,
            n.distancia_km
          );


        setNotarioSeleccionado(
          notarioCompleto
        );


        setForm(
          (actual) => ({

            ...actual,

            notario_id:
              notarioCompleto.id,

            tipo_firma:
              notarioCompleto.tipo_firma,

            apoderado_visible:
              notarioCompleto.apoderado ||
              "",

            observaciones:
              notarioCompleto.observacion ||
              "",
          })
        );


        setError("");

      },
      [soloLectura]
    );


  // ==========================================================
  // SIN FECHA
  // ==========================================================

  if (!fecha)
    return null;


  const titulo =
    modo === "crear"
      ? "Nueva cita"
      : modo === "editar"
      ? "Editar cita"
      : "Ver cita";


  return (

    <div
      className="modal-nueva-cita molsan-modal-overlay
 fixed inset-0
 
 
 flex items-center justify-center
 z-50
 p-4"
      onMouseDown={(e) => {

        if (
          e.target ===
            e.currentTarget &&
          !loading
        ) {

          onClose();

        }

      }}
    >

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="molsan-modal__panel w-full
 max-w-2xl
 max-h-[calc(100dvh-2rem)]
 overflow-y-auto"
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >

        {/* ====================================================
            CABECERA
           ==================================================== */}

        <div
          className="molsan-modal__header sticky top-0 z-20
 
 
 px-6 py-4
 flex items-start justify-between
 gap-4"
        >

          <div>

            <h2
             
            >
              {titulo}
            </h2>

            <p
              className="mt-1"
            >
              {fecha}
            </p>

          </div>


          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="molsan-btn molsan-btn--ghost molsan-btn--icon w-9 h-9
 flex items-center justify-center"
            aria-label="Cerrar"
          >
            ×
          </button>

        </div>


        {/* ====================================================
            CONTENIDO
           ==================================================== */}

        <div
          className="molsan-modal__body p-6
 space-y-5"
        >

          {/* ERROR */}

          {error && (

            <div
              className="px-4 py-3"
            >
              {error}
            </div>

          )}


          <div
            className="grid
 grid-cols-1
 sm:grid-cols-2
 gap-4"
          >

            {/* HORA INICIO */}

            <div>

              <label
                className="block
 mb-1.5"
              >
                Hora inicio
              </label>

              <input
                type="time"
                disabled={
                  soloLectura ||
                  loading
                }
                className="w-full
 min-h-[42px]
 
 
 
 px-3 py-2"
                value={
                  form.hora_inicio
                }
                onChange={(e) =>
                  handleChange(
                    "hora_inicio",
                    e.target.value
                  )
                }
              />

            </div>


            {/* HORA FIN */}

            <div>

              <label
                className="block
 mb-1.5"
              >
                Hora fin
              </label>

              <input
                type="time"
                disabled={
                  soloLectura ||
                  loading
                }
                className="w-full
 min-h-[42px]
 
 
 
 px-3 py-2"
                value={
                  form.hora_fin
                }
                onChange={(e) =>
                  handleChange(
                    "hora_fin",
                    e.target.value
                  )
                }
              />

            </div>


            {/* TIPO CITA */}

            <div
              className="sm:col-span-2"
            >

              <label
                className="block
 mb-1.5"
              >
                Tipo de cita
              </label>

              <SelectSJ
                value={
                  form.tipo_cita
                }
                onChange={(v) =>
                  handleChange(
                    "tipo_cita",
                    v
                  )
                }
                placeholder="Seleccionar tipo"
                disabled={
                  soloLectura ||
                  loading
                }
                options={
                  TIPOS_CITA.map(
                    (tipo) => ({
                      value: tipo,
                      label: tipo,
                    })
                  )
                }
              />

            </div>


            {/* NOTARIO: solo para firmas notariales */}

            {form.tipo_cita === "Firma notarial" && (
              <div
                className="sm:col-span-2"
              >

                <label
                  className="block
 mb-1.5"
                >
                  Notario
                </label>

                <AutocompleteNotario
                  disabled={
                    soloLectura ||
                    loading
                  }
                  value={
                    notarioSeleccionado
                  }
                  onSelect={
                    seleccionarNotario
                  }
                />

              </div>
            )}

          </div>


          {/* ==================================================
              TARJETA NOTARIO
             ================================================== */}

          {form.tipo_cita === "Firma notarial" && notarioSeleccionado && (

            <div
              className="p-4"
            >

              <div
                className="flex
 items-start
 justify-between
 gap-4
 mb-3"
              >

                <div>

                  <h3
                   
                  >
                    {
                      notarioSeleccionado.nombre
                    }{" "}
                    {
                      notarioSeleccionado.apellidos
                    }
                  </h3>

                  <p
                    className="mt-0.5"
                  >
                    Código{" "}
                    {
                      notarioSeleccionado.codigo ||
                      "—"
                    }
                  </p>

                </div>


                <span
                  className={`inline-flex
 px-2.5 py-1
 
 
 
 ${
 notarioSeleccionado.tipo_firma ===
 "Videoconferencia"
 ? ""
 : ""
 }`}
                >
                  {
                    notarioSeleccionado.tipo_firma
                  }
                </span>

              </div>


              <div
                className="grid
 grid-cols-1
 sm:grid-cols-2
 gap-x-6
 gap-y-2"
              >

                <p>

                  <strong
                   
                  >
                    NIF:
                  </strong>{" "}

                  {
                    notarioSeleccionado.nif ||
                    "—"
                  }

                </p>


                <p>

                  <strong
                   
                  >
                    Teléfono:
                  </strong>{" "}

                  {
                    notarioSeleccionado.telefono ||
                    "—"
                  }

                </p>


                <p>

                  <strong
                   
                  >
                    Provincia:
                  </strong>{" "}

                  {
                    notarioSeleccionado.provincia ||
                    "—"
                  }

                </p>


                <p>

                  <strong
                   
                  >
                    Municipio:
                  </strong>{" "}

                  {
                    notarioSeleccionado.municipio ||
                    "—"
                  }

                </p>


                <p>

                  <strong
                   
                  >
                    CP:
                  </strong>{" "}

                  {
                    notarioSeleccionado.cp ||
                    "—"
                  }

                </p>


                <p>

                  <strong
                   
                  >
                    Distancia:
                  </strong>{" "}

                  {
                    notarioSeleccionado.distancia_km !==
                    null &&
                    notarioSeleccionado.distancia_km !==
                    undefined
                      ? `${Number(
                          notarioSeleccionado.distancia_km
                        ).toFixed(2)} km`
                      : "—"
                  }

                </p>


                <p>

                  <strong
                   
                  >
                    Apoderado:
                  </strong>{" "}

                  {
                    notarioSeleccionado.apoderado ||
                    "—"
                  }

                </p>


                <p
                  className="sm:col-span-2"
                >

                  <strong
                   
                  >
                    Dirección:
                  </strong>{" "}

                  {
                    notarioSeleccionado.direccion ||
                    "—"
                  }

                </p>

              </div>


              {notarioSeleccionado.direccion && (

                <iframe
                  title="Ubicación de la notaría"
                  className="w-full
 h-44
 mt-4"
                  loading="lazy"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(
                    `${notarioSeleccionado.direccion}, ${notarioSeleccionado.cp || ""} ${notarioSeleccionado.municipio || ""}`
                  )}&output=embed`}
                />

              )}

            </div>

          )}


          {/* ==================================================
              TIPO FIRMA / APODERADO
             ================================================== */}

          {form.tipo_cita === "Firma notarial" && (
            <div
              className="grid
 grid-cols-1
 sm:grid-cols-2
 gap-4"
            >

              <div>

                <label
                  className="block
 mb-1.5"
                >
                  Tipo de firma
              </label>

              <input
                disabled
                className="w-full
 min-h-[42px]
 
 
 
 px-3 py-2"
                value={
                  form.tipo_firma ||
                  "—"
                }
              />

            </div>


            <div>

              <label
                className="block
 mb-1.5"
              >
                Apoderado
              </label>

              <input
                disabled
                className="w-full
 min-h-[42px]
 
 
 
 px-3 py-2"
                value={
                  form.apoderado_visible ||
                  "—"
                }
              />

              </div>

            </div>
          )}


          {/* ==================================================
              OBSERVACIONES
             ================================================== */}

          <div>

            <label
              className="block
 mb-1.5"
            >
              Observaciones
            </label>

            <textarea
              disabled={
                soloLectura ||
                loading
              }
              className="w-full
 
 
 
 px-3 py-2
 
 
 resize-none"
              rows={4}
              value={
                form.observaciones
              }
              onChange={(e) =>
                handleChange(
                  "observaciones",
                  e.target.value
                )
              }
            />

          </div>

        </div>


        {/* ====================================================
            FOOTER
           ==================================================== */}

        <div
          className="molsan-modal__footer px-6 py-4
 flex flex-col-reverse
 sm:flex-row
 justify-between
 gap-3"
        >

          <div>

            {modo === "editar" &&
              onDelete &&
              !soloLectura && (

                <button
                  type="button"
                  disabled={loading}
                  className="molsan-btn molsan-btn--danger px-4 py-2"
                  onClick={
                    onDelete
                  }
                >
                  Eliminar
                </button>

              )}

          </div>


          <div
            className="flex
 justify-end
 gap-3"
          >

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="molsan-btn molsan-btn--secondary px-4 py-2"
            >
              {
                soloLectura
                  ? "Cerrar"
                  : "Cancelar"
              }
            </button>


            {!soloLectura && (

              <button
                type="button"
                disabled={loading}
                onClick={guardar}
                className="molsan-btn molsan-btn--primary px-5 py-2"
              >
                {
                  loading
                    ? "Guardando…"
                    : modo === "crear"
                    ? "Crear cita"
                    : "Guardar cambios"
                }
              </button>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}
