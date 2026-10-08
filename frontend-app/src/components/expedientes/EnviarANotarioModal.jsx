```jsx
// ============================================================
// ERP MOLSAN — EXPEDIENTES
// MODAL "ENVÍO A NOTARIO"
// PREMIUM 2027
//
// INCLUYE:
// - Fecha Solicitud PNC
// - Nº de Solicitud
// - Fecha prevista de firma
// - Hora prevista de firma
// - Creación automática de cita en Agenda
// - Duración inicial de 1 hora
// - Vinculación con expediente
// - Vinculación con notario
// - Prevención de citas duplicadas
// ============================================================

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import AutocompleteNotario from "../agenda/AutocompleteNotario";

import axios from "../../api/axios";


// ============================================================
// FORMULARIO INICIAL
// ============================================================

const FORM_INICIAL = {
  escritura_firmada: "No",

  fecha_envio: "",

  // ----------------------------------------------------------
  // PNC
  // ----------------------------------------------------------

  fecha_solicitud_pnc: "",

  numero_solicitud_pnc: "",

  // ----------------------------------------------------------
  // FIRMA REAL
  // ----------------------------------------------------------

  fecha_firma: "",

  protocolo: "",

  // ----------------------------------------------------------
  // FECHA PREVISTA DE FIRMA
  // ----------------------------------------------------------

  fecha_prevista_firma: "",

  // ----------------------------------------------------------
  // HORA PREVISTA DE FIRMA
  // ----------------------------------------------------------

  hora_prevista_firma: "09:00",

  // ----------------------------------------------------------
  // NOTARIO
  // ----------------------------------------------------------

  notario: null,

  // ----------------------------------------------------------
  // TIPO DOCUMENTO
  // ----------------------------------------------------------

  tipo_documento: "",
};


// ============================================================
// FECHA ACTUAL LOCAL
// ============================================================

function fechaHoy() {

  const ahora = new Date();

  const year =
    ahora.getFullYear();

  const month = String(
    ahora.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    ahora.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// ============================================================
// SUMAR UNA HORA
// ============================================================

function sumarUnaHora(hora) {

  if (!hora) {
    return "";
  }

  const partes =
    String(hora).split(":");

  if (partes.length < 2) {
    return "";
  }

  const horas =
    Number(partes[0]);

  const minutos =
    Number(partes[1]);

  if (
    Number.isNaN(horas) ||
    Number.isNaN(minutos)
  ) {
    return "";
  }

  const totalMinutos =
    horas * 60 +
    minutos +
    60;

  if (totalMinutos >= 24 * 60) {
    return "";
  }

  const horasFinal =
    Math.floor(
      totalMinutos / 60
    );

  const minutosFinal =
    totalMinutos % 60;

  return `${String(
    horasFinal
  ).padStart(2, "0")}:${String(
    minutosFinal
  ).padStart(2, "0")}`;
}


// ============================================================
// FORMATEAR FECHA
// ============================================================

function formatearFecha(valor) {

  if (!valor) {
    return "—";
  }

  const texto =
    String(valor);

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      texto
    )
  ) {

    const [
      year,
      month,
      day,
    ] = texto.split("-");

    return `${day}/${month}/${year}`;
  }

  return texto;
}


// ============================================================
// COMPONENTE
// ============================================================

export default function EnviarANotarioModal({
  expediente,
  onClose,
  onGuardar,
}) {

  const [
    form,
    setForm,
  ] = useState({
    ...FORM_INICIAL,

    fecha_envio:
      fechaHoy(),
  });


  const [
    tiposDocumento,
    setTiposDocumento,
  ] = useState([]);


  const [
    loadingTipos,
    setLoadingTipos,
  ] = useState(false);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  // ==========================================================
  // CARGAR TIPOS DE DOCUMENTO
  // ==========================================================

  useEffect(() => {

    let activo = true;

    async function cargarTiposDocumento() {

      try {

        setLoadingTipos(true);

        const response =
          await axios.get(
            "/tipos-carga-hipotecaria/opciones"
          );

        if (!activo) {
          return;
        }

        const datos =
          Array.isArray(
            response?.data
          )
            ? response.data
            : [];

        setTiposDocumento(
          datos
        );

      } catch (err) {

        console.error(
          "ERROR CARGANDO TIPOS DE DOCUMENTO:",
          err
        );

        if (activo) {

          setError(
            err?.response?.data?.detail ||
            "No se han podido cargar los tipos de documento."
          );

        }

      } finally {

        if (activo) {
          setLoadingTipos(false);
        }

      }

    }

    cargarTiposDocumento();

    return () => {
      activo = false;
    };

  }, []);


  // ==========================================================
  // ESC
  // ==========================================================

  useEffect(() => {

    const handleEscape =
      (event) => {

        if (
          event.key === "Escape" &&
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
    loading,
    onClose,
  ]);


  // ==========================================================
  // CAMBIAR CAMPO
  // ==========================================================

  const cambiarCampo =
    useCallback(
      (campo, valor) => {

        setForm(
          (actual) => ({
            ...actual,

            [campo]:
              valor,
          })
        );

        setError("");

      },
      []
    );


  // ==========================================================
  // CAMBIAR ESCRITURA FIRMADA
  // ==========================================================

  const cambiarEscrituraFirmada =
    useCallback(
      (valor) => {

        setForm(
          (actual) => ({
            ...actual,

            escritura_firmada:
              valor,

            ...(valor === "No"
              ? {
                  fecha_firma: "",
                  protocolo: "",
                }
              : {}),
          })
        );

        setError("");

      },
      []
    );


  // ==========================================================
  // SELECCIONAR NOTARIO
  // ==========================================================

  const seleccionarNotario =
    useCallback(
      (notario) => {

        if (!notario) {

          setForm(
            (actual) => ({
              ...actual,

              notario:
                null,
            })
          );

          setError("");

          return;
        }

        setForm(
          (actual) => ({
            ...actual,

            notario,
          })
        );

        setError("");

      },
      []
    );


  // ==========================================================
  // COMPROBAR SI YA EXISTE CITA
  // ==========================================================

  const comprobarCitaExistente =
    useCallback(
      async () => {

        if (
          !expediente?.id_expediente ||
          !form.fecha_prevista_firma
        ) {

          return null;

        }


        const response =
          await axios.get(
            "/agenda/search",
            {
              params: {
                id_expediente:
                  expediente.id_expediente,

                fecha:
                  form.fecha_prevista_firma,
              },
            }
          );


        const datos =
          response?.data;


        if (
          Array.isArray(datos) &&
          datos.length > 0
        ) {

          return datos[0];

        }


        return null;

      },
      [
        expediente,
        form.fecha_prevista_firma,
      ]
    );


  // ==========================================================
  // CREAR CITA EN AGENDA
  // ==========================================================

  const crearCitaAgenda =
    useCallback(
      async () => {

        if (
          !form.fecha_prevista_firma ||
          !form.hora_prevista_firma ||
          !form.notario?.id ||
          !expediente?.id_expediente
        ) {

          throw new Error(
            "Faltan datos necesarios para crear la cita en Agenda."
          );

        }


        // ----------------------------------------------------
        // COMPROBAR DUPLICADO
        // ----------------------------------------------------

        const citaExistente =
          await comprobarCitaExistente();


        if (citaExistente) {

          console.warn(
            "AGENDA — YA EXISTE UNA CITA PARA ESTE EXPEDIENTE Y FECHA:",
            citaExistente
          );

          return citaExistente;

        }


        // ----------------------------------------------------
        // HORA FINAL
        // Duración inicial: 1 hora
        // ----------------------------------------------------

        const horaFin =
          sumarUnaHora(
            form.hora_prevista_firma
          );


        if (!horaFin) {

          throw new Error(
            "La hora prevista de firma debe permitir una duración de una hora. La última hora de inicio permitida es las 23:00."
          );

        }


        // ----------------------------------------------------
        // EXPEDIENTE INTERNO
        //
        // Agenda utiliza expediente_id como FK numérica.
        //
        // El número visible es id_expediente.
        // ----------------------------------------------------

        const expedienteId =
          expediente?.id ??
          expediente?.expediente_id ??
          null;


        // ----------------------------------------------------
        // APODERADO
        // ----------------------------------------------------

        const apoderadoId =
          form.notario?.apoderado_id ??
          expediente?.apoderado_id ??
          null;


        const apoderado =
          form.notario?.apoderado ||
          "";


        // ----------------------------------------------------
        // PAYLOAD EXACTAMENTE COMPATIBLE
        // CON CitaCreate
        // ----------------------------------------------------

        const payloadAgenda = {

          fecha:
            form.fecha_prevista_firma,

          hora_inicio:
            form.hora_prevista_firma,

          hora_fin:
            horaFin,

          tipo_cita:
            "Firma notarial",

          notario_id:
            Number(form.notario.id),

          tipo_firma:
            form.notario.tipo_firma ||
            null,

          apoderado_id:
            apoderadoId
              ? Number(apoderadoId)
              : null,

          apoderado:
            apoderado ||
            null,

          observaciones:
            `Firma notarial — Expediente ${expediente.id_expediente} — Solicitud PNC ${form.numero_solicitud_pnc.trim()}`,

          expediente_id:
            expedienteId
              ? Number(expedienteId)
              : null,

        };


        console.log(
          "=================================================="
        );

        console.log(
          "AGENDA — CREANDO CITA"
        );

        console.log(
          "AGENDA — PAYLOAD:",
          payloadAgenda
        );

        console.log(
          "AGENDA — EXPEDIENTE ID INTERNO:",
          expedienteId
        );

        console.log(
          "AGENDA — EXPEDIENTE Nº:",
          expediente.id_expediente
        );

        console.log(
          "AGENDA — NOTARIO ID:",
          form.notario.id
        );

        console.log(
          "AGENDA — FECHA:",
          form.fecha_prevista_firma
        );

        console.log(
          "AGENDA — HORA:",
          form.hora_prevista_firma,
          "→",
          horaFin
        );

        console.log(
          "=================================================="
        );


        const response =
          await axios.post(
            "/agenda/",
            payloadAgenda
          );


        console.log(
          "AGENDA — CITA CREADA CORRECTAMENTE:",
          response?.data
        );


        return response?.data;

      },
      [
        form,
        expediente,
        comprobarCitaExistente,
      ]
    );


  // ==========================================================
  // GUARDAR
  // ==========================================================

  const guardar =
    useCallback(
      async () => {

        if (loading) {
          return;
        }

        setError("");


        // ------------------------------------------------------
        // EXPEDIENTE
        // ------------------------------------------------------

        if (
          !expediente?.id_expediente
        ) {

          setError(
            "No se ha podido identificar el expediente."
          );

          return;
        }


        // ------------------------------------------------------
        // FECHA ENVÍO
        // ------------------------------------------------------

        if (!form.fecha_envio) {

          setError(
            "La Fecha de envío es obligatoria."
          );

          return;
        }


        // ------------------------------------------------------
        // FECHA SOLICITUD PNC
        // ------------------------------------------------------

        if (
          !form.fecha_solicitud_pnc
        ) {

          setError(
            "La Fecha Solicitud PNC es obligatoria."
          );

          return;
        }


        // ------------------------------------------------------
        // Nº SOLICITUD PNC
        // ------------------------------------------------------

        if (
          !form.numero_solicitud_pnc.trim()
        ) {

          setError(
            "El Nº de Solicitud es obligatorio."
          );

          return;
        }


        // ------------------------------------------------------
        // NOTARIO
        // ------------------------------------------------------

        if (
          !form.notario?.id
        ) {

          setError(
            "Selecciona un notario."
          );

          return;
        }


        // ------------------------------------------------------
        // TIPO DOCUMENTO
        // ------------------------------------------------------

        if (
          !form.tipo_documento
        ) {

          setError(
            "Selecciona el Tipo documento."
          );

          return;
        }


        // ------------------------------------------------------
        // FECHA PREVISTA DE FIRMA
        // ------------------------------------------------------

        if (
          !form.fecha_prevista_firma
        ) {

          setError(
            "Indica la Fecha prevista de firma."
          );

          return;
        }


        // ------------------------------------------------------
        // HORA PREVISTA DE FIRMA
        // ------------------------------------------------------

        if (
          !form.hora_prevista_firma
        ) {

          setError(
            "Indica la Hora prevista de firma."
          );

          return;
        }


        // ------------------------------------------------------
        // VALIDAR HORA PARA 1 HORA DE DURACIÓN
        // ------------------------------------------------------

        const horaFinValidacion =
          sumarUnaHora(
            form.hora_prevista_firma
          );


        if (!horaFinValidacion) {

          setError(
            "La hora prevista de firma no puede ser posterior a las 23:00 porque la cita tendrá una duración inicial de una hora."
          );

          return;
        }


        // ------------------------------------------------------
        // VALIDAR FECHA PREVISTA
        // ------------------------------------------------------

        if (
          form.fecha_prevista_firma <
          form.fecha_envio
        ) {

          setError(
            "La Fecha prevista de firma no puede ser anterior a la Fecha de envío."
          );

          return;
        }


        // ------------------------------------------------------
        // VALIDAR FECHA PNC
        // ------------------------------------------------------

        if (
          form.fecha_solicitud_pnc >
          form.fecha_envio
        ) {

          setError(
            "La Fecha Solicitud PNC no puede ser posterior a la Fecha de envío."
          );

          return;
        }


        // ------------------------------------------------------
        // ESCRITURA FIRMADA
        // ------------------------------------------------------

        if (
          form.escritura_firmada ===
          "Sí"
        ) {

          if (!form.fecha_firma) {

            setError(
              "Indica la Fecha de firma."
            );

            return;
          }


          if (
            !form.protocolo.trim()
          ) {

            setError(
              "Indica el Protocolo."
            );

            return;
          }


          // ----------------------------------------------------
          // FECHA ENVÍO <= FECHA FIRMA
          // ----------------------------------------------------

          if (
            form.fecha_envio >
            form.fecha_firma
          ) {

            setError(
              "La Fecha de envío no puede ser posterior a la Fecha de firma."
            );

            return;
          }

        }


        // ------------------------------------------------------
        // NOMBRE COMPLETO DEL NOTARIO
        // ------------------------------------------------------

        const nombreNotario =
          `${form.notario.nombre || ""} ${
            form.notario.apellidos || ""
          }`.trim();


        // ------------------------------------------------------
        // PAYLOAD EXPEDIENTE
        // ------------------------------------------------------

        const payload = {

          id_expediente:
            expediente.id_expediente,

          escritura_firmada:
            form.escritura_firmada ===
            "Sí",

          fecha_envio:
            form.fecha_envio,

          // ----------------------------------------------------
          // PNC
          // ----------------------------------------------------

          fecha_solicitud_pnc:
            form.fecha_solicitud_pnc,

          numero_solicitud_pnc:
            form.numero_solicitud_pnc.trim(),

          // ----------------------------------------------------
          // FIRMA
          // ----------------------------------------------------

          fecha_firma:
            form.escritura_firmada ===
            "Sí"
              ? form.fecha_firma
              : null,

          protocolo:
            form.escritura_firmada ===
            "Sí"
              ? form.protocolo.trim()
              : null,

          // ----------------------------------------------------
          // AGENDA
          // ----------------------------------------------------

          fecha_prevista_firma:
            form.fecha_prevista_firma,

          hora_prevista_firma:
            form.hora_prevista_firma,

          // ----------------------------------------------------
          // NOTARIO
          // ----------------------------------------------------

          notario_id:
            form.notario.id,

          nombre_notario:
            nombreNotario,

          nif_notario:
            form.notario.nif || "",

          notario:
            nombreNotario,

          apoderado:
            form.notario.apoderado || "",

          tipo_firma:
            form.notario.tipo_firma ||
            "",

          tipo_documento:
            form.tipo_documento,

          poblacion:
            form.notario.municipio ||
            "",

          provincia:
            form.notario.provincia ||
            "",

        };


        // ------------------------------------------------------
        // GUARDAR
        // ------------------------------------------------------

        try {

          setLoading(true);


          console.log(
            "=================================================="
          );

          console.log(
            "EXPEDIENTE — GUARDANDO ENVÍO A NOTARIO"
          );

          console.log(
            "EXPEDIENTE — PAYLOAD:",
            payload
          );

          console.log(
            "=================================================="
          );


          // ----------------------------------------------------
          // PRIMERO GUARDAMOS EL ENVÍO DEL EXPEDIENTE
          // ----------------------------------------------------

          await onGuardar(
            payload
          );


          console.log(
            "EXPEDIENTE — ENVÍO GUARDADO CORRECTAMENTE"
          );


          // ----------------------------------------------------
          // DESPUÉS CREAMOS LA CITA DE AGENDA
          // ----------------------------------------------------

          try {

            const cita =
              await crearCitaAgenda();


            console.log(
              "AGENDA — PROCESO COMPLETADO:",
              cita
            );


          } catch (agendaError) {

            console.error(
              "=================================================="
            );

            console.error(
              "AGENDA — ERROR CREANDO CITA"
            );

            console.error(
              "AGENDA — ERROR COMPLETO:",
              agendaError
            );

            console.error(
              "AGENDA — RESPONSE:",
              agendaError?.response?.data
            );

            console.error(
              "AGENDA — STATUS:",
              agendaError?.response?.status
            );

            console.error(
              "=================================================="
            );


            throw new Error(
              agendaError?.response?.data?.detail ||
              agendaError?.response?.data?.message ||
              agendaError?.message ||
              "El envío se ha guardado, pero no se ha podido crear la cita en Agenda."
            );

          }


          console.log(
            "=================================================="
          );

          console.log(
            "ENVÍO A NOTARIO COMPLETADO CORRECTAMENTE"
          );

          console.log(
            "=================================================="
          );


          // ----------------------------------------------------
          // CERRAR MODAL
          // ----------------------------------------------------

          onClose();

        } catch (err) {

          console.error(
            "ERROR ENVIANDO EXPEDIENTE A NOTARIO:",
            err
          );


          setError(
            err?.response?.data?.detail ||
            err?.response?.data?.message ||
            err?.message ||
            "No se ha podido completar el envío a notario."
          );

        } finally {

          setLoading(false);

        }

      },
      [
        loading,
        expediente,
        form,
        onGuardar,
        crearCitaAgenda,
        onClose,
      ]
    );


  // ==========================================================
  // SI NO HAY EXPEDIENTE
  // ==========================================================

  if (!expediente) {
    return null;
  }


  const notario =
    form.notario;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        fixed
        inset-0
        z-[200]
        flex
        items-center
        justify-center
        bg-slate-950/50
        backdrop-blur-sm
        p-4
      "
      onMouseDown={(event) => {

        if (
          event.target ===
            event.currentTarget &&
          !loading
        ) {

          onClose();

        }

      }}
    >

      <div
        className="
          w-full
          max-w-3xl
          max-h-[94vh]
          overflow-y-auto

          bg-white

          rounded-3xl

          border
          border-slate-200

          shadow-2xl

          text-slate-800
        "
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >

        {/* ====================================================
            CABECERA
        ==================================================== */}

        <div
          className="
            sticky
            top-0
            z-20

            flex
            items-start
            justify-between
            gap-4

            px-6
            py-5

            bg-white/95
            backdrop-blur-xl

            border-b
            border-slate-200
          "
        >

          <div>

            <div
              className="
                flex
                items-center
                gap-3
              "
            >

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center

                  rounded-2xl

                  bg-[var(--erp-primary-soft)]

                  text-xl
                "
              >
                🏛️
              </div>

              <div>

                <h2
                  className="
                    text-xl
                    font-bold
                    text-slate-800
                  "
                >
                  Envío a notario
                </h2>

                <p
                  className="
                    mt-0.5
                    text-sm
                    text-slate-500
                  "
                >
                  Expediente{" "}
                  <strong>
                    {expediente.id_expediente}
                  </strong>
                </p>

              </div>

            </div>

          </div>


          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              items-center
              justify-center

              rounded-xl

              text-slate-400

              hover:bg-slate-100
              hover:text-slate-700

              transition
            "
          >
            ✕
          </button>

        </div>


        {/* ====================================================
            CONTENIDO
        ==================================================== */}

        <div className="px-6 py-6">

          {/* ==================================================
              ESCRITURA FIRMADA
          ================================================== */}

          <section className="mb-6">

            <div className="mb-4">

              <h3
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Escritura
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Indica si la escritura ya ha sido firmada.
              </p>

            </div>


            <div
              className="
                grid
                grid-cols-2
                gap-3
              "
            >

              {[
                "No",
                "Sí",
              ].map((opcion) => {

                const activa =
                  form.escritura_firmada ===
                  opcion;

                return (
                  <button
                    key={opcion}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      cambiarEscrituraFirmada(
                        opcion
                      )
                    }
                    className={`
                      rounded-2xl
                      border
                      px-4
                      py-3

                      text-sm
                      font-semibold

                      transition

                      ${
                        activa
                          ? "border-[var(--erp-primary)] bg-[var(--erp-primary-soft)] text-[var(--erp-primary)]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }
                    `}
                  >
                    {opcion === "Sí"
                      ? "✓ Sí"
                      : "○ No"}
                  </button>
                );

              })}

            </div>

          </section>


          {/* ==================================================
              DATOS DEL ENVÍO / PNC
          ================================================== */}

          <section className="mb-6">

            <div className="mb-4">

              <h3
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Datos del envío
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Información de la solicitud PNC y del envío a notario.
              </p>

            </div>


            <div
              className="
                grid
                grid-cols-1
                gap-4
                md:grid-cols-2
              "
            >

              {/* =================================================
                  FECHA ENVÍO
              ================================================= */}

              <div>

                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Fecha de envío
                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>

                <input
                  type="date"
                  value={
                    form.fecha_envio
                  }
                  disabled={loading}
                  onChange={(event) =>
                    cambiarCampo(
                      "fecha_envio",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-700
                    outline-none

                    focus:border-[var(--erp-primary)]
                    focus:ring-2
                    focus:ring-[var(--erp-primary-soft)]
                  "
                />

              </div>


              {/* =================================================
                  FECHA SOLICITUD PNC
              ================================================= */}

              <div>

                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Fecha Solicitud PNC
                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>

                <input
                  type="date"
                  value={
                    form.fecha_solicitud_pnc
                  }
                  max={
                    form.fecha_envio ||
                    undefined
                  }
                  disabled={loading}
                  onChange={(event) =>
                    cambiarCampo(
                      "fecha_solicitud_pnc",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-700
                    outline-none

                    focus:border-[var(--erp-primary)]
                    focus:ring-2
                    focus:ring-[var(--erp-primary-soft)]
                  "
                />

              </div>


              {/* =================================================
                  Nº SOLICITUD
              ================================================= */}

              <div>

                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Nº de Solicitud
                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    form.numero_solicitud_pnc
                  }
                  disabled={loading}
                  onChange={(event) =>
                    cambiarCampo(
                      "numero_solicitud_pnc",
                      event.target.value
                    )
                  }
                  placeholder="Número de solicitud"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-700
                    outline-none

                    focus:border-[var(--erp-primary)]
                    focus:ring-2
                    focus:ring-[var(--erp-primary-soft)]
                  "
                />

              </div>

            </div>

          </section>


          {/* ==================================================
              FECHAS DE FIRMA
          ================================================== */}

          <section className="mb-6">

            <div
              className="
                grid
                grid-cols-1
                gap-4
                md:grid-cols-2
              "
            >

              {/* =================================================
                  FECHA PREVISTA FIRMA
              ================================================= */}

              <div>

                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Fecha prevista de firma
                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>

                <input
                  type="date"
                  value={
                    form.fecha_prevista_firma
                  }
                  min={
                    form.fecha_envio ||
                    undefined
                  }
                  disabled={loading}
                  onChange={(event) =>
                    cambiarCampo(
                      "fecha_prevista_firma",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-700
                    outline-none

                    focus:border-[var(--erp-primary)]
                    focus:ring-2
                    focus:ring-[var(--erp-primary-soft)]
                  "
                />

                <p
                  className="
                    mt-1
                    text-[11px]
                    text-slate-400
                  "
                >
                  Se creará automáticamente la cita de firma en Agenda.
                </p>

              </div>


              {/* =================================================
                  HORA PREVISTA FIRMA
              ================================================= */}

              <div>

                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Hora prevista de firma
                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>

                <input
                  type="time"
                  value={
                    form.hora_prevista_firma
                  }
                  disabled={loading}
                  onChange={(event) =>
                    cambiarCampo(
                      "hora_prevista_firma",
                      event.target.value
                    )
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-700
                    outline-none

                    focus:border-[var(--erp-primary)]
                    focus:ring-2
                    focus:ring-[var(--erp-primary-soft)]
                  "
                />

                <p
                  className="
                    mt-1
                    text-[11px]
                    text-slate-400
                  "
                >
                  La cita tendrá una duración inicial de una hora.
                </p>

              </div>


              {/* =================================================
                  FECHA FIRMA REAL
              ================================================= */}

              {form.escritura_firmada ===
                "Sí" && (

                <div>

                  <label
                    className="
                      mb-1.5
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Fecha de firma
                    <span className="text-red-500">
                      {" "}*
                    </span>
                  </label>

                  <input
                    type="date"
                    value={
                      form.fecha_firma
                    }
                    min={
                      form.fecha_envio ||
                      undefined
                    }
                    disabled={loading}
                    onChange={(event) =>
                      cambiarCampo(
                        "fecha_firma",
                        event.target.value
                      )
                    }
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-300
                      bg-white
                      px-3
                      py-2.5
                      text-sm
                      text-slate-700
                      outline-none

                      focus:border-[var(--erp-primary)]
                      focus:ring-2
                      focus:ring-[var(--erp-primary-soft)]
                    "
                  />

                  <p
                    className="
                      mt-1
                      text-[11px]
                      text-slate-400
                    "
                  >
                    La fecha de firma debe ser igual o posterior a la fecha de envío.
                  </p>

                </div>

              )}

            </div>


            {/* ==================================================
                PROTOCOLO
            ================================================== */}

            {form.escritura_firmada ===
              "Sí" && (

              <div className="mt-4">

                <label
                  className="
                    mb-1.5
                    block
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  Protocolo
                  <span className="text-red-500">
                    {" "}*
                  </span>
                </label>

                <input
                  type="text"
                  value={
                    form.protocolo
                  }
                  disabled={loading}
                  onChange={(event) =>
                    cambiarCampo(
                      "protocolo",
                      event.target.value
                    )
                  }
                  placeholder="Número de protocolo"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-slate-700
                    outline-none

                    focus:border-[var(--erp-primary)]
                    focus:ring-2
                    focus:ring-[var(--erp-primary-soft)]
                  "
                />

              </div>

            )}

          </section>


          {/* ==================================================
              NOTARIO
          ================================================== */}

          <section className="mb-6">

            <div className="mb-4">

              <h3
                className="
                  text-sm
                  font-bold
                  text-slate-800
                "
              >
                Notaría
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-500
                "
              >
                Selecciona el notario desde el catálogo CTN.
              </p>

            </div>


            <AutocompleteNotario
              value={notario}
              disabled={loading}
              onSelect={
                seleccionarNotario
              }
            />


            {/* ==================================================
                DATOS AUTOMÁTICOS
            ================================================== */}

            {notario && (

              <div
                className="
                  mt-4
                  grid
                  grid-cols-1
                  gap-3
                  md:grid-cols-2
                "
              >

                <CampoAutomatico
                  label="Apoderado"
                  valor={
                    notario.apoderado
                  }
                />

                <CampoAutomatico
                  label="Tipo de firma"
                  valor={
                    notario.tipo_firma
                  }
                />

                <CampoAutomatico
                  label="NIF notario"
                  valor={
                    notario.nif
                  }
                />

                <CampoAutomatico
                  label="Población"
                  valor={
                    notario.municipio
                  }
                />

                <CampoAutomatico
                  label="Provincia"
                  valor={
                    notario.provincia
                  }
                />

              </div>

            )}

          </section>


          {/* ==================================================
              TIPO DOCUMENTO
          ================================================== */}

          <section className="mb-6">

            <label
              className="
                mb-1.5
                block
                text-sm
                font-semibold
                text-slate-700
              "
            >
              Tipo documento
              <span className="text-red-500">
                {" "}*
              </span>
            </label>

            <select
              value={
                form.tipo_documento
              }
              disabled={
                loading ||
                loadingTipos
              }
              onChange={(event) =>
                cambiarCampo(
                  "tipo_documento",
                  event.target.value
                )
              }
              className="
                w-full
                rounded-xl
                border
                border-slate-300
                bg-white
                px-3
                py-2.5
                text-sm
                text-slate-700
                outline-none

                focus:border-[var(--erp-primary)]
                focus:ring-2
                focus:ring-[var(--erp-primary-soft)]
              "
            >

              <option value="">
                {loadingTipos
                  ? "Cargando tipos de documento..."
                  : "Seleccionar tipo de documento"}
              </option>

              {tiposDocumento.map(
                (tipo) => (

                  <option
                    key={tipo.id}
                    value={tipo.nombre}
                  >
                    {tipo.nombre}
                  </option>

                )
              )}

            </select>

          </section>


          {/* ==================================================
              RESUMEN
          ================================================== */}

          {notario && (

            <section
              className="
                rounded-2xl
                border
                border-slate-200
                bg-slate-50
                p-4
              "
            >

              <div
                className="
                  mb-3
                  text-xs
                  font-bold
                  uppercase
                  tracking-wide
                  text-slate-400
                "
              >
                Resumen del envío
              </div>


              <div
                className="
                  grid
                  grid-cols-1
                  gap-3
                  sm:grid-cols-2
                "
              >

                <Resumen
                  label="Expediente"
                  valor={
                    expediente.id_expediente
                  }
                />

                <Resumen
                  label="Notario"
                  valor={
                    `${notario.nombre || ""} ${
                      notario.apellidos || ""
                    }`.trim()
                  }
                />

                <Resumen
                  label="Fecha Solicitud PNC"
                  valor={formatearFecha(
                    form.fecha_solicitud_pnc
                  )}
                />

                <Resumen
                  label="Nº de Solicitud"
                  valor={
                    form.numero_solicitud_pnc
                  }
                />

                <Resumen
                  label="Fecha envío"
                  valor={formatearFecha(
                    form.fecha_envio
                  )}
                />

                <Resumen
                  label="Fecha prevista firma"
                  valor={formatearFecha(
                    form.fecha_prevista_firma
                  )}
                />

                <Resumen
                  label="Hora prevista"
                  valor={
                    form.hora_prevista_firma ||
                    "—"
                  }
                />

                <Resumen
                  label="Fin previsto"
                  valor={
                    sumarUnaHora(
                      form.hora_prevista_firma
                    ) || "—"
                  }
                />

                <Resumen
                  label="Modalidad"
                  valor={
                    notario.tipo_firma ||
                    "—"
                  }
                />

              </div>

            </section>

          )}


          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (

            <div
              className="
                mt-5
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-700
              "
            >
              {error}
            </div>

          )}

        </div>


        {/* ====================================================
            PIE
        ==================================================== */}

        <div
          className="
            flex
            flex-col-reverse
            gap-3

            border-t
            border-slate-200

            bg-slate-50

            px-6
            py-4

            sm:flex-row
            sm:justify-end
          "
        >

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="
              rounded-xl
              border
              border-slate-300
              bg-white
              px-5
              py-2.5
              text-sm
              font-semibold
              text-slate-700

              hover:bg-slate-100

              transition

              disabled:opacity-50
            "
          >
            Cancelar
          </button>


          <button
            type="button"
            disabled={
              loading ||
              !form.notario ||
              !form.tipo_documento ||
              !form.fecha_solicitud_pnc ||
              !form.numero_solicitud_pnc.trim() ||
              !form.fecha_prevista_firma ||
              !form.hora_prevista_firma
            }
            onClick={guardar}
            className="
              rounded-xl
              bg-[var(--erp-primary)]
              px-5
              py-2.5
              text-sm
              font-semibold
              text-white

              shadow-sm

              hover:opacity-90

              transition

              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading
              ? "Guardando..."
              : "Enviar a notario"}
          </button>

        </div>

      </div>

    </div>
  );
}


// ============================================================
// CAMPO AUTOMÁTICO
// ============================================================

function CampoAutomatico({
  label,
  valor,
}) {

  return (
    <div>

      <label
        className="
          mb-1
          block
          text-[11px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </label>

      <div
        className="
          min-h-[42px]
          flex
          items-center

          rounded-xl

          border
          border-slate-200

          bg-slate-100

          px-3

          text-sm
          font-medium
          text-slate-600
        "
      >
        {valor || "—"}
      </div>

    </div>
  );
}


// ============================================================
// RESUMEN
// ============================================================

function Resumen({
  label,
  valor,
}) {

  return (
    <div>

      <div
        className="
          text-[11px]
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </div>

      <div
        className="
          mt-0.5
          text-sm
          font-semibold
          text-slate-700
        "
      >
        {valor || "—"}
      </div>

    </div>
  );
}
```
