
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  obtenerNotaria,
  obtenerHistoricoFirmasNotaria,
  listarNotariasAsociadas,
  asociarNotarios,
  desasociarNotarios,
} from "../../api/ctn";
import "../../css/CtnListadoPage.css";
import AutocompleteNotario from "../agenda/AutocompleteNotario";

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

const listaDe = (respuesta, claves = []) => {
  const datos = dataDe(respuesta);

  if (Array.isArray(datos)) return datos;

  for (const clave of claves) {
    if (Array.isArray(datos?.[clave])) return datos[clave];
  }

  return [];
};

const normalizarModalidad = (valorModalidad) => {
  const modalidad = String(valorModalidad || "").trim().toUpperCase();

  if (
    modalidad === "VC" ||
    modalidad.includes("VIDEOCONFERENCIA")
  ) {
    return "Videoconferencia";
  }

  if (
    modalidad === "PRESENCIAL" ||
    modalidad === "P"
  ) {
    return "Presencial";
  }

  return "Sin clasificar";
};

export default function ModalCtnDetalle({
  open = true,
  notaria,
  onClose,
  onCerrar,
}) {
  // Se conservan las propiedades anteriores para no romper
  // las llamadas existentes desde ApoderaGest.
  const id = notaria?.id;

  const [ficha, setFicha] = useState(notaria || null);
  const [asociadas, setAsociadas] = useState([]);

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

      setFicha(datosFicha || notaria || null);

      setAsociadas(
        listaDe(respuestaAsociadas, [
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

        const items = Array.isArray(datos)
          ? datos
          : datos.items || datos.results || [];

        setFirmas(items);

        // Los contadores se actualizan únicamente al cargar
        // el histórico completo, sin filtros.
        if (!modo && !String(q || "").trim()) {
          setTotales({
            total: Number(datos.total ?? items.length ?? 0),
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

  const agregarAsociacion = async (asociadaId) => {
    if (!id || !asociadaId || guardandoAsociacion) return;

    setGuardandoAsociacion(true);
    setError("");

    try {
      await asociarNotarios(id, asociadaId);

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

    const confirmar = window.confirm(
      "¿Eliminar la asociación entre ambos notarios?"
    );

    if (!confirmar) return;

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

  const buscarFirmas = (e) => {
    e.preventDefault();
    cargarFirmas(modalidad || undefined, busquedaFirma);
  };

  const mostrarTodasLasFirmas = () => {
    setModalidad("");
    setBusquedaFirma("");
    cargarFirmas(undefined, "");
  };

  const listadoFirmas = useMemo(
    () => firmas,
    [firmas]
  );

  if (!open || !notaria || !id) return null;

  const datos = ficha || notaria;
  const consultaMapa = [
    datos.lat && datos.lng ? `${datos.lat}, ${datos.lng}` : "",
    datos.direccion,
    datos.cp || datos.codigo_postal,
    datos.municipio,
    datos.provincia,
    "España",
  ]
    .filter(Boolean)
    .join(", ");
  const mapaDisponible = Boolean(
    (datos.lat && datos.lng) ||
    datos.direccion ||
    datos.municipio ||
    datos.provincia
  );
  const urlMapa = mapaDisponible
    ? `https://maps.google.com/maps?q=${encodeURIComponent(consultaMapa)}&output=embed`
    : "";
  const urlAbrirMapa = mapaDisponible
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consultaMapa)}`
    : "";

  return (
    <div
      className="ctn-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          (onClose || onCerrar)?.();
        }
      }}
    >
      <section
        className="ctn-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ctn-ficha-titulo"
      >
      {/* CABECERA DE LA FICHA */}

      <header
        className="ctn-modal-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          padding: "0 0 18px",
          marginBottom: 20,
          borderBottom: "1px solid #e5eaf0",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span className="ctn-modal-eyebrow">
            MOLSAN ERP · CTN
          </span>

          <h2
            id="ctn-ficha-titulo"
            style={{
              margin: "6px 0",
              fontSize: "clamp(20px, 2vw, 28px)",
              fontWeight: 750,
              overflowWrap: "anywhere",
            }}
          >
            {nombreNotario(datos)}
          </h2>

          <p style={{ margin: 0, color: "#64748b" }}>
            NIF: {valor(datos.nif)}
            {" · "}
            Código: {valor(datos.codigo)}
            {" · "}
            ID: {valor(id)}
          </p>
        </div>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "7px 12px",
            borderRadius: 999,
            background: "#edf5ff",
            color: "#2458a6",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          Ficha de notaría
        </span>

        <button
          type="button"
          className="ctn-modal-cerrar"
          aria-label="Cerrar ficha"
          onClick={() => (onClose || onCerrar)?.()}
        >
          ×
        </button>
      </header>

      <div className="ctn-modal-contenido">
      {error && (
        <div
          className="ctn-modal-alerta"
          role="alert"
          style={{ marginBottom: 16 }}
        >
          {error}
        </div>
      )}

      {cargando && (
        <p className="ctn-modal-ayuda">
          Actualizando datos del notario…
        </p>
      )}

      {/* DATOS GENERALES */}

      <section className="ctn-modal-seccion">
        <div className="ctn-modal-seccion-titulo">
          <h3>Datos del notario</h3>
          <span>Ficha general</span>
        </div>

        <div className="ctn-modal-datos-grid">
          <Dato
            titulo="Teléfono"
            valor={datos.telefono}
          />

          <Dato
            titulo="Correo electrónico"
            valor={datos.email || datos.correo}
          />

          <Dato
            titulo="Dirección"
            valor={datos.direccion}
          />

          <Dato
            titulo="Código postal"
            valor={datos.cp || datos.codigo_postal}
          />

          <Dato
            titulo="Municipio"
            valor={datos.municipio}
          />

          <Dato
            titulo="Provincia"
            valor={datos.provincia}
          />

          <Dato
            titulo="Departamento de cancelaciones"
            valor={datos.departamento_cancelaciones}
          />

          <Dato
            titulo="Departamento de copias"
            valor={datos.departamento_copias}
          />

          <Dato
            titulo="Otros departamentos"
            valor={datos.otros_departamentos}
          />

          <Dato
            titulo="Videoconferencia"
            valor={datos.vc}
          />

          <Dato
            titulo="Apoderado"
            valor={datos.apoderado}
          />

          <Dato
            titulo="Apoderado S"
            valor={datos.apoderado_s}
          />

          <Dato
            titulo="Observaciones"
            valor={datos.observacion || datos.observaciones}
            ancho
          />
        </div>
      </section>

      {/* UBICACIÓN DE LA NOTARÍA */}

      <section className="ctn-modal-seccion">
        <div className="ctn-modal-seccion-titulo">
          <h3>Ubicación de la notaría</h3>
          <span>{datos.lat && datos.lng ? "Coordenadas registradas" : "Ubicación por dirección"}</span>
        </div>

        {mapaDisponible ? (
          <>
            <div className="ctn-modal-mapa-marco">
              <iframe
                title={`Mapa de ubicación de ${nombreNotario(datos)}`}
                src={urlMapa}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div className="ctn-modal-mapa-pie">
              <p>{[datos.direccion, datos.cp || datos.codigo_postal, datos.municipio, datos.provincia].filter(Boolean).join(", ") || "Ubicación según las coordenadas registradas"}</p>
              <a
                className="ctn-btn ctn-btn-secondary"
                href={urlAbrirMapa}
                target="_blank"
                rel="noreferrer"
              >
                Abrir en Google Maps ↗
              </a>
            </div>
          </>
        ) : (
          <p className="ctn-modal-vacio">
            No hay dirección ni coordenadas suficientes para mostrar el mapa de esta notaría.
          </p>
        )}
      </section>

      {/* HISTÓRICO DE FIRMAS REALES */}

      <section className="ctn-modal-seccion">
        <div className="ctn-modal-seccion-titulo">
          <h3>Histórico de firmas reales</h3>
          <span>Actividad de firma registrada</span>
        </div>

        <p className="ctn-modal-ayuda">
          Solo se contabilizan expedientes con fecha de firma
          registrada. Las citas de Agenda no se consideran
          firmas realizadas.
        </p>

        <div className="ctn-modal-resumen-firmas">
          <div>
            <span>Videoconferencia</span>
            <strong>{totales.total_vc}</strong>

            <button
              type="button"
              onClick={() => {
                setModalidad("VC");
                setBusquedaFirma("");
                cargarFirmas("VC", "");
              }}
            >
              Ver firmas
            </button>
          </div>

          <div>
            <span>Presencial</span>
            <strong>{totales.total_presencial}</strong>

            <button
              type="button"
              onClick={() => {
                setModalidad("PRESENCIAL");
                setBusquedaFirma("");
                cargarFirmas("PRESENCIAL", "");
              }}
            >
              Ver firmas
            </button>
          </div>

          <div>
            <span>Sin clasificar</span>
            <strong>{totales.total_sin_clasificar}</strong>
            <small>Modalidad no identificada</small>
          </div>

          <div>
            <span>Total de firmas</span>
            <strong>{totales.total}</strong>

            <button
              type="button"
              onClick={mostrarTodasLasFirmas}
            >
              Ver todas
            </button>
          </div>
        </div>

        <form
          className="ctn-modal-busqueda-firmas"
          onSubmit={buscarFirmas}
        >
          <label>
            Consultar histórico

            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
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
              onChange={(e) =>
                setBusquedaFirma(e.target.value)
              }
              placeholder="Escribe para filtrar…"
            />
          </label>

          <button
            type="submit"
            className="ctn-btn ctn-btn-primary"
            disabled={cargandoFirmas}
          >
            {cargandoFirmas ? "Buscando…" : "Buscar"}
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
                {listadoFirmas.map((f, i) => (
                  <tr
                    key={
                      f.id ??
                      `${f.id_expediente ?? "firma"}-${i}`
                    }
                  >
                    <td>{valor(f.fecha_firma)}</td>
                    <td>{valor(f.id_expediente)}</td>
                    <td>
                      {valor(f.nombre_titular || f.titular)}
                    </td>
                    <td>{valor(f.nif_titular)}</td>
                    <td>
                      {valor(
                        f.nombre_solicitante || f.solicitante
                      )}
                    </td>
                    <td>{valor(f.protocolo)}</td>
                    <td>
                      {valor(f.oficina || f.oficina_notarial)}
                    </td>
                    <td>{valor(f.importe ?? f.capital)}</td>
                    <td>
                      {normalizarModalidad(
                        f.modalidad ||
                        f.tipo_firma ||
                        f.modalidad_firma
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

      {/* NOTARIOS ASOCIADOS */}

      <section className="ctn-modal-seccion">
        <div className="ctn-modal-seccion-titulo">
          <h3>Notarios asociados</h3>
          <span>{asociadas.length} asociaciones</span>
        </div>

        <p className="ctn-modal-ayuda">
          Las asociaciones son recíprocas: añadir o eliminar
          aquí actualiza la relación en ambos sentidos.
        </p>

        <div className="ctn-modal-label-busqueda">
          <span>Buscar notario para asociar</span>
          <AutocompleteNotario
            value={null}
            disabled={guardandoAsociacion}
            onSelect={(notarioEncontrado) => {
              const asociadoId = notarioEncontrado?.id;
              if (!asociadoId) return;

              const yaAsociado = asociadas.some(
                (a) =>
                  Number(a.id ?? a.asociada_id ?? a.notaria_id) ===
                  Number(asociadoId)
              );

              if (Number(asociadoId) === Number(id)) {
                setError("No puedes asociar una notaría consigo misma.");
                return;
              }

              if (yaAsociado) {
                setError("Este notario ya está asociado a la ficha actual.");
                return;
              }

              agregarAsociacion(asociadoId);
            }}
          />
          <p className="ctn-modal-ayuda">
            Busca por nombre, apellidos, municipio o provincia y selecciona el notario para crear la asociación recíproca.
          </p>
        </div>

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
                {asociadas.map((n) => (
                  <tr key={n.id ?? n.asociada_id}>
                    <td>
                      <strong>{nombreNotario(n)}</strong>
                    </td>
                    <td>{valor(n.nif)}</td>
                    <td>{valor(n.municipio)}</td>
                    <td>{valor(n.provincia)}</td>
                    <td>
                      <button
                        type="button"
                        className="ctn-btn ctn-btn-danger ctn-btn-small"
                        disabled={guardandoAsociacion}
                        onClick={() =>
                          quitarAsociacion(
                            n.id ?? n.asociada_id
                          )
                        }
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
      </section>

      </div>

      <footer className="ctn-modal-footer">
        <span>
          Ficha CTN · Datos conectados al backend
        </span>

        <span>
          {cargando || cargandoFirmas
            ? "Actualizando información…"
            : "Información consultada"}
        </span>
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
