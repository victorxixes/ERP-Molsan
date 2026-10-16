
import { useCallback, useEffect, useState } from "react";
import axios from "../../api/axios";

const PESTANAS = [
  "Dashboard",
  "Agenda",
  "Encargos",
  "Mensajes",
  "Intranet",
  "CTN",
];

function fechaLegible(valor) {
  if (!valor) return "—";

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);

  return fecha.toLocaleDateString("es-ES");
}

function numeroLegible(valor) {
  return valor === null || valor === undefined
    ? "Pendiente de integración"
    : valor;
}

function TarjetaIndicador({ titulo, valor, detalle }) {
  return (
    <article className="ag-card ag-indicador">
      <div className="ag-indicador-titulo">{titulo}</div>
      <div className="ag-indicador-valor">{valor}</div>
      {detalle ? (
        <div className="ag-indicador-detalle">{detalle}</div>
      ) : null}
    </article>
  );
}

export default function ApoderaGest() {
  const [pestana, setPestana] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [encargos, setEncargos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [resDashboard, resAgenda, resEncargos] =
        await Promise.all([
          axios.get("/apoderagest/dashboard"),
          axios.get("/apoderagest/agenda"),
          axios.get("/apoderagest/encargos"),
        ]);

      setDashboard(resDashboard.data || {});
      setAgenda(Array.isArray(resAgenda.data) ? resAgenda.data : []);
      setEncargos(
        Array.isArray(resEncargos.data) ? resEncargos.data : []
      );
    } catch (err) {
      console.error("Error cargando ApoderaGest:", err);
      setError(
        err?.response?.data?.detail ||
        "No se han podido cargar los datos de ApoderaGest."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  return (
    <main className="apoderagest">
      <header className="ag-header">
        <div>
          <div className="ag-eyebrow">ERP-MOLSAN · MÓDULO PROFESIONAL</div>
          <h1>ApoderaGest</h1>
          <p>
            Gestión de encargos, firmas y actividad del apoderado.
          </p>
        </div>

        <button
          type="button"
          className="ag-boton"
          onClick={cargarDatos}
          disabled={cargando}
        >
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
      </header>

      <nav className="ag-tabs" aria-label="Secciones de ApoderaGest">
        {PESTANAS.map((nombre) => (
          <button
            type="button"
            key={nombre}
            className={
              pestana === nombre
                ? "ag-tab ag-tab-activa"
                : "ag-tab"
            }
            onClick={() => setPestana(nombre)}
          >
            {nombre}
          </button>
        ))}
      </nav>

      {error ? (
        <div className="ag-error" role="alert">
          {error}
        </div>
      ) : null}

      {cargando && !dashboard ? (
        <p className="ag-mensaje">Cargando datos…</p>
      ) : null}

      {pestana === "Dashboard" ? (
        <section className="ag-seccion">
          <h2>Resumen de actividad</h2>

          <div className="ag-grid-indicadores">
            <TarjetaIndicador
              titulo="Total de encargos"
              valor={dashboard?.total_encargos ?? "—"}
            />
            <TarjetaIndicador
              titulo="Firmados"
              valor={dashboard?.firmados ?? "—"}
            />
            <TarjetaIndicador
              titulo="Pendientes"
              valor={dashboard?.pendientes ?? "—"}
            />
            <TarjetaIndicador
              titulo="Media hasta firma"
              valor={
                dashboard?.media_dias_hasta_firma == null
                  ? "—"
                  : `${dashboard.media_dias_hasta_firma} días`
              }
            />
            <TarjetaIndicador
              titulo="Firmas presenciales"
              valor={numeroLegible(
                dashboard?.firmas_presenciales
              )}
            />
            <TarjetaIndicador
              titulo="Firmas por videoconferencia"
              valor={numeroLegible(
                dashboard?.firmas_videoconferencia
              )}
            />
            <TarjetaIndicador
              titulo="Kilómetros presenciales"
              valor={numeroLegible(
                dashboard?.kilometros_presenciales
              )}
            />
          </div>

          <div className="ag-card ag-resumen">
            <h3>Próximas citas</h3>
            {agenda.length === 0 ? (
              <p>No hay citas disponibles para mostrar.</p>
            ) : (
              <ul className="ag-lista-citas">
                {agenda.slice(0, 5).map((cita) => (
                  <li key={cita.id}>
                    <strong>{fechaLegible(cita.fecha)}</strong>
                    {" · "}
                    {cita.hora_inicio || "Hora pendiente"}
                    {" · "}
                    {cita.tipo_cita || "Cita"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {pestana === "Agenda" ? (
        <section className="ag-seccion">
          <h2>Mi agenda</h2>

          {agenda.length === 0 ? (
            <div className="ag-card">
              No hay citas asignadas para mostrar.
            </div>
          ) : (
            <div className="ag-tabla-contenedor">
              <table className="ag-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Tipo de cita</th>
                    <th>Expediente</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {agenda.map((cita) => (
                    <tr key={cita.id}>
                      <td>{fechaLegible(cita.fecha)}</td>
                      <td>{cita.hora_inicio || "—"}</td>
                      <td>{cita.hora_fin || "—"}</td>
                      <td>{cita.tipo_cita || "—"}</td>
                      <td>{cita.expediente_id || "—"}</td>
                      <td>{cita.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {pestana === "Encargos" ? (
        <section className="ag-seccion">
          <h2>Mis encargos</h2>

          {encargos.length === 0 ? (
            <div className="ag-card">
              No hay encargos asignados para mostrar.
            </div>
          ) : (
            <div className="ag-tabla-contenedor">
              <table className="ag-tabla">
                <thead>
                  <tr>
                    <th>Expediente</th>
                    <th>Titular</th>
                    <th>Estado</th>
                    <th>Notario</th>
                    <th>Alta</th>
                    <th>Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {encargos.map((encargo) => (
                    <tr key={encargo.id}>
                      <td>
                        {encargo.id_expediente || encargo.id || "—"}
                      </td>
                      <td>{encargo.titular || "—"}</td>
                      <td>{encargo.estado || "—"}</td>
                      <td>{encargo.notario || "—"}</td>
                      <td>{fechaLegible(encargo.fecha_alta)}</td>
                      <td>{fechaLegible(encargo.fecha_firma)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {["Mensajes", "Intranet", "CTN"].includes(pestana) ? (
        <section className="ag-seccion">
          <h2>{pestana}</h2>
          <div className="ag-card">
            Esta sección debe conectarse a la funcionalidad existente
            de ERP-Molsan. No se ha creado un sistema paralelo.
          </div>
        </section>
      ) : null}
    </main>
  );
}
