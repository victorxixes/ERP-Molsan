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
    <div className="crear-noticia-premium min-h-full p-4 sm:p-6 lg:p-8 space-y-6">

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
            📰
          </div>

          <div>

            <h1 className="">
              Crear noticia
            </h1>

            <p className="mt-1">
              Publica información para todos los usuarios de la intranet.
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          FORMULARIO
      ===================================================== */}

      <div
        className="max-w-3xl
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
              placeholder="Título de la noticia"
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


          {/* DESCRIPCIÓN */}

          <div>

            <label className="block mb-2">
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
              className="w-full
 resize-y
 
 
 
 px-4 py-3"
            />

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
                ? "Publicando..."
                : "Crear noticia"}

            </button>

          </div>


          {/* OK */}

          {ok && (
            <div
              className="flex items-center gap-3
 
 
 
 px-4 py-3"
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
