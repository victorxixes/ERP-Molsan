
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import "../../css/ApoderaGest.css";

const PESTANAS = [
  { nombre: "Dashboard", icono: "◫" },
  { nombre: "Agenda", icono: "▦" },
  { nombre: "Encargos", icono: "▤" },
  { nombre: "Mensajes", icono: "✉" },
  { nombre: "Intranet", icono: "⌂" },
  { nombre: "CTN", icono: "◇" },
];

function fechaLegible(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fechaHoraLegible(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function texto(valor, alternativa = "—") {
  return valor === null || valor === undefined || valor === ""
    ? alternativa
    : String(valor);
}

function numeroLegible(valor) {
  if (valor === null || valor === undefined || valor === "") return "Pendiente";
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? new Intl.NumberFormat("es-ES").format(numero)
    : String(valor);
}

function importeLegible(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(numero)
    : String(valor);
}

function EstadoPill({ valor }) {
  const estado = texto(valor, "Pendiente");
  const normalizado = estado.toLowerCase();
  let clase = "ag-estado-neutro";

  if (
    normalizado.includes("firmad") ||
    normalizado.includes("complet") ||
    normalizado.includes("finaliz")
  ) {
    clase = "ag-estado-ok";
  } else if (
    normalizado.includes("pendient") ||
    normalizado.includes("tramit")
  ) {
    clase = "ag-estado-pendiente";
  } else if (
    normalizado.includes("cancel") ||
    normalizado.includes("rechaz") ||
    normalizado.includes("error")
  ) {
    clase = "ag-estado-alerta";
  }

  return <span className={`ag-estado ${clase}`}>{estado}</span>;
}

function TarjetaIndicador({
  titulo,
  valor,
  detalle,
  icono,
  variante = "",
}) {
  return (
    <article className={`ag-kpi ${variante}`}>
      <div className="ag-kpi-superior">
        <span className="ag-kpi-titulo">{titulo}</span>
        <span className="ag-kpi-icono" aria-hidden="true">
          {icono}
        </span>
      </div>
      <div className="ag-kpi-valor">{valor}</div>
      {detalle ? <div className="ag-kpi-detalle">{detalle}</div> : null}
    </article>
  );
}

function EstadoVacio({ icono = "◇", titulo, detalle }) {
  return (
    <div className="ag-vacio">
      <span className="ag-vacio-icono" aria-hidden="true">
        {icono}
      </span>
      <h3>{titulo}</h3>
      <p>{detalle}</p>
    </div>
  );
}

function TablaCitas({ citas }) {
  if (!citas.length) {
    return (
      <EstadoVacio
        icono="▦"
        titulo="No hay citas para mostrar"
        detalle="Cuando tengas citas asignadas, aparecerán aquí."
      />
    );
  }

  return (
    <div className="ag-tabla-marco">
      <table className="ag-tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Horario</th>
            <th>Tipo de cita</th>
            <th>Expediente</th>
            <th>Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {citas.map((cita, indice) => (
            <tr key={cita.id ?? `${cita.fecha}-${indice}`}>
              <td>
                <span className="ag-celda-principal">
                  {fechaLegible(cita.fecha)}
                </span>
              </td>
              <td>
                <span className="ag-horario">
                  {texto(cita.hora_inicio, "—")}
                  {cita.hora_fin ? ` – ${cita.hora_fin}` : ""}
                </span>
              </td>
              <td>{texto(cita.tipo_cita, "Cita")}</td>
              <td>{texto(cita.expediente_id)}</td>
              <td className="ag-celda-secundaria">
                {texto(cita.observaciones)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaEncargos({ encargos }) {
  if (!encargos.length) {
    return (
      <EstadoVacio
        icono="▤"
        titulo="Todavía no hay encargos asignados"
        detalle="Los encargos disponibles para tu usuario se mostrarán en esta tabla."
      />
    );
  }

  return (
    <div className="ag-tabla-marco">
      <table className="ag-tabla">
        <thead>
          <tr>
            <th>N.º expediente</th>
            <th>Titular</th>
            <th>Estado</th>
            <th>Notario</th>
            <th>Fecha de alta</th>
            <th>Fecha de firma</th>
          </tr>
        </thead>
        <tbody>
          {encargos.map((encargo, indice) => (
            <tr key={encargo.id ?? `${encargo.id_expediente}-${indice}`}>
              <td>
                <span className="ag-expediente">
                  {texto(encargo.id_expediente || encargo.id)}
                </span>
              </td>
              <td className="ag-celda-principal">
                {texto(encargo.titular)}
              </td>
              <td>
                <EstadoPill valor={encargo.estado} />
              </td>
              <td>{texto(encargo.notario)}</td>
              <td>{fechaLegible(encargo.fecha_alta)}</td>
              <td>{fechaLegible(encargo.fecha_firma)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function nombreNotaria(notaria) {
  if (!notaria) return "Notaría";

  const nombreCompleto = [
    notaria.nombre,
    notaria.apellidos,
  ].filter(Boolean).join(" ").trim();

  return (
    nombreCompleto ||
    notaria.nombre_completo ||
    notaria.nombre_notario ||
    `Notaría ${notaria.id}`
  );
}

function normalizarRespuesta(respuesta) {
  const datos = respuesta?.data ?? respuesta;
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.items)) return datos.items;
  if (Array.isArray(datos?.resultados)) return datos.resultados;
  return [];
}

function TablaHistoricoFirmas({ firmas, cargando }) {
  if (cargando) {
    return (
      <div className="ag-cargando" role="status">
        <span className="ag-spinner" />
        <span>Cargando histórico de firmas reales…</span>
      </div>
    );
  }

  if (!firmas.length) {
    return (
      <EstadoVacio
        icono="◇"
        titulo="No hay firmas que coincidan"
        detalle="Prueba con otra modalidad o cambia el texto de búsqueda. Solo se muestran expedientes con fecha de firma registrada."
      />
    );
  }

  return (
    <div className="ag-tabla-marco">
      <table className="ag-tabla">
        <thead>
          <tr>
            <th>Fecha de firma</th>
            <th>Expediente</th>
            <th>Modalidad</th>
            <th>Protocolo</th>
            <th>Titular</th>
            <th>NIF titular</th>
            <th>Solicitante</th>
            <th>Oficina</th>
            <th>Importe</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {firmas.map((firma, indice) => {
            const modalidad = String(
              firma.modalidad || firma.tipo_firma || ""
            ).toUpperCase();

            const modalidadLegible =
              modalidad === "VC" ||
              modalidad.includes("VIDEOCONFERENCIA")
                ? "Videoconferencia"
                : modalidad === "PRESENCIAL" || modalidad === "P"
                  ? "Presencial"
                  : modalidad === "SIN_CLASIFICAR"
                    ? "Sin clasificar"
                    : texto(firma.modalidad || firma.tipo_firma);

            return (
              <tr key={firma.id ?? `${firma.id_expediente}-${indice}`}>
                <td>
                  <span className="ag-celda-principal">
                    {fechaLegible(firma.fecha_firma)}
                  </span>
                </td>
                <td>
                  <span className="ag-expediente">
                    {texto(firma.id_expediente || firma.id)}
                  </span>
                </td>
                <td>{modalidadLegible}</td>
                <td>{texto(firma.protocolo)}</td>
                <td>{texto(firma.nombre_titular || firma.titular)}</td>
                <td>{texto(firma.nif_titular)}</td>
                <td>{texto(firma.nombre_solicitante || firma.solicitante)}</td>
                <td>{texto(firma.oficina)}</td>
                <td>{importeLegible(firma.importe ?? firma.capital)}</td>
                <td>
                  <EstadoPill
                    valor={firma.estado_expediente || firma.estado}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ApoderaGest() {
  const [pestana, setPestana] = useState("Dashboard");

  const [dashboard, setDashboard] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [encargos, setEncargos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [busquedaAgenda, setBusquedaAgenda] = useState("");
  const [busquedaEncargos, setBusquedaEncargos] = useState("");
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // CTN: histórico de firmas reales.
  const [notarias, setNotarias] = useState([]);
  const [notariaSeleccionada, setNotariaSeleccionada] = useState("");
  const [busquedaFirmas, setBusquedaFirmas] = useState("");
  const [modalidadFirmas, setModalidadFirmas] = useState("");
  const [firmas, setFirmas] = useState([]);
  const [totalesFirmas, setTotalesFirmas] = useState({
    total: 0,
    total_vc: 0,
    total_presencial: 0,
    total_sin_clasificar: 0,
  });
  const [cargandoNotarias, setCargandoNotarias] = useState(false);
  const [cargandoFirmas, setCargandoFirmas] = useState(false);
  const [errorCTN, setErrorCTN] = useState("");
  const [notariasCargadas, setNotariasCargadas] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [resDashboard, resAgenda, resEncargos] = await Promise.all([
        axios.get("/apoderagest/dashboard"),
        axios.get("/apoderagest/agenda"),
        axios.get("/apoderagest/encargos"),
      ]);

      setDashboard(resDashboard.data || {});
      setAgenda(Array.isArray(resAgenda.data) ? resAgenda.data : []);
      setEncargos(Array.isArray(resEncargos.data) ? resEncargos.data : []);
      setUltimaActualizacion(new Date());
    } catch (err) {
      console.error("Error cargando ApoderaGest:", err);
      setError(
        err?.response?.data?.detail ||
        "No se han podido cargar los datos. Comprueba tu conexión o vuelve a intentarlo."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const agendaFiltrada = useMemo(() => {
    const termino = busquedaAgenda.trim().toLowerCase();
    if (!termino) return agenda;

    return agenda.filter((cita) =>
      [
        cita.tipo_cita,
        cita.expediente_id,
        cita.observaciones,
        cita.fecha,
        cita.hora_inicio,
      ].some((valor) => String(valor ?? "").toLowerCase().includes(termino))
    );
  }, [agenda, busquedaAgenda]);

  const encargosFiltrados = useMemo(() => {
    const termino = busquedaEncargos.trim().toLowerCase();
    if (!termino) return encargos;

    return encargos.filter((encargo) =>
      [
        encargo.id_expediente,
        encargo.id,
        encargo.titular,
        encargo.estado,
        encargo.notario,
      ].some((valor) => String(valor ?? "").toLowerCase().includes(termino))
    );
  }, [encargos, busquedaEncargos]);

  const cargarNotariasCTN = useCallback(async () => {
    setCargandoNotarias(true);
    setErrorCTN("");

    try {
      const respuesta = await axios.get("/ctn/notarias", {
        params: {
          page: 1,
          page_size: 200,
        },
      });

      const listado = normalizarRespuesta(respuesta).sort((a, b) =>
        nombreNotaria(a).localeCompare(nombreNotaria(b), "es")
      );

      setNotarias(listado);
      setNotariasCargadas(true);

      setNotariaSeleccionada((actual) => {
        if (actual && listado.some((item) => String(item.id) === actual)) {
          return actual;
        }
        return listado.length ? String(listado[0].id) : "";
      });

      if (!listado.length) {
        setFirmas([]);
        setTotalesFirmas({
          total: 0,
          total_vc: 0,
          total_presencial: 0,
          total_sin_clasificar: 0,
        });
      }
    } catch (err) {
      console.error("Error cargando notarías CTN:", err);
      setErrorCTN(
        err?.response?.data?.detail ||
        "No se ha podido cargar el listado de notarías de CTN."
      );
    } finally {
      setCargandoNotarias(false);
    }
  }, []);

  const cargarHistoricoCTN = useCallback(async () => {
    if (!notariaSeleccionada) {
      setFirmas([]);
      setTotalesFirmas({
        total: 0,
        total_vc: 0,
        total_presencial: 0,
        total_sin_clasificar: 0,
      });
      return;
    }

    setCargandoFirmas(true);
    setErrorCTN("");

    try {
      const params = {};

      if (modalidadFirmas) {
        params.modalidad = modalidadFirmas;
      }

      if (busquedaFirmas.trim()) {
        params.q = busquedaFirmas.trim();
      }

      const respuesta = await axios.get(
        `/ctn/notarias/${encodeURIComponent(notariaSeleccionada)}/firmas/historico`,
        { params }
      );

      const datos = respuesta?.data ?? respuesta;
      const listado = Array.isArray(datos?.items) ? datos.items : [];

      setFirmas(listado);
      setTotalesFirmas({
        total: Number(datos?.total ?? listado.length),
        total_vc: Number(datos?.total_vc ?? 0),
        total_presencial: Number(datos?.total_presencial ?? 0),
        total_sin_clasificar: Number(datos?.total_sin_clasificar ?? 0),
      });
    } catch (err) {
      console.error("Error cargando histórico de firmas CTN:", err);
      setFirmas([]);
      setTotalesFirmas({
        total: 0,
        total_vc: 0,
        total_presencial: 0,
        total_sin_clasificar: 0,
      });
      setErrorCTN(
        err?.response?.data?.detail ||
        "No se ha podido cargar el histórico real de firmas."
      );
    } finally {
      setCargandoFirmas(false);
    }
  }, [notariaSeleccionada, modalidadFirmas, busquedaFirmas]);

  useEffect(() => {
    if (pestana !== "CTN" || notariasCargadas) return;
    cargarNotariasCTN();
  }, [pestana, notariasCargadas, cargarNotariasCTN]);

  useEffect(() => {
    if (pestana !== "CTN" || !notariaSeleccionada) return;

    const temporizador = setTimeout(() => {
      cargarHistoricoCTN();
    }, busquedaFirmas.trim() ? 300 : 0);

    return () => clearTimeout(temporizador);
  }, [
    pestana,
    notariaSeleccionada,
    modalidadFirmas,
    busquedaFirmas,
    cargarHistoricoCTN,
  ]);

  const fechaActual = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const notariaActual = notarias.find(
    (item) => String(item.id) === notariaSeleccionada
  );

  return (
    <main className="apoderagest">
      <div className="ag-fondo-decorativo" aria-hidden="true" />

      <header className="ag-hero">
        <div className="ag-hero-identidad">
          <div className="ag-marca">AG</div>
          <div>
            <div className="ag-eyebrow">MOLSAN ERP · PREMIUM 2027</div>
            <h1>ApoderaGest</h1>
            <p>
              Centro de gestión de encargos, firmas y actividad del apoderado.
            </p>
          </div>
        </div>

        <div className="ag-hero-acciones">
          <div className="ag-fecha-actual">
            <span className="ag-punto-vivo" />
            <span>{fechaActual}</span>
          </div>
          <button
            type="button"
            className="ag-boton-actualizar"
            onClick={cargarDatos}
            disabled={cargando}
          >
            <span
              className={cargando ? "ag-icono-girando" : ""}
              aria-hidden="true"
            >
              ↻
            </span>
            {cargando ? "Actualizando…" : "Actualizar datos"}
          </button>
        </div>
      </header>

      <nav className="ag-navegacion" aria-label="Secciones de ApoderaGest">
        {PESTANAS.map((item) => (
          <button
            type="button"
            key={item.nombre}
            className={`ag-nav-item ${
              pestana === item.nombre ? "ag-nav-activo" : ""
            }`}
            onClick={() => setPestana(item.nombre)}
            aria-current={pestana === item.nombre ? "page" : undefined}
          >
            <span className="ag-nav-icono" aria-hidden="true">
              {item.icono}
            </span>
            <span>{item.nombre}</span>
          </button>
        ))}
      </nav>

      {error ? (
        <div className="ag-alerta-error" role="alert">
          <span className="ag-alerta-icono" aria-hidden="true">
            !
          </span>
          <div>
            <strong>No se han podido actualizar los datos</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={cargarDatos} disabled={cargando}>
            Reintentar
          </button>
        </div>
      ) : null}

      {cargando && !dashboard ? (
        <div className="ag-cargando">
          <span className="ag-spinner" />
          <span>Cargando tu espacio de trabajo…</span>
        </div>
      ) : null}

      {pestana === "Dashboard" ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion">
            <div>
              <span className="ag-kicker">VISTA GENERAL</span>
              <h2>Resumen de actividad</h2>
              <p>
                Una visión rápida de encargos, firmas y próximos compromisos.
              </p>
            </div>
            {ultimaActualizacion ? (
              <span className="ag-actualizado">
                Actualizado a las{" "}
                {ultimaActualizacion.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </div>

          <div className="ag-grid-kpi">
            <TarjetaIndicador
              titulo="Total de encargos"
              valor={numeroLegible(dashboard?.total_encargos ?? 0)}
              detalle="Volumen registrado"
              icono="▤"
              variante="ag-kpi-azul"
            />
            <TarjetaIndicador
              titulo="Firmados"
              valor={numeroLegible(dashboard?.firmados ?? 0)}
              detalle="Encargos completados"
              icono="✓"
              variante="ag-kpi-verde"
            />
            <TarjetaIndicador
              titulo="Pendientes"
              valor={numeroLegible(dashboard?.pendientes ?? 0)}
              detalle="Requieren seguimiento"
              icono="◷"
              variante="ag-kpi-ambar"
            />
            <TarjetaIndicador
              titulo="Media hasta firma"
              valor={
                dashboard?.media_dias_hasta_firma == null
                  ? "—"
                  : `${dashboard.media_dias_hasta_firma} días`
              }
              detalle="Tiempo medio de gestión"
              icono="↗"
              variante="ag-kpi-violeta"
            />
          </div>

          <div className="ag-grid-secundario">
            <TarjetaIndicador
              titulo="Firmas presenciales"
              valor={numeroLegible(dashboard?.firmas_presenciales)}
              detalle="Actividad presencial"
              icono="⌖"
            />
            <TarjetaIndicador
              titulo="Firmas por videoconferencia"
              valor={numeroLegible(dashboard?.firmas_videoconferencia)}
              detalle="Actividad remota"
              icono="▣"
            />
            <TarjetaIndicador
              titulo="Kilómetros presenciales"
              valor={
                dashboard?.kilometros_presenciales == null
                  ? "Pendiente"
                  : `${numeroLegible(dashboard.kilometros_presenciales)} km`
              }
              detalle="Desplazamientos registrados"
              icono="⌁"
            />
          </div>

          <section className="ag-panel ag-panel-proximas">
            <div className="ag-panel-cabecera">
              <div>
                <span className="ag-kicker">PLANIFICACIÓN</span>
                <h3>Próximas citas</h3>
              </div>
              <button
                type="button"
                className="ag-enlace-accion"
                onClick={() => setPestana("Agenda")}
              >
                Ver agenda <span aria-hidden="true">→</span>
              </button>
            </div>

            {agenda.length === 0 ? (
              <EstadoVacio
                icono="▦"
                titulo="No hay citas disponibles"
                detalle="Cuando existan citas asignadas, podrás consultarlas desde aquí."
              />
            ) : (
              <div className="ag-proximas-lista">
                {agenda.slice(0, 5).map((cita, indice) => (
                  <article
                    className="ag-cita-item"
                    key={cita.id ?? `${cita.fecha}-${indice}`}
                  >
                    <div className="ag-cita-fecha">
                      <strong>
                        {fechaLegible(cita.fecha).split("/")[0]}
                      </strong>
                      <span>
                        {fechaLegible(cita.fecha)
                          .split("/")
                          .slice(1)
                          .join("/")}
                      </span>
                    </div>
                    <div className="ag-cita-info">
                      <strong>{texto(cita.tipo_cita, "Cita")}</strong>
                      <span>
                        {texto(cita.hora_inicio, "Hora pendiente")}
                        {cita.expediente_id
                          ? ` · Expediente ${cita.expediente_id}`
                          : ""}
                      </span>
                    </div>
                    <span className="ag-cita-flecha" aria-hidden="true">
                      ›
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      ) : null}

      {pestana === "Agenda" ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion">
            <div>
              <span className="ag-kicker">ORGANIZACIÓN</span>
              <h2>Mi agenda</h2>
              <p>
                Consulta tus citas, horarios y datos de cada compromiso.
              </p>
            </div>
            <span className="ag-contador">{agenda.length} citas</span>
          </div>

          <div className="ag-panel">
            <div className="ag-toolbar">
              <label className="ag-busqueda">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={busquedaAgenda}
                  onChange={(event) => setBusquedaAgenda(event.target.value)}
                  placeholder="Buscar por tipo, expediente u observaciones…"
                  aria-label="Buscar en agenda"
                />
              </label>
              <span className="ag-resultados">
                {agendaFiltrada.length} resultados
              </span>
            </div>
            <TablaCitas citas={agendaFiltrada} />
          </div>
        </section>
      ) : null}

      {pestana === "Encargos" ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion">
            <div>
              <span className="ag-kicker">GESTIÓN OPERATIVA</span>
              <h2>Mis encargos</h2>
              <p>
                Seguimiento de expedientes, titulares y estado de firma.
              </p>
            </div>
            <span className="ag-contador">{encargos.length} encargos</span>
          </div>

          <div className="ag-panel">
            <div className="ag-toolbar">
              <label className="ag-busqueda">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={busquedaEncargos}
                  onChange={(event) =>
                    setBusquedaEncargos(event.target.value)
                  }
                  placeholder="Buscar expediente, titular, notario o estado…"
                  aria-label="Buscar encargos"
                />
              </label>
              <span className="ag-resultados">
                {encargosFiltrados.length} resultados
              </span>
            </div>
            <TablaEncargos encargos={encargosFiltrados} />
          </div>
        </section>
      ) : null}

      {pestana === "CTN" ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion">
            <div>
              <span className="ag-kicker">COORDINACIÓN NOTARIAL</span>
              <h2>Histórico real de firmas</h2>
              <p>
                Consulta firmas registradas en expedientes, separadas de las
                citas programadas en agenda.
              </p>
            </div>
            <button
              type="button"
              className="ag-boton-actualizar"
              onClick={() => {
                setNotariasCargadas(false);
                cargarNotariasCTN();
              }}
              disabled={cargandoNotarias}
            >
              {cargandoNotarias ? "Actualizando…" : "Actualizar notarías"}
            </button>
          </div>

          {errorCTN ? (
            <div className="ag-alerta-error" role="alert">
              <span className="ag-alerta-icono" aria-hidden="true">
                !
              </span>
              <div>
                <strong>Error en la integración CTN</strong>
                <p>{errorCTN}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!notariasCargadas) {
                    cargarNotariasCTN();
                  } else {
                    cargarHistoricoCTN();
                  }
                }}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          <div className="ag-panel">
            <div className="ag-toolbar">
              <label className="ag-busqueda">
                <span aria-hidden="true">◇</span>
                <select
                  value={notariaSeleccionada}
                  onChange={(event) =>
                    setNotariaSeleccionada(event.target.value)
                  }
                  aria-label="Seleccionar notaría"
                  disabled={cargandoNotarias || !notarias.length}
                >
                  {!notarias.length ? (
                    <option value="">
                      {cargandoNotarias
                        ? "Cargando notarías…"
                        : "No hay notarías disponibles"}
                    </option>
                  ) : null}
                  {notarias.map((notaria) => (
                    <option key={notaria.id} value={String(notaria.id)}>
                      {nombreNotaria(notaria)}
                      {notaria.nif ? ` · ${notaria.nif}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ag-busqueda">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={busquedaFirmas}
                  onChange={(event) => setBusquedaFirmas(event.target.value)}
                  placeholder="Buscar expediente, titular, NIF, protocolo…"
                  aria-label="Buscar en histórico de firmas"
                />
              </label>

              <label className="ag-busqueda">
                <span aria-hidden="true">▤</span>
                <select
                  value={modalidadFirmas}
                  onChange={(event) => setModalidadFirmas(event.target.value)}
                  aria-label="Filtrar por modalidad de firma"
                >
                  <option value="">Todas las modalidades</option>
                  <option value="VC">Videoconferencia</option>
                  <option value="PRESENCIAL">Presencial</option>
                </select>
              </label>
            </div>

            {notariaActual ? (
              <div className="ag-panel-cabecera">
                <div>
                  <span className="ag-kicker">NOTARÍA SELECCIONADA</span>
                  <h3>{nombreNotaria(notariaActual)}</h3>
                  <p>
                    NIF: {texto(notariaActual.nif)}
                    {notariaActual.municipio
                      ? ` · ${notariaActual.municipio}`
                      : ""}
                    {notariaActual.provincia
                      ? ` · ${notariaActual.provincia}`
                      : ""}
                  </p>
                </div>
                <span className="ag-contador">
                  {totalesFirmas.total} firmas
                </span>
              </div>
            ) : null}

            <div className="ag-grid-kpi">
              <TarjetaIndicador
                titulo="Firmas encontradas"
                valor={numeroLegible(totalesFirmas.total)}
                detalle="Expedientes con fecha de firma"
                icono="✓"
                variante="ag-kpi-azul"
              />
              <TarjetaIndicador
                titulo="Videoconferencia"
                valor={numeroLegible(totalesFirmas.total_vc)}
                detalle="Firmas clasificadas como VC"
                icono="▣"
                variante="ag-kpi-violeta"
              />
              <TarjetaIndicador
                titulo="Presenciales"
                valor={numeroLegible(totalesFirmas.total_presencial)}
                detalle="Firmas clasificadas como presenciales"
                icono="⌖"
                variante="ag-kpi-verde"
              />
              <TarjetaIndicador
                titulo="Sin clasificar"
                valor={numeroLegible(totalesFirmas.total_sin_clasificar)}
                detalle="Modalidad no identificada"
                icono="◷"
                variante="ag-kpi-ambar"
              />
            </div>

            <div className="ag-panel-cabecera">
              <div>
                <span className="ag-kicker">REGISTRO DE OPERACIONES</span>
                <h3>Firmas realizadas</h3>
                <p>
                  Este histórico procede de expedientes con fecha de firma
                  registrada. No representa las citas pendientes de agenda.
                </p>
              </div>
              <button
                type="button"
                className="ag-enlace-accion"
                onClick={cargarHistoricoCTN}
                disabled={cargandoFirmas || !notariaSeleccionada}
              >
                {cargandoFirmas ? "Consultando…" : "Actualizar histórico"}{" "}
                <span aria-hidden="true">↻</span>
              </button>
            </div>

            <TablaHistoricoFirmas
              firmas={firmas}
              cargando={cargandoFirmas}
            />
          </div>
        </section>
      ) : null}

      {["Mensajes", "Intranet"].includes(pestana) ? (
        <section className="ag-contenido">
          <div className="ag-titulo-seccion">
            <div>
              <span className="ag-kicker">ESPACIO DE TRABAJO</span>
              <h2>{pestana}</h2>
              <p>
                Acceso integrado a las herramientas corporativas de MOLSAN.
              </p>
            </div>
          </div>
          <div className="ag-panel ag-modulo-pendiente">
            <div className="ag-modulo-pendiente-icono" aria-hidden="true">
              {pestana === "Mensajes" ? "✉" : "⌂"}
            </div>
            <h3>{pestana}: integración pendiente</h3>
            <p>
              Esta sección debe enlazarse con la funcionalidad existente del
              ERP. No se ha creado un sistema paralelo ni se han alterado los
              módulos actuales.
            </p>
          </div>
        </section>
      ) : null}

      <footer className="ag-footer">
        <span>
          <strong>MOLSAN ERP</strong> · ApoderaGest
        </span>
        <span>Premium 2027</span>
      </footer>
    </main>
  );
}
