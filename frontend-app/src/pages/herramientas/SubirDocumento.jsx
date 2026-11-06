import MolsanIcon from "../../components/ui/MolsanIcon";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { useState, useCallback, useMemo } from "react";
import { useUtilidades } from "../../hooks/useUtilidades";

/**
 * SUBIR DOCUMENTO — MOLSAN ERP PREMIUM 2027
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
    <div className="subir-documento-premium herramientas-subpagina-premium min-h-full p-4 sm:p-6 lg:p-8 space-y-6 ">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <MolsanPageHeader mark="DC" title="Subir documento" description="Añade documentos para ponerlos a disposición de la intranet." />

      {/* =====================================================
          FORMULARIO
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

          {/* TÍTULO */}

          <div>

            <label className="block mb-2 text-sm font-medium text-slate-700">
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
              className="
                w-full
                rounded-xl
                border border-slate-200
                bg-slate-50/80
                px-4 py-3
                text-slate-800
                placeholder:text-slate-400
                outline-none
                transition-all
                focus:border-emerald-400
                focus:bg-white
                focus:ring-4
                focus:ring-emerald-500/10
                disabled:opacity-50
              "
            />

          </div>


          {/* CONCEPTO */}

          <div>

            <label className="block mb-2 text-sm font-medium text-slate-700">
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
              className="
                w-full
                rounded-xl
                border border-slate-200
                bg-slate-50/80
                px-4 py-3
                text-slate-800
                placeholder:text-slate-400
                outline-none
                transition-all
                focus:border-emerald-400
                focus:bg-white
                focus:ring-4
                focus:ring-emerald-500/10
                disabled:opacity-50
              "
            />

          </div>


          {/* ARCHIVO */}

          <div>

            <label className="block mb-2 text-sm font-medium text-slate-700">
              Archivo
            </label>

            <label
              className="
                flex flex-col
                items-center justify-center
                gap-2
                min-h-32
                rounded-2xl
                border-2 border-dashed
                border-slate-200
                bg-slate-50/70
                px-5
                cursor-pointer
                transition-all
                hover:border-emerald-300
                hover:bg-emerald-50/40
              "
            >

              <span className="text-3xl">
                {file ? <MolsanIcon name="attachment" size={24} tone="ocean" /> : <MolsanIcon name="upload" size={24} tone="ocean" />}
              </span>

              <span className="text-sm font-medium text-slate-600">
                {file
                  ? file.name
                  : "Selecciona un archivo"}
              </span>

              {!file && (
                <span className="text-xs text-slate-400">
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
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                px-6 py-3
                text-sm font-semibold
                text-white
                bg-gradient-to-r
                from-emerald-600
                to-emerald-500
                shadow-[0_10px_25px_rgba(16,185,129,0.20)]
                transition-all
                hover:from-emerald-500
                hover:to-emerald-400
                active:scale-[0.98]
                disabled:opacity-40
                disabled:cursor-not-allowed
              "
            >

              {enviando && (
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

              {enviando
                ? "Subiendo..."
                : "Subir documento"}

            </button>

          </div>


          {/* OK */}

          {ok && (
            <div
              className="
                flex items-center gap-3
                rounded-xl
                border border-emerald-200
                bg-emerald-50
                px-4 py-3
                text-sm
                font-medium
                text-emerald-700
                
              "
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
