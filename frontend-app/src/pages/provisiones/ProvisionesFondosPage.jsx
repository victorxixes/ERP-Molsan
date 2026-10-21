import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProvisionesModal from "../../components/expedientes/ProvisionesModal";

export default function ProvisionesFondosPage() {
  const [idExpediente, setIdExpediente] = useState("");
  const [expedienteActivo, setExpedienteActivo] = useState("");
  const navigate = useNavigate();

  const abrir = (event) => {
    event.preventDefault();
    const id = idExpediente.trim();
    if (!id) return;
    setExpedienteActivo(id);
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xl text-white" aria-hidden="true">€</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">ERP · MOLSAN</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Provisiones de fondos</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Accede a la gestión de provisiones y cancelaciones de un expediente. Introduce su identificador para consultar el histórico, calcular importes con las tarifas disponibles y generar el documento de provisión.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={abrir} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label htmlFor="provisiones-expediente" className="block text-sm font-semibold text-slate-700">
          Número o identificador de expediente
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="provisiones-expediente"
            value={idExpediente}
            onChange={(event) => setIdExpediente(event.target.value)}
            placeholder="Introduce el identificador del expediente"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            required
          />
          <button type="submit" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Abrir provisiones
          </button>
          <button type="button" onClick={() => navigate("/expedientes")} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Buscar en expedientes
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          La gestión actual guarda las provisiones asociadas al expediente seleccionado. El formulario independiente para preparar la provisión estimativa del cliente se ampliará sobre este acceso.
        </p>
      </form>

      {expedienteActivo && (
        <ProvisionesModal
          key={expedienteActivo}
          idExpediente={expedienteActivo}
          onClose={() => setExpedienteActivo("")}
        />
      )}
    </section>
  );
}
