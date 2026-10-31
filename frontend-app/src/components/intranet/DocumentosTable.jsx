import { useCallback } from "react";
import { useIntranet } from "../../hooks/useIntranet";

/**
 * DOCUMENTOS TABLE
 *
 * Diseño:
 * - Coherente con el resto del ERP
 * - Responsive
 * - Animaciones suaves
 *
 * Lógica:
 * - Mantiene useIntranet()
 * - Mantiene eliminarDocumento()
 */

export default function DocumentosTable() {
  const {
    documentos,
    eliminarDocumento,
  } = useIntranet();

  const handleEliminar = useCallback(
    (id) => {
      eliminarDocumento(id);
    },
    [eliminarDocumento]
  );

  return (
    <div
      className="w-full
 overflow-hidden"
    >

      {/* =====================================================
          CABECERA TABLA
      ===================================================== */}

      <div
        className="px-5
 py-4"
      >

        <div
          className="flex
 items-center
 justify-between
 gap-4"
        >

          <div>

            <h3
             
            >
              Documentos internos
            </h3>

            <p
              className="mt-0.5"
            >
              Documentación disponible en la intranet
            </p>

          </div>

          <div
            className="flex
 h-9
 min-w-9
 items-center
 justify-center

 

 
 

 

 px-2.5"
          >
            {documentos.length}
          </div>

        </div>

      </div>


      {/* =====================================================
          TABLA
      ===================================================== */}

      <div className="w-full overflow-x-auto">

        <table
          className="w-full
 min-w-[760px]"
        >

          <thead>

            <tr
             
            >

              <th
                className="px-5
 py-3.5

 

 
 

 uppercase"
              >
                ID
              </th>

              <th
                className="px-5
 py-3.5

 

 
 

 uppercase"
              >
                Título
              </th>

              <th
                className="px-5
 py-3.5

 

 
 

 uppercase"
              >
                Concepto
              </th>

              <th
                className="px-5
 py-3.5

 

 
 

 uppercase"
              >
                Fecha
              </th>

              <th
                className="px-5
 py-3.5

 

 
 

 uppercase"
              >
                Acciones
              </th>

            </tr>

          </thead>


          {/* =================================================
              CUERPO
          ================================================= */}

          <tbody>

            {documentos.length === 0 ? (

              <tr>

                <td
                  colSpan={5}
                  className="px-5
 py-12"
                >

                  <div
                    className="mx-auto
 flex
 max-w-sm
 flex-col
 items-center"
                  >

                    <div
                      className="mb-3

 flex
 h-12
 w-12

 items-center
 justify-center"
                    >
                      📄
                    </div>

                    <p
                     
                    >
                      No hay documentos disponibles.
                    </p>

                    <p
                      className="mt-1"
                    >
                      Los documentos internos aparecerán aquí.
                    </p>

                  </div>

                </td>

              </tr>

            ) : (

              documentos.map((d) => (

                <tr
                  key={d.id}
                 
                  
                >

                  {/* ID */}

                  <td
                    className="px-5
 py-4

 whitespace-nowrap"
                  >
                    #{d.id}
                  </td>


                  {/* TÍTULO */}

                  <td
                    className="px-5
 py-4"
                  >

                    <div
                     
                    >
                      {d.titulo || "Sin título"}
                    </div>

                  </td>


                  {/* CONCEPTO */}

                  <td
                    className="px-5
 py-4

 max-w-xs"
                  >

                    <span
                     
                    >
                      {d.concepto || "—"}
                    </span>

                  </td>


                  {/* FECHA */}

                  <td
                    className="px-5
 py-4

 whitespace-nowrap"
                  >

                    <span
                      className="inline-flex
 items-center

 

 
 

 

 px-2.5
 py-1"
                    >
                      {d.fecha_publicacion
                        ? new Date(
                            d.fecha_publicacion
                          ).toLocaleString("es-ES")
                        : "—"}
                    </span>

                  </td>


                  {/* ACCIONES */}

                  <td
                    className="px-5
 py-4"
                  >

                    <button
                      type="button"
                      onClick={() =>
                        handleEliminar(d.id)
                      }
                      className="inline-flex
 items-center
 justify-center

 

 
 

 

 px-3
 py-1.5"
                    >
                      Eliminar
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}
