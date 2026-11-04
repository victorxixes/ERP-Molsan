import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useState, useCallback, useMemo } from "react";
import { useUtilidades } from "../../hooks/useUtilidades";

/**
 * SUBIR DOCUMENTO
 */

export default function SubirDocumento() {
  const { subirDocumento } = useUtilidades();

  const [titulo, setTitulo] = useState("");
  const [concepto, setConcepto] = useState("");
  const [file, setFile] = useState(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const puedeEnviar = useMemo(() => {
    return (
      titulo.trim().length > 0 &&
      concepto.trim().length > 0 &&
      !!file
    );
  }, [titulo, concepto, file]);

  const enviar = useCallback(async () => {
    if (!puedeEnviar || enviando) return;

    try {
      setEnviando(true);
      setOk(false);

      await subirDocumento(
        titulo.trim(),
        concepto.trim(),
        file
      );

      setOk(true);
      setTitulo("");
      setConcepto("");
      setFile(null);

    } catch (error) {
      console.error("Error subiendo documento:", error);
    } finally {
      setEnviando(false);
    }
  }, [
    puedeEnviar,
    enviando,
    subirDocumento,
    titulo,
    concepto,
    file,
  ]);

  return (
    <div className="erp-page min-w-0 space-y-6">

      <MolsanPageHeader mark="SD" title="Subir documento" description="Añade documentos para ponerlos a disposición de la intranet." />


      <div
        className="erp-card max-w-3xl
 relative overflow-hidden
 
 
 
 
 
 p-6 sm:p-7"
      >

        <div className="space-y-5">

          {/* TÍTULO */}

          <div>

            <label className="block mb-2">
              Título
            </label>

            <input
              type="text"
              placeholder="Título del documento"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setOk(false);
              }}
              disabled={enviando}
              className="w-full
 
 
 
 px-4 py-3"
            />

          </div>


          {/* CONCEPTO */}

          <div>

            <label className="block mb-2">
              Concepto
            </label>

            <input
              type="text"
              placeholder="Concepto o descripción breve"
              value={concepto}
              onChange={(e) => {
                setConcepto(e.target.value);
                setOk(false);
              }}
              disabled={enviando}
              className="w-full
 
 
 
 px-4 py-3"
            />

          </div>


          {/* ARCHIVO */}

          <div>

            <label className="block mb-2">
              Archivo
            </label>

            <label
              className="flex flex-col
 items-center justify-center
 gap-2
 min-h-32
 
 
 
 
 px-5"
            >

              <span>
                {file ? "📎" : "☁️"}
              </span>

              <span>
                {file
                  ? file.name
                  : "Selecciona un archivo"}
              </span>

              {!file && (
                <span>
                  Haz clic para seleccionar el documento
                </span>
              )}

              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setOk(false);
                }}
                disabled={enviando}
              />

            </label>

          </div>


          {/* BOTÓN */}

          <div className="flex justify-end">

            <button
              onClick={enviar}
              disabled={!puedeEnviar || enviando}
              className="inline-flex
 items-center
 justify-center
 gap-2
 
 px-6 py-3"
            >

              {enviando && (
                <span
                  className="h-4 w-4"
                />
              )}

              {enviando
                ? "Subiendo..."
                : "Subir documento"}

            </button>

          </div>


          {/* OK */}

          {ok && (
            <div
              className="flex items-center gap-3
 
 
 
 px-4 py-3"
            >
              <span>✓</span>
              <span>Documento subido correctamente.</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
