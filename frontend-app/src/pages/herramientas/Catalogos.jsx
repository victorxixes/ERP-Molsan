import { Link } from "react-router-dom";
import MolsanPageHeader from "../../components/ui/MolsanPageHeader";

/**
 * CENTRAL DE CATÁLOGOS — MOLSAN ERP
 * Reúne las pantallas de mantenimiento de datos maestros existentes.
 * Cada tarjeta conserva la ruta y el origen de datos de su catálogo.
 */
const CATALOGOS = [
  {
    icon: "🖋️",
    titulo: "Firmas y plantillas de email",
    descripcion: "Configura el pie corporativo y la firma automática vinculada a la ficha del empleado.",
    ruta: "/catalogos/firmas-email",
    grupo: "Catálogos operativos",
    destacado: true,
  },
  {
    icon: "✉️",
    titulo: "Correspondencia tipificada",
    descripcion: "Crea plantillas de email por proceso y genera mensajes con datos reales de la ficha del expediente.",
    ruta: "/catalogos/correspondencia-tipificada",
    grupo: "Catálogos operativos",
    destacado: true,
  },
  {
    icon: "🔗",
    titulo: "Catálogo ABSIS",
    descripcion: "Estados de expediente, productos GTG, actividades, operaciones y defectos.",
    ruta: "/catalogos/absis",
    grupo: "Integraciones y catálogos técnicos",
    destacado: true,
  },
  {
    icon: "🏦",
    titulo: "Entidades bancarias",
    descripcion: "Entidades, códigos europeos, LEI, categorías y direcciones.",
    ruta: "/herramientas/entidades-bancarias",
    grupo: "Datos territoriales y entidades",
  },
  {
    icon: "🏘️",
    titulo: "Municipios",
    descripcion: "Comunidades autónomas, provincias y municipios.",
    ruta: "/herramientas/municipios",
    grupo: "Datos territoriales y entidades",
  },
  {
    icon: "🏛️",
    titulo: "Registros de la propiedad",
    descripcion: "Datos y mantenimiento de los registros de la propiedad.",
    ruta: "/herramientas/registros-propiedad",
    grupo: "Datos territoriales y entidades",
  },
  {
    icon: "🏢",
    titulo: "Oficinas liquidadoras",
    descripcion: "Oficinas liquidadoras y sus datos asociados.",
    ruta: "/herramientas/oficinas-liquidadoras",
    grupo: "Datos territoriales y entidades",
  },
  {
    icon: "🏢",
    titulo: "Catálogo de oficinas",
    descripcion: "Busca oficinas e importa y actualiza sus datos desde tu Excel.",
    ruta: "/catalogos/oficinas",
    grupo: "Datos territoriales y entidades",
    destacado: true,
  },
  {
    icon: "🧾",
    titulo: "Tabla Provisiones de fondos",
    descripcion: "Configura importes de referencia y criterios iniciales de impuestos por operación y territorio.",
    ruta: "/catalogos/provisiones-fondos",
    grupo: "Catálogos económicos",
    destacado: true,
  },
  {
    icon: "🧮",
    titulo: "Tipos impositivos",
    descripcion: "Gestiona tipos de IVA, IGIC y retenciones; crea, edita y desactiva porcentajes utilizados por las órdenes de pago.",
    ruta: "/catalogos/tipos-impositivos",
    grupo: "Catálogos económicos",
    destacado: true,
  },
  {
    icon: "💶",
    titulo: "Honorarios de gestoría",
    descripcion: "Tarifas con base imponible, IVA o IGIC y total calculado.",
    ruta: "/herramientas/honorarios-gestoria",
    grupo: "Catálogos económicos",
    destacado: true,
  },
  {
    icon: "🏠",
    titulo: "Tipos de carga hipotecaria",
    descripcion: "Catálogo de tipos de carga hipotecaria.",
    ruta: "/herramientas/tipos-carga-hipotecaria",
    grupo: "Catálogos económicos",
  },
  {
    icon: "🧾",
    titulo: "Tipos de conceptos de gastos",
    descripcion: "Conceptos disponibles para clasificar gastos.",
    ruta: "/herramientas/tipos-concepto-gastos",
    grupo: "Catálogos económicos",
  },
  {
    icon: "🚚",
    titulo: "Mensajería · Servicios y tarifas",
    descripcion: "Mantén el catálogo interno de servicios, tarifas, suplementos e impuestos de mensajería.",
    ruta: "/catalogos/mensajeria-servicios",
    grupo: "Catálogos económicos",
    destacado: true,
    avisoConstruccion: true,
  },
  {
    icon: "🕒",
    titulo: "Fichajes · Tipos de ausencia",
    descripcion: "Configura los motivos de ausencia y si cada uno requiere justificante.",
    ruta: "/catalogos/fichajes",
    grupo: "Catálogos operativos",
    destacado: true,
  },
  {
    icon: "🗂️",
    titulo: "Maestros generales",
    descripcion: "Acceso al catálogo general de datos maestros del ERP.",
    ruta: "/maestros",
    grupo: "Catálogos operativos",
  },
  {
    icon: "🗃️",
    titulo: "Tipos de expediente",
    descripcion: "Mantén los tipos de expediente, incluidos los tipos históricos de provisiones fuera del circuito GTG.",
    ruta: "/herramientas/tipos-expediente",
    grupo: "Catálogos operativos",
    destacado: true,
  },
  {
    icon: "📋",
    titulo: "Acciones del expediente",
    descripcion: "Acciones y actividades utilizadas en el circuito de expedientes.",
    ruta: "/herramientas/acciones-expediente",
    grupo: "Catálogos operativos",
  },
];

const GRUPOS = [
  "Integraciones y catálogos técnicos",
  "Datos territoriales y entidades",
  "Catálogos económicos",
  "Catálogos operativos",
];

export default function Catalogos() {
  return (
    <main className="erp-page min-h-full space-y-7">
      <MolsanPageHeader mark="CA" title="Catálogos" description="Centraliza los datos maestros que utilizan los módulos y procesos de la gestoría." />

      <div className="px-4 py-3">
        Los catálogos conservan sus datos y pantallas actuales. Esta sección los reúne en un único acceso para facilitar su mantenimiento.
      </div>

      {GRUPOS.map((grupo) => {
        const items = CATALOGOS.filter((item) => item.grupo === grupo);
        return (
          <section key={grupo} className="space-y-3">
            <h2>{grupo}</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <Link
                  key={item.ruta}
                  to={item.ruta}
                  className={`group relative overflow-hidden p-5 ${item.destacado ? "" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center ${item.destacado ? "" : ""}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3>{item.titulo}</h3>
                      <p className="mt-1.5">{item.descripcion}</p>
                      {item.avisoConstruccion && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-1 uppercase">
                            En construcción
                          </span>
                          <span>
                            Acceso disponible
                          </span>
                        </div>
                      )}
                    </div>
                    <span>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
