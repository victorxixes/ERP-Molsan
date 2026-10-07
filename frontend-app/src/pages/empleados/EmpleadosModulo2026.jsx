import {
  useState,
  useCallback,
} from "react";

import EmpleadosListado
  from "./EmpleadosListado";

import ModalEmpleado
  from "../../components/empleados/ModalEmpleado";


export default function EmpleadosModulo2026() {

  const [
    seleccionado,
    setSeleccionado,
  ] = useState(null);

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);


  const abrirFicha =
    useCallback(
      (id) => {

        const idNum =
          Number(id);

        if (
          !Number.isFinite(idNum) ||
          idNum <= 0
        ) {
          return;
        }

        setSeleccionado(
          idNum
        );

        setModalOpen(
          true
        );
      },
      []
    );


  const cerrarModal =
    useCallback(
      () => {

        setModalOpen(
          false
        );

        setSeleccionado(
          null
        );
      },
      []
    );


  return (

    <div className="
      erp-page
      space-y-6
      animate-fade-in
    ">

      {/* =====================================================
          CABECERA
      ===================================================== */}

      <section className="
        erp-card
        w-full
        p-6
      ">

        <div className="
          flex
          flex-col
          xl:flex-row
          xl:items-center
          xl:justify-between
          gap-5
        ">

          <div>

            <div className="
              flex
              items-center
              gap-3
              mb-2
            ">

              <div className="
                w-11
                h-11
                rounded-2xl
                bg-[var(--erp-primary-soft)]
                border
                border-[var(--erp-border)]
                flex
                items-center
                justify-center
                text-xl
              ">
                👥
              </div>

              <span className="
                text-xs
                uppercase
                tracking-[0.18em]
                font-semibold
                text-[var(--erp-primary)]
              ">
                Gestión interna
              </span>

            </div>

            <h1 className="
              text-3xl
              font-semibold
              tracking-tight
              text-[var(--erp-text)]
            ">
              Empleados
            </h1>

            <p className="
              mt-1
              text-sm
              text-[var(--erp-text-soft)]
            ">
              Gestión de empleados, estructura organizativa y
              datos corporativos.
            </p>

          </div>


          <div className="
            flex
            items-center
            gap-3
          ">

            <div className="
              px-4
              py-3
              rounded-2xl
              border
              border-[var(--erp-border)]
              bg-[var(--erp-surface-soft)]
            ">

              <div className="
                text-xs
                text-[var(--erp-text-soft)]
              ">
                Módulo
              </div>

              <div className="
                text-sm
                font-semibold
                text-[var(--erp-text)]
              ">
                SJ-2026
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          LISTADO
      ===================================================== */}

      <section className="
        erp-card
        w-full
        p-5
      ">

        <EmpleadosListado
          onSeleccionar={
            abrirFicha
          }
        />

      </section>


      {/* =====================================================
          MODAL
      ===================================================== */}

      {modalOpen &&
        Number.isFinite(
          seleccionado
        ) && (

        <ModalEmpleado
          open={true}
          onClose={
            cerrarModal
          }
          empleadoId={
            seleccionado
          }
        />

      )}

    </div>
  );
}
