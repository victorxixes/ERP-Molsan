import React, { useState } from "react";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

/**
 * Vista visual de demostración de FichaExpediente.
 * Datos ficticios y estado local: no consume ni modifica la API.
 */
export default function FichaExpedienteDemo() {
  const [actividad, setActividad] = useState("Documentación previa");
  const [modal, setModal] = useState("");
  const [pestana, setPestana] = useState("Documentos");
  const actividades = [
    "Documentación previa",
    "Sede notarial",
    "Sede notarial con protocolo",
    "Gestión económica",
    "Liquidación de impuestos",
    "Tramitación inscripción",
    "Defectos registrales",
    "Cierre del expediente",
  ];
  const documentos = [
    ["Hoja de encargo firmada", "Firmado", "28/10/2026"],
    ["Nota simple registral", "Recibido", "29/10/2026"],
    ["Justificante de cancelación", "Pendiente", "—"],
  ];

  return (
    <main className="ficha-expediente-premium erp-page space-y-5">
      <MolsanPageHeader
        mark="▣"
        title="Ficha de expediente"
        description="Vista de demostración del diseño MOLSAN ERP PREMIUM 2027"
      />

      <div className="rounded-xl border px-4 py-3 text-sm" style={{ background: "var(--molsan-table-head)", borderColor: "var(--molsan-border)", color: "var(--molsan-blue)" }}>
        <strong>MODO DEMOSTRACIÓN · DATOS FICTICIOS</strong>
        <span className="ml-2">Esta vista es solo visual. No consulta ni guarda información en la base de datos.</span>
      </div>

      <section className="molsan-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--molsan-muted)" }}>Expediente de prueba</p>
            <h2 className="mt-1 text-xl font-semibold" style={{ color: "var(--molsan-blue)" }}>MOL-2026-0042 · Cancelación de hipoteca</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--molsan-muted)" }}>Referencia ficticia · Oficina de Barcelona · Alta 21/10/2026</p>
          </div>
          <span className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ color: "var(--molsan-blue)", borderColor: "var(--molsan-border)", background: "var(--molsan-panel)" }}>EN TRAMITACIÓN</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["Titular","María Ejemplo García"],["NIF","00000000T"],["Entidad","CaixaBank, S.A."],["Importe","148.500,00 €"],["Notario","Notaría de demostración"],["N.º protocolo","1.245 / 2026"],["Gestoría","Gestoría"],["Actividad actual",actividad]].map(([label,value]) => (
            <div className="molsan-data-point min-w-0" key={label}>
              <p className="mb-1 text-xs font-semibold uppercase" style={{ color: "var(--molsan-muted)" }}>{label}</p>
              <div className="break-words font-medium" style={{ color: "var(--molsan-text)" }}>{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="molsan-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--molsan-blue)" }}>Circuito del expediente</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--molsan-muted)" }}>Selecciona una actividad para comprobar el tratamiento visual</p>
          </div>
          <button type="button" className="molsan-btn molsan-btn--secondary" onClick={() => setModal("Datos de actividad")}>Editar datos de actividad</button>
        </div>
        <div id="ficha-actividades" className="mt-4">
          <div className="flex flex-wrap gap-2">
            {actividades.map((item, index) => (
              <button key={item} type="button" aria-pressed={actividad === item} onClick={() => setActividad(item)} className="px-3 py-2 text-sm">
                <span className="mr-2 text-xs" style={{ color: "var(--molsan-muted)" }}>{String(index + 1).padStart(2,"0")}</span>{item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="molsan-card">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ color: "var(--molsan-blue)", background: "var(--molsan-panel)" }}>▤</span>
            <div><h2 className="font-semibold">Documentación de la actividad</h2><p className="text-xs">Documentos y seguimiento</p></div>
          </div>
          <div className="p-5">
            <div className="mb-4 flex gap-2">
              {["Documentos","Historial"].map(t => <button key={t} type="button" onClick={() => setPestana(t)} className="molsan-btn" aria-pressed={pestana === t}>{t}</button>)}
            </div>
            {pestana === "Documentos" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr><th className="px-3 py-3">Documento</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Fecha</th></tr></thead>
                  <tbody>{documentos.map(([nombre,estado,fecha]) => <tr key={nombre}><td className="px-3 py-3">{nombre}</td><td className="px-3 py-3">{estado}</td><td className="px-3 py-3">{fecha}</td></tr>)}</tbody>
                </table>
              </div>
            ) : <p className="rounded-lg p-4 text-sm" style={{ background: "var(--molsan-panel)", color: "var(--molsan-muted)" }}>28/10/2026 · Se incorpora documentación de prueba.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="molsan-btn molsan-btn--primary" type="button" onClick={() => setModal("Añadir documento")}>Añadir documento</button>
              <button className="molsan-btn" type="button" onClick={() => setModal("Ver carpeta digital")}>Ver carpeta digital</button>
            </div>
          </div>
        </section>

        <section className="molsan-card">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ color: "var(--molsan-blue)", background: "var(--molsan-panel)" }}>€</span>
            <div><h2 className="font-semibold">Gestión económica</h2><p className="text-xs">Resumen ilustrativo de provisiones y pagos</p></div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
            {[["Provisión inicial","2.450,00 €"],["Total obligaciones","1.820,00 €"],["Total pagado","1.200,00 €"],["Saldo pendiente","620,00 €"]].map(([label,value]) => <div className="molsan-data-point" key={label}><p className="mb-1 text-xs font-semibold uppercase">{label}</p><div className="text-lg font-semibold" style={{ color: "var(--molsan-blue)" }}>{value}</div></div>)}
            <div className="sm:col-span-2 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr><th className="px-3 py-3">Concepto</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3 text-right">Total</th></tr></thead>
                <tbody><tr><td className="px-3 py-3">Notaría</td><td className="px-3 py-3">Pagado</td><td className="px-3 py-3 text-right">850,00 €</td></tr><tr><td className="px-3 py-3">Registro</td><td className="px-3 py-3">Pendiente</td><td className="px-3 py-3 text-right">620,00 €</td></tr></tbody>
              </table>
            </div>
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              <button className="molsan-btn molsan-btn--primary" type="button" onClick={() => setModal("Registrar pago")}>Registrar pago</button>
              <button className="molsan-btn" type="button" onClick={() => setModal("Liquidar expediente")}>Liquidar expediente</button>
            </div>
          </div>
        </section>
      </div>

      <section className="molsan-card">
        <div className="px-5 py-4"><h2 className="font-semibold">Control y observaciones</h2><p className="mt-1 text-xs">Bloque de seguimiento del expediente</p></div>
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3">
          <div className="molsan-data-point"><p className="mb-1 text-xs font-semibold uppercase">Próximo vencimiento</p><div>30/11/2026</div></div>
          <div className="molsan-data-point"><p className="mb-1 text-xs font-semibold uppercase">Defectos abiertos</p><div>0</div></div>
          <div className="molsan-data-point"><p className="mb-1 text-xs font-semibold uppercase">Última actualización</p><div>31/10/2026</div></div>
        </div>
      </section>

      {modal && <div className="expediente-operativo-modal fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(18,42,60,.34)" }} onMouseDown={e => { if (e.target === e.currentTarget) setModal(""); }}>
        <div className="expediente-operativo-modal-panel flex w-full max-w-xl flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label={modal}>
          <div className="flex items-center justify-between gap-3 border-b px-6 py-5"><div><h2 className="font-semibold">{modal}</h2><p className="mt-1 text-xs">Vista de ejemplo · No se guardarán cambios</p></div><button type="button" className="molsan-btn" onClick={() => setModal("")}>Cerrar</button></div>
          <div className="space-y-4 p-6"><div className="molsan-data-point"><p className="mb-1 text-xs font-semibold uppercase">Expediente</p><div>MOL-2026-0042 · Datos ficticios</div></div><label className="block text-sm">Observaciones de demostración<textarea className="mt-2 w-full p-3" rows="3" defaultValue="Contenido de ejemplo para comprobar campos y superficies." /></label><div className="flex justify-end"><button type="button" className="molsan-btn molsan-btn--primary" onClick={() => setModal("")}>Cerrar demostración</button></div></div>
        </div>
      </div>}
    </main>
  );
}
