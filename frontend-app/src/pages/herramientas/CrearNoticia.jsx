import { useState, useCallback, useMemo } from "react";
import { useUtilidades } from "../../hooks/useUtilidades";


/**
 * CREAR NOTICIA
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
    <div className="erp-page min-w-0 space-y-6">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <MolsanPageHeader mark="IN" title="Crear noticia" description="Redacta y publica una noticia para la intranet de Molsan." />

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
