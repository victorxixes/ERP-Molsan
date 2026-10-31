import { useState } from "react";
import { useLocation } from "react-router-dom";
import ProvisionesModal from "./ProvisionesModal";

import "../../css/ComponentesOperativosPremium.css";

export default function ProvisionesLauncher() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const coincidencia = pathname.match(/^\/expedientes\/([^/]+)\/?$/);
  const idExpediente = coincidencia ? decodeURIComponent(coincidencia[1]) : "";
  if (!idExpediente || idExpediente === "nuevo") return null;

  return <>
    <button
      type="button"
      onClick={() => setAbierto(true)}
      className="provisiones-launcher-premium fixed bottom-5 right-5 z-40 px-5 py-3 hover:-translate-y-0.5"
      title="Abrir provisiones de fondos y cancelaciones"
    >€ Provisiones / Cancelaciones</button>
    {abierto && <ProvisionesModal idExpediente={idExpediente} onClose={() => setAbierto(false)} />}
  </>;
}
