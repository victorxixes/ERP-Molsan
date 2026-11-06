import ModalEmpleado from "./empleados/ModalEmpleado";

export default function EmpleadoPerfilModal({
  id,
  onClose,
}) {
  const idNum = Number(id);

  const idValido =
    Number.isFinite(idNum) &&
    idNum > 0;

  if (!idValido) {
    return null;
  }

  return (
    <ModalEmpleado
      open={true}
      empleadoId={idNum}
      onClose={onClose}
    />
  );
}
