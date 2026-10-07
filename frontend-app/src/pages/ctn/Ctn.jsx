import CtnListadoPage from "./CtnListadoPage";

export default function Ctn() {
  return (
    <div
      className="
        erp-page
        w-full
        p-4
        sm:p-6
        lg:p-8
        text-[var(--erp-text)]
        animate-fade-in
      "
    >
      <div className="max-w-[1700px] mx-auto space-y-6">

        {/* CABECERA */}
        <div>
          <h1 className="text-3xl font-bold text-[var(--erp-text)]">
            CTN — Notarías
          </h1>

          <p className="mt-1 text-sm text-[var(--erp-text-soft)]">
            Gestión y consulta de notarías.
          </p>
        </div>

        <CtnListadoPage />

      </div>
    </div>
  );
}
