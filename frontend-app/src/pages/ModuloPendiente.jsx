
import { useNavigate } from "react-router-dom";

export default function ModuloPendiente({ nombre }) {
  const navigate = useNavigate();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
          MOLSAN ERP
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          {nombre}
        </h1>

        <p className="mt-4 leading-7 text-slate-600">
          La ruta de este módulo está preparada, pero su pantalla
          operativa todavía debe integrarse.
        </p>

        <button
          type="button"
          onClick={() => navigate("/modulos")}
          className="mt-7 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Volver al selector
        </button>
      </div>
    </section>
  );
}
