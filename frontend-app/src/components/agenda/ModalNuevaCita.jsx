import {
  useEffect,
  useState,
  useCallback,
} from "react";

import AutocompleteNotario from "./AutocompleteNotario";

import { obtenerNotaria } from "../../api/ctn";

import SelectSJ from "../ui/SelectSJ";


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

        setForm(
          (actual) => ({
            ...actual,
            [campo]: valor,
          })
        );

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
  // ESC
  // ==========================================================

  useEffect(() => {

    if (!fecha)
      return;

    const handleEscape =
      (event) => {

        if (
          event.key ===
            "Escape" &&
          !loading
        ) {

          onClose();

        }

      };


    window.addEventListener(
      "keydown",
      handleEscape
    );


    return () => {

      window.removeEventListener(
        "keydown",
        handleEscape
      );

    };

  }, [
    fecha,
    loading,
    onClose,
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
      className="
        fixed inset-0
        bg-slate-950/50
        backdrop-blur-sm
        flex items-center justify-center
        z-50
        p-4
        animate-fade-in
      "
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
        className="
          bg-white
          border border-slate-200
          rounded-2xl
          shadow-2xl
          w-full
          max-w-2xl
          max-h-[92vh]
          overflow-y-auto
          text-slate-800
        "
        onMouseDown={(e) =>
          e.stopPropagation()
        }
      >

        {/* ====================================================
            CABECERA
           ==================================================== */}

        <div
          className="
            sticky top-0 z-20
            bg-white/95 backdrop-blur-xl
            border-b border-slate-200
            px-6 py-4
            flex items-start justify-between
            gap-4
          "
        >

          <div>

            <h2
              className="
                text-xl
                font-bold
                text-slate-800
              "
            >
              {titulo}
            </h2>

            <p
              className="
                text-sm
                text-slate-500
                mt-1
              "
            >
              {fecha}
            </p>

          </div>


          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="
              w-9 h-9
              rounded-xl
              flex items-center justify-center
              text-slate-500
              hover:bg-slate-100
              hover:text-slate-800
              transition
              disabled:opacity-40
            "
            aria-label="Cerrar"
          >
            ×
          </button>

        </div>


        {/* ====================================================
            CONTENIDO
           ==================================================== */}

        <div
          className="
            p-6
            space-y-5
          "
        >

          {/* ERROR */}

          {error && (

            <div
              className="
                rounded-xl
                border border-red-200
                bg-red-50
                px-4 py-3
                text-sm
                text-red-700
              "
            >
              {error}
            </div>

          )}


          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              gap-4
            "
          >

            {/* HORA INICIO */}

            <div>

              <label
                className="
                  block
                  mb-1.5
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                Hora inicio
              </label>

              <input
                type="time"
                disabled={
                  soloLectura ||
                  loading
                }
                className="
                  w-full
                  min-h-[42px]
                  bg-white
                  border border-slate-300
                  rounded-xl
                  px-3 py-2
                  text-slate-700
                  shadow-sm
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-400
                  disabled:bg-slate-100
                  disabled:text-slate-400
                "
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
                className="
                  block
                  mb-1.5
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                Hora fin
              </label>

              <input
                type="time"
                disabled={
                  soloLectura ||
                  loading
                }
                className="
                  w-full
                  min-h-[42px]
                  bg-white
                  border border-slate-300
                  rounded-xl
                  px-3 py-2
                  text-slate-700
                  shadow-sm
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500/20
                  focus:border-blue-400
                  disabled:bg-slate-100
                  disabled:text-slate-400
                "
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
              className="
                sm:col-span-2
              "
            >

              <label
                className="
                  block
                  mb-1.5
                  text-sm
                  font-medium
                  text-slate-700
                "
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


            {/* NOTARIO */}

            <div
              className="
                sm:col-span-2
              "
            >

              <label
                className="
                  block
                  mb-1.5
                  text-sm
                  font-medium
                  text-slate-700
                "
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

          </div>


          {/* ==================================================
              TARJETA NOTARIO
             ================================================== */}

          {notarioSeleccionado && (

            <div
              className="
                rounded-2xl
                border border-blue-100
                bg-blue-50/60
                p-4
              "
            >

              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                  mb-3
                "
              >

                <div>

                  <h3
                    className="
                      font-semibold
                      text-slate-800
                    "
                  >
                    {
                      notarioSeleccionado.nombre
                    }{" "}
                    {
                      notarioSeleccionado.apellidos
                    }
                  </h3>

                  <p
                    className="
                      text-xs
                      text-slate-500
                      mt-0.5
                    "
                  >
                    Código{" "}
                    {
                      notarioSeleccionado.codigo ||
                      "—"
                    }
                  </p>

                </div>


                <span
                  className={`
                    inline-flex
                    px-2.5 py-1
                    rounded-full
                    text-xs
                    font-semibold
                    ${
                      notarioSeleccionado.tipo_firma ===
                      "Videoconferencia"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-sky-100 text-sky-700"
                    }
                  `}
                >
                  {
                    notarioSeleccionado.tipo_firma
                  }
                </span>

              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-x-6
                  gap-y-2
                  text-xs
                  text-slate-600
                "
              >

                <p>

                  <strong
                    className="
                      text-slate-700
                    "
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
                    className="
                      text-slate-700
                    "
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
                    className="
                      text-slate-700
                    "
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
                    className="
                      text-slate-700
                    "
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
                    className="
                      text-slate-700
                    "
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
                    className="
                      text-slate-700
                    "
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
                    className="
                      text-slate-700
                    "
                  >
                    Apoderado:
                  </strong>{" "}

                  {
                    notarioSeleccionado.apoderado ||
                    "—"
                  }

                </p>


                <p
                  className="
                    sm:col-span-2
                  "
                >

                  <strong
                    className="
                      text-slate-700
                    "
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
                  className="
                    w-full
                    h-44
                    mt-4
                    rounded-xl
                    border border-slate-200
                  "
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

          <div
            className="
              grid
              grid-cols-1
              sm:grid-cols-2
              gap-4
            "
          >

            <div>

              <label
                className="
                  block
                  mb-1.5
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                Tipo de firma
              </label>

              <input
                disabled
                className="
                  w-full
                  min-h-[42px]
                  bg-slate-100
                  border border-slate-200
                  rounded-xl
                  px-3 py-2
                  text-slate-600
                "
                value={
                  form.tipo_firma ||
                  "—"
                }
              />

            </div>


            <div>

              <label
                className="
                  block
                  mb-1.5
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                Apoderado
              </label>

              <input
                disabled
                className="
                  w-full
                  min-h-[42px]
                  bg-slate-100
                  border border-slate-200
                  rounded-xl
                  px-3 py-2
                  text-slate-600
                "
                value={
                  form.apoderado_visible ||
                  "—"
                }
              />

            </div>

          </div>


          {/* ==================================================
              OBSERVACIONES
             ================================================== */}

          <div>

            <label
              className="
                block
                mb-1.5
                text-sm
                font-medium
                text-slate-700
              "
            >
              Observaciones
            </label>

            <textarea
              disabled={
                soloLectura ||
                loading
              }
              className="
                w-full
                bg-white
                border border-slate-300
                rounded-xl
                px-3 py-2
                text-slate-700
                shadow-sm
                resize-none
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500/20
                focus:border-blue-400
                disabled:bg-slate-100
                disabled:text-slate-400
              "
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
          className="
            border-t border-slate-200
            bg-slate-50/80
            px-6 py-4
            flex flex-col-reverse
            sm:flex-row
            justify-between
            gap-3
          "
        >

          <div>

            {modo === "editar" &&
              onDelete &&
              !soloLectura && (

                <button
                  type="button"
                  disabled={loading}
                  className="
                    px-4 py-2
                    rounded-xl
                    bg-red-50
                    border border-red-200
                    text-red-700
                    hover:bg-red-100
                    transition
                    disabled:opacity-50
                  "
                  onClick={
                    onDelete
                  }
                >
                  Eliminar
                </button>

              )}

          </div>


          <div
            className="
              flex
              justify-end
              gap-3
            "
          >

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="
                px-4 py-2
                rounded-xl
                bg-white
                border border-slate-300
                text-slate-700
                hover:bg-slate-50
                transition
                disabled:opacity-50
              "
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
                className="
                  px-5 py-2
                  rounded-xl
                  bg-blue-600
                  hover:bg-blue-700
                  text-white
                  font-medium
                  shadow-sm
                  transition
                  active:scale-[0.98]
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                "
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
