import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
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
    <div className="erp-page min-w-0 space-y-6">

      <MolsanPageHeader mark="CT" title="Importar CTN" description="Importa información desde un fichero Excel al catálogo de notarías." />


      <div
        className="erp-card max-w-3xl
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

              <span>
                {file ? "📊" : "📁"}
              </span>

              <span>
                {file
                  ? file.name
                  : "Selecciona el fichero Excel"}
              </span>

              <span>
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

                <div>
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

                  <div>
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
