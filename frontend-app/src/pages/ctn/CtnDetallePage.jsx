
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCtn } from "../../hooks/useCtn";
import { listarNotarias } from "../../api/ctn";

// ============================================================
// HELPERS
// ============================================================

function texto(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }
  return String(valor);
}

function fechaVisible(valor) {
  if (!valor) return "—";

  const fecha = String(valor).slice(0, 10);
  const partes = fecha.split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function importeVisible(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) return String(valor);

  return numero.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function nombreNotario(notario) {
  return [
    notario?.nombre,
    notario?.apellidos,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Notario sin nombre";
}

function mensajeError(error, alternativo) {
  return (
    error?.response?.data?.detail ||
    error?.message ||
    alternativo
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--erp-border,#d1d5db)] " +
  "bg-[var(--erp-card,#fff)] px-3 py-2 text-sm " +
  "text-[var(--erp-text,#111827)] outline-none " +
  "focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "border border-[var(--erp-border,#d1d5db)] px-3 py-2 " +
  "text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl " +
  "bg-blue-700 px-4 py-2 text-sm font-semibold text-white " +
  "transition hover:bg-blue-800 disabled:opacity-50";

const cardClass =
  "rounded-2xl border border-[var(--erp-border,#e5e7eb)] " +
  "bg-[var(--erp-card,#fff)] p-4 shadow-sm";

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function CtnDetallePage() {
  const { id } = useParams();

  const {
    notaria,
    historicoFirmas,
    resumenHistoricoFirmas,
    notariasAsociadas,
    loading,
    loadingHistoricoFirmas,
    loadingAsociadas,
    error,
    cargarNotaria,
    cargarHistoricoFirmasNotaria,
    cargarNotariasAsociadas,
    asociarNotarios,
    desasociarNotarios,
  } = useCtn();

  const [errorLocal, setErrorLocal] = useState("");
  const [guardandoAsociacion, setGuardandoAsociacion] =
    useState(false);

  const [busquedaNotario, setBusquedaNotario] = useState("");
  const [resultadosNotarios, setResultadosNotarios] = useState([]);
  const [buscandoNotarios, setBuscandoNotarios] = useState(false);
  const [notarioSeleccionado, setNotarioSeleccionado] =
    useState(null);

  const [modalFirmasAbierto, setModalFirmasAbierto] =
    useState(false);
  const [modalidadActiva, setModalidadActiva] = useState("VC");
  const [busquedaFirma, setBusquedaFirma] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");

  const datosNotaria = notaria || {};

  const nombreCompleto = useMemo(
    () => nombreNotario(datosNotaria),
    [datosNotaria],
  );

  // ----------------------------------------------------------
  // CARGA INICIAL
  // ----------------------------------------------------------

  const cargar = useCallback(async () => {
    if (!id) return;

    setErrorLocal("");

    try {
      await Promise.all([
        cargarNotaria(id),
        cargarNotariasAsociadas(id),
        cargarHistoricoFirmasNotaria(id),
      ]);
    } catch (err) {
      setErrorLocal(
        mensajeError(
          err,
          "No se ha podido cargar toda la información del notario.",
        ),
      );
    }
  }, [
    id,
    cargarNotaria,
    cargarNotariasAsociadas,
    cargarHistoricoFirmasNotaria,
  ]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ----------------------------------------------------------
  // BUSCAR NOTARIOS PARA ASOCIAR
  // ----------------------------------------------------------

  const buscarNotarios = useCallback(async () => {
    const termino = busquedaNotario.trim();

    if (termino.length < 2) {
      setResultadosNotarios([]);
      setErrorLocal(
        "Introduce al menos dos caracteres del nombre o del NIF.",
      );
      return;
    }

    setBuscandoNotarios(true);
    setErrorLocal("");

    try {
      const respuesta = await listarNotarias({
        q: termino,
        page: 1,
        page_size: 30,
      });

      const items = respuesta.data?.items || [];

      setResultadosNotarios(
        items.filter(
          (item) => Number(item.id) !== Number(id),
        ),
      );
    } catch (err) {
      setErrorLocal(
        mensajeError(
          err,
          "No se ha podido realizar la búsqueda de notarios.",
        ),
      );
      setResultadosNotarios([]);
    } finally {
      setBuscandoNotarios(false);
    }
  }, [busquedaNotario, id]);

  // ----------------------------------------------------------
  // CREAR ASOCIACIÓN RECÍPROCA
  // ----------------------------------------------------------

  async function guardarAsociacion() {
    if (!notarioSeleccionado) {
      setErrorLocal("Selecciona un notario de los resultados.");
      return;
    }

    setGuardandoAsociacion(true);
    setErrorLocal("");

    try {
      await asociarNotarios(
        Number(id),
        Number(notarioSeleccionado.id),
      );

      await cargarNotaria(id);

      setNotarioSeleccionado(null);
      setBusquedaNotario("");
      setResultadosNotarios([]);
    } catch (err) {
      setErrorLocal(
        mensajeError(
          err,
          "No se ha podido guardar la asociación.",
        ),
      );
    } finally {
      setGuardandoAsociacion(false);
    }
  }

  // ----------------------------------------------------------
  // ELIMINAR ASOCIACIÓN RECÍPROCA
  // ----------------------------------------------------------

  async function eliminarAsociacion(asociada) {
    const confirmar = window.confirm(
      `¿Eliminar la asociación entre ${nombreCompleto} y ` +
      `${nombreNotario(asociada)}? La relación desaparecerá ` +
      "también de la ficha del otro notario.",
    );

    if (!confirmar) return;

    setErrorLocal("");

    try {
      await desasociarNotarios(
        Number(id),
        Number(asociada.id),
      );

      await cargarNotaria(id);
    } catch (err) {
      setErrorLocal(
        mensajeError(
          err,
          "No se ha podido eliminar la asociación.",
        ),
      );
    }
  }

  // ----------------------------------------------------------
  // HISTÓRICO REAL DE FIRMAS
  // ----------------------------------------------------------

  async function abrirHistorico(modalidad) {
    setModalidadActiva(modalidad);
    setBusquedaFirma("");
    setBusquedaAplicada("");
    setModalFirmasAbierto(true);
    setErrorLocal("");

    try {
      await cargarHistoricoFirmasNotaria(id, { modalidad });
    } catch (err) {
      setErrorLocal(
        mensajeError(
          err,
          "No se ha podido cargar el histórico de firmas.",
        ),
      );
    }
  }

  async function aplicarBusquedaFirmas(evento) {
    evento?.preventDefault();

    const termino = busquedaFirma.trim();
    setBusquedaAplicada(termino);

    try {
      await cargarHistoricoFirmasNotaria(id, {
        modalidad: modalidadActiva,
        q: termino || undefined,
      });
    } catch (err) {
      setErrorLocal(
        mensajeError(
          err,
          "No se ha podido filtrar el histórico.",
        ),
      );
    }
  }

  async function cambiarModalidad(modalidad) {
    setModalidadActiva(modalidad);
    setBusquedaAplicada("");

    try {
      await cargarHistoricoFirmasNotaria(id, {
        modalidad,
      });
    } catch (err) {
      setErrorLocal(
        mensajeError(
          err,
          "No se ha podido cargar el histórico de firmas.",
        ),
      );
    }
  }

  const firmasVisibles = useMemo(() => {
    return (historicoFirmas || []).filter((firma) => {
      if (modalidadActiva === "VC") {
        return firma.modalidad === "VC";
      }

      return firma.modalidad === "PRESENCIAL";
    });
  }, [historicoFirmas, modalidadActiva]);

  // ----------------------------------------------------------
  // ESTADOS DE CARGA
  // ----------------------------------------------------------

  if (loading && !notaria) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Cargando ficha del notario...
      </div>
    );
  }

  if (!notaria) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-red-600">
          {errorLocal || error || "No se ha encontrado el notario."}
        </p>

        <Link
          to="/ctn"
          className={buttonClass}
        >
          Volver al listado CTN
        </Link>
      </div>
    );
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="erp-page w-full space-y-6 p-4 text-[var(--erp-text)] sm:p-6">
      {/* CABECERA */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/ctn"
            className="mb-2 inline-flex text-sm text-blue-700 hover:underline"
          >
            ← Volver a CTN
          </Link>

          <h1 className="text-2xl font-bold">
            Ficha del notario
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {nombreCompleto} · NIF: {texto(datosNotaria.nif)}
          </p>
        </div>

        <button
          type="button"
          className={buttonClass}
          onClick={cargar}
          disabled={loading}
        >
          {loading ? "Actualizando..." : "Actualizar ficha"}
        </button>
      </div>

      {(errorLocal || error) && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errorLocal || error}
        </div>
      )}

      {/* DATOS DEL NOTARIO */}

      <section className={cardClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">
            Datos del notario
          </h2>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
            Código: {texto(datosNotaria.codigo)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dato label="Nombre" valor={datosNotaria.nombre} />
          <Dato label="Apellidos" valor={datosNotaria.apellidos} />
          <Dato label="NIF" valor={datosNotaria.nif} />
          <Dato label="Teléfono" valor={datosNotaria.telefono} />
          <Dato label="Provincia" valor={datosNotaria.provincia} />
          <Dato label="Municipio" valor={datosNotaria.municipio} />
          <Dato label="Código postal" valor={datosNotaria.cp} />
          <Dato label="Dirección" valor={datosNotaria.direccion} />
          <Dato
            label="Videoconferencia habilitada"
            valor={
              datosNotaria.vc
                ? String(datosNotaria.vc)
                : "No informado"
            }
          />
          <Dato label="Apoderado" valor={datosNotaria.apoderado} />
          <Dato
            label="Apoderado suplente"
            valor={datosNotaria.apoderado_s}
          />
          <Dato
            label="Departamento de cancelaciones"
            valor={datosNotaria.departamento_cancelaciones}
          />
          <Dato
            label="Departamento de copias"
            valor={datosNotaria.departamento_copias}
          />
          <Dato
            label="Otros departamentos"
            valor={datosNotaria.otros_departamentos}
          />
        </div>

        {datosNotaria.observacion && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Observaciones
            </p>
            <p className="whitespace-pre-wrap text-sm">
              {datosNotaria.observacion}
            </p>
          </div>
        )}
      </section>

      {/* NOTARIOS ASOCIADOS */}

      <section className={cardClass}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Notarios asociados
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            La asociación se guarda en las dos fichas. Si se elimina
            desde cualquiera de ellas, desaparece de ambas.
          </p>
        </div>

        <form
          className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto]"
          onSubmit={(evento) => {
            evento.preventDefault();
            buscarNotarios();
          }}
        >
          <div>
            <label className="mb-1 block text-sm font-medium">
              Buscar notario por nombre, apellidos o NIF
            </label>

            <input
              className={inputClass}
              value={busquedaNotario}
              onChange={(evento) =>
                setBusquedaNotario(evento.target.value)
              }
              placeholder="Ej.: Pepe García Sánchez o NIF..."
            />
          </div>

          <button
            type="submit"
            className={buttonClass}
            disabled={buscandoNotarios}
          >
            {buscandoNotarios ? "Buscando..." : "Buscar notario"}
          </button>
        </form>

        {resultadosNotarios.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200">
            {resultadosNotarios.map((resultado) => (
              <button
                key={resultado.id}
                type="button"
                onClick={() => setNotarioSeleccionado(resultado)}
                className={
                  "flex w-full flex-wrap items-center justify-between gap-3 " +
                  "border-b border-gray-100 p-3 text-left last:border-b-0 " +
                  (Number(notarioSeleccionado?.id) === Number(resultado.id)
                    ? "bg-blue-50"
                    : "hover:bg-gray-50")
                }
              >
                <span>
                  <span className="block font-medium">
                    {nombreNotario(resultado)}
                  </span>
                  <span className="text-xs text-gray-500">
                    NIF: {texto(resultado.nif)} · Código: {texto(resultado.codigo)}
                  </span>
                </span>

                <span className="text-sm text-blue-700">
                  {Number(notarioSeleccionado?.id) === Number(resultado.id)
                    ? "Seleccionado"
                    : "Seleccionar"}
                </span>
              </button>
            ))}
          </div>
        )}

        {buscandoNotarios && (
          <p className="mt-3 text-sm text-gray-500">
            Buscando en el catálogo de notarías...
          </p>
        )}

        {notarioSeleccionado && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <div className="text-sm">
              <span className="block font-semibold">
                Notario seleccionado
              </span>
              {nombreNotario(notarioSeleccionado)} · {texto(notarioSeleccionado.nif)}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClass}
                onClick={() => setNotarioSeleccionado(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                className={primaryButtonClass}
                disabled={guardandoAsociacion}
                onClick={guardarAsociacion}
              >
                {guardandoAsociacion
                  ? "Guardando..."
                  : "Asociar notarios"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">
              Asociaciones actuales
            </h3>
            <span className="text-xs text-gray-500">
              {notariasAsociadas.length} asociada(s)
            </span>
          </div>

          {loadingAsociadas ? (
            <p className="text-sm text-gray-500">
              Cargando asociaciones...
            </p>
          ) : notariasAsociadas.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
              Este notario todavía no tiene otros notarios asociados.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Notario asociado</th>
                    <th className="px-3 py-3">NIF</th>
                    <th className="px-3 py-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {notariasAsociadas.map((asociada) => (
                    <tr
                      key={asociada.id}
                      className="border-t border-gray-100"
                    >
                      <td className="px-3 py-3 font-medium">
                        {nombreNotario(asociada)}
                      </td>

                      <td className="px-3 py-3">
                        {texto(asociada.nif)}
                      </td>

                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                          onClick={() => eliminarAsociacion(asociada)}
                        >
                          Eliminar asociación
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* HISTÓRICO REAL DE FIRMAS */}

      <section className={cardClass}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Histórico de firmas realizadas
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Se cuentan expedientes con fecha de firma informada.
            Las citas de agenda no se consideran firmas realizadas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
            <p className="text-sm font-medium text-blue-800">
              Firmas por videoconferencia
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-950">
              {resumenHistoricoFirmas.total_vc}
            </p>

            <p className="mt-1 text-xs text-blue-800">
              Expedientes firmados clasificados como VC
            </p>

            <button
              type="button"
              className={`${primaryButtonClass} mt-4`}
              onClick={() => abrirHistorico("VC")}
            >
              Mostrar listado
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <p className="text-sm font-medium text-emerald-800">
              Firmas presenciales
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-950">
              {resumenHistoricoFirmas.total_presencial}
            </p>

            <p className="mt-1 text-xs text-emerald-800">
              Expedientes firmados clasificados como presencial
            </p>

            <button
              type="button"
              className={`${buttonClass} mt-4`}
              onClick={() => abrirHistorico("PRESENCIAL")}
            >
              Mostrar listado
            </button>
          </div>
        </div>

        {resumenHistoricoFirmas.total_sin_clasificar > 0 && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Hay {resumenHistoricoFirmas.total_sin_clasificar} expediente(s)
            con fecha de firma cuyo tipo de firma no está clasificado
            como videoconferencia o presencial.
          </p>
        )}

        <div className="mt-4 text-xs text-gray-500">
          Total de expedientes firmados encontrados:{" "}
          <strong>{resumenHistoricoFirmas.total}</strong>
        </div>
      </section>

      {/* MODAL DE HISTÓRICO */}

      {modalFirmasAbierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6"
          role="presentation"
          onMouseDown={(evento) => {
            if (evento.target === evento.currentTarget) {
              setModalFirmasAbierto(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ctn-historico-titulo"
            className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white text-gray-900 shadow-2xl"
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 p-4 sm:p-5">
              <div>
                <h2
                  id="ctn-historico-titulo"
                  className="text-xl font-bold"
                >
                  Histórico de firmas
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {nombreCompleto} · NIF {texto(datosNotaria.nif)}
                </p>
              </div>

              <button
                type="button"
                className={buttonClass}
                onClick={() => setModalFirmasAbierto(false)}
              >
                Cerrar
              </button>
            </header>

            <div className="border-b border-gray-200 px-4 pt-3 sm:px-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={
                    modalidadActiva === "VC"
                      ? primaryButtonClass
                      : buttonClass
                  }
                  onClick={() => cambiarModalidad("VC")}
                >
                  Videoconferencia
                </button>

                <button
                  type="button"
                  className={
                    modalidadActiva === "PRESENCIAL"
                      ? primaryButtonClass
                      : buttonClass
                  }
                  onClick={() => cambiarModalidad("PRESENCIAL")}
                >
                  Presencial
                </button>
              </div>

              <form
                className="my-3 flex flex-col gap-2 sm:flex-row"
                onSubmit={aplicarBusquedaFirmas}
              >
                <input
                  className={inputClass}
                  value={busquedaFirma}
                  onChange={(evento) =>
                    setBusquedaFirma(evento.target.value)
                  }
                  placeholder="Buscar expediente, titular, NIF, protocolo u oficina..."
                />

                <button
                  type="submit"
                  className={primaryButtonClass}
                >
                  Buscar
                </button>

                {busquedaAplicada && (
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => {
                      setBusquedaFirma("");
                      setBusquedaAplicada("");
                      cargarHistoricoFirmasNotaria(id, {
                        modalidad: modalidadActiva,
                      }).catch(() => {});
                    }}
                  >
                    Limpiar
                  </button>
                )}
              </form>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
              {loadingHistoricoFirmas ? (
                <p className="py-10 text-center text-sm text-gray-500">
                  Cargando expedientes firmados...
                </p>
              ) : firmasVisibles.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                  No se han encontrado expedientes firmados para esta
                  modalidad y estos criterios de búsqueda.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[1050px] text-sm">
                    <thead className="sticky top-0 bg-gray-100 text-left text-xs uppercase text-gray-600">
                      <tr>
                        <th className="px-3 py-3">Expediente</th>
                        <th className="px-3 py-3">Fecha firma</th>
                        <th className="px-3 py-3">Protocolo</th>
                        <th className="px-3 py-3">Titular</th>
                        <th className="px-3 py-3">NIF titular</th>
                        <th className="px-3 py-3">Solicitante</th>
                        <th className="px-3 py-3">Oficina</th>
                        <th className="px-3 py-3 text-right">Capital</th>
                        <th className="px-3 py-3">Estado</th>
                      </tr>
                    </thead>

                    <tbody>
                      {firmasVisibles.map((firma) => (
                        <tr
                          key={firma.id ?? firma.id_expediente}
                          className="border-t border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-3 py-3 font-medium">
                            {firma.id_expediente ? (
                              <Link
                                to={`/expedientes/${encodeURIComponent(
                                  firma.id_expediente,
                                )}`}
                                className="text-blue-700 hover:underline"
                                onClick={() => setModalFirmasAbierto(false)}
                              >
                                {firma.id_expediente}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3">
                            {fechaVisible(firma.fecha_firma)}
                          </td>

                          <td className="px-3 py-3">
                            {texto(firma.protocolo)}
                          </td>

                          <td className="px-3 py-3">
                            {texto(firma.nombre_titular)}
                          </td>

                          <td className="px-3 py-3">
                            {texto(firma.nif_titular)}
                          </td>

                          <td className="px-3 py-3">
                            {texto(firma.nombre_solicitante)}
                          </td>

                          <td className="px-3 py-3">
                            {texto(firma.oficina)}
                          </td>

                          <td className="whitespace-nowrap px-3 py-3 text-right">
                            {importeVisible(
                              firma.capital ?? firma.importe,
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {texto(firma.estado_expediente)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!loadingHistoricoFirmas && firmasVisibles.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">
                  Expedientes mostrados: {firmasVisibles.length}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ============================================================
// DATO DE FICHA
// ============================================================

function Dato({ label, valor }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="break-words text-sm font-medium">
        {texto(valor)}
      </p>
    </div>
  );
}
