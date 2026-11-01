import { useMemo, useCallback } from "react";

const HORAS = Array.from(
  { length: 12 },
  (_, i) => `${9 + i}:00`
);

export default function VistaDia({
  fechaDia,
  citas = [],
  onCitaClick,
  onCrearCita,
}) {
  const fechaNormalizada = useMemo(
    () =>
      fechaDia.toLocaleDateString("sv-SE"),
    [fechaDia]
  );

  const citasSeguras = useMemo(
    () => (Array.isArray(citas) ? citas : []).filter((cita) => String(cita.fecha || "").slice(0, 10) === fechaNormalizada),
    [citas, fechaNormalizada]
  );

  const crearCitaDia = useCallback(() => {
    onCrearCita(fechaNormalizada);
  }, [
    fechaNormalizada,
    onCrearCita,
  ]);

  const citasPosicionadas = useMemo(() => {
    return citasSeguras.map((cita) => {
      const inicioHora =
        parseInt(
          cita.hora_inicio.split(":")[0],
          10
        );

      const finHora =
        parseInt(
          cita.hora_fin.split(":")[0],
          10
        );

      return {
        ...cita,
        top: (inicioHora - 9) * 48,
        height:
          (finHora - inicioHora) * 48 - 4,
      };
    });
  }, [citasSeguras]);

  return (
    <div className="grid grid-cols-[70px,1fr] gap-4">

      {/* HORAS */}

      <div className="flex flex-col">

        {HORAS.map((h) => (
          <div
            key={h}
            className="h-12 flex items-start justify-end pr-2 pt-1"
          >
            {h}
          </div>
        ))}

      </div>

      {/* TIMELINE */}

      <div
        className="agenda-day-timeline relative overflow-hidden"
      >

        {/* BLOQUES HORARIOS */}

        {HORAS.map((h) => (
          <div
            key={h}
            className="agenda-day-hour h-12"
            onDoubleClick={crearCitaDia}
          />
        ))}

        {/* CITAS */}

        {citasPosicionadas.map((cita) => {

          return (
            <div
              key={cita.id}
              className="agenda-appointment absolute left-4 right-4 mt-1 p-3 overflow-hidden"
              style={{ top: cita.top, height: cita.height }}
              onClick={() =>
                onCitaClick(cita)
              }
            >

              {/* ACENTO */}

              <span
                className="absolute left-0 top-0 bottom-0 w-1"
              />

              <div className="truncate pl-1">
                {cita.tipo_cita} —{" "}
                {cita.hora_inicio} -{" "}
                {cita.hora_fin}
              </div>
              {String(cita.tipo_cita || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").includes("firma") ? (() => { const realizada = Boolean(cita.firma_realizada) || /FIRMA\s+REALIZADA|FIRMADA/.test(String(cita.observaciones || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()); return <div className="mt-1 inline-flex items-center px-2 py-1">{realizada ? "✓ Firma realizada" : "◷ Pendiente de firma"}</div>; })() : null}

              <div className="truncate pl-1">
                Notario:{" "}
                {cita.notario_nombre || "—"}
              </div>

              <div className="truncate pl-1">
                Firma: {cita.tipo_firma}
              </div>

              <div className="truncate pl-1">
                Apoderado:{" "}
                {cita.apoderado_nombre || "—"}
              </div>

              {cita.observaciones && (
                <div
                  className="mt-1 truncate pl-1"
                >
                  Obs: {cita.observaciones}
                </div>
              )}

            </div>
          );
        })}

      </div>
    </div>
  );
}
