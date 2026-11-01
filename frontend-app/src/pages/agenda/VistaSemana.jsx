import React, { useMemo, useCallback } from "react";
import { useAgendaStore } from "../../store/agendaStore";
import "../../css/ComponentesCompartidosPremium.css";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HORAS = Array.from(
  { length: 12 },
  (_, i) => `${9 + i}:00`
);

const colorPorTipo = (tipo) => {
  switch (tipo) {
    case "Firma notarial":
      return {
        box: "bg-[var(--erp-primary-soft)] border-[var(--erp-primary)]/30",
        text: "text-[var(--erp-primary)]",
        accent: "bg-[var(--erp-primary)]",
      };

    case "Reunión":
      return {
        box: "bg-emerald-50 border-emerald-200",
        text: "text-emerald-700",
        accent: "bg-emerald-500",
      };

    default:
      return {
        box: "bg-[var(--erp-surface-soft)] border-[var(--erp-border)]",
        text: "text-[var(--erp-text)]",
        accent: "bg-slate-400",
      };
  }
};

export default function VistaSemana({
  fechaBase,
  citas = [],
  onCitaClick,
  onCrearCita,
}) {
  const resaltadaId = useAgendaStore(
    (s) => s.resaltadaId
  );

  const citasSeguras = useMemo(
    () => (Array.isArray(citas) ? citas : []),
    [citas]
  );

  const obtenerFechaDia = useCallback(
    (idx) => {
      const fecha = new Date(`${fechaBase}T12:00:00`);

      fecha.setDate(
        fecha.getDate() + idx
      );

      return fecha.toLocaleDateString("sv-SE");
    },
    [fechaBase]
  );

  const citasPorDiaHora = useMemo(() => {
    const mapa = {};

    citasSeguras.forEach((c) => {
      const fechaCita = new Date(
        `${c.fecha}T12:00:00`
      );

      const diaSemana =
        fechaCita.getDay();

      const idxDia =
        diaSemana - 1;

      if (idxDia < 0 || idxDia > 6) {
        return;
      }

      const hora =
        c.hora_inicio.split(":")[0];

      const clave =
        `${idxDia}-${hora}`;

      if (!mapa[clave]) {
        mapa[clave] = [];
      }

      mapa[clave].push(c);
    });

    return mapa;
  }, [citasSeguras]);

  return (
    <>
      <header className="molsan-page-header agenda-vista-page-header">
        <div className="molsan-page-header__identity">
          <span className="molsan-page-header__mark" aria-hidden="true">AG</span>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · APODERAGEST</p>
            <h1 className="molsan-page-header__title">Agenda · Vista semanal</h1>
            <p className="molsan-page-header__description">Consulta la planificación semanal de citas y firmas.</p>
          </div>
        </div>
      </header>
<div
      className="agenda-vista-premium agenda-vista-semana-premium 
        grid grid-cols-[70px,repeat(7,minmax(0,1fr))]
        gap-1
        text-xs
        bg-[var(--erp-surface)]
        animate-fade-in
      "
    >

      {/* CABECERA */}

      <div />

      {DIAS.map((d) => (
        <div
          key={d}
          className="
            py-3
            text-center
            font-semibold
            text-[var(--erp-text-soft)]
            uppercase
            tracking-wide
            bg-[var(--erp-surface-soft)]
            border border-[var(--erp-border)]
            rounded-lg
          "
        >
          {d}
        </div>
      ))}

      {/* HORAS */}

      {HORAS.map((h) => {
        const horaBloque =
          h.split(":")[0];

        return (
          <React.Fragment key={h}>

            {/* HORA */}

            <div
              className="
                h-20
                flex items-start
                justify-end
                pr-3
                pt-2
                text-[var(--erp-text-soft)]
                font-medium
              "
            >
              {h}
            </div>

            {/* DÍAS */}

            {DIAS.map((_, idx) => {

              const clave =
                `${idx}-${horaBloque}`;

              const citasEnCelda =
                citasPorDiaHora[clave] || [];

              return (
                <div
                  key={`${h}-${idx}`}
                  className="
                    h-20
                    border border-[var(--erp-border)]
                    rounded-lg
                    bg-[var(--erp-surface-soft)]
                    hover:bg-white
                    transition-all duration-200
                    cursor-pointer
                    relative
                  "
                  onDoubleClick={() =>
                    onCrearCita(
                      obtenerFechaDia(idx)
                    )
                  }
                >

                  {citasEnCelda.map((c) => {

                    const colores =
                      colorPorTipo(c.tipo_cita);

                    const resaltada =
                      resaltadaId === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`
                          absolute
                          inset-0
                          m-1
                          p-2
                          rounded-lg
                          border
                          shadow-sm
                          cursor-pointer
                          overflow-hidden
                          ${colores.box}
                          ${colores.text}
                          transition-all duration-200
                          ${
                            resaltada
                              ? "ring-2 ring-amber-400 bg-amber-50"
                              : "hover:shadow-md hover:scale-[1.01]"
                          }
                        `}
                        onClick={() =>
                          onCitaClick(c)
                        }
                      >

                        <span
                          className={`
                            absolute
                            left-0
                            top-0
                            bottom-0
                            w-1
                            ${colores.accent}
                          `}
                        />

                        <div className="font-semibold truncate pl-1">
                          {c.tipo_cita} — {c.hora_inicio}
                        </div>
                        {String(c.tipo_cita || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").includes("firma") ? (() => { const realizada = Boolean(c.firma_realizada) || /FIRMA\s+REALIZADA|FIRMADA/.test(String(c.observaciones || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()); return <div className={`mt-1 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${realizada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{realizada ? "✓ Firma realizada" : "◷ Pendiente de firma"}</div>; })() : null}

                        <div className="truncate text-[var(--erp-text-soft)] pl-1">
                          Notario: {c.notario_nombre || "—"}
                        </div>

                        <div className="truncate text-[var(--erp-text-soft)] pl-1">
                          Firma: {c.tipo_firma}
                        </div>

                        <div className="truncate text-[var(--erp-text-soft)] pl-1">
                          Apoderado: {c.apoderado || "—"}
                        </div>

                      </div>
                    );
                  })}

                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
    </>
  );
}
