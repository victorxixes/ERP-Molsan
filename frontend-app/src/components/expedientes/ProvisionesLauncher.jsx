import { useState } from "react";
import { useLocation } from "react-router-dom";
import ProvisionesModal from "./ProvisionesModal";
import MolsanIcon from "../ui/MolsanIcon";

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
      className="provisiones-launcher-premium fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-[var(--molsan-primary)] bg-[var(--molsan-primary)] px-5 py-3 text-sm font-bold text-white shadow-[var(--molsan-shadow-card)] transition hover:-translate-y-0.5 hover:bg-[var(--molsan-primary-hover)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--molsan-primary-soft)]"
      title="Abrir provisiones de fondos y cancelaciones"
      aria-label="Abrir provisiones de fondos y cancelaciones"
    >
      <MolsanIcon name="wallet" size={17} tone="inherit" bare />
      Provisiones / Cancelaciones
    </button>
    {abierto && <ProvisionesModal idExpediente={idExpediente} onClose={() => setAbierto(false)} />}
  </>;
}
