import { useNavigate } from "react-router-dom";
import "../../css/EncargaGestWorkspace.css";
import Sidebar from "../../components/Sidebar";
import EncargaGest from "./EncargaGest";
import Ctn from "../ctn/Ctn";
import Agenda from "../agenda/Agenda";
import Mensajes from "../mensajes/Mensajes";
import Intranet from "../intranet/Intranet.jsx";
import { useAuthStore } from "../../store/authStore";

/** Espacio independiente de EncargaGest para CTN, Agenda y Mensajes. */
export default function EncargaGestWorkspace({ page }) {
  const navigate = useNavigate();
  const empleado = useAuthStore((state) => state.empleado);

  const items = [
    { key: "ctn", label: "CTN", icon: "building" },
    { key: "agenda", label: "Agenda", icon: "calendar" },
    { key: "mensajes", label: "Mensajes", icon: "chat" },
    { key: "intranet", label: "Intranet", icon: "file-text" },
    { key: "encargos", label: "Encargos", icon: "clipboard" },
  ];
  const rutas = {
    CTN: "/encargagest/ctn",
    Agenda: "/encargagest/agenda",
    Mensajes: "/encargagest/mensajes",
    Intranet: "/encargagest/intranet",
    Encargos: "/encargagest",
  };

  return (
    <div className="encargagest-workspace-premium apoderagest encargagest min-h-screen">
      <Sidebar
        brandName="EncargaGest"
        navigationItems={items}
        activeNavigationItem={items.find((item) => item.key === page)?.label || (page === "encargos" ? "Encargos" : "CTN")}
        onNavigationItemClick={(label) => {
          if (rutas[label]) navigate(rutas[label]);
        }}
      />
      <main className="relative min-h-screen px-4 py-6 lg:px-6">
        <div role="status" aria-live="polite" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
          <span aria-hidden="true" className="mt-0.5 text-xl">⚠️</span>
          <div>
            <p className="text-sm font-extrabold">Conexiones con bancos pendientes</p>
            <p className="mt-1 text-sm">La integración mediante API con las entidades bancarias todavía está pendiente de conexión. Puedes acceder y utilizar EncargaGest con normalidad; las funciones que dependan de esas conexiones estarán disponibles cuando se complete la integración.</p>
          </div>
        </div>
        {page === "encargos" && <EncargaGest />}
        {page === "ctn" && <Ctn />}
        {page === "agenda" && <Agenda />}
        {page === "intranet" && <Intranet />}
        {page === "mensajes" && (
          empleado?.id
            ? <Mensajes usuarioId={empleado.id} />
            : <div className="p-6 text-white/70">Cargando módulo de mensajes…</div>
        )}
      </main>
    </div>
  );
}
