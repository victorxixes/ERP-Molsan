import MolsanPageHeader from "../../components/ui/MolsanPageHeader";
import { Link } from "react-router-dom";

/**
 * UTILIDADES
 */

export default function Utilidades() {

  return (
    <div className="erp-page w-full space-y-7">
      <MolsanPageHeader mark="UT" title="Utilidades" description="Configuración corporativa, documentación, integraciones y herramientas auxiliares." />

      <Grupo titulo="Documentación y plantillas" descripcion="Centraliza el diseño de los documentos oficiales sin mover los catálogos ni las reglas económicas.">
        <Card icon="📑" titulo="Modelos documentos" descripcion="Consulta y prepara las plantillas de Hoja de liquidación, Provisión de fondos y Factura de honorarios de gestoría." link="/herramientas/utilidades/modelos-documentos" destacado />
      </Grupo>

      <Grupo titulo="Datos corporativos" descripcion="Centraliza la información de Molsan que se reutilizará en documentos y facturación.">
        <Card icon="🏢" titulo="Datos Molsan" descripcion="Mantén los datos fiscales, contacto corporativo y preferencias documentales en un único lugar." link="/herramientas/utilidades/datos-molsan" destacado />
      </Grupo>

      <Grupo titulo="Empleados y permisos" descripcion="Gestiona empleados, roles, permisos, asignaciones, visibilidad y auditoría desde un único grupo de administración.">
        <Card icon="🛡️" titulo="Empleados y permisos" descripcion="Selecciona un empleado para revisar y administrar sus roles, módulos y permisos asignados." link="/seguridad/usuarios" destacado />
        <Card icon="🔑" titulo="Gestión de roles" descripcion="Crea roles nuevos, como Colaborador, y administra los roles disponibles en el sistema." link="/seguridad/roles/editor" destacado />
        <Card icon="🧾" titulo="Auditoría" descripcion="Consulta los eventos de auditoría disponibles para tu perfil." link="/auditoria" destacado />
        <Card icon="📊" titulo="Visibilidad de tablas" descripcion="Configura las columnas de Excel y la visibilidad por actividad para el empleado seleccionado." link="/herramientas/utilidades/visibilidad-tablas" destacado />
        <Card icon="⚖️" titulo="Asignaciones" descripcion="Administra las reglas de reparto y asignación de expedientes desde un panel centralizado." link="/herramientas/utilidades/asignaciones" destacado />
      </Grupo>

      <Grupo titulo="Accesos notariales" descripcion="Administra por separado los accesos de las notarías a NotarGest y EncargaGest, con historial de cambios.">
        <Card icon="🔐" titulo="Accesos notariales" descripcion="Busca una notaría y administra por separado sus accesos a NotarGest y EncargaGest, con historial de cambios." link="/herramientas/utilidades/accesos-notariales" />
      </Grupo>

      <Grupo titulo="Importaciones y datos" descripcion="Carga información desde los ficheros de trabajo autorizados.">
        <Card icon="📥" titulo="Importar CTN" descripcion="Importar un Excel con información de notarías." link="/herramientas/importar-ctn" />
        <Card icon="📦" titulo="Importador ABSIS" descripcion="Importar expedientes desde el Excel matriz ABSIS." etapa="Carga Pre firma" link="/herramientas/importador-absis" destacado />
        <Card icon="📦" titulo="Importador ABSIS" descripcion="Importar el histórico Excel de gastos y facturación Post Firma, validar los datos y abrir su informe." etapa="Post Firma" link="/herramientas/importador-absis/postfirma" destacado />
      </Grupo>

      <Grupo titulo="Integraciones y comunicaciones" descripcion="Seguimiento de los procesos de intercambio de información con los sistemas de nuestros clientes.">
        <Card icon="🔄" titulo="Proceso de ABSIS" descripcion="Control de expedientes enviados, errores detectados e incidencias, con buscador, acciones y exportación Excel." link="/herramientas/utilidades/proceso-absis" enConstruccion />
        <Card icon="🧾" titulo="Verifacti" descripcion="Acceso al futuro panel de control de Verifacti para consultar la integración y el estado de los registros de facturación." link="/herramientas/utilidades/verifacti" enConstruccion />
        <Card icon="📄" titulo="Lectura copias" descripcion="Procesamiento de copias por fecha, con progreso y listado de expedientes detectados." link="/herramientas/utilidades/lectura-copias" enConstruccion />
        <Card icon="📁" titulo="Lectura Cancela I" descripcion="Accede a la pantalla inicial del futuro módulo de lectura de información de Cancela I." link="/herramientas/utilidades/lectura-cancela-i" enConstruccion />
        <Card icon="🔀" titulo="Cambios de actividad ABSIS" descripcion="Busca expedientes, solicita una nueva actividad y consulta el estado de consolidación." link="/herramientas/utilidades/cambios-actividad-absis" enConstruccion />
      </Grupo>

      <Grupo titulo="Control económico" descripcion="Seguimiento de PPAD, complementos de saldo y control económico de apoderados.">
        <Card icon="💶" titulo="Complementos de saldo" descripcion="Consultar solicitudes de complemento de saldo, controlar su estado, revisar importes y descargar el listado a Excel." link="/herramientas/utilidades/complementos-saldo" />

        <Card icon="🧾" titulo="Control Apoderados" descripcion="Gestiona colaboradores, revisa las relaciones mensuales de firmas reales y valida las facturas recibidas." link="/herramientas/utilidades/control-apoderados" destacado />
        <Card icon="💶" titulo="PPAD" descripcion="Consulta importes pendientes y compensados, revisa cada expediente y descarga los listados a Excel." link="/herramientas/utilidades/ppad" destacado />
      </Grupo>

      <Grupo titulo="Reglas y configuración de expedientes" descripcion="Define las condiciones de documentos, campos y validaciones del circuito de actividades.">
        <Card icon="⚙️" titulo="Reglas de actividades expediente" descripcion="Configura los documentos requeridos en cada actividad, las condiciones de envío a notaría, las validaciones y los requisitos de avance y cierre." link="/herramientas/utilidades/reglas-actividades-expediente" destacado />
      </Grupo>

      <Grupo titulo="Gestión de expedientes" descripcion="Acciones manuales y controladas sobre la asignación y el seguimiento de los expedientes.">
        <Card icon="📝" titulo="Alta expediente" descripcion="Crear un expediente nuevo con sus datos de facturación, contrato, múltiples fincas, hipotecas y notaría CTN." link="/herramientas/utilidades/alta-expediente" destacado />
        <Card icon="🔁" titulo="Cambiar gestor de expediente" descripcion="Busca un expediente por su número y reasígnalo manualmente a otro gestor, dejando constancia del cambio." link="/herramientas/utilidades/cambiar-gestor" />
        <Card icon="🏛️" titulo="Reasignar expediente a notario" descripcion="Busca un expediente, carga su ficha de Envío a notario y modifica el notario, la fecha de envío y los datos relacionados antes de guardar." link="/herramientas/utilidades/reasignar-notario" destacado />
        <Card icon="🏷️" titulo="Asignar expedientes a promociones" descripcion="Busca un expediente y asígnale un tipo del catálogo Tipos de expediente para que la promoción aparezca automáticamente en su ficha y en los filtros." link="/herramientas/utilidades/asignar-promociones" destacado />
      </Grupo>

      <Grupo titulo="Administración y supervisión" descripcion="Accesos directos para revisar el estado operativo y técnico del ERP.">
        <Card icon="📜" titulo="Logs del sistema" descripcion="Revisar registros y errores registrados por la aplicación." link="/logs" />
        <Card icon="🖥️" titulo="Panel técnico" descripcion="Acceder a los paneles de supervisión del sistema y tiempo real." link="/paneltecnico" />
        <Card icon="📈" titulo="Informes" descripcion="Consultar informes y estadísticas operativas." link="/informes" />
        <Card icon="📡" titulo="Monitor en tiempo real" descripcion="Consultar la supervisión y actividad del sistema en tiempo real." link="/paneltecnico/monitor-realtime" />
        <Card icon="⚙️" titulo="Mantenimiento técnico" descripcion="Diagnóstico de base de datos, revisión de estructura y tareas técnicas controladas desde el ERP." link="/herramientas/mantenimiento-tecnico" />
      </Grupo>

      <Grupo titulo="Módulos de trabajo" descripcion="Accesos directos a los módulos operativos del ERP.">
        <Card icon="⚡" titulo="ApoderaGest" descripcion="Gestionar encargos y actividad de apoderados." link="/apoderagest" />
        <Card icon="📁" titulo="CancelaGest" descripcion="Acceder al módulo de gestión de cancelaciones." link="/cancelagest" />
        <Card icon="🌐" titulo="NotarGest" descripcion="Acceder al módulo de trabajo notarial interno." link="/notargest" />
        <Card icon="📋" titulo="EncargaGest" descripcion="Gestionar encargos de cancelación recibidos desde el ERP." link="/encargagest" />
        <Card icon="🏛️" titulo="NotarGest · Notarios" descripcion="Acceso externo de las notarías colaboradoras a NotarGest." link="/notargest-notario" />
        <Card icon="📨" titulo="EncargaGest · Notarios" descripcion="Portal externo para que las notarías envíen encargos, aporten documentación y consulten su seguimiento." link="/encargagest-notario" />
      </Grupo>

      <Grupo titulo="Intranet y administración" descripcion="Publicación de información y herramientas de soporte integradas en el ERP.">
        <Card icon="📰" titulo="Crear noticia" descripcion="Publicar noticias para los usuarios de la intranet." link="/herramientas/utilidades/crear-noticia" />
        <Card icon="📄" titulo="Subir documento" descripcion="Publicar documentos en la intranet." link="/herramientas/utilidades/subir-documento" />
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, descripcion, children }) {
  return (
    <section className="molsan-tool-group space-y-3">
      <div className="molsan-tool-group__header flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2>{titulo}</h2>
        <p>{descripcion}</p>
      </div>
      <div className="molsan-tool-grid grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

/* =========================================================
   CARD
========================================================= */

function MetricaAbsis({ titulo, valor, alerta = false }) {
  return (
    <div className={`p-3.5 ${alerta ? "" : ""}`}>
      <p>{titulo}</p>
      <p className={`mt-2 ${alerta ? "" : ""}`}>{valor}</p>
    </div>
  );
}

function Card({
  icon,
  titulo,
  descripcion,
  link,
  destacado = false,
  enConstruccion = false,
  etapa = null,
  aviso = null,
  onClick,
}) {
  const contenido = (
    <>
      <div
        className="absolute inset-x-0 top-0 h-px"
      />
      <div className="flex items-start gap-4">
        <div
          className={`molsan-tool-icon flex h-12 w-12 shrink-0 items-center justify-center ${destacado ? "" : ""}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2>{titulo}</h2>
            {enConstruccion && (
              <span className="molsan-tool-badge px-2 py-0.5 uppercase">
                En construcción
              </span>
            )}
          </div>
          <p className="mt-1.5">{descripcion}</p>
          {etapa && <p className="molsan-tool-stage mt-3 inline-flex px-2.5 py-1">{etapa}</p>}
          {aviso && <div className="molsan-tool-warning mt-3 px-3 py-2.5"><p>⚠️ Pendiente de revisión técnica</p><p className="mt-1">{aviso}</p></div>}
          {enConstruccion && (
            <p className="mt-3">
              Próximamente: registro de envíos, respuestas y cambios de estado vía API.
            </p>
          )}
        </div>
        {!enConstruccion && (
          <span>→</span>
        )}
      </div>
    </>
  );

  const clases = `molsan-tool-card group relative overflow-hidden p-5 ${enConstruccion && !onClick && !link ? "cursor-default" : "cursor-pointer"}`;

  if (enConstruccion && !onClick && !link) {
    return (
      <div className={clases} aria-label={`${titulo}: en construcción`}>
        {contenido}
      </div>
    );
  }

  if (onClick) {
    return <button type="button" onClick={onClick} className={`${clases} w-full`}>{contenido}</button>;
  }

  return (
    <Link to={link} className={clases}>
      {contenido}
    </Link>
  );
}
