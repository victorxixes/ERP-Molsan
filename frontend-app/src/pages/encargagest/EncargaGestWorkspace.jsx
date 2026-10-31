import { useNavigate } from "react-router-dom";
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
    <div className="min-h-screen">
      <Sidebar
        brandName="EncargaGest"
        navigationItems={items}
        activeNavigationItem={items.find((item) => item.key === page)?.label || (page === "encargos" ? "Encargos" : "CTN")}
        onNavigationItemClick={(label) => {
          if (rutas[label]) navigate(rutas[label]);
        }}
      />
      <main className="relative min-h-screen px-4 py-6 lg:px-6">
        {page === "encargos" && <EncargaGest />}
        {page === "ctn" && <Ctn />}
        {page === "agenda" && <Agenda />}
        {page === "intranet" && <Intranet />}
        {page === "mensajes" && (
          empleado?.id
            ? <Mensajes usuarioId={empleado.id} />
            : <div className="p-6">Cargando módulo de mensajes…</div>
        )}
      </main>
    </div>
  );
}
