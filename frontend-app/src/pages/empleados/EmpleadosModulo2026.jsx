import {
  useState,
  useCallback,
} from "react";

import "./EmpleadosModulo2026.css";

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
      empleados-premium-page
      space-y-6
      animate-fade-in
    ">

      {/* =====================================================
          LISTADO
      ===================================================== */}

      <div className="w-full min-w-0">
        <EmpleadosListado onSeleccionar={abrirFicha} />
      </div>


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
