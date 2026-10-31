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

    <div className="erp-page min-w-0 space-y-6">

      {/* =====================================================
          LISTADO
      ===================================================== */}

      <EmpleadosListado onSeleccionar={abrirFicha} />


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
