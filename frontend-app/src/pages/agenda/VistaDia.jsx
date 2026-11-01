import { useMemo, useCallback } from "react";
import { useAgendaStore } from "../../store/agendaStore";
import "../../css/ComponentesCompartidosPremium.css";

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

export default function VistaDia({
  fechaDia,
  citas = [],
  onCitaClick,
  onCrearCita,
}) {
  const resaltadaId = useAgendaStore(
    (s) => s.resaltadaId
  );

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
    <>
      <header className="molsan-page-header agenda-vista-page-header">
        <div className="molsan-page-header__identity">
          <span className="molsan-page-header__mark" aria-hidden="true">AG</span>
          <div className="min-w-0">
            <p className="molsan-page-header__eyebrow">MOLSAN ERP · APODERAGEST</p>
            <h1 className="molsan-page-header__title">Agenda · Vista diaria</h1>
            <p className="molsan-page-header__description">Consulta las citas y firmas organizadas por horas.</p>
          </div>
        </div>
      </header>
    <div className="agenda-vista-premium agenda-vista-dia-premium grid grid-cols-[70px,1fr] gap-4 text-xs animate-fade-in">

      {/* HORAS */}

      <div className="text-[var(--erp-text-soft)] flex flex-col">

        {HORAS.map((h) => (
          <div
            key={h}
            className="
              h-12
              flex items-start
              justify-end
              pr-2
              pt-1
              font-medium
            "
          >
            {h}
          </div>
        ))}

      </div>

      {/* TIMELINE */}

      <div
        className="
          relative
          border border-[var(--erp-border)]
          rounded-xl
          bg-[var(--erp-surface)]
          overflow-hidden
          shadow-sm
        "
      >

        {/* BLOQUES HORARIOS */}

        {HORAS.map((h) => (
          <div
            key={h}
            className="
              h-12
              border-b border-[var(--erp-border)]
              hover:bg-[var(--erp-surface-soft)]
              cursor-pointer
              transition
            "
            onDoubleClick={crearCitaDia}
          />
        ))}

        {/* CITAS */}

        {citasPosicionadas.map((cita) => {

          const colores =
            colorPorTipo(cita.tipo_cita);

          const resaltada =
            resaltadaId === cita.id;

          return (
            <div
              key={cita.id}
              className={`
                absolute
                left-4
                right-4
                mt-1
                p-3
                rounded-xl
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
                    : "hover:shadow-md hover:scale-[1.005]"
                }
              `}
              style={{
                top: cita.top,
                height: cita.height,
              }}
              onClick={() =>
                onCitaClick(cita)
              }
            >

              {/* ACENTO */}

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
                {cita.tipo_cita} —{" "}
                {cita.hora_inicio} -{" "}
                {cita.hora_fin}
              </div>
              {String(cita.tipo_cita || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("es").includes("firma") ? (() => { const realizada = Boolean(cita.firma_realizada) || /FIRMA\s+REALIZADA|FIRMADA/.test(String(cita.observaciones || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()); return <div className={`mt-1 inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold ${realizada ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{realizada ? "✓ Firma realizada" : "◷ Pendiente de firma"}</div>; })() : null}

              <div className="truncate text-[var(--erp-text-soft)] pl-1">
                Notario:{" "}
                {cita.notario_nombre || "—"}
              </div>

              <div className="truncate text-[var(--erp-text-soft)] pl-1">
                Firma: {cita.tipo_firma}
              </div>

              <div className="truncate text-[var(--erp-text-soft)] pl-1">
                Apoderado:{" "}
                {cita.apoderado_nombre || "—"}
              </div>

              {cita.observaciones && (
                <div
                  className="
                    text-[11px]
                    mt-1
                    truncate
                    text-[var(--erp-text-soft)]
                    pl-1
                  "
                >
                  Obs: {cita.observaciones}
                </div>
              )}

            </div>
          );
        })}

      </div>
    </div>
    </>
  );
}
