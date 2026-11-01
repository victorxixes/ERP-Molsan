import { useMemo, useCallback } from "react";
import { useAgendaStore } from "../../store/agendaStore";
import "../../css/ComponentesCompartidosPremium.css";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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

function generarMatriz(fechaBase) {
  const f = new Date(fechaBase);

  if (isNaN(f.getTime())) return [[]];

  const year = f.getFullYear();
  const month = f.getMonth();

  const firstDay = new Date(year, month, 1);

  const start =
    firstDay.getDay() === 0
      ? 6
      : firstDay.getDay() - 1;

  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < start; i++) {
    cells.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  const weeks = [];

  for (let i = 0; i < cells.length; i += 7) {
    const semanaCompleta = cells.slice(i, i + 7);

    weeks.push(semanaCompleta);
  }

  return weeks;
}

export default function VistaMes({
  year,
  month,
  citas,
  onDiaClick,
  onCitaClick,
}) {
  const resaltadaId = useAgendaStore(
    (s) => s.resaltadaId
  );

  const fechaBase = useMemo(
    () =>
      `${year}-${String(month).padStart(2, "0")}-01`,
    [year, month]
  );

  const matrix = useMemo(
    () => generarMatriz(fechaBase),
    [fechaBase]
  );

  const citasSeguras = useMemo(
    () => (Array.isArray(citas) ? citas : []),
    [citas]
  );

  const obtenerCitasDia = useCallback(
    (fechaStr) =>
      citasSeguras.filter(
        (c) =>
          (c.fecha || "").slice(0, 10) === fechaStr
      ),
    [citasSeguras]
  );

  const hoyStr = new Date().toLocaleDateString("sv-SE");

  return (
    <>
      <header className="molsan-page-header agenda-vista-page-header">
        <div className="molsan-page-header__identity">
          <span className="molsan-page-header__mark" aria-hidden="true">AG</span>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · APODERAGEST</p>
            <h1 className="molsan-page-header__title">Agenda · Vista mensual</h1>
            <p className="molsan-page-header__description">Consulta la actividad mensual y la distribución de citas.</p>
          </div>
        </div>
      </header>
<div className="agenda-vista-premium agenda-vista-mes-premium text-xs text-[var(--erp-text)] animate-fade-in">

      {/* CABECERA DÍAS */}

      <div
        className="grid grid-cols-7 gap-2 mb-2"
      >
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="
              py-3
              text-center
              font-semibold
              text-[var(--erp-text-soft)]
              uppercase
              tracking-wide
              rounded-xl
              border border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
            "
          >
            {d}
          </div>
        ))}
      </div>

      {/* CALENDARIO */}

      <div className="grid grid-cols-7 gap-2">

        {matrix.map((week, wi) =>
          week.map((day, di) => {

            if (!day) {
              return (
                <div
                  key={`${wi}-${di}`}
                  className="
                    min-h-32
                    rounded-xl
                    bg-slate-50/70
                    border border-[var(--erp-border)]
                  "
                />
              );
            }

            const fechaStr =
              day.toLocaleDateString("sv-SE");

            const citasDia =
              obtenerCitasDia(fechaStr);

            const esHoy =
              fechaStr === hoyStr;

            return (
              <div
                key={`${wi}-${di}`}
                className={`
                  min-h-32
                  rounded-xl
                  border
                  p-2
                  flex flex-col
                  cursor-pointer
                  transition-all duration-200
                  ${
                    esHoy
                      ? "border-[var(--erp-primary)] bg-[var(--erp-primary-soft)]/40 shadow-sm"
                      : "border-[var(--erp-border)] bg-[var(--erp-surface)] hover:bg-[var(--erp-surface-soft)] hover:shadow-sm"
                  }
                `}
                onClick={() =>
                  onDiaClick(fechaStr)
                }
              >

                {/* DÍA */}

                <div className="flex items-center justify-between mb-1">

                  <span
                    className={`
                      text-[11px]
                      font-semibold
                      ${
                        esHoy
                          ? "text-[var(--erp-primary)]"
                          : "text-[var(--erp-text-soft)]"
                      }
                    `}
                  >
                    {esHoy ? "HOY" : ""}
                  </span>

                  <div
                    className={`
                      w-7 h-7
                      flex items-center justify-center
                      rounded-full
                      text-xs
                      font-semibold
                      ${
                        esHoy
                          ? "bg-[var(--erp-primary)] text-white"
                          : "text-[var(--erp-text)]"
                      }
                    `}
                  >
                    {day.getDate()}
                  </div>

                </div>

                {/* CITAS */}

                <div
                  className="
                    mt-1
                    space-y-1
                    overflow-y-auto
                    max-h-24
                    pr-1
                  "
                >
                  {citasDia.map((c) => {

                    const colores =
                      colorPorTipo(c.tipo_cita);

                    const resaltada =
                      resaltadaId === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`
                          relative
                          text-[11px]
                          px-2
                          py-1.5
                          rounded-lg
                          border
                          truncate
                          ${colores.box}
                          ${colores.text}
                          shadow-sm
                          transition-all duration-200
                          ${
                            resaltada
                              ? "ring-2 ring-amber-400 bg-amber-50"
                              : "hover:shadow-md hover:-translate-y-[1px]"
                          }
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCitaClick(c);
                        }}
                      >

                        <span
                          className={`
                            absolute
                            left-0
                            top-0
                            bottom-0
                            w-1
                            rounded-l-lg
                            ${colores.accent}
                          `}
                        />

                        <div className="font-semibold truncate pl-1">
                          {c.tipo_cita} — {c.hora_inicio} →{" "}
                          {c.hora_fin}
                        </div>
                        {String(c.tipo_cita || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").includes("firma") ? (() => { const realizada = Boolean(c.firma_realizada) || /FIRMA\s+REALIZADA|FIRMADA/.test(String(c.observaciones || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()); return <div className={`mt-1 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${realizada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{realizada ? "✓ Firma realizada" : "◷ Pendiente de firma"}</div>; })() : null}

                        <div className="truncate text-[var(--erp-text-soft)] pl-1">
                          Notario: {c.notario_nombre || "—"}
                        </div>

                        <div className="truncate text-[var(--erp-text-soft)] pl-1">
                          Firma: {c.tipo_firma}
                        </div>

                        <div className="truncate text-[var(--erp-text-soft)] pl-1">
                          Apoderado: {c.apoderado_nombre || "—"}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

      </div>
    </div>
    </>
  );
}
