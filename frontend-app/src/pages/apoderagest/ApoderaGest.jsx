
import { useEffect, useState } from "react";
import axios from "../../api/axios";

const TABS = [
  "Dashboard",
  "Agenda",
  "Encargos",
  "Mensajes",
  "Intranet",
  "CTN",
];

function fechaBonita(valor) {
  if (!valor) return "—";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return fecha.toLocaleDateString("es-ES");
}

function TarjetaMetrica({ titulo, valor }) {
  return (
    <article
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 18,
        background: "var(--card-bg, #ffffff)",
      }}
    >
      <div style={{ color: "#6b7280", fontSize: 13 }}>
        {titulo}
      </div>

      <strong style={{ fontSize: 28 }}>
        {valor ?? "—"}
      </strong>
    </article>
  );
}

export default function ApoderaGest() {
  const [tab, setTab] = useState("Dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [encargos, setEncargos] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      setCargando(true);
      setError("");

      try {
        if (tab === "Dashboard") {
          const respuesta = await axios.get(
            "/apoderagest/dashboard"
          );

          if (activo) {
            setDashboard(respuesta.data);
          }
        }

        if (tab === "Encargos") {
          const respuesta = await axios.get(
            "/apoderagest/encargos"
          );

          if (activo) {
            setEncargos(
              Array.isArray(respuesta.data)
                ? respuesta.data
                : []
            );
          }
        }

        if (tab === "Agenda") {
          const respuesta = await axios.get(
            "/apoderagest/agenda"
          );

          if (activo) {
            setAgenda(
              Array.isArray(respuesta.data)
                ? respuesta.data
                : []
            );
          }
        }
      } catch (err) {
        if (activo) {
          setError(
            err?.response?.data?.detail ||
              err.message ||
              "No se han podido cargar los datos."
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, [tab]);

  return (
    <main style={{ padding: 24 }}>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0 }}>ApoderaGest</h1>

        <p style={{ color: "#6b7280" }}>
          Gestión de encargos, agenda y actividad del apoderado.
        </p>
      </header>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 24,
        }}
      >
        {TABS.map((nombre) => (
          <button
            key={nombre}
            type="button"
            onClick={() => setTab(nombre)}
            aria-pressed={tab === nombre}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "10px 16px",
              cursor: "pointer",
              background:
                tab === nombre ? "#1f2937" : "#ffffff",
              color:
                tab === nombre ? "#ffffff" : "#1f2937",
            }}
          >
            {nombre}
          </button>
        ))}
      </nav>

      {cargando && <p>Cargando información…</p>}

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {tab === "Dashboard" && dashboard && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
          }}
        >
          <TarjetaMetrica
            titulo="Total de encargos"
            valor={dashboard.total_encargos}
          />

          <TarjetaMetrica
            titulo="Firmados"
            valor={dashboard.firmados}
          />

          <TarjetaMetrica
            titulo="Pendientes"
            valor={dashboard.pendientes}
          />

          <TarjetaMetrica
            titulo="Días medios hasta firma"
            valor={dashboard.dias_medios_hasta_firma ?? "—"}
          />

          <TarjetaMetrica
            titulo="Firmas presenciales"
            valor={dashboard.firmas_presenciales ?? "Pendiente"}
          />

          <TarjetaMetrica
            titulo="Videoconferencias"
            valor={dashboard.firmas_videoconferencia ?? "Pendiente"}
          />

          <TarjetaMetrica
            titulo="Kilómetros presenciales"
            valor={dashboard.kilometros_presenciales ?? "Pendiente"}
          />
        </section>
      )}

      {tab === "Encargos" && (
        <section style={{ overflowX: "auto" }}>
          <h2>Mis encargos</h2>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {[
                  "Expediente",
                  "Titular",
                  "Estado",
                  "Fecha de alta",
                  "Fecha de firma",
                  "Notario",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderBottom: "1px solid #d1d5db",
                    }}
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {encargos.map((encargo) => (
                <tr key={encargo.id}>
                  <td style={{ padding: 10 }}>
                    {encargo.id_expediente || "—"}
                  </td>

                  <td style={{ padding: 10 }}>
                    {encargo.titular || "—"}
                  </td>

                  <td style={{ padding: 10 }}>
                    {encargo.estado_expediente || "—"}
                  </td>

                  <td style={{ padding: 10 }}>
                    {fechaBonita(encargo.fecha_alta)}
                  </td>

                  <td style={{ padding: 10 }}>
                    {fechaBonita(encargo.fecha_firma)}
                  </td>

                  <td style={{ padding: 10 }}>
                    {encargo.notario || "—"}
                  </td>
                </tr>
              ))}

              {!encargos.length && !cargando && (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: 14 }}
                  >
                    No hay encargos asignados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      {tab === "Agenda" && (
        <section>
          <h2>Mi agenda</h2>

          {!agenda.length && !cargando && (
            <p>No hay citas asociadas a este apoderado.</p>
          )}

          {agenda.map((cita) => (
            <article
              key={cita.id}
              style={{
                padding: 14,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <strong>
                {fechaBonita(cita.fecha)}
                {" · "}
                {String(cita.hora_inicio || "").slice(0, 5)}
              </strong>

              <p style={{ marginBottom: 0 }}>
                {cita.tipo_cita || "Cita"}
              </p>

              {cita.observaciones && (
                <p style={{ color: "#6b7280" }}>
                  {cita.observaciones}
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      {["Mensajes", "Intranet", "CTN"].includes(tab) && (
        <section>
          <h2>{tab}</h2>

          <p>
            Esta sección debe reutilizar el módulo existente
            de ERP-Molsan y mantener sus permisos actuales.
          </p>
        </section>
      )}
    </main>
  );
}
