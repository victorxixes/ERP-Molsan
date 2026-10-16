import { useState, useEffect, useCallback, useMemo } from "react";
import { useAgendaStore } from "../../store/agendaStore";
import { useAuthStore } from "../../store/authStore";

import axios from "../../api/axios";

import VistaMes from "./VistaMes";
import VistaSemana from "./VistaSemana";
import VistaDia from "./VistaDia";

import ModalNuevaCita from "../../components/agenda/ModalNuevaCita.jsx";
import AgendaToast from "../../components/agenda/AgendaToast.jsx";

import SelectSJ from "../../components/ui/SelectSJ";

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

  const [citasApoderado, setCitasApoderado] = useState([]);
const [cargandoApoderado, setCargandoApoderado] = useState(false);
const [errorApoderado, setErrorApoderado] = useState("");
  
  // ============================================================
  // PERMISOS
  // ============================================================

  const permisosAgenda = useAuthStore((s) => {
    const mod = s.empleado?.permisos_modulo;

    if (!mod) return [];
    if (!Array.isArray(mod.agenda)) return [];

    return mod.agenda;
  });

  const puedeCrear = !soloApoderado && permisosAgenda.includes("crear");
  const puedeEditar = !soloApoderado && permisosAgenda.includes("editar");
  const puedeEliminar = !soloApoderado && permisosAgenda.includes("eliminar");

  const puedeVer =
    permisosAgenda.includes("ver") ||
    permisosAgenda.includes("editar") ||
    permisosAgenda.includes("crear") ||
    permisosAgenda.includes("eliminar");

  // ============================================================
  // MODAL
  // ============================================================

  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalModo, setModalModo] = useState("crear");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);

  // ============================================================
  // CARGAR MES
  // ============================================================

  useEffect(() => {
  if (!soloApoderado) {
    cargarMes(year, month);
    return undefined;
  }

  let activo = true;

  setCargandoApoderado(true);
  setErrorApoderado("");

  axios
    .get("/apoderagest/agenda")
    .then((respuesta) => {
      if (!activo) return;

      const datos = respuesta?.data;

      const listado = Array.isArray(datos)
        ? datos
        : Array.isArray(datos?.items)
          ? datos.items
          : Array.isArray(datos?.resultados)
            ? datos.resultados
            : [];

      setCitasApoderado(listado);
    })
    .catch((err) => {
      if (!activo) return;

      setCitasApoderado([]);
      setErrorApoderado(
        err?.response?.data?.detail ||
          "No se ha podido cargar tu agenda personal."
      );
    })
    .finally(() => {
      if (activo) setCargandoApoderado(false);
    });

  return () => {
    activo = false;
  };
}, [soloApoderado, year, month, cargarMes]);

    // ============================================================
  // SELECCIÓN DE DÍA Y APERTURA DE CITA
  // ============================================================

  const handleDiaClick = useCallback(
    (fecha) => {
      if (soloApoderado) {
        return;
      }

      abrirCrear(fecha);
    },
    [soloApoderado, abrirCrear]
  );

  const handleCitaClick = useCallback(
    (cita) => {
      abrirEditar(cita);
    },
    [abrirEditar]
  );
  
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
        const res = await fetch(
          `https://agenda-intranet-b.onrender.com/api/agenda/${cita.id}`
        );

        const citaCompleta = await res.json();

        setModalModo(puedeEditar ? "editar" : "ver");
        setFechaSeleccionada(citaCompleta.fecha);
        setCitaSeleccionada(citaCompleta);
        setMostrarModal(true);
      } catch (err) {
        console.error("Error cargando cita completa:", err);
        notify("Error al cargar la cita.");
      }
    },
    [puedeEditar, notify]
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
        notify("Error al guardar la cita.");
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
    if (!citaSeleccionada) return;

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
      notify("Error al eliminar la cita.");
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
  // NAVEGACIÓN
  // ============================================================

  const mesAnterior = useCallback(() => {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1);
        return 12;
      }

      return m - 1;
    });
  }, []);

  const mesSiguiente = useCallback(() => {
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1);
        return 1;
      }

      return m + 1;
    });
  }, []);

  // ============================================================
  // CITAS SEGURAS
  // ============================================================

const citasSeguras = useMemo(() => {
  const fuente = soloApoderado ? citasApoderado : citas;
  const lista = Array.isArray(fuente) ? fuente : [];

  if (!soloApoderado) return lista;

  const mesSeleccionado =
    `${year}-${String(month).padStart(2, "0")}`;

  return lista.filter(
    (cita) =>
      String(cita.fecha ?? "").slice(0, 7) === mesSeleccionado
  );
}, [citas, citasApoderado, soloApoderado, year, month]);

  // ============================================================
  // FECHA ACTUAL
  // ============================================================

  const esMesActual =
    year === hoy.getFullYear() &&
    month === hoy.getMonth() + 1;

  return (
    <div className="space-y-5 p-6 text-[var(--erp-text)] animate-fade-in">

   
      {/* ======================================================
          NAVEGACIÓN
          ====================================================== */}

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
          >
            ←
          </button>

          <SelectSJ
            value={year}
            onChange={(v) => setYear(parseInt(v))}
            options={Array.from({ length: 10 }, (_, i) => {
              const y = hoy.getFullYear() - 5 + i;

              return {
                value: y,
                label: y,
              };
            })}
            className="w-32"
          />

          <SelectSJ
            value={month}
            onChange={(v) => setMonth(parseInt(v))}
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

          {/* VISTAS */}

          <div
            className="
              ml-auto flex items-center gap-1
              p-1 rounded-xl
              bg-[var(--erp-surface-soft)]
              border border-[var(--erp-border)]
            "
          >
            {["mes", "semana", "dia"].map((v) => {
              const activo = vista === v;

              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVista(v)}
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
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ======================================================
          CALENDARIO
          ====================================================== */}

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
            fechaDia={new Date()}
            citas={citasSeguras}
            onCitaClick={handleCitaClick}
            onCrearCita={handleDiaClick}
          />
        )}
      </div>

      {/* ======================================================
          MODAL
          ====================================================== */}

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

      <AgendaToast />
    </div>
  );
}
