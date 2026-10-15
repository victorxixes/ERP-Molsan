import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listarNotarias,
  obtenerNotaria,
  obtenerHistoricoFirmasNotaria,
  listarNotariasAsociadas,
  asociarNotarios,
  desasociarNotarios,
} from "../../api/ctn";
import "../../css/CtnListadoPage.css";

const valor = (v) =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const nombreNotario = (n) =>
  [n?.nombre, n?.apellidos].filter(Boolean).join(" ").trim() ||
  n?.nombre_completo ||
  n?.notario ||
  `Notario ${n?.id ?? ""}`;

const dataDe = (r) => r?.data ?? r;

const mensajeError = (e, fallback) => {
  const detail = e?.response?.data?.detail;
  return typeof detail === "string"
    ? detail
    : detail
      ? JSON.stringify(detail)
      : e?.message || fallback;
};

function extraerLista(data, claves = []) {
  if (Array.isArray(data)) return data;

  for (const clave of claves) {
    if (Array.isArray(data?.[clave])) return data[clave];
  }

  return [];
}

function normalizarModalidad(valorModalidad) {
  const texto = String(valorModalidad || "")
    .trim()
    .toUpperCase();

  if (
    texto === "VC" ||
    texto.includes("VIDEOCONFERENCIA") ||
    texto === "VIDEO"
  ) {
    return "Videoconferencia";
  }

  if (
    texto === "PRESENCIAL" ||
    texto.includes("PRESENCIAL")
  ) {
    return "Presencial";
  }

  return "Sin clasificar";
}

