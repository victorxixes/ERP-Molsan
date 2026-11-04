
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  obtenerNotaria,
  actualizarDatosBancariosNotaria,
  obtenerHistoricoFirmasNotaria,
  listarNotariasAsociadas,
  asociarNotarios,
  desasociarNotarios,
} from "../../api/ctn";
import "../../css/CtnListadoPage.css";
import AutocompleteNotario from "../agenda/AutocompleteNotario";
import PortalAccessTabs from "./PortalAccessTabs";

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
  mostrarAccesosPortales = false,
}) {
  // Se conservan las propiedades anteriores para no romper
  // las llamadas existentes desde ApoderaGest.
  const id = notaria?.id;

  const [ficha, setFicha] = useState(notaria || null);
  const [pestanaActiva, setPestanaActiva] = useState(mostrarAccesosPortales ? "portales" : "ficha");
  const [asociadas, setAsociadas] = useState([]);

  const [guardandoAsociacion, setGuardandoAsociacion] =
    useState(false);
  const [guardandoDatosBancarios, setGuardandoDatosBancarios] = useState(false);
  const [editandoCuenta1, setEditandoCuenta1] = useState(!notaria?.iban_1);
  const [editandoCuenta2, setEditandoCuenta2] = useState(false);
  const [mostrarCuenta2, setMostrarCuenta2] = useState(Boolean(notaria?.iban_2));
  const [cuentasGuardadas, setCuentasGuardadas] = useState({
    iban_1: notaria?.iban_1 || "",
    iban_2: notaria?.iban_2 || "",
  });

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
      const ibanPrincipal = datosFicha?.iban_1 || "";
      const ibanSecundario = datosFicha?.iban_2 || "";
      setCuentasGuardadas({ iban_1: ibanPrincipal, iban_2: ibanSecundario });
      setMostrarCuenta2(Boolean(ibanSecundario));
      setEditandoCuenta1(!ibanPrincipal);
      setEditandoCuenta2(false);

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

  const guardarDatosBancarios = async () => {
    if (!id || guardandoDatosBancarios) return;
    setGuardandoDatosBancarios(true);
    setError("");
    try {
      const respuesta = await actualizarDatosBancariosNotaria(id, {
        iban_1: ficha?.iban_1 || "",
        iban_2: ficha?.iban_2 || "",
      });
      const guardada = dataDe(respuesta);
      setFicha((actual) => ({ ...(actual || {}), ...(guardada || {}) }));
      setCuentasGuardadas({
        iban_1: guardada?.iban_1 ?? ficha?.iban_1 ?? "",
        iban_2: guardada?.iban_2 ?? ficha?.iban_2 ?? "",
      });
      setEditandoCuenta1(false);
      setEditandoCuenta2(false);
      setMostrarCuenta2(Boolean(guardada?.iban_2 ?? ficha?.iban_2));
      setError("");
    } catch (e) {
      setError(mensajeError(e, "No se pudieron guardar las cuentas bancarias del notario."));
    } finally {
      setGuardandoDatosBancarios(false);
    }
  };

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
        className="ctn-modal-panel molsan-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ctn-ficha-titulo"
      >
      {/* CABECERA DE LA FICHA */}

      <header
        className="ctn-modal-header molsan-modal-header ctn-modal-header-unified"
      >
        <div className="ctn-modal-header-identity">
          <span className="ctn-modal-eyebrow">
            MOLSAN ERP · CTN
          </span>

          <h2
            id="ctn-ficha-titulo"
            className="ctn-modal-title"
          >
            {nombreNotario(datos)}
          </h2>

          <p className="ctn-modal-meta">
            NIF: {valor(datos.nif)}
            {" · "}
            Código: {valor(datos.codigo)}
            {" · "}
            ID: {valor(id)}
          </p>
        </div>

        <span className="ctn-modal-header-badge">
          Ficha de notaría
        </span>

        <button
          type="button"
          className="ctn-modal-cerrar molsan-btn molsan-btn--secondary"
          aria-label="Cerrar ficha"
          onClick={() => (onClose || onCerrar)?.()}
        >
          ×
        </button>
      </header>

      <div className="ctn-modal-contenido">
      <nav className="ctn-ficha-pestanas" role="tablist" aria-label="Secciones de la ficha del notario">
        {[
          ["ficha", "Ficha del notario"],
          ["bancarios", "Datos bancarios"],
          ...(mostrarAccesosPortales ? [["portales", "Acceso a portales"]] : []),
          ["firmas", "Histórico de firmas reales"],
        ].map(([key, titulo]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={pestanaActiva === key}
            className={pestanaActiva === key ? "ctn-ficha-pestana activa" : "ctn-ficha-pestana"}
            onClick={() => setPestanaActiva(key)}
          >
            {titulo}
          </button>
        ))}
      </nav>
      {error && (
        <div
          className="ctn-modal-alerta ctn-modal-alerta--spaced"
          role="alert"
        >
          {error}
        </div>
      )}

      {cargando && (
        <p className="ctn-modal-ayuda">
          Actualizando datos del notario…
        </p>
      )}

      {pestanaActiva === "ficha" && (
        <>
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
                className="ctn-btn ctn-btn-secondary molsan-btn molsan-btn--secondary"
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

        </>
      )}

      {pestanaActiva === "bancarios" && (
        <section className="ctn-modal-seccion">
          <div className="ctn-modal-seccion-titulo">
            <h3>Datos bancarios</h3>
            <span>Hasta dos cuentas para pagos</span>
          </div>
          <p className="ctn-modal-ayuda">
            La cuenta principal se utilizará como primera opción al pagar desde Gestión económica. Puedes guardar una segunda cuenta si el notario dispone de ella.
          </p>

          <div className="ctn-modal-seccion ctn-modal-seccion--compact">
            <div className="ctn-modal-seccion-titulo">
              <h3>Cuenta bancaria principal</h3>
              <span>{cuentasGuardadas.iban_1 ? "Cuenta guardada" : "Sin cuenta guardada"}</span>
            </div>
            {editandoCuenta1 ? (
              <label className="ctn-modal-dato">
                <span className="ctn-modal-info-label">IBAN de la cuenta principal</span>
                <input
                  value={datos.iban_1 || ""}
                  maxLength={34}
                  autoComplete="off"
                  onChange={(event) => setFicha((actual) => ({ ...(actual || datos), iban_1: event.target.value.toUpperCase() }))}
                  placeholder="ES…"
                />
              </label>
            ) : (
              <div className="ctn-modal-dato">
                <span className="ctn-modal-info-label">IBAN</span>
                <strong>{cuentasGuardadas.iban_1 || "No configurada"}</strong>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {editandoCuenta1 ? (
                <>
                  <button type="button" className="ctn-btn ctn-btn-primary" onClick={guardarDatosBancarios} disabled={guardandoDatosBancarios}>
                    {guardandoDatosBancarios ? "Guardando…" : "Guardar"}
                  </button>
                  {cuentasGuardadas.iban_1 && (
                    <button type="button" className="ctn-btn ctn-btn-secondary" onClick={() => { setFicha((actual) => ({ ...(actual || datos), iban_1: cuentasGuardadas.iban_1 })); setEditandoCuenta1(false); }}>
                      Cancelar
                    </button>
                  )}
                </>
              ) : (
                <button type="button" className="ctn-btn ctn-btn-secondary" onClick={() => setEditandoCuenta1(true)}>Editar</button>
              )}
              {cuentasGuardadas.iban_1 && (
                <button
                  type="button"
                  className="ctn-btn ctn-btn-danger"
                  disabled={guardandoDatosBancarios}
                  onClick={async () => {
                    if (!window.confirm("¿Eliminar la cuenta bancaria principal de este notario?")) return;
                    const ibanAnterior = datos.iban_1 || "";
                    setFicha((actual) => ({ ...(actual || datos), iban_1: "" }));
                    try {
                      setGuardandoDatosBancarios(true);
                      const respuesta = await actualizarDatosBancariosNotaria(id, { iban_1: "", iban_2: datos.iban_2 || "" });
                      const guardada = dataDe(respuesta);
                      setFicha((actual) => ({ ...(actual || {}), ...(guardada || {}), iban_1: "" }));
                      setCuentasGuardadas((actual) => ({ ...actual, iban_1: "" }));
                      setEditandoCuenta1(true);
                    } catch (e) {
                      setFicha((actual) => ({ ...(actual || datos), iban_1: ibanAnterior }));
                      setError(mensajeError(e, "No se pudo eliminar la cuenta bancaria principal."));
                    } finally {
                      setGuardandoDatosBancarios(false);
                    }
                  }}
                >Eliminar</button>
              )}
            </div>
          </div>

          {mostrarCuenta2 && (
            <div className="ctn-modal-seccion ctn-modal-seccion--compact">
              <div className="ctn-modal-seccion-titulo">
                <h3>Segunda cuenta bancaria</h3>
                <span>{cuentasGuardadas.iban_2 ? "Cuenta guardada" : "Pendiente de guardar"}</span>
              </div>
              {editandoCuenta2 ? (
                <label className="ctn-modal-dato">
                  <span className="ctn-modal-info-label">IBAN de la segunda cuenta</span>
                  <input
                    value={datos.iban_2 || ""}
                    maxLength={34}
                    autoComplete="off"
                    onChange={(event) => setFicha((actual) => ({ ...(actual || datos), iban_2: event.target.value.toUpperCase() }))}
                    placeholder="ES…"
                  />
                </label>
              ) : (
                <div className="ctn-modal-dato">
                  <span className="ctn-modal-info-label">IBAN</span>
                  <strong>{cuentasGuardadas.iban_2 || "No configurada"}</strong>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {editandoCuenta2 ? (
                  <>
                    <button type="button" className="ctn-btn ctn-btn-primary" onClick={guardarDatosBancarios} disabled={guardandoDatosBancarios}>
                      {guardandoDatosBancarios ? "Guardando…" : "Guardar"}
                    </button>
                    <button type="button" className="ctn-btn ctn-btn-secondary" onClick={() => { setFicha((actual) => ({ ...(actual || datos), iban_2: cuentasGuardadas.iban_2 })); if (!cuentasGuardadas.iban_2) setMostrarCuenta2(false); setEditandoCuenta2(false); }}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button type="button" className="ctn-btn ctn-btn-secondary" onClick={() => setEditandoCuenta2(true)}>Editar</button>
                )}
                {cuentasGuardadas.iban_2 && (
                  <button
                    type="button"
                    className="ctn-btn ctn-btn-danger"
                    disabled={guardandoDatosBancarios}
                    onClick={async () => {
                      if (!window.confirm("¿Eliminar la segunda cuenta bancaria de este notario?")) return;
                      const ibanAnterior = datos.iban_2 || "";
                      setFicha((actual) => ({ ...(actual || datos), iban_2: "" }));
                      try {
                        setGuardandoDatosBancarios(true);
                        const respuesta = await actualizarDatosBancariosNotaria(id, { iban_1: datos.iban_1 || "", iban_2: "" });
                        const guardada = dataDe(respuesta);
                        setFicha((actual) => ({ ...(actual || {}), ...(guardada || {}), iban_2: "" }));
                        setCuentasGuardadas((actual) => ({ ...actual, iban_2: "" }));
                        setMostrarCuenta2(false);
                        setEditandoCuenta2(false);
                      } catch (e) {
                        setFicha((actual) => ({ ...(actual || datos), iban_2: ibanAnterior }));
                        setError(mensajeError(e, "No se pudo eliminar la segunda cuenta bancaria."));
                      } finally {
                        setGuardandoDatosBancarios(false);
                      }
                    }}
                  >Eliminar</button>
                )}
              </div>
            </div>
          )}

          {!mostrarCuenta2 && (
            <div className="mt-4">
              <button
                type="button"
                className="ctn-btn ctn-btn-secondary"
                onClick={() => {
                  setMostrarCuenta2(true);
                  setEditandoCuenta2(true);
                  setFicha((actual) => ({ ...(actual || datos), iban_2: "" }));
                }}
              >
                + Añadir otra cuenta
              </button>
            </div>
          )}
        </section>
      )}

      {mostrarAccesosPortales && pestanaActiva === "portales" && <PortalAccessTabs notariaId={id} />}

      {pestanaActiva === "firmas" && (
        <>
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
                  <th>Expediente</th>
                  <th>Fecha alta</th>
                  <th>Nombre solicitante</th>
                  <th>NIF solicitante</th>
                  <th>Tipo operación</th>
                  <th>Contrato</th>
                  <th>Fecha firma</th>
                  <th>Protocolo</th>
                </tr>
              </thead>

              <tbody>
                {listadoFirmas.map((f, i) => (
                  <tr
                    key={
                      f.id ??
                      `${f.id_expediente ?? f.expediente ?? "firma"}-${i}`
                    }
                  >
                    <td>{valor(f.expediente ?? f.numero_expediente ?? f.id_expediente)}</td>
                    <td>{valor(f.fecha_alta ?? f.fecha_creacion ?? f.fecha_apertura)}</td>
                    <td>
                      {valor(
                        f.nombre_solicitante ||
                        f.solicitante ||
                        [f.solicitante_nombre, f.solicitante_apellidos].filter(Boolean).join(" ")
                      )}
                    </td>
                    <td>{valor(f.nif_solicitante ?? f.cif_solicitante)}</td>
                    <td>{valor(f.tipo_operacion ?? f.tipo_operación ?? f.operacion)}</td>
                    <td>{valor(f.contrato ?? f.numero_contrato ?? f.referencia_contrato)}</td>
                    <td>{valor(f.fecha_firma)}</td>
                    <td>{valor(f.protocolo ?? f.numero_protocolo)}</td>
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

        </>
      )}

      {pestanaActiva === "ficha" && (
        <>
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

        </>
      )}

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
