// ============================================================
// ERP MOLSAN
// FICHA DE EXPEDIENTE
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { obtenerExpediente } from "../../api/expedientes";
import EnviarANotarioModal from "../../components/expedientes/EnviarANotarioModal";


// ============================================================
// HELPERS
// ============================================================

function valorVisible(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  return String(valor);
}


function formatearFecha(fecha) {
  if (!fecha) {
    return "—";
  }

  const valor = String(fecha);

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  if (valor.includes("T")) {
    const parteFecha = valor.split("T")[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(parteFecha)) {
      const [anio, mes, dia] = parteFecha.split("-");
      return `${dia}/${mes}/${anio}`;
    }
  }

  return valor;
}


function formatearNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === "" ||
    Number.isNaN(Number(valor))
  ) {
    return "—";
  }

  return Number(valor).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}


function normalizarActividad(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}


// ============================================================
// ICONOS DE SECCIÓN
// ============================================================

function IconoSeccion({ tipo }) {
  const iconos = {
    estado: "◉",
    identificacion: "▣",
    titular: "👤",
    solicitante: "👥",
    notario: "✒️",
    oficina: "🏢",
    fechas: "📅",
    actividad: "⚙️",
    facturacion: "💶",
    economico: "📊",
    provision: "💰",
    finca: "🏠",
    defectos: "⚠️",
  };

  return (
    <span className="text-lg leading-none">
      {iconos[tipo] || "▣"}
    </span>
  );
}


// ============================================================
// BADGE DE ESTADO
// ============================================================

function EstadoBadge({ valor }) {
  const texto = valorVisible(valor);
  const normalizado = texto.toLowerCase();

  let clase =
    "inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600";

  if (
    normalizado.includes("vig") ||
    normalizado.includes("abiert") ||
    normalizado.includes("activo")
  ) {
    clase =
      "inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700";
  }

  if (
    normalizado.includes("cerr") ||
    normalizado.includes("final")
  ) {
    clase =
      "inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600";
  }

  if (
    normalizado.includes("error") ||
    normalizado.includes("defecto")
  ) {
    clase =
      "inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700";
  }

  return <span className={clase}>{texto}</span>;
}


// ============================================================
// DATO
// ============================================================

function Dato({
  etiqueta,
  valor,
  fecha = false,
  numero = false,
  destacado = false,
}) {
  let valorFinal = valorVisible(valor);

  if (fecha && valor) {
    valorFinal = formatearFecha(valor);
  }

  if (numero && valor !== null && valor !== undefined && valor !== "") {
    valorFinal = formatearNumero(valor);
  }

  const esEstado =
    etiqueta?.toLowerCase() === "estado" ||
    etiqueta?.toLowerCase() === "estado actividad";

  return (
    <div
      className={[
        "rounded-xl border border-slate-200/80 bg-white/70 p-4",
        destacado ? "ring-1 ring-blue-100" : "",
      ].join(" ")}
    >
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {etiqueta}
      </div>

      <div
        className={[
          "break-words text-sm",
          destacado
            ? "font-bold text-slate-900"
            : "font-medium text-slate-700",
        ].join(" ")}
      >
        {esEstado ? (
          <EstadoBadge valor={valorFinal} />
        ) : (
          valorFinal
        )}
      </div>
    </div>
  );
}


// ============================================================
// SECCIÓN
// ============================================================

function Seccion({
  titulo,
  subtitulo,
  icono,
  children,
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-sm">

      <div className="border-b border-slate-200/80 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 px-5 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/80 shadow-sm">
            <IconoSeccion tipo={icono} />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-800">
              {titulo}
            </h2>

            {subtitulo && (
              <p className="mt-0.5 text-xs text-slate-500">
                {subtitulo}
              </p>
            )}
          </div>

        </div>

      </div>

      <div className="p-5">
        {children}
      </div>

    </section>
  );
}


// ============================================================
// OBSERVACIONES
// ============================================================

function Observaciones({ valor }) {
  return (
    <Seccion
      titulo="Observaciones"
      subtitulo="Información adicional del expediente"
      icono="identificacion"
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {valorVisible(valor)}
        </div>
      </div>
    </Seccion>
  );
}


