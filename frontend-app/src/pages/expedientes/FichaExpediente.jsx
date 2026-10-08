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
  if (!fecha) return "—";

  const texto = String(fecha);

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [anio, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  if (texto.includes("T")) {
    const parte = texto.split("T")[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(parte)) {
      const [anio, mes, dia] = parte.split("-");
      return `${dia}/${mes}/${anio}`;
    }
  }

  return texto;
}


function formatearNumero(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "—";
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return String(valor);
  }

  return numero.toLocaleString("es-ES", {
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
// ICONOS
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
    <span className="mr-2 inline-flex items-center">
      {iconos[tipo] || "▣"}
    </span>
  );
}


// ============================================================
// BADGE DE ESTADO
// ============================================================

function EstadoBadge({ valor }) {
  const texto = valorVisible(valor);
  const normalizado = normalizarActividad(valor);

  let clase =
    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold";

  if (
    normalizado.includes("vig") ||
    normalizado.includes("abiert") ||
    normalizado.includes("activo")
  ) {
    clase +=
      " border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (
    normalizado.includes("cerr") ||
    normalizado.includes("final")
  ) {
    clase +=
      " border-slate-200 bg-slate-100 text-slate-600";
  } else if (
    normalizado.includes("error") ||
    normalizado.includes("defecto")
  ) {
    clase +=
      " border-red-200 bg-red-50 text-red-700";
  } else {
    clase +=
      " border-slate-200 bg-slate-50 text-slate-700";
  }

  return (
    <span className={clase}>
      {texto}
    </span>
  );
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

  if (fecha) {
    valorFinal = formatearFecha(valor);
  }

  if (numero) {
    valorFinal = formatearNumero(valor);
  }

  const esEstado =
    etiqueta === "Estado" ||
    etiqueta === "Estado actividad";

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {etiqueta}
      </div>

      {esEstado ? (
        <EstadoBadge valor={valor} />
      ) : (
        <div
          className={
            destacado
              ? "text-sm font-bold text-slate-800"
              : "text-sm text-slate-700"
          }
        >
          {valorFinal}
        </div>
      )}
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
    <section className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-sm backdrop-blur">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
        <div className="flex items-center text-base font-bold text-slate-800">
          <IconoSeccion tipo={icono} />
          {titulo}
        </div>

        {subtitulo && (
          <div className="mt-1 text-xs text-slate-500">
            {subtitulo}
          </div>
        )}
      </div>

      <div className="p-5">
        {children}
      </div>
    </section>
  );
}


// ============================================================
// DEFECTO — BADGE
// ============================================================

function DefectoEstadoBadge({ vigente }) {
  if (vigente) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
        ⚠️ DEFECTO VIGENTE
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      ✓ DEFECTO SUBSANADO
    </span>
  );
}


// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function FichaExpediente() {
  const { id } = useParams();

  const [expediente, setExpediente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // MODAL ENVIAR A NOTARIO
  // ----------------------------------------------------------

  const [mostrarEnviarANotario, setMostrarEnviarANotario] =
    useState(false);


  // ----------------------------------------------------------
  // DEFECTOS
  // ----------------------------------------------------------

  const [mostrarDefectoModal, setMostrarDefectoModal] =
    useState(false);

  const [modoDefecto, setModoDefecto] =
    useState("alta");

  const [tipoDefecto, setTipoDefecto] =
    useState("");

  const [faltaDefecto, setFaltaDefecto] =
    useState("");

  const [descripcionDefecto, setDescripcionDefecto] =
    useState("");

  const [fechaSubsanacion, setFechaSubsanacion] =
    useState("");

  const [observacionSubsanacion, setObservacionSubsanacion] =
    useState("");

  const [guardandoDefecto, setGuardandoDefecto] =
    useState(false);

  const [defectoLocal, setDefectoLocal] =
    useState(null);


  // ----------------------------------------------------------
  // CARGAR EXPEDIENTE
  // ----------------------------------------------------------

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        setCargando(true);
        setError("");

        const data = await obtenerExpediente(id);

        if (!activo) return;

        setExpediente(data);
      } catch (err) {
        console.error(
          "Error cargando expediente:",
          err
        );

        if (!activo) return;

        setError(
          err?.response?.data?.detail ||
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

  const actividadNormalizada = useMemo(
    () =>
      normalizarActividad(
        expediente?.actividad_actual
      ),
    [expediente]
  );

  const esDocumentacionPrevia =
    actividadNormalizada.includes("documentacion") &&
    actividadNormalizada.includes("previa");


  // ==========================================================
  // ENVIAR A NOTARIO
  // ==========================================================

  function abrirEnviarANotario() {
    setMostrarEnviarANotario(true);
  }


  function cerrarEnviarANotario() {
    setMostrarEnviarANotario(false);
  }


  async function guardarEnviarANotario(payload) {
    console.log(
      "ENVIAR A NOTARIO — pendiente conexión backend:",
      payload
    );

    setMostrarEnviarANotario(false);
  }


  // ==========================================================
  // DEFECTOS — ABRIR ALTA
  // ==========================================================

  function abrirAltaDefecto() {
    setModoDefecto("alta");

    setTipoDefecto("");
    setFaltaDefecto("");
    setDescripcionDefecto("");
    setFechaSubsanacion("");
    setObservacionSubsanacion("");

    setMostrarDefectoModal(true);
  }


  // ==========================================================
  // DEFECTOS — VER / EDITAR
  // ==========================================================

  function editarDefecto() {
    const defecto =
      defectoLocal || {
        tipo: expediente?.tipo_error,
        falta: expediente?.falta_defecto,
        descripcion:
          expediente?.descripcion_error,
        vigente: true,
      };

    setModoDefecto("editar");

    setTipoDefecto(
      defecto?.tipo || ""
    );

    setFaltaDefecto(
      defecto?.falta || ""
    );

    setDescripcionDefecto(
      defecto?.descripcion || ""
    );

    setFechaSubsanacion(
      defecto?.fecha_subsanacion || ""
    );

    setObservacionSubsanacion(
      defecto?.observacion_subsanacion || ""
    );

    setMostrarDefectoModal(true);
  }


  // ==========================================================
  // CERRAR MODAL DEFECTO
  // ==========================================================

  function cerrarDefectoModal() {
    if (guardandoDefecto) {
      return;
    }

    setMostrarDefectoModal(false);
  }


  // ==========================================================
  // GUARDAR DEFECTO
  // ==========================================================

  async function guardarDefecto() {
    if (!tipoDefecto.trim()) {
      alert("Indica el tipo de defecto.");
      return;
    }

    if (!faltaDefecto.trim()) {
      alert("Indica la falta o documentación.");
      return;
    }

    if (!descripcionDefecto.trim()) {
      alert("Indica la descripción del defecto.");
      return;
    }

    try {
      setGuardandoDefecto(true);

      const payload = {
        expediente_id:
          expediente?.id ||
          expediente?.id_expediente ||
          id,

        id_expediente:
          expediente?.id_expediente ||
          id,

        tipo_defecto: tipoDefecto.trim(),

        falta: faltaDefecto.trim(),

        descripcion:
          descripcionDefecto.trim(),

        fecha_subsanacion:
          fechaSubsanacion || null,

        observacion_subsanacion:
          observacionSubsanacion.trim() || null,

        vigente:
          !fechaSubsanacion,
      };

      console.log(
        "DEFECTO REGISTRAL — pendiente conexión backend:",
        payload
      );

      /*
       * ------------------------------------------------------
       * IMPORTANTE
       * ------------------------------------------------------
       *
       * Aquí se conectará posteriormente el endpoint real
       * de defectos registrales.
       *
       * No se inventa ningún endpoint hasta revisar
       * el backend actual.
       *
       * ------------------------------------------------------
       */

      setDefectoLocal({
        tipo: tipoDefecto.trim(),
        falta: faltaDefecto.trim(),
        descripcion:
          descripcionDefecto.trim(),

        fecha_subsanacion:
          fechaSubsanacion || null,

        observacion_subsanacion:
          observacionSubsanacion.trim() || null,

        vigente:
          !fechaSubsanacion,
      });

      setMostrarDefectoModal(false);
    } catch (err) {
      console.error(
        "Error guardando defecto:",
        err
      );

      alert(
        "No se ha podido guardar el defecto."
      );
    } finally {
      setGuardandoDefecto(false);
    }
  }


  // ==========================================================
  // DAR DE BAJA / SUBSANAR
  // ==========================================================

  function abrirSubsanacion() {
    const hoy = new Date()
      .toISOString()
      .slice(0, 10);

    setModoDefecto("subsanar");

    setFechaSubsanacion(hoy);
    setObservacionSubsanacion("");

    setMostrarDefectoModal(true);
  }


  async function confirmarSubsanacion() {
    if (!fechaSubsanacion) {
      alert(
        "Indica la fecha de subsanación."
      );
      return;
    }

    try {
      setGuardandoDefecto(true);

      const payload = {
        expediente_id:
          expediente?.id ||
          expediente?.id_expediente ||
          id,

        id_expediente:
          expediente?.id_expediente ||
          id,

        fecha_subsanacion:
          fechaSubsanacion,

        observacion_subsanacion:
          observacionSubsanacion.trim() || null,

        vigente: false,
      };

      console.log(
        "SUBSANACIÓN DEFECTO — pendiente conexión backend:",
        payload
      );

      setDefectoLocal((actual) => ({
        ...(actual || {}),
        fecha_subsanacion:
          fechaSubsanacion,

        observacion_subsanacion:
          observacionSubsanacion.trim() || null,

        vigente: false,
      }));

      setMostrarDefectoModal(false);
    } catch (err) {
      console.error(
        "Error subsanando defecto:",
        err
      );

      alert(
        "No se ha podido registrar la subsanación."
      );
    } finally {
      setGuardandoDefecto(false);
    }
  }


  // ==========================================================
  // DEFECTO ACTUAL
  // ==========================================================

  const defecto = defectoLocal
    ? defectoLocal
    : expediente?.tipo_error ||
      expediente?.falta_defecto ||
      expediente?.descripcion_error
    ? {
        tipo:
          expediente?.tipo_error || "",
        falta:
          expediente?.falta_defecto || "",
        descripcion:
          expediente?.descripcion_error || "",
        vigente: true,
      }
    : null;


  // ==========================================================
  // CARGANDO
  // ==========================================================

  if (cargando) {
    return (
      <div className="erp-page">
        <div className="erp-card p-8">
          <div className="text-center text-sm text-slate-500">
            Cargando expediente...
          </div>
        </div>
      </div>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="erp-page">
        <div className="erp-card p-8">
          <div className="mb-4 text-sm font-semibold text-red-600">
            {error}
          </div>

          <Link
            to="/expedientes"
            className="erp-btn-secondary"
          >
            ← Volver a expedientes
          </Link>
        </div>
      </div>
    );
  }


  // ==========================================================
  // SIN EXPEDIENTE
  // ==========================================================

  if (!expediente) {
    return (
      <div className="erp-page">
        <div className="erp-card p-8">
          <div className="mb-4 text-sm text-slate-500">
            No se ha encontrado el expediente.
          </div>

          <Link
            to="/expedientes"
            className="erp-btn-secondary"
          >
            ← Volver a expedientes
          </Link>
        </div>
      </div>
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="erp-page">

      {/* ====================================================
          CABECERA
      ==================================================== */}

      <div className="mb-6">

        <div className="mb-4">
          <Link
            to="/expedientes"
            className="inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            ← Expedientes
          </Link>
        </div>


        <div className="erp-card overflow-hidden">

          <div className="flex flex-col gap-5 p-6 xl:flex-row xl:items-center xl:justify-between">

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Expediente{" "}
                {valorVisible(
                  expediente.id_expediente
                )}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Ficha completa del expediente
              </p>
            </div>


            {/* ==================================================
                BOTONES DE ACCIÓN
            ================================================== */}

            <div className="flex flex-wrap items-center gap-3">

              {esDocumentacionPrevia && (
                <button
                  type="button"
                  onClick={abrirEnviarANotario}
                  className="erp-btn-primary"
                >
                  ✒️ Enviar a notario
                </button>
              )}

              <button
                type="button"
                onClick={abrirAltaDefecto}
                className="erp-btn-danger"
              >
                ⚠️ Defecto registral
              </button>

            </div>

          </div>

        </div>

      </div>


      {/* ====================================================
          4 BLOQUES PRINCIPALES
      ==================================================== */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">

        {/* ==================================================
            COLUMNA 1 — ESTADO
        ================================================== */}

        <Seccion
          titulo="Estado"
          subtitulo="Situación actual del expediente"
          icono="estado"
        >

          <div className="grid grid-cols-1 gap-3">

            <Dato
              etiqueta="Estado"
              valor={
                expediente.estado_expediente
              }
              destacado
            />

            <Dato
              etiqueta="Actividad actual"
              valor={
                expediente.actividad_actual
              }
              destacado
            />

            <Dato
              etiqueta="Estado actividad"
              valor={
                expediente.estado_actividad
              }
            />

            <Dato
              etiqueta="Tipo operación"
              valor={
                expediente.tipo_operacion
              }
            />

            <Dato
              etiqueta="Oficina"
              valor={
                expediente.oficina
              }
            />

            <Dato
              etiqueta="DAN"
              valor={
                expediente.dan
              }
            />

            <Dato
              etiqueta="Fecha alta"
              valor={
                expediente.fecha_alta
              }
              fecha
            />

          </div>

        </Seccion>


        {/* ==================================================
            COLUMNA 2 — TITULARES + SOLICITANTES
        ================================================== */}

        <div className="space-y-5">

          <Seccion
            titulo="Titulares"
            subtitulo="Titulares del expediente"
            icono="titular"
          >

            <div className="grid grid-cols-1 gap-3">

              <Dato
                etiqueta="Nombre titular"
                valor={
                  expediente.nombre_titular
                }
                destacado
              />

              <Dato
                etiqueta="NIF titular"
                valor={
                  expediente.nif_titular
                }
              />

            </div>

          </Seccion>


          <Seccion
            titulo="Solicitantes"
            subtitulo="Solicitantes del expediente"
            icono="solicitante"
          >

            <div className="grid grid-cols-1 gap-3">

              <Dato
                etiqueta="Nombre solicitante"
                valor={
                  expediente.nombre_solicitante
                }
                destacado
              />

              <Dato
                etiqueta="NIF solicitante"
                valor={
                  expediente.nif_solicitante
                }
              />

            </div>

          </Seccion>

        </div>


        {/* ==================================================
            COLUMNA 3 — INFORMACIÓN CREDITICIA
        ================================================== */}

        <Seccion
          titulo="Información crediticia"
          subtitulo="Datos económicos y contractuales"
          icono="economico"
        >

          <div className="grid grid-cols-1 gap-3">

            <Dato
              etiqueta="Nº expediente"
              valor={
                expediente.id_expediente
              }
              destacado
            />

            <Dato
              etiqueta="Contrato"
              valor={
                expediente.contrato
              }
            />

            <Dato
              etiqueta="Tipo operación"
              valor={
                expediente.tipo_operacion
              }
            />

            <Dato
              etiqueta="Subtipo operación"
              valor={
                expediente.subtipo_operacion
              }
            />

            <Dato
              etiqueta="Nº solicitud SIA"
              valor={
                expediente.num_solicitud_sia
              }
            />

            <Dato
              etiqueta="Capital"
              valor={
                expediente.capital
              }
              numero
            />

            <Dato
              etiqueta="Importe"
              valor={
                expediente.importe
              }
              numero
            />

            <Dato
              etiqueta="Saldo real"
              valor={
                expediente.saldo_real
              }
              numero
            />

            <Dato
              etiqueta="Saldo disponible"
              valor={
                expediente.saldo_disponible
              }
              numero
            />

            <Dato
              etiqueta="Finca"
              valor={
                expediente.finca
              }
            />

          </div>

        </Seccion>


        {/* ==================================================
            COLUMNA 4 — NOTARIO + OBSERVACIONES
        ================================================== */}

        <div className="space-y-5">

          <Seccion
            titulo="Notario"
            subtitulo="Información del notario asociado"
            icono="notario"
          >

            <div className="grid grid-cols-1 gap-3">

              <Dato
                etiqueta="Nombre notario"
                valor={
                  expediente.nombre_notario
                }
                destacado
              />

              <Dato
                etiqueta="NIF notario"
                valor={
                  expediente.nif_notario
                }
              />

              <Dato
                etiqueta="Notario"
                valor={
                  expediente.notario
                }
              />

              <Dato
                etiqueta="ID notario"
                valor={
                  expediente.notario_id
                }
              />

            </div>

          </Seccion>


          {/* ==================================================
              OBSERVACIONES — DENTRO DE NOTARIO
          ================================================== */}

          <Seccion
            titulo="Observaciones"
            subtitulo="Información adicional"
            icono="identificacion"
          >

            <div className="min-h-[120px] rounded-xl border border-slate-200 bg-slate-50/70 p-4">

              <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {valorVisible(
                  expediente.observaciones
                )}
              </div>

            </div>

          </Seccion>

        </div>

      </div>


      {/* ====================================================
          DEFECTOS
      ==================================================== */}

      <div className="mt-5">

        <Seccion
          titulo="Defectos registrales"
          subtitulo="Defectos asociados al expediente"
          icono="defectos"
        >

          {!defecto ? (

            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center">

              <div className="mb-2 text-3xl">
                ✓
              </div>

              <div className="text-sm font-semibold text-slate-700">
                No hay ningún defecto registral vigente
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Puedes registrar un defecto desde el botón de la cabecera.
              </div>

            </div>

          ) : (

            <div className="rounded-2xl border border-slate-200 bg-white">

              <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-5 xl:flex-row xl:items-center xl:justify-between">

                <div>

                  <div className="mb-2">
                    <DefectoEstadoBadge
                      vigente={
                        defecto.vigente !== false
                      }
                    />
                  </div>

                  <div className="text-sm font-bold text-slate-800">
                    Expediente{" "}
                    {valorVisible(
                      expediente.id_expediente
                    )}
                  </div>

                </div>


                <div className="flex flex-wrap gap-2">

                  <button
                    type="button"
                    onClick={editarDefecto}
                    className="erp-btn-secondary"
                  >
                    ✏️ Ver / editar
                  </button>

                  {defecto.vigente !== false && (
                    <button
                      type="button"
                      onClick={abrirSubsanacion}
                      className="erp-btn-danger"
                    >
                      ⛔ Dar de baja
                    </button>
                  )}

                </div>

              </div>


              <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">

                <Dato
                  etiqueta="Tipo de defecto"
                  valor={defecto.tipo}
                  destacado
                />

                <Dato
                  etiqueta="Falta / documento"
                  valor={defecto.falta}
                />

                <Dato
                  etiqueta="Estado"
                  valor={
                    defecto.vigente !== false
                      ? "Vigente"
                      : "Subsanado"
                  }
                />

              </div>


              <div className="px-5 pb-5">

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Descripción del defecto
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {valorVisible(
                      defecto.descripcion
                    )}
                  </div>

                </div>

              </div>


              {defecto.fecha_subsanacion && (

                <div className="grid grid-cols-1 gap-4 border-t border-slate-200 p-5 md:grid-cols-2">

                  <Dato
                    etiqueta="Fecha de subsanación"
                    valor={
                      defecto.fecha_subsanacion
                    }
                    fecha
                  />

                  <Dato
                    etiqueta="Observación de subsanación"
                    valor={
                      defecto.observacion_subsanacion
                    }
                  />

                </div>

              )}

            </div>

          )}

        </Seccion>

      </div>


      {/* ====================================================
          ACTIVIDADES
      ==================================================== */}

      <div className="mt-5">

        <Seccion
          titulo="Actividades"
          subtitulo="Historial y seguimiento del expediente"
          icono="actividad"
        >

          <div className="mb-5 overflow-x-auto border-b border-slate-200">

            <div className="flex min-w-max gap-1">

              <button
                type="button"
                className="border-b-2 border-slate-800 px-4 py-3 text-sm font-bold text-slate-800"
              >
                Todas
              </button>

              <button
                type="button"
                className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              >
                Documentación
              </button>

              <button
                type="button"
                className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              >
                Notaría
              </button>

              <button
                type="button"
                className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              >
                Registro
              </button>

              <button
                type="button"
                className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              >
                Firma
              </button>

              <button
                type="button"
                className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
              >
                Incidencias
              </button>

            </div>

          </div>


          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">

            <div className="mb-2 text-3xl">
              ⚙️
            </div>

            <div className="text-sm font-semibold text-slate-700">
              Historial de actividades
            </div>

            <div className="mt-1 text-xs text-slate-500">
              Las actividades reales del expediente se mostrarán aquí.
            </div>

          </div>

        </Seccion>

      </div>


      {/* ====================================================
          MODAL — ENVIAR A NOTARIO
      ==================================================== */}

      {mostrarEnviarANotario && (

        <EnviarANotarioModal
          expediente={expediente}
          onClose={cerrarEnviarANotario}
          onGuardar={guardarEnviarANotario}
        />

      )}


      {/* ====================================================
          MODAL — DEFECTO REGISTRAL
      ==================================================== */}

      {mostrarDefectoModal && (

        <div
          className="modal-overlay-sj"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              cerrarDefectoModal();
            }
          }}
        >

          <div
            className="erp-modal w-full max-w-2xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            {/* ==================================================
                CABECERA MODAL
            ================================================== */}

            <div className="erp-modal-header">

              <div>

                <div className="text-lg font-bold text-slate-800">

                  {modoDefecto === "alta" &&
                    "⚠️ Alta de defecto registral"}

                  {modoDefecto === "editar" &&
                    "✏️ Editar defecto registral"}

                  {modoDefecto === "subsanar" &&
                    "⛔ Subsanar defecto registral"}

                </div>

                <div className="mt-1 text-xs text-slate-500">

                  Expediente{" "}
                  <strong>
                    {valorVisible(
                      expediente.id_expediente
                    )}
                  </strong>

                </div>

              </div>


              <button
                type="button"
                onClick={cerrarDefectoModal}
                className="text-xl text-slate-400 transition hover:text-slate-700"
                disabled={guardandoDefecto}
              >
                ✕
              </button>

            </div>


            {/* ==================================================
                CUERPO MODAL
            ================================================== */}

            <div className="erp-modal-body">

              {/* ----------------------------------------------
                  EXPEDIENTE
              ---------------------------------------------- */}

              <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Expediente en defectos registrales
                </div>

                <div className="mt-1 text-base font-bold text-slate-800">
                  {valorVisible(
                    expediente.id_expediente
                  )}
                </div>

              </div>


              {/* ----------------------------------------------
                  ALTA / EDICIÓN
              ---------------------------------------------- */}

              {modoDefecto !== "subsanar" && (

                <div className="space-y-5">

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Tipo de defecto
                    </label>

                    <input
                      type="text"
                      value={tipoDefecto}
                      onChange={(event) =>
                        setTipoDefecto(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      placeholder="Ej.: Documentación"
                      disabled={guardandoDefecto}
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Falta / documento
                    </label>

                    <input
                      type="text"
                      value={faltaDefecto}
                      onChange={(event) =>
                        setFaltaDefecto(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      placeholder="Ej.: Nota simple actualizada"
                      disabled={guardandoDefecto}
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Descripción del defecto
                    </label>

                    <textarea
                      rows={5}
                      value={descripcionDefecto}
                      onChange={(event) =>
                        setDescripcionDefecto(
                          event.target.value
                        )
                      }
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      placeholder="Describe el defecto registral..."
                      disabled={guardandoDefecto}
                    />

                  </div>

                </div>

              )}


              {/* ----------------------------------------------
                  SUBSANACIÓN
              ---------------------------------------------- */}

              {modoDefecto === "subsanar" && (

                <div className="space-y-5">

                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                    <div className="text-sm font-bold text-red-700">
                      ⚠️ Se va a registrar la subsanación del defecto
                    </div>

                    <div className="mt-1 text-xs leading-5 text-red-600">
                      El defecto no se eliminará del expediente.
                      Quedará registrado como histórico y pasará
                      a estado subsanado.
                    </div>

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Fecha de subsanación
                    </label>

                    <input
                      type="date"
                      value={fechaSubsanacion}
                      onChange={(event) =>
                        setFechaSubsanacion(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      disabled={guardandoDefecto}
                    />

                  </div>


                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Observación de subsanación
                    </label>

                    <textarea
                      rows={4}
                      value={
                        observacionSubsanacion
                      }
                      onChange={(event) =>
                        setObservacionSubsanacion(
                          event.target.value
                        )
                      }
                      className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      placeholder="Indica cómo se ha subsanado el defecto..."
                      disabled={guardandoDefecto}
                    />

                  </div>

                </div>

              )}

            </div>


            {/* ==================================================
                PIE MODAL
            ================================================== */}

            <div className="erp-modal-footer">

              <button
                type="button"
                onClick={cerrarDefectoModal}
                className="erp-btn-secondary"
                disabled={guardandoDefecto}
              >
                Cancelar
              </button>


              {modoDefecto === "subsanar" ? (

                <button
                  type="button"
                  onClick={confirmarSubsanacion}
                  className="erp-btn-danger"
                  disabled={guardandoDefecto}
                >
                  {guardandoDefecto
                    ? "Guardando..."
                    : "✓ Confirmar subsanación"}
                </button>

              ) : (

                <button
                  type="button"
                  onClick={guardarDefecto}
                  className="erp-btn-primary"
                  disabled={guardandoDefecto}
                >
                  {guardandoDefecto
                    ? "Guardando..."
                    : modoDefecto === "editar"
                    ? "Guardar cambios"
                    : "Dar de alta defecto"}
                </button>

              )}

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
