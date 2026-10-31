import React, { useMemo, useCallback } from "react";
import { useAgendaStore } from "../../store/agendaStore";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HORAS = Array.from(
  { length: 12 },
  (_, i) => `${9 + i}:00`
);

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
    <div
      className="  
 grid grid-cols-[70px,repeat(7,minmax(0,1fr))]
 gap-1"
    >

      {/* CABECERA */}

      <div />

      {DIAS.map((d) => (
        <div
          key={d}
          className="agenda-weekday py-3 uppercase"
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
              className="h-20
 flex items-start
 justify-end
 pr-3
 pt-2"
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
                  className="agenda-week-cell h-20 relative"
                  onDoubleClick={() =>
                    onCrearCita(
                      obtenerFechaDia(idx)
                    )
                  }
                >

                  {citasEnCelda.map((c) => {

                    const resaltada =
                      resaltadaId === c.id;

                    return (
                      <div
                        key={c.id}
                        className={`agenda-appointment absolute inset-0 m-1 p-2
 
 
 
 
 overflow-hidden
 
 
 
 `}
                        onClick={() =>
                          onCitaClick(c)
                        }
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
                          {c.tipo_cita} — {c.hora_inicio}
                        </div>
                        {String(c.tipo_cita || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").includes("firma") ? (() => { const realizada = Boolean(c.firma_realizada) || /FIRMA\s+REALIZADA|FIRMADA/.test(String(c.observaciones || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()); return <div className={`mt-1 inline-flex items-center px-1.5 py-0.5 ${realizada ? "" : ""}`}>{realizada ? "✓ Firma realizada" : "◷ Pendiente de firma"}</div>; })() : null}

                        <div className="truncate pl-1">
                          Notario: {c.notario_nombre || "—"}
                        </div>

                        <div className="truncate pl-1">
                          Firma: {c.tipo_firma}
                        </div>

                        <div className="truncate pl-1">
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
  );
}