export default function ModalCtnDetalle({
  open = true,
  notaria,
  onClose,
  onCerrar,
}) {
  const cerrar = onClose || onCerrar || (() => {});
  const id = notaria?.id;

  const [ficha, setFicha] = useState(notaria || null);
  const [asociadas, setAsociadas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [guardandoAsociacion, setGuardandoAsociacion] =
    useState(false);

  const [modalidad, setModalidad] = useState("VC");
  const [busquedaFirma, setBusquedaFirma] = useState("");
  const [firmas, setFirmas] = useState([]);

  const [totales, setTotales] = useState({
    total: 0,
    total_vc: 0,
    total_presencial: 0,
    total_sin_clasificar: 0,
  });

  const [cargando, setCargando] = useState(false);
  const [cargandoFirmas, setCargandoFirmas] = useState(false);
  const [error, setError] = useState("");
  const [errorFirmas, setErrorFirmas] = useState("");

  const cargarFicha = useCallback(async () => {
    if (!id) return;

    setCargando(true);
    setError("");

    try {
      const [respuestaFicha, respuestaAsociadas] =
        await Promise.all([
          obtenerNotaria(id),
          listarNotariasAsociadas(id),
        ]);

      const datosFicha = dataDe(respuestaFicha);
      const datosAsociadas = dataDe(respuestaAsociadas);

      setFicha(datosFicha || notaria || null);

      setAsociadas(
        extraerLista(datosAsociadas, [
          "items",
          "asociadas",
          "notarias",
          "results",
        ])
      );
    } catch (e) {
      setFicha(notaria || null);
      setError(
        mensajeError(
          e,
          "No se pudo cargar la ficha completa del notario."
        )
      );
    } finally {
      setCargando(false);
    }
  }, [id, notaria]);

  const cargarFirmas = useCallback(
    async (modo = undefined, q = "") => {
      if (!id) return;

      setCargandoFirmas(true);
      setErrorFirmas("");

      try {
        const respuesta = await obtenerHistoricoFirmasNotaria(
          id,
          {
            modalidad: modo,
            q,
          }
        );

        const datos = dataDe(respuesta) || {};

        const lista = extraerLista(datos, [
          "items",
          "results",
          "firmas",
        ]);

        setFirmas(lista);

        if (!modo && !String(q || "").trim()) {
          setTotales({
            total: Number(datos.total ?? lista.length),
            total_vc: Number(datos.total_vc || 0),
            total_presencial: Number(
              datos.total_presencial || 0
            ),
            total_sin_clasificar: Number(
              datos.total_sin_clasificar || 0
            ),
          });
        }
      } catch (e) {
        setFirmas([]);
        setErrorFirmas(
          mensajeError(
            e,
            "No se pudo cargar el histórico de firmas reales."
          )
        );
      } finally {
        setCargandoFirmas(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (!open || !id) return;

    cargarFicha();
    cargarFirmas(undefined, "");
  }, [open, id, cargarFicha, cargarFirmas]);

  useEffect(() => {
    const q = busqueda.trim();

    if (!open || q.length < 2) {
      setResultados([]);
      return undefined;
    }

    let activo = true;

    listarNotarias({
      q,
      page: 1,
      page_size: 30,
    })
      .then((respuesta) => {
        if (!activo) return;

        const datos = dataDe(respuesta) || {};

        const lista = extraerLista(datos, [
          "items",
          "notarias",
          "results",
        ]);

        const idsAsociados = new Set(
          asociadas.map((a) =>
            Number(a.id ?? a.asociada_id ?? a.notaria_id)
          )
        );

        setResultados(
          lista.filter(
            (n) =>
              Number(n.id) !== Number(id) &&
              !idsAsociados.has(Number(n.id))
          )
        );
      })
      .catch(() => {
        if (activo) setResultados([]);
      });

    return () => {
      activo = false;
    };
  }, [busqueda, asociadas, id, open]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") cerrar();
    };

    window.addEventListener("keydown", onKeyDown);

    return () =>
      window.removeEventListener("keydown", onKeyDown);
  }, [open, cerrar]);

  const agregarAsociacion = async (asociadaId) => {
    if (!id || !asociadaId || guardandoAsociacion) return;

    setGuardandoAsociacion(true);
    setError("");

    try {
      await asociarNotarios(id, asociadaId);

      setBusqueda("");
      setResultados([]);

      await cargarFicha();
    } catch (e) {
      setError(
        mensajeError(e, "No se pudo crear la asociación.")
      );
    } finally {
      setGuardandoAsociacion(false);
    }
  };

  const quitarAsociacion = async (asociadaId) => {
    if (!id || !asociadaId || guardandoAsociacion) return;

    const confirmado = window.confirm(
      "¿Eliminar la asociación entre ambos notarios?"
    );

    if (!confirmado) return;

    setGuardandoAsociacion(true);
    setError("");

    try {
      await desasociarNotarios(id, asociadaId);
      await cargarFicha();
    } catch (e) {
      setError(
        mensajeError(e, "No se pudo eliminar la asociación.")
      );
    } finally {
      setGuardandoAsociacion(false);
    }
  };

  const buscarFirmas = (event) => {
    event.preventDefault();
    cargarFirmas(modalidad || undefined, busquedaFirma);
  };

  const mostrarModalidad = (modo) => {
    setModalidad(modo);
    setBusquedaFirma("");
    cargarFirmas(modo || undefined, "");
  };

  const listadoFirmas = useMemo(() => firmas, [firmas]);

  if (!open || !notaria) return null;

  const datosNotario = ficha || notaria;

  return (
    <div
      className="ctn-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cerrar();
      }}
    >
      <section
        className="ctn-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ctn-modal-titulo"
      >
        <header className="ctn-modal-header">
          <div>
            <span className="ctn-modal-eyebrow">
              MOLSAN ERP · CTN
            </span>

            <h2 id="ctn-modal-titulo">
              {nombreNotario(datosNotario)}
            </h2>

            <p>
              NIF: {valor(datosNotario.nif)} · Código:{" "}
              {valor(datosNotario.codigo)} · ID: {valor(id)}
            </p>
          </div>

          <button
            type="button"
            className="ctn-modal-cerrar"
            onClick={cerrar}
            aria-label="Cerrar ventana"
          >
            ×
          </button>
        </header>

        <div className="ctn-modal-contenido">
          {error && (
            <div className="ctn-modal-alerta" role="alert">
              {error}
            </div>
          )}

          {cargando && (
            <p className="ctn-modal-ayuda">
              Actualizando datos del notario…
            </p>
          )}

          <section className="ctn-modal-seccion">
            <div className="ctn-modal-seccion-titulo">
              <h3>Datos del notario</h3>
              <span>Ficha general</span>
            </div>

            <div className="ctn-modal-datos-grid">
              <Dato
                titulo="Teléfono"
                valor={datosNotario.telefono}
              />

              <Dato
                titulo="Correo electrónico"
                valor={
                  datosNotario.email || datosNotario.correo
                }
              />

              <Dato
                titulo="Dirección"
                valor={datosNotario.direccion}
              />

              <Dato
                titulo="Código postal"
                valor={
                  datosNotario.cp ||
                  datosNotario.codigo_postal
                }
              />

              <Dato
                titulo="Municipio"
                valor={datosNotario.municipio}
              />

              <Dato
                titulo="Provincia"
                valor={datosNotario.provincia}
              />

              <Dato titulo="Videoconferencia" valor={datosNotario.vc} />

              <Dato
                titulo="Apoderado"
                valor={datosNotario.apoderado}
              />

              <Dato
                titulo="Observaciones"
                valor={
                  datosNotario.observacion ||
                  datosNotario.observaciones
                }
                ancho
              />
            </div>
          </section>

          <section className="ctn-modal-seccion">
            <div className="ctn-modal-seccion-titulo">
              <h3>Histórico de firmas reales</h3>
              <span>Expedientes firmados</span>
            </div>

            <p className="ctn-modal-ayuda">
              Solo deben contabilizarse expedientes con fecha
              de firma registrada. Las citas de Agenda no son
              firmas realizadas.
            </p>

            <div className="ctn-modal-resumen-firmas">
              <div>
                <span>Videoconferencia</span>
                <strong>{totales.total_vc}</strong>

                <button
                  type="button"
                  onClick={() => mostrarModalidad("VC")}
                >
                  Ver firmas
                </button>
              </div>

              <div>
                <span>Presencial</span>
                <strong>{totales.total_presencial}</strong>

                <button
                  type="button"
                  onClick={() =>
                    mostrarModalidad("PRESENCIAL")
                  }
                >
                  Ver firmas
                </button>
              </div>

              <div>
                <span>Sin clasificar</span>
                <strong>
                  {totales.total_sin_clasificar}
                </strong>

                <small>Modalidad no identificada</small>
              </div>
            </div>

            <form
              className="ctn-modal-busqueda-firmas"
              onSubmit={buscarFirmas}
            >
              <label>
                Modalidad
                <select
                  value={modalidad}
                  onChange={(event) =>
                    setModalidad(event.target.value)
                  }
                >
                  <option value="VC">Videoconferencia</option>
                  <option value="PRESENCIAL">Presencial</option>
                  <option value="">Todas las modalidades</option>
                </select>
              </label>

              <label className="ctn-modal-busqueda-expandida">
                Buscar expediente, titular, NIF o protocolo
                <input
                  value={busquedaFirma}
                  onChange={(event) =>
                    setBusquedaFirma(event.target.value)
                  }
                  placeholder="Escribe para filtrar…"
                />
              </label>

              <button
                type="submit"
                className="ctn-btn ctn-btn-primary"
                disabled={cargandoFirmas}
              >
                Buscar
              </button>
            </form>

            {errorFirmas && (
              <div className="ctn-modal-alerta" role="alert">
                {errorFirmas}
              </div>
            )}

            {cargandoFirmas ? (
              <p className="ctn-modal-ayuda">
                Cargando firmas…
              </p>
            ) : listadoFirmas.length === 0 ? (
              <p className="ctn-modal-vacio">
                No hay firmas para los filtros seleccionados.
              </p>
            ) : (
              <div className="ctn-modal-tabla-scroll">
                <table className="ctn-modal-tabla">
                  <thead>
                    <tr>
                      <th>Fecha firma</th>
                      <th>Expediente</th>
                      <th>Titular</th>
                      <th>NIF titular</th>
                      <th>Solicitante</th>
                      <th>Protocolo</th>
                      <th>Oficina</th>
                      <th>Importe</th>
                      <th>Modalidad</th>
                    </tr>
                  </thead>

                  <tbody>
                    {listadoFirmas.map((firma, index) => (
                      <tr
                        key={
                          firma.id ??
                          `${firma.id_expediente ?? "firma"}-${index}`
                        }
                      >
                        <td>{valor(firma.fecha_firma)}</td>

                        <td>
                          {valor(
                            firma.id_expediente ??
                              firma.numero_expediente
                          )}
                        </td>

                        <td>
                          {valor(
                            firma.nombre_titular ||
                              firma.titular
                          )}
                        </td>

                        <td>{valor(firma.nif_titular)}</td>

                        <td>
                          {valor(
                            firma.nombre_solicitante ||
                              firma.solicitante
                          )}
                        </td>

                        <td>{valor(firma.protocolo)}</td>

                        <td>
                          {valor(
                            firma.oficina ||
                              firma.oficina_notarial
                          )}
                        </td>

                        <td>
                          {valor(
                            firma.importe ?? firma.capital
                          )}
                        </td>

                        <td>
                          {normalizarModalidad(
                            firma.modalidad ||
                              firma.modalidad_firma ||
                              firma.tipo_firma
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="ctn-modal-pie-tabla">
              Registros mostrados: {listadoFirmas.length}
            </p>
          </section>

          <section className="ctn-modal-seccion">
            <div className="ctn-modal-seccion-titulo">
              <h3>Notarios asociados</h3>
              <span>{asociadas.length} asociaciones</span>
            </div>

            <p className="ctn-modal-ayuda">
              Las asociaciones deben ser recíprocas: añadir o
              eliminar una relación debe actualizar ambos sentidos.
            </p>

            <label className="ctn-modal-label-busqueda">
              Buscar notario para asociar
              <input
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Nombre, apellidos o NIF (mínimo 2 caracteres)"
              />
            </label>

            {resultados.length > 0 && (
              <div className="ctn-modal-resultados">
                {resultados.map((n) => (
                  <div key={n.id}>
                    <span>
                      <strong>{nombreNotario(n)}</strong>
                      <small>
                        NIF: {valor(n.nif)} ·{" "}
                        {valor(n.municipio)}
                      </small>
                    </span>

                    <button
                      type="button"
                      className="ctn-btn ctn-btn-primary ctn-btn-small"
                      disabled={guardandoAsociacion}
                      onClick={() => agregarAsociacion(n.id)}
                    >
                      {guardandoAsociacion
                        ? "Guardando…"
                        : "Asociar"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {busqueda.trim().length >= 2 &&
              resultados.length === 0 && (
                <p className="ctn-modal-ayuda">
                  No hay nuevos notarios que coincidan con la búsqueda.
                </p>
              )}

            {asociadas.length === 0 ? (
              <p className="ctn-modal-vacio">
                Este notario todavía no tiene asociaciones.
              </p>
            ) : (
              <div className="ctn-modal-tabla-scroll">
                <table className="ctn-modal-tabla">
                  <thead>
                    <tr>
                      <th>Notario asociado</th>
                      <th>NIF</th>
                      <th>Municipio</th>
                      <th>Provincia</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {asociadas.map((asociado) => {
                      const asociadoId =
                        asociado.id ??
                        asociado.asociada_id ??
                        asociado.notaria_id;

                      return (
                        <tr key={asociadoId}>
                          <td>
                            <strong>
                              {nombreNotario(asociado)}
                            </strong>
                          </td>

                          <td>{valor(asociado.nif)}</td>
                          <td>{valor(asociado.municipio)}</td>
                          <td>{valor(asociado.provincia)}</td>

                          <td>
                            <button
                              type="button"
                              className="ctn-btn ctn-btn-danger ctn-btn-small"
                              disabled={guardandoAsociacion}
                              onClick={() =>
                                quitarAsociacion(asociadoId)
                              }
                            >
                              Eliminar asociación
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <footer className="ctn-modal-footer">
          <span>Ficha CTN · Datos conectados al backend</span>

          <button
            type="button"
            className="ctn-btn ctn-btn-primary"
            onClick={cerrar}
          >
            Cerrar ficha
          </button>
        </footer>
      </section>
    </div>
  );
}

function Dato({ titulo, valor: contenido, ancho = false }) {
  return (
    <div
      className={`ctn-modal-dato${
        ancho ? " ctn-modal-dato-ancho" : ""
      }`}
    >
      <span>{titulo}</span>
      <strong>{valor(contenido)}</strong>
    </div>
  );
}
