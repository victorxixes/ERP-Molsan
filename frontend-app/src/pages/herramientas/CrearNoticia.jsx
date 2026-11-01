import { useState, useCallback, useMemo } from "react";
import { useUtilidades } from "../../hooks/useUtilidades";

import "../../css/ComponentesOperativosPremium.css";

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
    <div className="crear-noticia-premium min-h-full p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div
        className="
          relative overflow-hidden
          rounded-[24px]
          border border-slate-200/80
          bg-white/80
          backdrop-blur-xl
          shadow-[0_18px_50px_rgba(15,23,42,0.08)]
          p-6 sm:p-7
        "
      >

        <div
          className="
            absolute inset-x-0 top-0 h-px
            bg-gradient-to-r
            from-transparent
            via-purple-400/60
            to-transparent
          "
        />

        <div className="molsan-page-header flex items-center gap-4">

          <div
            className="
              flex h-12 w-12
              items-center justify-center
              rounded-2xl
              bg-purple-50
              border border-purple-100
              text-2xl
            "
          >
            📰
          </div>

          <div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
              Crear noticia
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Publica información para todos los usuarios de la intranet.
            </p>

          </div>

        </div>

      </div>


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
                bg-slate-50/80
                px-4 py-3
                text-slate-800
                placeholder:text-slate-400
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

            <label className="block mb-2 text-sm font-medium text-slate-700">
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
                bg-slate-50/80
                px-4 py-3
                text-slate-800
                placeholder:text-slate-400
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
                bg-gradient-to-r
                from-purple-600
                to-purple-500
                shadow-[0_10px_25px_rgba(147,51,234,0.20)]
                transition-all duration-200
                hover:from-purple-500
                hover:to-purple-400
                hover:shadow-[0_14px_30px_rgba(147,51,234,0.25)]
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
                animate-fadeIn
              "
            >
              <span>✓</span>
              <span>Noticia creada correctamente.</span>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
