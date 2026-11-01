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
  const [fechaAncla, setFechaAncla] = useState(hoy.toLocaleDateString("sv-SE"));
  const [busqueda, setBusqueda] = useState("");
  const [modalidadFiltro, setModalidadFiltro] = useState("todas");

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

  useEffect(() => {
    setFechaAncla((actual) => {
      const prefijo = `${year}-${String(month).padStart(2, "0")}`;
      return String(actual || "").slice(0, 7) === prefijo ? actual : `${prefijo}-01`;
    });
  }, [year, month]);

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
        console.error("No se pudo cargar el detalle de la cita.");

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
      const fechaTexto = typeof fecha === "string" ? fecha.slice(0, 10) : fecha?.toLocaleDateString("sv-SE");
      if (fechaTexto) setFechaAncla(fechaTexto);
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
        console.error("No se pudo guardar la cita.");

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
      console.error("No se pudo eliminar la cita.");

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

  // Resumen y filtros derivados de las citas ya cargadas; no añade llamadas al backend.
  const hoyISO = hoy.toLocaleDateString("sv-SE");
  const normalizarTexto = (valor) => String(valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const modalidadCita = (cita) => {
    const tipo = normalizarTexto(cita?.tipo_firma);
    if (tipo.includes("video") || tipo === "vc" || tipo === "si") return "videoconferencia";
    if (tipo.includes("presencial") || tipo === "p") return "presencial";
    return "sin-especificar";
  };
  const citasDelPeriodo = useMemo(() => {
    const prefijo = `${year}-${String(month).padStart(2, "0")}`;
    return (Array.isArray(citasSeguras) ? citasSeguras : []).filter((cita) => String(cita.fecha || "").slice(0, 7) === prefijo);
  }, [citasSeguras, year, month]);
  const citasFiltradas = useMemo(() => {
    const q = normalizarTexto(busqueda.trim());
    return citasDelPeriodo.filter((cita) => {
      const modalidad = modalidadCita(cita);
      const coincideModalidad = modalidadFiltro === "todas" || modalidad === modalidadFiltro;
      const texto = normalizarTexto([cita.tipo_cita, cita.tipo_firma, cita.notario_nombre, cita.notario, cita.apoderado_nombre, cita.apoderado, cita.observaciones, cita.expediente, cita.id_expediente].join(" "));
      return coincideModalidad && (!q || texto.includes(q));
    }).sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")) || String(a.hora_inicio || "").localeCompare(String(b.hora_inicio || "")));
  }, [citasDelPeriodo, busqueda, modalidadFiltro]);
  const citasPorRealizar = citasDelPeriodo.filter((cita) => String(cita.fecha || "").slice(0, 10) >= hoyISO && !(Boolean(cita.firma_realizada) && normalizarTexto(cita.tipo_cita).includes("firma"))).length;
  const citasPresenciales = citasDelPeriodo.filter((cita) => modalidadCita(cita) === "presencial").length;
  const citasVideoconferencia = citasDelPeriodo.filter((cita) => modalidadCita(cita) === "videoconferencia").length;

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
    <div className="molsan-page-stack agenda-premium-page text-[var(--erp-text)] animate-fade-in">
      <header className="molsan-page-header agenda-page-header">
        <div className="molsan-page-header__identity">
          <span className="molsan-page-header__mark" aria-hidden="true">AG</span>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · APODERAGEST</p>
            <h1 className="molsan-page-header__title">Agenda</h1>
            <p className="molsan-page-header__description">Consulta y organiza las citas, firmas y actividad del calendario.</p>
          </div>
        </div>
      </header>
      {/* NAVEGACIÓN Y FILTROS */}

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

          <button type="button" className="agenda-today-action" onClick={() => {
            const actual = new Date();
            setYear(actual.getFullYear());
            setMonth(actual.getMonth() + 1);
            setFechaAncla(actual.toLocaleDateString("sv-SE"));
          }}>Hoy</button>

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
                  aria-pressed={activo}
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

      {/* INDICADORES DEL PERÍODO */}
      <section className="agenda-resumen-grid" aria-label="Resumen de citas del mes">
        <article className="erp-card agenda-stat-card"><span className="agenda-stat-icon agenda-stat-icon-blue">▦</span><div><span className="agenda-stat-label">Citas del mes</span><strong>{citasDelPeriodo.length}</strong><small>{MESES[month - 1]} de {year}</small></div></article>
        <article className="erp-card agenda-stat-card"><span className="agenda-stat-icon agenda-stat-icon-amber">◷</span><div><span className="agenda-stat-label">Por realizar</span><strong>{citasPorRealizar}</strong><small>Hoy y fechas futuras</small></div></article>
        <article className="erp-card agenda-stat-card"><span className="agenda-stat-icon agenda-stat-icon-green">⌖</span><div><span className="agenda-stat-label">Presenciales</span><strong>{citasPresenciales}</strong><small>Según tipo de firma</small></div></article>
        <article className="erp-card agenda-stat-card"><span className="agenda-stat-icon agenda-stat-icon-purple">▣</span><div><span className="agenda-stat-label">Videoconferencias</span><strong>{citasVideoconferencia}</strong><small>Según tipo de firma</small></div></article>
      </section>

      {/* FILTROS Y CALENDARIO */}
      <div className="erp-card p-4 shadow-sm agenda-calendar-card">
        <div className="agenda-filters">
          <label className="agenda-search"><span aria-hidden="true">⌕</span><input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cita, notario, apoderado…" aria-label="Buscar citas" /></label>
          <div className="agenda-filter-buttons" aria-label="Filtrar por modalidad">{[["todas", "Todas"], ["presencial", "Presencial"], ["videoconferencia", "Videoconferencia"]].map(([valor, etiqueta]) => <button key={valor} type="button" aria-pressed={modalidadFiltro === valor} onClick={() => setModalidadFiltro(valor)}>{etiqueta}</button>)}</div>
          {(busqueda || modalidadFiltro !== "todas") && <button type="button" className="agenda-clear-filters" onClick={() => { setBusqueda(""); setModalidadFiltro("todas"); }}>Limpiar filtros</button>}
        </div>
        <div className="agenda-calendar-scroll">
        {vista === "mes" && (
          <VistaMes
            year={year}
            month={month}
            citas={citasFiltradas}
            onDiaClick={handleDiaClick}
            onCitaClick={handleCitaClick}
          />
        )}

        {vista === "semana" && (
          <VistaSemana
            fechaBase={(() => { const [ay, am, ad] = String(fechaAncla).split("-").map(Number); const inicio = new Date(ay, am - 1, ad); inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7)); return inicio.toLocaleDateString("sv-SE"); })()}
            citas={citasFiltradas}
            onCitaClick={handleCitaClick}
            onCrearCita={handleDiaClick}
          />
        )}

        {vista === "dia" && (
          <VistaDia
            fechaDia={new Date(`${fechaAncla}T12:00:00`)}
            citas={citasFiltradas}
            onCitaClick={handleCitaClick}
            onCrearCita={handleDiaClick}
          />
        )}
      </div>

        </div>

      <section className="erp-card agenda-upcoming-card">
        <div className="agenda-list-heading"><div><h2>Citas del período</h2><p>{citasFiltradas.length} {citasFiltradas.length === 1 ? "cita visible" : "citas visibles"} · selecciona una para abrir su ficha</p></div></div>
        {citasFiltradas.length ? <div className="agenda-list-table-wrap"><table className="agenda-list-table"><thead><tr><th>Fecha y hora</th><th>Cita</th><th>Modalidad</th><th>Notario / responsable</th><th>Estado</th><th></th></tr></thead><tbody>{citasFiltradas.map((cita) => {
          const firma = normalizarTexto(cita.tipo_cita).includes("firma");
          const realizada = firma && (Boolean(cita.firma_realizada) || /FIRMA\s+REALIZADA|FIRMADA/.test(normalizarTexto(cita.observaciones).toUpperCase()));
          const fecha = String(cita.fecha || "").slice(0, 10);
          const anterior = fecha < hoyISO && !realizada;
          const modalidad = modalidadCita(cita);
          return <tr key={cita.id}><td><strong>{fechaTexto(cita.fecha)}</strong><small>{horaTexto(cita.hora_inicio)} – {horaTexto(cita.hora_fin)}</small></td><td><strong>{cita.tipo_cita || "Cita"}</strong>{cita.observaciones ? <small>{cita.observaciones}</small> : null}</td><td><span className={`agenda-modality-pill ${modalidad === "videoconferencia" ? "is-video" : modalidad === "presencial" ? "is-presencial" : ""}`}>{modalidad === "videoconferencia" ? "Videoconferencia" : modalidad === "presencial" ? "Presencial" : cita.tipo_firma || "Sin especificar"}</span></td><td>{cita.notario_nombre || cita.apoderado_nombre || cita.apoderado || "—"}</td><td><span className={`agenda-status-pill ${realizada ? "is-done" : anterior ? "is-past" : "is-pending"}`}>{realizada ? "Firma realizada" : anterior ? "Fecha pasada · revisar" : "Programada"}</span></td><td><button type="button" className="agenda-open-cita" onClick={() => handleCitaClick(cita)}>Abrir</button></td></tr>;
        })}</tbody></table></div> : <div className="agenda-empty-state"><span>▦</span><strong>No hay citas para mostrar</strong><p>Prueba con otra búsqueda o cambia el filtro de modalidad.</p></div>}
      </section>

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
