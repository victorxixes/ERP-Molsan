import { useState } from "react";
import { useUtilidades } from "../../hooks/useUtilidades";

/**
 * IMPORTAR CTN
 */

export default function ImportarCTN() {
  const { importarCTN, loading, resultado } = useUtilidades();

  const [file, setFile] = useState(null);

  const enviar = async () => {
    if (!file || loading) return;

    await importarCTN(file);
  };

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 space-y-6">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div
        className="relative overflow-hidden
 
 
 
 
 
 p-6 sm:p-7"
      >

        <div
          className="absolute inset-x-0 top-0 h-px"
        />

        <div className="flex items-center gap-4">

          <div
            className="flex h-12 w-12
 items-center justify-center"
          >
            📥
          </div>

          <div>

            <h1 className="">
              Importar CTN
            </h1>

            <p className="mt-1">
              Importa información desde un fichero Excel.
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          PANEL IMPORTACIÓN
      ===================================================== */}

      <div
        className="max-w-3xl
 relative overflow-hidden
 
 
 
 
 
 p-6 sm:p-7"
      >

        <div className="space-y-5">

          {/* SELECTOR */}

          <div>

            <label className="block mb-2">
              Archivo Excel
            </label>

            <label
              className="flex flex-col
 items-center justify-center
 gap-2
 min-h-36
 
 
 
 
 px-5"
            >

              <span className="">
                {file ? "📊" : "📁"}
              </span>

              <span className="">
                {file
                  ? file.name
                  : "Selecciona el fichero Excel"}
              </span>

              <span className="">
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
              className="flex items-center gap-3
 
 
 
 px-4 py-3"
            >
              <span>✓</span>

              <div className="min-w-0">

                <div className="">
                  Archivo seleccionado
                </div>

                <div className="truncate">
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
              className="inline-flex
 items-center
 justify-center
 gap-2
 
 px-6 py-3"
            >

              {loading && (
                <span
                  className="h-4 w-4"
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
              className="p-5"
            >

              <div className="flex items-center gap-3">

                <div
                  className="flex h-10 w-10
 items-center justify-center"
                >
                  ✓
                </div>

                <div>

                  <div className="">
                    Importación completada
                  </div>

                  <div className="mt-0.5">
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
