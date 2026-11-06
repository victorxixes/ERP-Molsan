import { useMemo, useCallback } from "react";
import { useAgendaStore } from "../../store/agendaStore";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

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
    <div>

      {/* CABECERA DÍAS */}

      <div
        className="agenda-weekday-grid grid grid-cols-7 gap-2 mb-2"
      >
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            className="agenda-weekday py-3 uppercase"
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
                  className="min-h-32"
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
                aria-current={esHoy ? "date" : undefined}
                className={`agenda-month-day min-h-32 p-2 flex flex-col
 
 
 ${
 esHoy
 ? ""
 : ""
 }`}
                onClick={() =>
                  onDiaClick(fechaStr)
                }
              >

                {/* DÍA */}

                <div className="flex items-center justify-between mb-1">

                  <span
                    className={`${
 esHoy
 ? ""
 : ""
 }`}
                  >
                    {esHoy ? "HOY" : ""}
                  </span>

                  <div
                    className={`w-7 h-7
 flex items-center justify-center
 
 
 
 ${
 esHoy
 ? ""
 : ""
 }`}
                  >
                    {day.getDate()}
                  </div>

                </div>

                {/* CITAS */}

                <div
                  className="mt-1
 space-y-1
 overflow-y-auto
 max-h-24
 pr-1"
                >
                  {citasDia.map((c) => {

                    const resaltada =
                      resaltadaId === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`agenda-appointment relative px-2 py-1.5
 
 
 truncate
 
 
 
 
 `}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCitaClick(c);
                        }}
                      >

                        <span
                          className={`absolute
 left-0
 top-0
 bottom-0
 w-1
 
 `}
                        />

                        <div className="truncate pl-1">
                          {c.tipo_cita} — {c.hora_inicio} →{" "}
                          {c.hora_fin}
                        </div>
                        {String(c.tipo_cita || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").includes("firma") ? (() => { const realizada = Boolean(c.firma_realizada) || /FIRMA\s+REALIZADA|FIRMADA/.test(String(c.observaciones || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()); return <div className={`mt-1 inline-flex items-center px-1.5 py-0.5 ${realizada ? "" : ""}`}>{realizada ? "✓ Firma realizada" : "◷ Pendiente de firma"}</div>; })() : null}

                        <div className="truncate pl-1">
                          Notario: {c.notario_nombre || "—"}
                        </div>

                        <div className="truncate pl-1">
                          Firma: {c.tipo_firma}
                        </div>

                        <div className="truncate pl-1">
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
  );
}
