import { useState } from "react";
import { useUtilidades } from "../../hooks/useUtilidades";
import MolsanButton from "../../components/ui/MolsanButton";
import "../../css/ModalesHerramientasPremium.css";
import "../../css/CatalogosMaestrosPremium.css";

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
    <div className="molsan-page-stack importar-ctn-premium herramientas-subpagina-premium min-h-full animate-fadeIn">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <header
        className=" molsan-page-header "
      >

        <div
          className="
            absolute inset-x-0 top-0 h-px
            bg-gradient-to-r
            from-transparent
            via-blue-400/60
            to-transparent
          "
        />

        <div className="flex items-center gap-4">

          <div
            className="
              flex h-12 w-12
              items-center justify-center
              rounded-2xl
              bg-blue-50
              border border-blue-100
              text-2xl
            "
          >
            📥
          </div>

          <div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Importar CTN
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Importa información desde un fichero Excel.
            </p>

          </div>

        </div>

      </header>


      {/* =====================================================
          PANEL IMPORTACIÓN
      ===================================================== */}

      <div
        className="
          max-w-3xl
          relative overflow-hidden
          rounded-[24px]
          border border-slate-200/80
          bg-white/85
          backdrop-blur-xl
          shadow-[0_18px_50px_rgba(15,23,42,0.08)]
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
                {file ? "📊" : "📁"}
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
                animate-fadeIn
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

            <MolsanButton icon="upload" variant="primary" onClick={enviar} disabled={!file || loading} loading={loading}>
              Importar fichero
            </MolsanButton>

          </div>


          {/* RESULTADO */}

          {resultado && (
            <div
              className="
                rounded-2xl
                border border-emerald-200
                bg-emerald-50
                p-5
                animate-fadeIn
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
