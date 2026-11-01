import { useEffect, useMemo, useState } from "react";
import axios from "../../api/axios";
import { Link } from "react-router-dom";
import "../../css/HerramientasPremium.css";

const DOCUMENTOS_INICIALES = [
  { id: "solicitud", nombre: "Hoja de solicitud", detalle: "Debe estar incorporada en la carpeta digital del resumen del expediente." },
  { id: "justificante", nombre: "Justificante de cancelación", detalle: "Nombre vigente del documento; sustituye la denominación genérica «certificado de cancelación»." },
  { id: "nota_simple", nombre: "Nota simple", detalle: "Debe estar incorporada en la carpeta digital del resumen del expediente." },
];

export default function ReglasActividadesExpediente() {
  const [documentos, setDocumentos] = useState(
    Object.fromEntries(DOCUMENTOS_INICIALES.map((d) => [d.id, true]))
  );
  const [validarFechaEnvio, setValidarFechaEnvio] = useState(true);
  const [avisoFacturacion, setAvisoFacturacion] = useState(true);
  const [exigirNotario, setExigirNotario] = useState(true);
  const [exigirTipoDocumento, setExigirTipoDocumento] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    axios.get("/utilidades/reglas-actividades")
      .then(({ data }) => {
        if (!vigente) return;
        const config = data?.configuracion || {};
        if (config.documentos) setDocumentos((actual) => ({ ...actual, ...config.documentos }));
        if (typeof config.validarFechaEnvio === "boolean") setValidarFechaEnvio(config.validarFechaEnvio);
        if (typeof config.avisoFacturacion === "boolean") setAvisoFacturacion(config.avisoFacturacion);
        if (typeof config.exigirNotario === "boolean") setExigirNotario(config.exigirNotario);
        if (typeof config.exigirTipoDocumento === "boolean") setExigirTipoDocumento(config.exigirTipoDocumento);
      })
      .catch(() => {
        if (vigente) setMensaje("No se pudo cargar la configuración guardada. Revisa los permisos o la conexión con el backend.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => { vigente = false; };
  }, []);

  const documentosActivos = useMemo(
    () => DOCUMENTOS_INICIALES.filter((d) => documentos[d.id]).length,
    [documentos]
  );

  const guardarVista = async () => {
    setGuardando(true);
    setMensaje("");
    try {
      const configuracion = {
        documentos,
        validarFechaEnvio,
        avisoFacturacion,
        exigirNotario,
        exigirTipoDocumento,
      };
      const { data } = await axios.put("/utilidades/reglas-actividades", configuracion);
      setMensaje(data?.mensaje || "Reglas guardadas correctamente en el ERP.");
    } catch (error) {
      setMensaje(error?.response?.data?.detail || "No se pudieron guardar las reglas. Comprueba tu permiso de edición y la conexión.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="utilidades-premium-page min-h-full space-y-6 p-4 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="molsan-page-header relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl">⚙️</div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Configuración del expediente</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Reglas de actividades expediente</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Define los documentos, campos y validaciones de cada fase, y deja identificadas las integraciones y reglas que requieren revisión técnica.</p>
            </div>
          </div>
          <Link to="/herramientas/utilidades" className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Volver a Utilidades</Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Resumen icono="📂" titulo="Actividad inicial" valor="Documentación previa" />
        <Resumen icono="📄" titulo="Documentos requeridos" valor={`${documentosActivos} de ${DOCUMENTOS_INICIALES.length}`} />
        <Resumen icono="📨" titulo="Flujo principal" valor="5 transiciones" />
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Regla 01</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">Documentación previa → Sede notarial</h2>
            <p className="mt-1 text-sm text-slate-500">Los tres documentos deben existir en la carpeta digital del resumen del expediente para dar por preparada la documentación.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Configuración persistente</span>
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">1. Documentos necesarios</h3>
              <p className="mt-1 text-sm text-slate-500">Selecciona los documentos que deben estar presentes antes del envío.</p>
            </div>
            <div className="space-y-3">
              {DOCUMENTOS_INICIALES.map((doc) => (
                <label key={doc.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30">
                  <input type="checkbox" checked={Boolean(documentos[doc.id])} onChange={(e) => { setDocumentos((actual) => ({ ...actual, [doc.id]: e.target.checked })); setMensaje(""); }} className="mt-1 h-4 w-4 accent-indigo-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{doc.nombre}</span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">{doc.detalle}</span>
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${documentos[doc.id] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{documentos[doc.id] ? "Requerido" : "Opcional"}</span>
                </label>
              ))}
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-5 text-blue-900">
              <strong>Condición de avance</strong>
              <p className="mt-1">El envío a notaría se registra con su fecha. Una vez registrada la fecha de envío, la actividad cambia automáticamente a Sede notarial, siempre que estén los tres documentos requeridos.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">2. Validaciones del envío a notario</h3>
              <p className="mt-1 text-sm text-slate-500">Condiciones que deben comprobarse al preparar el envío.</p>
            </div>

            <Opcion
              checked={validarFechaEnvio}
              onChange={(v) => { setValidarFechaEnvio(v); setMensaje(""); }}
              titulo="Validar fecha de envío frente al protocolo"
              descripcion="Si la escritura ya está firmada, la fecha de envío no puede ser posterior a la fecha del protocolo. Si todavía no está firmada, se permite introducir la fecha de envío."
            />
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800">Datos de facturación</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">No bloqueantes</span>
                <span className="text-xs text-slate-500">Pendientes de cumplimentar</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-500">No serán obligatorios para permitir el envío, pero el sistema debe advertir si faltan datos de facturación para que se completen.</p>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={avisoFacturacion} onChange={(e) => { setAvisoFacturacion(e.target.checked); setMensaje(""); }} className="h-4 w-4 accent-indigo-600" />
                Mostrar aviso si faltan datos de facturación
              </label>
            </div>
            <Opcion
              checked={exigirNotario}
              onChange={(v) => { setExigirNotario(v); setMensaje(""); }}
              titulo="Exigir notario informado"
              descripcion="No permitir completar el envío si no se ha indicado el notario."
            />
            <Opcion
              checked={exigirTipoDocumento}
              onChange={(v) => { setExigirTipoDocumento(v); setMensaje(""); }}
              titulo="Exigir tipo de documento"
              descripcion="No permitir completar el envío si falta el tipo de documento."
            />
          </div>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">3. Integración con ICAM I / ABSIS</p>
              <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-500">Al entrar en Sede notarial, la integración debe enviar a ABSIS los campos y repositorios digitales de la ventana modal «Datos de actividad». Esta integración queda identificada como trabajo técnico pendiente; todavía no se realiza ningún envío externo desde esta pantalla.</p>
            </div>
            <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Pendiente de desarrollo API</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Regla 02</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">Sede notarial → Sede notarial con protocolo</h2>
            <p className="mt-1 text-sm text-slate-500">La fecha de firma y el protocolo se reciben desde ApoderaGest cuando el apoderado informa de la firma de la escritura.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Integración pendiente</span>
        </div>
        <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
          <Condicion titulo="Origen de los datos" texto="ApoderaGest debe informar la fecha de firma y el número de protocolo del expediente." />
          <Condicion titulo="Condición de avance" texto="Cuando la fecha de firma y el protocolo estén informados y validados, la actividad pasa a Sede notarial con protocolo." />
          <Condicion titulo="Al entrar en Sede notarial" texto="Enviar a ABSIS los campos y repositorios digitales definidos en el modal Datos de actividad." />
          <Condicion titulo="Control de integridad" texto="Si falta la fecha de firma o el protocolo, el expediente permanece en Sede notarial y se muestra qué dato falta." />
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <p className="text-sm leading-5 text-slate-600">Pendiente del técnico: conectar el evento de ApoderaGest, validar los datos recibidos y desarrollar el envío de datos a ABSIS con trazabilidad de errores.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Regla 03</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">Sede notarial con protocolo → Liquidación impuestos</h2>
            <p className="mt-1 text-sm text-slate-500">Validación de campos y documentos recibidos desde NotarGest / Visión Notarios.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">OCR/PDF pendiente</span>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Campos que deben estar informados</h3>
            <p className="mt-1 text-sm text-slate-500">No se avanza de actividad hasta que todos los campos obligatorios estén detectados o validados.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["Notario", "NIF del notario", "Gestoría", "Fecha de presentación", "Entrada", "Asiento", "Diario"].map((campo) => (
              <div key={campo} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />{campo}
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Condicion titulo="Documentos requeridos" texto="Copia simple y hoja de presentación deben estar subidas en los repositorios de NotarGest / Visión Notarios." />
            <Condicion titulo="Extracción de datos PDF" texto="Un proceso de lectura/extracción debe detectar los campos en los PDF y asociarlos al expediente. Los datos detectados deben poder revisarse y corregirse si la extracción no es fiable." />
            <Condicion titulo="Condición de avance" texto="Solo pasar a Liquidación impuestos cuando estén presentes ambos documentos y todos los campos obligatorios estén completos y validados." />
            <Condicion titulo="Si falta información" texto="Mantener Sede notarial con protocolo, mostrar los campos o documentos pendientes y no avanzar automáticamente." />
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <p className="text-sm leading-5 text-slate-600">Pendiente del técnico: conexión con NotarGest / Visión Notarios, extracción PDF/OCR, validación de campos, detección de documentos y pruebas con expedientes reales.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Actividad condicional · entre liquidación y tramitación</p>
          <h2 className="mt-1 text-lg font-bold text-slate-800">Defectos registrales</h2>
          <p className="mt-1 text-sm text-slate-600">No forma parte obligatoria del recorrido. Solo se activa si el Registro de la Propiedad notifica un defecto registral.</p>
        </div>
        <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
          <Condicion titulo="Si no hay notificación" texto="El expediente continúa directamente desde Liquidación impuestos a Tramitación inscripción y puede llegar al cierre sin pasar por Defectos registrales." />
          <Condicion titulo="Si el Registro notifica un defecto" texto="Activar la actividad Defectos registrales, registrar la notificación y su fecha, y gestionar el defecto y su subsanación. La actividad no debe activarse por defecto en todos los expedientes." />
          <Condicion titulo="Reanudación del flujo" texto="Una vez subsanado y documentado el defecto, el expediente puede continuar hacia Tramitación inscripción, manteniendo el historial y los documentos vinculados." />
          <Condicion titulo="Control de cierre" texto="Antes de cerrar, comprobar que no quedan defectos registrales abiertos. El backend ya contiene una validación de bloqueo en una ruta de cierre documental; debe comprobarse que cubre todos los caminos de cierre." />
        </div>
        <div className="border-t border-amber-100 bg-amber-50/40 px-5 py-4 sm:px-6">
          <p className="text-sm leading-5 text-slate-600">Pendiente de revisión: comprobar activación por notificación real, alta/edición, subsanación, historial y bloqueo de cierre con defectos abiertos.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Regla 04</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">Liquidación impuestos → Tramitación inscripción</h2>
            <p className="mt-1 text-sm text-slate-500">La liquidación tributaria debe quedar documentada y con todos los datos de actividad cumplimentados antes de avanzar.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">Extracción PDF pendiente</span>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Campos obligatorios en Datos de actividad</h3>
            <p className="mt-1 text-sm text-slate-500">Todos deben estar cumplimentados y validados para cerrar Liquidación impuestos.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["Fecha de presentación en oficina liquidadora", "Fecha de liquidación tributaria", "Base imponible", "Oficina liquidadora (desplegable existente)", "Tributo exento (desplegable existente)", "Documento AJD/ITP"].map((campo) => (
              <div key={campo} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />{campo}
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Condicion titulo="Origen del documento" texto="El AJD/ITP puede llegar desde NotarGest / Visión Notarios o ser subido directamente por el equipo Molsan para escrituras de cancelación gestionadas personalmente." />
            <Condicion titulo="Lectura automática del PDF" texto="Al detectar o subir el documento, el lector PDF/OCR debe extraer la fecha de presentación, fecha de liquidación tributaria, base imponible, oficina liquidadora y situación de exención, y proponerlos en los campos existentes." />
            <Condicion titulo="Condición de avance" texto="Pasar a Tramitación inscripción solo cuando el documento AJD/ITP esté adjunto, todos los campos estén completos y la validación de fechas sea correcta." />
            <Condicion titulo="Fecha en Tramitación inscripción" texto="La fecha de presentación de Tramitación inscripción debe copiarse de la fecha de liquidación tributaria y nunca puede ser anterior a esta." />
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-900">
            <strong>Validación de fechas pendiente de confirmación</strong>
            <p className="mt-1">La regla debe impedir fechas incoherentes. En tu mensaje hay una contradicción: indicas que la fecha de presentación en Liquidación impuestos nunca debe ser igual o anterior a la fecha de liquidación tributaria, pero después indicas que la fecha de liquidación tributaria nunca puede ser anterior a la fecha de presentación. No se activará una validación automática de esta pareja de fechas hasta confirmar cuál de las dos condiciones es la correcta.</p>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <p className="text-sm leading-5 text-slate-600">Pendiente del técnico: conexión con repositorios, lectura PDF/OCR, revisión de valores extraídos, detección de campos vacíos y pruebas de la transición a Tramitación inscripción.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Regla 05</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800">Tramitación inscripción → Control de calidad → Cierre de expediente</h2>
            <p className="mt-1 text-sm text-slate-500">Control de calidad se consulta antes del cierre; es una comprobación informativa del estado real y no una actividad obligatoria por la que deba pasar todo expediente.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">PDF/OCR y transición pendientes</span>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Campos y condiciones de la actividad</h3>
            <p className="mt-1 text-sm text-slate-500">La fecha de presentación se hereda de la actividad anterior y la fecha de vencimiento se calcula automáticamente según la regla de vencimiento configurada para la actividad.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["Fecha de presentación (heredada de Liquidación impuestos)", "Fecha de vencimiento (automática)", "Fecha de inscripción (manual o extraída del PDF)", "Hoja de inscripción en Carpeta digital"].map((campo) => (
              <div key={campo} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />{campo}
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Condicion titulo="Origen de la Hoja de inscripción" texto="El documento PDF debe estar subido en la Carpeta digital del expediente, dentro del repositorio denominado exactamente «Hoja de inscripción»." />
            <Condicion titulo="Lectura PDF/OCR" texto="Al detectar la Hoja de inscripción, el lector PDF debe intentar extraer la fecha de inscripción y proponerla en el campo existente. El usuario podrá revisar/corregir el dato o introducirlo manualmente si la extracción falla." />
            <Condicion titulo="Condición previa al cierre" texto="Cuando la Hoja de inscripción esté adjunta y la fecha de inscripción esté informada y validada, el expediente queda preparado para el control de calidad y el cierre, según las validaciones vigentes." />
            <Condicion titulo="Fecha de vencimiento" texto="Se calcula automáticamente a partir de la fecha de presentación heredada. El cálculo debe reutilizar la regla vigente de vencimiento de Tramitación inscripción y verificarse en las pruebas; no duplicar ni inventar una fórmula distinta." />
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <p className="text-sm leading-5 text-slate-600">Anotación para el técnico: preparar la integración/API con el Colegio de Registradores para la comunicación/consulta registral. Queda pendiente de especificación técnica, credenciales y documentación oficial; no se ejecuta ninguna llamada externa desde esta pantalla.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[22px] border border-amber-200 bg-white shadow-sm">
        <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-4 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Pendientes de revisión técnica</p>
          <h2 className="mt-1 text-lg font-bold text-slate-800">Cierre de expediente, Gestión económica y Efectos</h2>
          <p className="mt-1 text-sm text-slate-600">Estas reglas quedan documentadas para el técnico y no deben darse por implementadas hasta revisar el comportamiento real.</p>
        </div>
        <div className="grid gap-4 p-5 sm:p-6 md:grid-cols-2">
          <Condicion titulo="Control de calidad antes del cierre" texto="Revisar la pestaña y sus reglas existentes: cambios de estado, campos obligatorios cumplimentados, documentos adjuntos y consistencia global del expediente. Debe ofrecer una fotografía fiable del expediente antes de pulsar «Liquidar». No crear una checklist paralela: reutilizar la comprobación existente que ya se muestra en el modal Liquidar expediente. La revisión visual no convierte por sí sola esta actividad en un paso obligatorio del flujo." />
          <Condicion titulo="Revisar reglas de Cierre de expediente y botón «Liquidar»" texto="Comprobar cómo interactúan el control de calidad, la generación y aceptación del PDF de cierre documental, la factura definitiva de honorarios, los saldos y el cierre final. Evitar cierres prematuros o duplicados. El modal actual exige aceptar y guardar el PDF antes de confirmar el cierre; debe probarse el comportamiento completo." />
          <Condicion titulo="Gestión económica · actividad independiente" texto="No sigue el orden lineal de las actividades. Funciona en paralelo durante la vida del expediente como gestión contable central: puede recibir facturas de NotarGest (notaría) y de Tramitación inscripción (Registro), pero adjuntar una factura no equivale a pagarla. El estado pagado debe proceder de movimientos de pago reales registrados desde Gestión económica." />
          <Condicion titulo="Actividad Efectos" texto="Pendiente de especificar y revisar con el técnico: identificar el origen de los datos/documentos, las condiciones de entrada y salida, y sus relaciones con la gestión económica y el cierre. No crear automatismos hasta validar el flujo actual." />
          <Condicion titulo="Integración con el Colegio de Registradores" texto="Anotación técnica pendiente: estudiar API/servicio disponible, autenticación, campos necesarios, documentos intercambiados, errores, trazabilidad y entorno de pruebas. No asumir que existe una conexión operativa hasta comprobarla." />
        </div>
      </section>

      {mensaje && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">{mensaje}</div>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-xs leading-5 text-slate-500">La configuración se guarda en el ERP y se recupera al volver a entrar. Guardarla no activa por sí sola automatismos ni modifica expedientes; la aplicación efectiva de cada regla se valida por separado.</p>
        <button type="button" onClick={guardarVista} disabled={cargando || guardando} className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{cargando ? "Cargando..." : guardando ? "Guardando..." : "Guardar reglas"}</button>
      </div>
    </main>
  );
}

function Condicion({ titulo, texto }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-800">{titulo}</p>
      <p className="mt-1 text-sm leading-5 text-slate-500">{texto}</p>
    </div>
  );
}

function Resumen({ icono, titulo, valor }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-xl">{icono}</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{titulo}</p>
          <p className="mt-1 text-base font-bold text-slate-800">{valor}</p>
        </div>
      </div>
    </div>
  );
}

function Opcion({ checked, onChange, titulo, descripcion }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-indigo-200 hover:bg-indigo-50/30">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600" />
      <span>
        <span className="block text-sm font-semibold text-slate-800">{titulo}</span>
        <span className="mt-1 block text-sm leading-5 text-slate-500">{descripcion}</span>
      </span>
    </label>
  );
}