// ============================================================
// BADGE DEFECTO VIGENTE
// ============================================================

function DefectoVigenteBadge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      DEFECTO VIGENTE
    </span>
  );
}


// ============================================================
// FICHA EXPEDIENTE
// ============================================================

export default function FichaExpediente() {
  const { id } = useParams();

  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [
    mostrarEnviarANotario,
    setMostrarEnviarANotario,
  ] = useState(false);


  // ==========================================================
  // DEFECTOS
  // ==========================================================

  const [
    mostrarAltaDefecto,
    setMostrarAltaDefecto,
  ] = useState(false);

  const [
    modoDefecto,
    setModoDefecto,
  ] = useState("alta");

  const [
    tipoDefecto,
    setTipoDefecto,
  ] = useState("");

  const [
    faltaDefecto,
    setFaltaDefecto,
  ] = useState("");

  const [
    descripcionDefecto,
    setDescripcionDefecto,
  ] = useState("");

  const [
    guardandoDefecto,
    setGuardandoDefecto,
  ] = useState(false);

  const [
    defectoLocal,
    setDefectoLocal,
  ] = useState(null);


  // ==========================================================
  // CARGAR EXPEDIENTE
  // ==========================================================

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        setCargando(true);
        setError("");

        const datos = await obtenerExpediente(id);

        if (!activo) {
          return;
        }

        setExpediente(datos);

        // ------------------------------------------------------
        // Si el backend ya devuelve información del defecto,
        // la utilizamos como estado inicial.
        // ------------------------------------------------------

        if (
          datos?.tiene_defectos_abiertos ||
          datos?.tipo_error ||
          datos?.falta_defecto ||
          datos?.descripcion_error
        ) {
          setDefectoLocal({
            vigente: Boolean(
              datos?.tiene_defectos_abiertos
            ),
            tipo_error:
              datos?.tipo_error || "",
            falta_defecto:
              datos?.falta_defecto || "",
            descripcion_error:
              datos?.descripcion_error || "",
          });
        } else {
          setDefectoLocal(null);
        }

      } catch (err) {
        console.error(
          "Error cargando expediente:",
          err
        );

        if (!activo) {
          return;
        }

        setError(
          err?.response?.data?.detail ||
          err?.message ||
          "No se ha podido cargar el expediente."
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    if (id) {
      cargar();
    }

    return () => {
      activo = false;
    };
  }, [id]);


  // ==========================================================
  // ACTIVIDAD
  // ==========================================================

  const actividadNormalizada = useMemo(() => {
    return normalizarActividad(
      expediente?.actividad_actual
    );
  }, [expediente?.actividad_actual]);


  const esDocumentacionPrevia =
    actividadNormalizada.includes("document") ||
    actividadNormalizada.includes("previa");


  // ==========================================================
  // DEFECTO VIGENTE
  // ==========================================================

  const defectoVigente = Boolean(
    defectoLocal?.vigente ??
    expediente?.tiene_defectos_abiertos
  );


  // ==========================================================
  // ENVIAR A NOTARIO
  // ==========================================================

  function cerrarEnviarANotario() {
    setMostrarEnviarANotario(false);
  }


  async function guardarEnviarANotario(payload) {
    console.log(
      "ENVIAR A NOTARIO — payload:",
      payload
    );

    setMostrarEnviarANotario(false);
  }


  // ==========================================================
  // ABRIR ALTA DEFECTO
  // ==========================================================

  function abrirAltaDefecto() {
    setModoDefecto("alta");

    setTipoDefecto("");
    setFaltaDefecto("");
    setDescripcionDefecto("");

    setMostrarAltaDefecto(true);
  }


  // ==========================================================
  // ABRIR EDICIÓN DEFECTO
  // ==========================================================

  function editarDefecto() {
    setModoDefecto("editar");

    setTipoDefecto(
      defectoLocal?.tipo_error ||
      expediente?.tipo_error ||
      ""
    );

    setFaltaDefecto(
      defectoLocal?.falta_defecto ||
      expediente?.falta_defecto ||
      ""
    );

    setDescripcionDefecto(
      defectoLocal?.descripcion_error ||
      expediente?.descripcion_error ||
      ""
    );

    setMostrarAltaDefecto(true);
  }


  // ==========================================================
  // CERRAR MODAL DEFECTO
  // ==========================================================

  function cerrarAltaDefecto() {
    if (guardandoDefecto) {
      return;
    }

    setMostrarAltaDefecto(false);

    setTipoDefecto("");
    setFaltaDefecto("");
    setDescripcionDefecto("");
  }


  // ==========================================================
  // GUARDAR DEFECTO
  // ==========================================================

  async function guardarDefecto() {
    if (!tipoDefecto.trim()) {
      alert("Debes indicar el tipo de defecto.");
      return;
    }

    if (!faltaDefecto.trim()) {
      alert("Debes indicar la falta o defecto.");
      return;
    }

    if (!descripcionDefecto.trim()) {
      alert("Debes indicar una descripción.");
      return;
    }

    try {
      setGuardandoDefecto(true);

      const nuevoDefecto = {
        vigente: true,
        tipo_error: tipoDefecto.trim(),
        falta_defecto: faltaDefecto.trim(),
        descripcion_error:
          descripcionDefecto.trim(),
      };

      /*
       * --------------------------------------------------------
       * PENDIENTE CONEXIÓN BACKEND
       * --------------------------------------------------------
       *
       * Aquí conectaremos el endpoint real de defectos.
       *
       * No inventamos todavía ninguna URL porque queremos
       * utilizar la arquitectura real del backend de ERP Molsan.
       */

      console.log(
        modoDefecto === "alta"
          ? "ALTA DEFECTO"
          : "EDITAR DEFECTO",
        {
          expediente_id: expediente?.id,
          id_expediente:
            expediente?.id_expediente,
          ...nuevoDefecto,
        }
      );

      // --------------------------------------------------------
      // Estado visual inmediato
      // --------------------------------------------------------

      setDefectoLocal(nuevoDefecto);

      setMostrarAltaDefecto(false);

      setTipoDefecto("");
      setFaltaDefecto("");
      setDescripcionDefecto("");

    } catch (err) {
      console.error(
        "Error guardando defecto:",
        err
      );

      alert(
        err?.response?.data?.detail ||
        err?.message ||
        "No se ha podido guardar el defecto."
      );
    } finally {
      setGuardandoDefecto(false);
    }
  }


  // ==========================================================
  // DAR DE BAJA DEFECTO
  // ==========================================================

  function darDeBajaDefecto() {
    const confirmar = window.confirm(
      "¿Quieres dar de baja el defecto vigente de este expediente?"
    );

    if (!confirmar) {
      return;
    }

    /*
     * --------------------------------------------------------
     * PENDIENTE CONEXIÓN BACKEND
     * --------------------------------------------------------
     *
     * Cuando tengamos el endpoint real, aquí se actualizará
     * definitivamente el estado en la base de datos.
     */

    setDefectoLocal((actual) => {
      if (!actual) {
        return null;
      }

      return {
        ...actual,
        vigente: false,
      };
    });
  }


  // ==========================================================
  // ESTADOS CARGA
  // ==========================================================

  if (cargando) {
    return (
      <div className="erp-page flex min-h-[400px] items-center justify-center">
        <div className="erp-card px-8 py-6 text-center">

          <div className="mb-2 text-2xl">
            ⏳
          </div>

          <div className="text-sm font-semibold text-slate-600">
            Cargando expediente...
          </div>

        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="erp-page">

        <div className="erp-card border border-red-200 bg-red-50 p-6">

          <div className="mb-2 text-lg font-bold text-red-700">
            Error
          </div>

          <div className="text-sm text-red-600">
            {error}
          </div>

          <div className="mt-5">

            <Link
              to="/expedientes"
              className="erp-btn-secondary inline-flex items-center gap-2"
            >
              ← Volver a expedientes
            </Link>

          </div>

        </div>

      </div>
    );
  }


  if (!expediente) {
    return (
      <div className="erp-page">

        <div className="erp-card p-6 text-center">

          <div className="text-sm font-semibold text-slate-600">
            No se ha encontrado el expediente.
          </div>

          <div className="mt-5">

            <Link
              to="/expedientes"
              className="erp-btn-secondary inline-flex items-center gap-2"
            >
              ← Volver a expedientes
            </Link>

          </div>

        </div>

      </div>
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="erp-page space-y-6">


      {/* ======================================================
          CABECERA EXPEDIENTE
      ====================================================== */}

      <div className="erp-card overflow-hidden">

        <div className="border-b border-slate-200/80 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 px-6 py-5">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <div className="mb-2 flex flex-wrap items-center gap-2">

                <Link
                  to="/expedientes"
                  className="erp-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs font-bold"
                >
                  ← Expedientes
                </Link>

                {expediente.fecha_prevista_firma && (
                  <Link
                    to={`/agenda?fecha=${expediente.fecha_prevista_firma}`}
                    className="erp-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs font-bold"
                  >
                    📅 Ver agenda
                  </Link>
                )}

              </div>


              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Expediente{" "}
                {valorVisible(
                  expediente.id_expediente
                )}
              </h1>


              <p className="mt-1 text-sm text-slate-500">
                Ficha completa del expediente
              </p>

            </div>


            <div className="flex flex-wrap items-center gap-2">

              {esDocumentacionPrevia && (
                <button
                  type="button"
                  onClick={() =>
                    setMostrarEnviarANotario(true)
                  }
                  className="erp-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
                >
                  ✒️ Enviar a notario
                </button>
              )}

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          BLOQUES PRINCIPALES — 4 COLUMNAS
      ====================================================== */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">


        {/* ====================================================
            COLUMNA 1 — ESTADO
        ==================================================== */}

        <Seccion
          titulo="Estado"
          subtitulo="Situación actual del expediente"
          icono="estado"
        >

          <div className="grid grid-cols-1 gap-3">

            <Dato
              etiqueta="Estado"
              valor={expediente.estado_expediente}
              destacado
            />

            <Dato
              etiqueta="Actividad actual"
              valor={expediente.actividad_actual}
              destacado
            />

            <Dato
              etiqueta="Estado actividad"
              valor={expediente.estado_actividad}
            />

            <Dato
              etiqueta="Tipo operación"
              valor={expediente.tipo_operacion}
            />

            <Dato
              etiqueta="Oficina"
              valor={expediente.oficina}
            />

            <Dato
              etiqueta="DAN"
              valor={expediente.dan}
            />

            <Dato
              etiqueta="Fecha alta"
              valor={expediente.fecha_alta}
              fecha
            />

          </div>

        </Seccion>


        {/* ====================================================
            COLUMNA 2 — TITULARES
        ==================================================== */}

        <Seccion
          titulo="Titulares"
          subtitulo="Información de los titulares del expediente"
          icono="titular"
        >

          <div className="grid grid-cols-1 gap-3">

            <Dato
              etiqueta="Nombre titular"
              valor={expediente.nombre_titular}
              destacado
            />

            <Dato
              etiqueta="NIF titular"
              valor={expediente.nif_titular}
            />

          </div>

        </Seccion>


        {/* ====================================================
            COLUMNA 3 — SOLICITANTES
        ==================================================== */}

        <Seccion
          titulo="Solicitantes"
          subtitulo="Información de los solicitantes"
          icono="solicitante"
        >

          <div className="grid grid-cols-1 gap-3">

            <Dato
              etiqueta="Nombre solicitante"
              valor={expediente.nombre_solicitante}
              destacado
            />

            <Dato
              etiqueta="NIF solicitante"
              valor={expediente.nif_solicitante}
            />

          </div>

        </Seccion>


        {/* ====================================================
            COLUMNA 4 — INFORMACIÓN CREDITICIA
        ==================================================== */}

        <Seccion
          titulo="Información crediticia"
          subtitulo="Datos económicos y contractuales"
          icono="economico"
        >

          <div className="grid grid-cols-1 gap-3">

            <Dato
              etiqueta="Nº expediente"
              valor={expediente.id_expediente}
              destacado
            />

            <Dato
              etiqueta="Contrato"
              valor={expediente.contrato}
            />

            <Dato
              etiqueta="Tipo operación"
              valor={expediente.tipo_operacion}
            />

            <Dato
              etiqueta="Subtipo operación"
              valor={expediente.subtipo_operacion}
            />

            <Dato
              etiqueta="Nº solicitud SIA"
              valor={expediente.num_solicitud_sia}
            />

            <Dato
              etiqueta="Capital"
              valor={expediente.capital}
              numero
            />

            <Dato
              etiqueta="Importe"
              valor={expediente.importe}
              numero
            />

            <Dato
              etiqueta="Saldo real"
              valor={expediente.saldo_real}
              numero
            />

            <Dato
              etiqueta="Saldo disponible"
              valor={expediente.saldo_disponible}
              numero
            />

            <Dato
              etiqueta="Finca"
              valor={expediente.finca}
            />

          </div>

        </Seccion>

      </div>


      {/* ======================================================
          NOTARIO
      ====================================================== */}

      <Seccion
        titulo="Notario"
        subtitulo="Información del notario asociado"
        icono="notario"
      >

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">

          <Dato
            etiqueta="Nombre notario"
            valor={expediente.nombre_notario}
            destacado
          />

          <Dato
            etiqueta="NIF notario"
            valor={expediente.nif_notario}
          />

          <Dato
            etiqueta="Notario"
            valor={expediente.notario}
          />

          <Dato
            etiqueta="ID notario"
            valor={expediente.notario_id}
          />

        </div>

      </Seccion>


      {/* ======================================================
          OBSERVACIONES
      ====================================================== */}

      <Observaciones
        valor={expediente.observaciones}
      />


      {/* ======================================================
          DEFECTOS
      ====================================================== */}

      <Seccion
        titulo="Defectos"
        subtitulo="Incidencias y defectos registrales"
        icono="defectos"
      >

        <div className="space-y-4">


          {/* ==================================================
              DEFECTO VIGENTE
          ================================================== */}

          {defectoVigente && (

            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-5">

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                <div className="min-w-0">

                  <div className="mb-3 flex flex-wrap items-center gap-2">

                    <DefectoVigenteBadge />

                  </div>


                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                    <Dato
                      etiqueta="Tipo de defecto"
                      valor={
                        defectoLocal?.tipo_error ||
                        expediente.tipo_error
                      }
                    />

                    <Dato
                      etiqueta="Falta / defecto"
                      valor={
                        defectoLocal?.falta_defecto ||
                        expediente.falta_defecto
                      }
                    />

                    <Dato
                      etiqueta="Descripción"
                      valor={
                        defectoLocal?.descripcion_error ||
                        expediente.descripcion_error
                      }
                    />

                  </div>

                </div>


                {/* ==========================================
                    ACCIONES DEFECTO
                ========================================== */}

                <div className="flex shrink-0 flex-wrap gap-2">

                  <button
                    type="button"
                    onClick={editarDefecto}
                    className="erp-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
                  >
                    ✏️ Editar
                  </button>


                  <button
                    type="button"
                    onClick={darDeBajaDefecto}
                    className="erp-btn-danger inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
                  >
                    ⛔ Dar de baja
                  </button>

                </div>

              </div>

            </div>

          )}


          {/* ==================================================
              SIN DEFECTO VIGENTE
          ================================================== */}

          {!defectoVigente && (

            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm">
                    ✓
                  </span>

                  <div className="text-sm font-bold text-slate-800">
                    No hay ningún defecto vigente
                  </div>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Este expediente no tiene actualmente
                  ningún defecto abierto.
                </p>

              </div>


              <button
                type="button"
                onClick={abrirAltaDefecto}
                className="erp-btn-danger inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold"
              >
                ⚠️ Dar de alta defecto
              </button>

            </div>

          )}


        </div>

      </Seccion>


      {/* ======================================================
          MODAL ALTA / EDICIÓN DEFECTO
      ====================================================== */}

      {mostrarAltaDefecto && (

        <div
          className="modal-overlay-sj z-50 flex items-center justify-center p-4"
          onMouseDown={(event) => {

            if (
              event.target === event.currentTarget &&
              !guardandoDefecto
            ) {
              cerrarAltaDefecto();
            }

          }}
        >

          <div
            className="erp-modal w-full max-w-2xl overflow-hidden"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >


            {/* ================================================
                HEADER
            ================================================ */}

            <div className="erp-modal-header flex items-center justify-between gap-4 p-5">

              <div>

                <div className="flex items-center gap-2">

                  <span className="text-xl">
                    ⚠️
                  </span>

                  <h3 className="text-lg font-black">
                    {modoDefecto === "editar"
                      ? "Editar defecto"
                      : "Dar de alta defecto"}
                  </h3>

                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Expediente{" "}
                  {valorVisible(
                    expediente.id_expediente
                  )}
                </p>

              </div>


              <button
                type="button"
                onClick={cerrarAltaDefecto}
                disabled={guardandoDefecto}
                className="erp-btn-secondary flex h-9 w-9 items-center justify-center rounded-lg p-0 text-lg"
                aria-label="Cerrar"
              >
                ×
              </button>

            </div>


            {/* ================================================
                BODY
            ================================================ */}

            <div className="erp-modal-body space-y-5 p-6">


              {/* TIPO */}

              <div>

                <label
                  htmlFor="tipo-defecto"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Tipo de defecto
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="tipo-defecto"
                  type="text"
                  value={tipoDefecto}
                  onChange={(event) =>
                    setTipoDefecto(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Defecto registral"
                  disabled={guardandoDefecto}
                  autoFocus
                  className="w-full"
                />

              </div>


              {/* FALTA */}

              <div>

                <label
                  htmlFor="falta-defecto"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Falta / defecto
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="falta-defecto"
                  type="text"
                  value={faltaDefecto}
                  onChange={(event) =>
                    setFaltaDefecto(
                      event.target.value
                    )
                  }
                  placeholder="Indica la falta o defecto detectado"
                  disabled={guardandoDefecto}
                  className="w-full"
                />

              </div>


              {/* DESCRIPCIÓN */}

              <div>

                <label
                  htmlFor="descripcion-defecto"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Descripción
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <textarea
                  id="descripcion-defecto"
                  value={descripcionDefecto}
                  onChange={(event) =>
                    setDescripcionDefecto(
                      event.target.value
                    )
                  }
                  placeholder="Describe detalladamente el defecto..."
                  disabled={guardandoDefecto}
                  rows={5}
                  className="w-full resize-y"
                />

              </div>


              {/* AVISO */}

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">

                <div className="flex gap-3">

                  <span className="text-lg">
                    ℹ️
                  </span>

                  <div className="text-xs leading-5 text-amber-800">
                    {modoDefecto === "editar"
                      ? "Estás modificando el defecto actualmente asociado al expediente."
                      : "El nuevo defecto quedará asociado al expediente y aparecerá como defecto vigente."}
                  </div>

                </div>

              </div>

            </div>


            {/* ================================================
                FOOTER
            ================================================ */}

            <div className="erp-modal-footer flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={cerrarAltaDefecto}
                disabled={guardandoDefecto}
                className="erp-btn-secondary inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold"
              >
                Cancelar
              </button>


              <button
                type="button"
                onClick={guardarDefecto}
                disabled={guardandoDefecto}
                className="erp-btn-danger inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold"
              >

                {guardandoDefecto ? (
                  <>
                    ⏳ Guardando...
                  </>
                ) : (
                  <>
                    ⚠️{" "}
                    {modoDefecto === "editar"
                      ? "Guardar cambios"
                      : "Dar de alta defecto"}
                  </>
                )}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          MODAL ENVIAR A NOTARIO
      ====================================================== */}

      {mostrarEnviarANotario && (

        <EnviarANotarioModal
          expediente={expediente}
          onClose={cerrarEnviarANotario}
          onGuardar={guardarEnviarANotario}
        />

      )}

    </div>
  );
}
