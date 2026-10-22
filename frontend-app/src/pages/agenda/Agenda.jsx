import { useState, useEffect, useCallback, useMemo } from "react";
import { useAgendaWS } from "../../hooks/useAgendaWS";
import { useAgendaStore } from "../../store/agendaStore";
import { useAuthStore } from "../../store/authStore";
import axios from "../../api/axios";

import VistaMes from "./VistaMes";
import VistaSemana from "./VistaSemana";
import VistaDia from "./VistaDia";

import ModalNuevaCita from "../../components/agenda/ModalNuevaCita.jsx";
import AgendaToast from "../../components/agenda/AgendaToast.jsx";
import SelectSJ from "../../components/ui/SelectSJ";
import "./Agenda.css";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function Agenda({ soloApoderado = false } = {}) {
  const hoy = useMemo(() => new Date(), []);

  // Conectar al canal común de actualizaciones de la agenda.
  useAgendaWS();

  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth() + 1);
  const [vista, setVista] = useState("mes");

  const {
    citas,
    cargarMes,
    crear,
    editar,
    eliminar,
    marcarResaltada,
    notify,
  } = useAgendaStore();

  // ============================================================
  // PERMISOS
  // ============================================================

  const permisosAgenda = useAuthStore((s) => {
    const mod = s.empleado?.permisos_modulo;

    if (!mod || !Array.isArray(mod.agenda)) {
      return [];
    }

    return mod.agenda;
  });

  const puedeCrear = permisosAgenda.includes("crear");
  const puedeEditar = permisosAgenda.includes("editar");
  const puedeEliminar = permisosAgenda.includes("eliminar");

  // ============================================================
  // MODAL
  // ============================================================

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalModo, setModalModo] = useState("crear");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [citasApoderado, setCitasApoderado] = useState([]);

  // ============================================================
  // CARGAR AGENDA COMPARTIDA
  // ============================================================

  useEffect(() => {
    cargarMes(year, month);
  }, [year, month, cargarMes]);

  // En ApoderaGest, obtener las citas desde el endpoint autenticado del apoderado.
  // Evita depender del filtrado local de la agenda compartida, que puede ocultar
  // citas históricas asignadas por nombre o con identificadores incompletos.
  useEffect(() => {
    if (!soloApoderado) {
      setCitasApoderado([]);
      return undefined;
    }

    let cancelado = false;
    const cargarCitasApoderado = async () => {
      try {
        const respuesta = await axios.get("/apoderagest/agenda");
        if (cancelado) return;
        const lista = Array.isArray(respuesta?.data) ? respuesta.data : [];
        setCitasApoderado(lista.map((cita) => ({
          ...cita,
          apoderado_nombre: cita.apoderado_nombre || cita.apoderado || "",
          notario_nombre: cita.nombre_notario || cita.notario_nombre || "",
        })));
      } catch (error) {
        if (cancelado) return;
        setCitasApoderado([]);
        notify(error?.response?.data?.detail || "No se ha podido cargar la agenda del apoderado.");
      }
    };

    cargarCitasApoderado();
    return () => { cancelado = true; };
  }, [soloApoderado, year, month, notify]);

  // ApoderaGest puede confirmar una firma real fuera del modal de Agenda.
  // Recargar el mes visible para actualizar el indicador pendiente/realizada.
  useEffect(() => {
    const refrescarTrasFirma = () => cargarMes(year, month);
    window.addEventListener("apoderagest:firma-registrada", refrescarTrasFirma);
    return () => window.removeEventListener("apoderagest:firma-registrada", refrescarTrasFirma);
  }, [year, month, cargarMes]);

  // ============================================================
  // CREAR CITA
  // ============================================================

  const abrirCrear = useCallback(
    (fecha) => {
      if (!puedeCrear) {
        notify("No tienes permiso para crear citas.");
        return;
      }

      setModalModo("crear");
      setFechaSeleccionada(fecha);
      setCitaSeleccionada(null);
      setMostrarModal(true);
    },
    [puedeCrear, notify]
  );

  // ============================================================
  // ABRIR CITA
  // ============================================================

  const abrirEditar = useCallback(
    async (cita) => {
      try {
        if (!cita?.id) {
          notify("No se ha podido identificar la cita.");
          return;
        }

        // Se construye la URL mediante concatenación para evitar
        // problemas con la interpolación de la plantilla.
        const respuesta = await axios.get(
          "/agenda/" + encodeURIComponent(cita.id)
        );

        const citaCompleta = respuesta?.data;

        if (!citaCompleta) {
          notify("No se ha encontrado la cita.");
          return;
        }

        // Si no tiene permiso de edición, abre la cita en consulta.
        const modo = puedeEditar ? "editar" : "ver";

        setModalModo(modo);
        setFechaSeleccionada(citaCompleta.fecha || cita.fecha);
        setCitaSeleccionada(citaCompleta);
        setMostrarModal(true);
      } catch (err) {
        console.error("Error cargando cita completa:", err);

        notify(
          err?.response?.data?.detail ||
            "Error al cargar la cita."
        );
      }
    },
    [puedeEditar, notify]
  );

  // ============================================================
  // SELECCIÓN DE DÍA Y CITA
  // ============================================================

  const handleDiaClick = useCallback(
    (fecha) => {
      abrirCrear(fecha);
    },
    [abrirCrear]
  );

  const handleCitaClick = useCallback(
    (cita) => {
      abrirEditar(cita);
    },
    [abrirEditar]
  );

  // ============================================================
  // GUARDAR CITA
  // ============================================================

  const guardarCita = useCallback(
    async (payload) => {
      try {
        if (modalModo === "crear") {
          if (!puedeCrear) {
            notify("No tienes permiso para crear citas.");
            return;
          }

          const creada = await crear(payload, year, month);

          if (creada?.id) {
            marcarResaltada(creada.id);
            notify("Cita creada correctamente.");
          }
        } else if (modalModo === "editar" && citaSeleccionada) {
          if (!puedeEditar) {
            notify("No tienes permiso para editar citas.");
            return;
          }

          const editada = await editar(
            citaSeleccionada.id,
            payload,
            year,
            month
          );

          if (editada?.id) {
            marcarResaltada(editada.id);
            notify("Cita actualizada correctamente.");
          }
        } else if (modalModo === "ver") {
          setMostrarModal(false);
          return;
        }

        setMostrarModal(false);
      } catch (err) {
        console.error("ERROR AL GUARDAR CITA:", err);

        notify(
          err?.response?.data?.detail ||
            "Error al guardar la cita."
        );
      }
    },
    [
      modalModo,
      citaSeleccionada,
      crear,
      editar,
      marcarResaltada,
      notify,
      year,
      month,
      puedeCrear,
      puedeEditar,
    ]
  );

  // ============================================================
  // ELIMINAR CITA
  // ============================================================

  const borrarCita = useCallback(async () => {
    if (!citaSeleccionada) {
      return;
    }

    if (!puedeEliminar) {
      notify("No tienes permiso para eliminar citas.");
      return;
    }

    try {
      await eliminar(citaSeleccionada.id, year, month);

      notify("Cita eliminada.");
      setMostrarModal(false);
    } catch (err) {
      console.error("ERROR AL ELIMINAR CITA:", err);

      notify(
        err?.response?.data?.detail ||
          "Error al eliminar la cita."
      );
    }
  }, [
    citaSeleccionada,
    eliminar,
    notify,
    year,
    month,
    puedeEliminar,
  ]);

  // ============================================================
  // NAVEGACIÓN ENTRE MESES
  // ============================================================

  const mesAnterior = useCallback(() => {
    if (month === 1) {
      setYear((actual) => actual - 1);
      setMonth(12);
      return;
    }

    setMonth((actual) => actual - 1);
  }, [month]);

  const mesSiguiente = useCallback(() => {
    if (month === 12) {
      setYear((actual) => actual + 1);
      setMonth(1);
      return;
    }

    setMonth((actual) => actual + 1);
  }, [month]);

  // En modo ApoderaGest se usa la lista filtrada por el backend para el usuario
  // autenticado. La Agenda interna sigue utilizando el almacén compartido.
  const citasSeguras = useMemo(() => {
    if (!soloApoderado) {
      return Array.isArray(citas) ? citas : [];
    }

    const prefijoMes = `${year}-${String(month).padStart(2, "0")}`;
    return (Array.isArray(citasApoderado) ? citasApoderado : []).filter((cita) =>
      String(cita.fecha ?? "").slice(0, 7) === prefijoMes
    );
  }, [citas, citasApoderado, soloApoderado, year, month]);

  // ============================================================
  // FECHA ACTUAL
  // ============================================================

  const esMesActual =
    year === hoy.getFullYear() &&
    month === hoy.getMonth() + 1;

  const imprimirAgenda = () => {
    document.body.classList.add("molsan-print-agenda");
    const limpiar = () => { document.body.classList.remove("molsan-print-agenda"); window.removeEventListener("afterprint", limpiar); };
    window.addEventListener("afterprint", limpiar);
    window.print();
  };
  const fechaTexto = (valor) => {
    if (!valor) return "—";
    const fecha = new Date(String(valor).slice(0, 10) + "T12:00:00");
    return Number.isNaN(fecha.getTime()) ? String(valor) : fecha.toLocaleDateString("es-ES");
  };
  const horaTexto = (valor) => valor ? String(valor).slice(0, 5) : "—";
  const fechaDiaAgenda = new Date(year, month - 1, Math.min(hoy.getDate(), new Date(year, month, 0).getDate()));
  const inicioSemanaImpresion = new Date(year, month - 1, 1);
  inicioSemanaImpresion.setDate(inicioSemanaImpresion.getDate() - ((inicioSemanaImpresion.getDay() + 6) % 7));
  const finSemanaImpresion = new Date(inicioSemanaImpresion); finSemanaImpresion.setDate(finSemanaImpresion.getDate() + 7);
  const citasImpresion = (Array.isArray(citasSeguras) ? citasSeguras : []).filter((cita) => {
    const fecha = String(cita.fecha || "").slice(0, 10);
    if (vista === "mes") return fecha.startsWith(String(year) + "-" + String(month).padStart(2, "0"));
    if (vista === "dia") return fecha === fechaDiaAgenda.toLocaleDateString("sv-SE");
    const fechaCita = new Date(fecha + "T12:00:00"); return fechaCita >= inicioSemanaImpresion && fechaCita < finSemanaImpresion;
  }).sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")) || String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")));
  const tituloImpresion = vista === "mes" ? "Agenda de " + MESES[month - 1] + " de " + year : vista === "semana" ? "Agenda semanal · " + fechaTexto(inicioSemanaImpresion.toLocaleDateString("sv-SE")) + " – " + fechaTexto(new Date(finSemanaImpresion.getTime() - 86400000).toLocaleDateString("sv-SE")) : "Agenda del día · " + fechaTexto(fechaDiaAgenda.toLocaleDateString("sv-SE"));
  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="agenda-premium-page space-y-5 p-6 text-[var(--erp-text)] animate-fade-in">
      {/* CABECERA Y NAVEGACIÓN */}

      <div className="erp-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={mesAnterior}
            className="
              w-10 h-10 rounded-xl
              border border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              text-[var(--erp-text)]
              hover:bg-[var(--erp-primary-soft)]
              hover:text-[var(--erp-primary)]
              transition
              font-semibold
            "
            title="Mes anterior"
            aria-label="Mes anterior"
          >
            ←
          </button>

          <SelectSJ
            value={year}
            onChange={(valor) => setYear(parseInt(valor, 10))}
            options={Array.from({ length: 10 }, (_, i) => {
              const anio = hoy.getFullYear() - 5 + i;

              return {
                value: anio,
                label: anio,
              };
            })}
            className="w-32"
          />

          <SelectSJ
            value={month}
            onChange={(valor) => setMonth(parseInt(valor, 10))}
            options={MESES.map((nombre, index) => ({
              value: index + 1,
              label: nombre,
            }))}
            className="w-40"
          />

          <button
            type="button"
            onClick={mesSiguiente}
            className="
              w-10 h-10 rounded-xl
              border border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
              text-[var(--erp-text)]
              hover:bg-[var(--erp-primary-soft)]
              hover:text-[var(--erp-primary)]
              transition
              font-semibold
            "
            title="Mes siguiente"
            aria-label="Mes siguiente"
          >
            →
          </button>

          {esMesActual && (
            <span
              className="
                hidden sm:inline-flex
                px-3 py-1.5 rounded-full
                text-xs font-semibold
                bg-[var(--erp-primary-soft)]
                text-[var(--erp-primary)]
              "
            >
              Mes actual
            </span>
          )}

          {soloApoderado ? <button type="button" onClick={imprimirAgenda} className="ag-print-action" title="Imprimir la vista actual de la agenda">⎙ Imprimir agenda</button> : null}

          {/* SELECTOR DE VISTA */}

          <div
            className="
              ml-auto flex items-center gap-1
              p-1 rounded-xl
              bg-[var(--erp-surface-soft)]
              border border-[var(--erp-border)]
            "
          >
            {["mes", "semana", "dia"].map((opcion) => {
              const activo = vista === opcion;

              return (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setVista(opcion)}
                  className={`
                    px-4 py-2 rounded-lg
                    text-sm font-medium
                    transition-all duration-200
                    ${
                      activo
                        ? "bg-[var(--erp-primary)] text-white shadow-sm"
                        : "text-[var(--erp-text-soft)] hover:text-[var(--erp-text)] hover:bg-white"
                    }
                  `}
                >
                  {opcion.charAt(0).toUpperCase() + opcion.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CALENDARIO */}

      <div className="erp-card p-4 shadow-sm overflow-hidden">
        {vista === "mes" && (
          <VistaMes
            year={year}
            month={month}
            citas={citasSeguras}
            onDiaClick={handleDiaClick}
            onCitaClick={handleCitaClick}
          />
        )}

        {vista === "semana" && (
          <VistaSemana
            fechaBase={`${year}-${String(month).padStart(2, "0")}-01`}
            citas={citasSeguras}
            onCitaClick={handleCitaClick}
            onCrearCita={handleDiaClick}
          />
        )}

        {vista === "dia" && (
          <VistaDia
            fechaDia={new Date(year, month - 1, hoy.getDate())}
            citas={citasSeguras}
            onCitaClick={handleCitaClick}
            onCrearCita={handleDiaClick}
          />
        )}
      </div>

      {/* MODAL DE CITA */}

      {mostrarModal && (
        <ModalNuevaCita
          fecha={fechaSeleccionada}
          modo={modalModo}
          cita={citaSeleccionada}
          onClose={() => setMostrarModal(false)}
          onGuardar={guardarCita}
          onDelete={
            modalModo === "editar" && puedeEliminar
              ? borrarCita
              : null
          }
        />
      )}

      {soloApoderado ? (
        <section className="ag-print-root ag-agenda-print-root" aria-hidden="true">
          <header className="ag-print-header"><strong>MOLSAN ERP · APODERAGEST</strong><h1>{tituloImpresion}</h1><p>{citasImpresion.length} {citasImpresion.length === 1 ? "cita" : "citas"}</p></header>
          {citasImpresion.length ? <table className="ag-print-table"><thead><tr><th>Fecha</th><th>Horario</th><th>Expediente / cita</th><th>Notario</th><th>Tipo de firma</th><th>Estado</th></tr></thead><tbody>{citasImpresion.map((cita, index) => <tr key={cita.id || String(cita.fecha) + "-" + index}><td>{fechaTexto(cita.fecha)}</td><td>{horaTexto(cita.hora_inicio)}{cita.hora_fin ? " – " + horaTexto(cita.hora_fin) : ""}</td><td>{cita.expediente || cita.id_expediente || cita.titulo || cita.tipo_cita || "Cita"}{cita.observaciones ? <small>{cita.observaciones}</small> : null}</td><td>{cita.notario_nombre || cita.nombre_notario || cita.notario || "—"}</td><td>{cita.tipo_firma || cita.tipo_cita || "—"}</td><td>{cita.firma_realizada ? "Firmada" : "Pendiente"}</td></tr>)}</tbody></table> : <p>No hay citas en este período.</p>}
          <footer className="ag-print-footer">Documento generado desde ApoderaGest · {new Date().toLocaleString("es-ES")}</footer>
        </section>
      ) : null}
      <AgendaToast />
    </div>
  );
}
