import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import MolsanIcon from "../../components/ui/MolsanIcon";
import { useState, useCallback, useMemo } from "react";
import { useUtilidades } from "../../hooks/useUtilidades";

/**
 * CREAR NOTICIA — MOLSAN ERP PREMIUM 2027
 */

export default function CrearNoticia() {
  const { crearNoticia } = useUtilidades();

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const puedeEnviar = useMemo(() => {
    return (
      titulo.trim().length > 0 &&
      descripcion.trim().length > 0
    );
  }, [titulo, descripcion]);

  const enviar = useCallback(async () => {
    if (!puedeEnviar || enviando) return;

    try {
      setEnviando(true);
      setOk(false);

      await crearNoticia(
        titulo.trim(),
        descripcion.trim()
      );

      setOk(true);
      setTitulo("");
      setDescripcion("");

    } catch (error) {
      console.error("No se ha podido crear la noticia.");
    } finally {
      setEnviando(false);
    }
  }, [
    crearNoticia,
    titulo,
    descripcion,
    puedeEnviar,
    enviando,
  ]);

  return (
    <div className="herramientas-subpagina-premium crear-noticia-premium min-h-full p-4 sm:p-6 lg:p-8 space-y-6 ">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <MolsanPageHeader mark="NT" title="Crear noticia" description="Publica información para todos los usuarios de la intranet." />

      {/* =====================================================
          FORMULARIO
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

          {/* TÍTULO */}

          <div>

            <label className="block mb-2 text-sm font-medium text-[var(--molsan-text)]">
              Título
            </label>

            <input
              type="text"
              placeholder="Título de la noticia"
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
                bg-[var(--molsan-surface-soft)]
                px-4 py-3
                text-[var(--molsan-primary)]
                placeholder:text-[var(--molsan-text-muted)]
                outline-none
                transition-all
                focus:border-purple-400
                focus:bg-white
                focus:ring-4
                focus:ring-purple-500/10
                disabled:opacity-50
              "
            />

          </div>


          {/* DESCRIPCIÓN */}

          <div>

            <label className="block mb-2 text-sm font-medium text-[var(--molsan-text)]">
              Descripción
            </label>

            <textarea
              rows={7}
              placeholder="Escribe el contenido de la noticia..."
              value={descripcion}
              onChange={(e) => {
                setDescripcion(e.target.value);
                setOk(false);
              }}
              disabled={enviando}
              className="
                w-full
                resize-y
                rounded-xl
                border border-slate-200
                bg-[var(--molsan-surface-soft)]
                px-4 py-3
                text-[var(--molsan-primary)]
                placeholder:text-[var(--molsan-text-muted)]
                outline-none
                transition-all
                focus:border-purple-400
                focus:bg-white
                focus:ring-4
                focus:ring-purple-500/10
                disabled:opacity-50
              "
            />

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
                bg-[#064675]
                shadow-sm
                transition-colors duration-150
                hover:bg-[#04375B]
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
                ? "Publicando..."
                : "Crear noticia"}

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
              <span><MolsanIcon name="check" size={13} bare /></span>
              <span>Noticia creada correctamente.</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
