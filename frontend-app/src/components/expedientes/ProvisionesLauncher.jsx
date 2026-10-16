import { useState } from "react";
import { useLocation } from "react-router-dom";
import ProvisionesModal from "./ProvisionesModal";

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
      className="fixed bottom-5 right-5 z-40 rounded-full border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
      title="Abrir provisiones de fondos y cancelaciones"
    >€ Provisiones / Cancelaciones</button>
    {abierto && <ProvisionesModal idExpediente={idExpediente} onClose={() => setAbierto(false)} />}
  </>;
}
