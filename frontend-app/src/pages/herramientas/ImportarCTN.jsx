import MolsanIcon from "../../components/ui/MolsanIcon";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useState } from "react";
import { useUtilidades } from "../../hooks/useUtilidades";
/**
 * IMPORTAR CTN — MOLSAN ERP PREMIUM 2027
 */

export default function ImportarCTN() {
  const { importarCTN, loading, resultado } = useUtilidades();

  const [file, setFile] = useState(null);

  const enviar = async () => {
    if (!file || loading) return;

    await importarCTN(file);
  };

  return (
    <div className="importar-ctn-premium herramientas-subpagina-premium min-h-full p-4 sm:p-6 lg:p-8 space-y-6 ">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <MolsanPageHeader mark="CTN" title="Importar CTN" description="Importa información desde un fichero Excel." />

      {/* =====================================================
          PANEL IMPORTACIÓN
      ===================================================== */}

      <div
        className="
          max-w-3xl
          relative overflow-hidden
          rounded-[24px]
          border border-slate-200/80
          bg-white
          
          
          p-6 sm:p-7
        "
      >

        <div className="space-y-5">

          {/* SELECTOR */}

          <div>

            <label className="block mb-2 text-sm font-medium text-slate-700">
              Archivo Excel
            </label>

            <label
              className="
                flex flex-col
                items-center justify-center
                gap-2
                min-h-36
                rounded-2xl
                border-2 border-dashed
                border-slate-200
                bg-slate-50/70
                px-5
                cursor-pointer
                transition-all
                hover:border-blue-300
                hover:bg-blue-50/40
              "
            >

              <span className="text-4xl">
                {file ? <MolsanIcon name="chart" size={20} tone="ocean" bare /> : <MolsanIcon name="folder" size={20} tone="ocean" bare />}
              </span>

              <span className="text-sm font-medium text-slate-700">
                {file
                  ? file.name
                  : "Selecciona el fichero Excel"}
              </span>

              <span className="text-xs text-slate-400">
                Formato permitido: .xlsx
              </span>

              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) =>
                  setFile(e.target.files?.[0] || null)
                }
                disabled={loading}
              />

            </label>

          </div>


          {/* INFORMACIÓN */}

          {file && (
            <div
              className="
                flex items-center gap-3
                rounded-xl
                border border-blue-100
                bg-blue-50/70
                px-4 py-3
                text-sm text-blue-700
                
              "
            >
              <span>✓</span>

              <div className="min-w-0">

                <div className="font-medium">
                  Archivo seleccionado
                </div>

                <div className="truncate text-xs text-blue-600/70">
                  {file.name}
                </div>

              </div>

            </div>
          )}


          {/* BOTÓN */}

          <div className="flex justify-end">

            <button
              onClick={enviar}
              disabled={!file || loading}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                px-6 py-3
                text-sm font-semibold
                text-white
                bg-[#064675]
                shadow-sm
                transition-colors duration-150
                hover:bg-[#04375B]
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >

              {loading && (
                <span
                  className="
                    h-4 w-4
                    rounded-full
                    border-2
                    border-white/30
                    border-t-white
                    animate-spin
                  "
                />
              )}

              {loading
                ? "Importando..."
                : "Importar fichero"}

            </button>

          </div>


          {/* RESULTADO */}

          {resultado && (
            <div
              className="
                rounded-2xl
                border border-emerald-200
                bg-emerald-50
                p-5
                
              "
            >

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex h-10 w-10
                    items-center justify-center
                    rounded-xl
                    bg-emerald-100
                    text-emerald-700
                    font-bold
                  "
                >
                  ✓
                </div>

                <div>

                  <div className="font-semibold text-emerald-800">
                    Importación completada
                  </div>

                  <div className="mt-0.5 text-sm text-emerald-700">
                    {resultado.importados} registros importados
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
