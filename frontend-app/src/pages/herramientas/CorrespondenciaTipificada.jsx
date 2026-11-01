import { useCallback, useEffect, useMemo, useState } from "react";
import "../../css/ModalesHerramientasPremium.css";
import "../../css/CatalogosMaestrosPremium.css";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../../api/axios";

const PLANTILLA_VACIA = {
  nombre: "",
  categoria: "General",
  asunto: "",
  destinatario: "",
  cc: "",
  cuerpo: "",
  activo: true,
};

const CATEGORIAS = [
  "General",
  "Documentación",
  "Firma y notaría",
  "Defectos registrales",
  "Liquidación e impuestos",
  "Inscripción registral",
  "Provisión de fondos",
  "Honorarios y facturación",
  "Cierre de expediente",
  "Avisos y reclamaciones",
];

function insertarCampos(texto, contexto) {
  return String(texto || "").replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (coincidencia, clave) => {
    const valor = contexto[clave];
    return valor === undefined || valor === null || String(valor).trim() === ""
      ? "[[FALTA: " + clave + "]]"
      : String(valor);
  });
}

function extraerCampos(texto) {
  return Array.from(new Set(Array.from(String(texto || "").matchAll(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g), (m) => m[1])));
}

function Campo({ etiqueta, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{etiqueta}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export default function CorrespondenciaTipificada() {
  const [searchParams] = useSearchParams();
  const [plantillas, setPlantillas] = useState([]);
  const [campos, setCampos] = useState([]);
  const [plantilla, setPlantilla] = useState({ ...PLANTILLA_VACIA });
  const [plantillaId, setPlantillaId] = useState(null);
  const [numeroExpediente, setNumeroExpediente] = useState(searchParams.get("expediente") || "");
  const [expedienteContexto, setExpedienteContexto] = useState(null);
  const [contexto, setContexto] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [cargandoExpediente, setCargandoExpediente] = useState(false);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [vistaFicha, setVistaFicha] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [plantillasRes, camposRes] = await Promise.all([
        axios.get("/utilidades/correspondencia/plantillas"),
        axios.get("/utilidades/correspondencia/campos"),
      ]);
      setPlantillas(Array.isArray(plantillasRes.data) ? plantillasRes.data : []);
      setCampos(Array.isArray(camposRes.data) ? camposRes.data : []);
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo cargar Correspondencia tipificada.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cargarContexto = useCallback(async (numero) => {
    const limpio = String(numero || "").trim();
    if (!limpio) {
      setError("Introduce el número de expediente para cargar sus datos.");
      return;
    }
    setCargandoExpediente(true);
    setError("");
    setMensaje("");
    try {
      const res = await axios.get("/utilidades/correspondencia/expediente", {
        params: { numero_expediente: limpio },
      });
      setExpedienteContexto(res.data.numero_expediente);
      setContexto(res.data.contexto || {});
      setNumeroExpediente(res.data.numero_expediente || limpio);
      setMensaje("Datos del expediente cargados correctamente.");
    } catch (err) {
      setExpedienteContexto(null);
      setContexto({});
      setError(err?.response?.data?.detail || "No se han podido cargar los datos del expediente.");
    } finally {
      setCargandoExpediente(false);
    }
  }, []);

  useEffect(() => {
    const numeroInicial = searchParams.get("expediente");
    if (numeroInicial) cargarContexto(numeroInicial);
  }, [searchParams, cargarContexto]);

  const plantillasFiltradas = useMemo(() => plantillas.filter((item) => {
    const coincideTexto = (item.nombre + " " + item.asunto + " " + item.categoria)
      .toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es"));
    const coincideCategoria = categoriaFiltro === "Todas" || item.categoria === categoriaFiltro;
    return coincideTexto && coincideCategoria;
  }), [plantillas, busqueda, categoriaFiltro]);

  const camposUsados = useMemo(() => extraerCampos(plantilla.asunto + "\n" + plantilla.destinatario + "\n" + plantilla.cc + "\n" + plantilla.cuerpo), [plantilla]);
  const faltantes = useMemo(() => camposUsados.filter((clave) => !String(contexto[clave] ?? "").trim()), [camposUsados, contexto]);

  function nuevaPlantilla() {
    setVistaFicha(true);
    setPlantilla({ ...PLANTILLA_VACIA });
    setPlantillaId(null);
    setMostrarVistaPrevia(false);
    setMensaje("");
    setError("");
  }

  function editarPlantilla(item) {
    setVistaFicha(true);
    setPlantilla({
      nombre: item.nombre || "",
      categoria: item.categoria || "General",
      asunto: item.asunto || "",
      destinatario: item.destinatario || "",
      cc: item.cc || "",
      cuerpo: item.cuerpo || "",
      activo: item.activo !== false,
    });
    setPlantillaId(item.id);
    setMostrarVistaPrevia(false);
    setMensaje("");
    setError("");
  }

  function actualizar(campo, valor) {
    setPlantilla((actual) => ({ ...actual, [campo]: valor }));
  }

  function insertarCampo(clave) {
    const token = "{{" + clave + "}}";
    const area = document.getElementById("correspondencia-cuerpo");
    if (area && typeof area.selectionStart === "number") {
      const inicio = area.selectionStart;
      const fin = area.selectionEnd;
      const nuevoTexto = plantilla.cuerpo.slice(0, inicio) + token + plantilla.cuerpo.slice(fin);
      actualizar("cuerpo", nuevoTexto);
      requestAnimationFrame(() => {
        area.focus();
        area.setSelectionRange(inicio + token.length, inicio + token.length);
      });
    } else {
      actualizar("cuerpo", plantilla.cuerpo + token);
    }
  }

  async function guardarPlantilla() {
    if (!plantilla.nombre.trim()) {
      setError("Escribe un nombre para la plantilla.");
      return;
    }
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const payload = { ...plantilla, nombre: plantilla.nombre.trim() };
      const res = plantillaId
        ? await axios.put("/utilidades/correspondencia/plantillas/" + plantillaId, payload)
        : await axios.post("/utilidades/correspondencia/plantillas", payload);
      await cargar();
      editarPlantilla(res.data);
      setMensaje("Plantilla guardada correctamente.");
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo guardar la plantilla.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarPlantilla() {
    if (!plantillaId || !window.confirm("¿Quieres eliminar esta plantilla? Esta acción no se puede deshacer.")) return;
    setError("");
    setMensaje("");
    try {
      await axios.delete("/utilidades/correspondencia/plantillas/" + plantillaId);
      setVistaFicha(false);
      setPlantilla({ ...PLANTILLA_VACIA });
      setPlantillaId(null);
      setMostrarVistaPrevia(false);
      await cargar();
      setMensaje("Plantilla eliminada.");
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo eliminar la plantilla.");
    }
  }

  function duplicarPlantilla() {
    setPlantilla((actual) => ({ ...actual, nombre: actual.nombre ? actual.nombre + " (copia)" : "Copia de plantilla" }));
    setPlantillaId(null);
    setMensaje("Se ha creado una copia en el editor. Guárdala para incorporarla al catálogo.");
  }

  const asuntoFinal = insertarCampos(plantilla.asunto, contexto);
  const destinatarioFinal = insertarCampos(plantilla.destinatario, contexto);
  const ccFinal = insertarCampos(plantilla.cc, contexto);
  const cuerpoFinal = insertarCampos(plantilla.cuerpo, contexto);
  const hayFaltantes = !expedienteContexto || faltantes.length > 0;

  async function abrirCorreo() {
    if (hayFaltantes) {
      setError("Carga un expediente y completa los campos obligatorios antes de preparar el correo.");
      return;
    }
    try {
      const { data } = await axios.get("/utilidades/correspondencia/firma");
      const bloquesFirma = [data.firma_personal, data.firma_pie].filter((x) => String(x || "").trim());
      const cuerpoConFirma = [cuerpoFinal, ...bloquesFirma].filter((x) => String(x || "").trim()).join("\n\n");
      const url = "mailto:" + encodeURIComponent(destinatarioFinal) +
        "?subject=" + encodeURIComponent(asuntoFinal) +
        (ccFinal ? "&cc=" + encodeURIComponent(ccFinal) : "") +
        "&body=" + encodeURIComponent(cuerpoConFirma);
      window.location.href = url;
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo cargar la firma corporativa. No se ha abierto el correo.");
    }
  }

  return (
    <div className="correspondencia-tipificada-premium herramientas-subpagina-premium min-h-full space-y-5 p-4 pb-10 sm:p-6 lg:p-8 animate-fadeIn">
      <header className="molsan-page-header relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-2xl">✉️</div>
            <div>
              <Link to="/herramientas/catalogos" className="text-xs font-bold text-blue-600 hover:text-blue-700">← Volver a Catálogos</Link>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Correspondencia tipificada</h1>
              <p className="mt-1 text-sm text-slate-500">Plantillas reutilizables con campos vinculados a los expedientes.</p>
            </div>
          </div>
          <button type="button" onClick={nuevaPlantilla} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">＋ Nueva plantilla</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}
      {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{mensaje}</div>}

      {!vistaFicha ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><h2 className="text-lg font-bold text-slate-800">Plantillas creadas</h2><p className="mt-1 text-sm text-slate-500">Consulta y administra los modelos de correspondencia del ERP.</p></div>
            <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">{plantillas.length} plantillas</span>
          </div>
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(0,1fr)_240px]">
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, asunto o tipología…" className={inputClass} />
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className={inputClass}><option value="Todas">Todas las tipologías</option>{CATEGORIAS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
          </div>
          {cargando ? <p className="p-8 text-center text-sm text-slate-400">Cargando plantillas…</p> : plantillasFiltradas.length === 0 ? (
            <div className="p-10 text-center"><div className="text-3xl">✉️</div><h3 className="mt-3 font-bold text-slate-800">{plantillas.length ? "No hay plantillas que coincidan" : "Todavía no hay plantillas creadas"}</h3><p className="mt-1 text-sm text-slate-500">{plantillas.length ? "Prueba con otra búsqueda o categoría." : "Pulsa «Nueva plantilla» para crear el primer modelo de correspondencia."}</p>{!plantillas.length && <button type="button" onClick={nuevaPlantilla} className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">＋ Nueva plantilla</button>}</div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-bold">Nombre de la plantilla</th><th className="px-5 py-3 font-bold">Tipología / proceso</th><th className="px-5 py-3 font-bold">Asunto</th><th className="px-5 py-3 font-bold">Estado</th><th className="px-5 py-3 text-right font-bold">Acciones</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{plantillasFiltradas.map((item) => <tr key={item.id} className="transition hover:bg-blue-50/40">
                <td className="px-5 py-4"><span className="block font-bold text-slate-800">{item.nombre || "Sin nombre"}</span><span className="mt-1 block text-xs text-slate-400">Modelo de correo reutilizable</span></td>
                <td className="px-5 py-4 text-slate-600">{item.categoria || "General"}</td>
                <td className="max-w-[280px] px-5 py-4 text-slate-600"><span className="block truncate" title={item.asunto || ""}>{item.asunto || "Sin asunto"}</span></td>
                <td className="px-5 py-4"><span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-bold " + (item.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{item.activo ? "Activa" : "Inactiva"}</span></td>
                <td className="px-5 py-4 text-right"><button type="button" onClick={() => editarPlantilla(item)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100">↗ Acceder a la ficha</button></td>
              </tr>)}</tbody>
            </table></div>
          )}
          <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500">Las plantillas inactivas se conservan en el catálogo y se identifican claramente.</div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Catálogo de correspondencia</p><h2 className="mt-1 text-xl font-bold text-slate-800">{plantillaId ? "Ficha de plantilla" : "Nueva plantilla"}</h2></div><button type="button" onClick={() => { setVistaFicha(false); setMostrarVistaPrevia(false); setError(""); setMensaje(""); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">← Volver al catálogo</button></div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-bold text-slate-800">Catálogo de plantillas</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{plantillas.length}</span>
            </div>
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar plantilla…" className={inputClass} />
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className={inputClass + " mt-2"}>
              <option value="Todas">Todas las categorías</option>
              {CATEGORIAS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="mt-3 space-y-2">
              {cargando ? <p className="p-4 text-center text-sm text-slate-400">Cargando plantillas…</p> :
                plantillasFiltradas.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-400">No hay plantillas para este filtro. Crea una nueva para empezar.</p> :
                plantillasFiltradas.map((item) => (
                  <button key={item.id} type="button" onClick={() => editarPlantilla(item)} className={"w-full rounded-xl border p-3 text-left transition " + (plantillaId === item.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50")}>
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-800">{item.nombre}</span>
                        <span className="mt-1 block text-xs text-slate-500">{item.categoria || "General"}</span>
                      </span>
                      <span className={"mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold " + (item.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{item.activo ? "Activa" : "Inactiva"}</span>
                    </span>
                    <span className="mt-2 block truncate text-xs text-slate-500">{item.asunto || "Sin asunto"}</span>
                  </button>
                ))}
            </div>
          </section>
          <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <h3 className="text-sm font-bold text-blue-900">Cómo insertar datos</h3>
            <p className="mt-1 text-xs leading-5 text-blue-800">Coloca el cursor en el cuerpo del email y pulsa un campo. El ERP lo guardará como marcador y lo sustituirá por el dato real al generar la vista previa.</p>
            <p className="mt-2 text-xs text-blue-800">Ejemplo: <code>{"{{expediente.numero}}"}</code></p>
          </section>
        </aside>

        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{plantillaId ? "Editar plantilla" : "Nueva plantilla"}</h2>
                <p className="mt-1 text-xs text-slate-500">Los marcadores se escriben con doble llave, por ejemplo {"{{solicitante.nombre}}"}.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input type="checkbox" checked={plantilla.activo} onChange={(e) => actualizar("activo", e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Plantilla activa
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Campo etiqueta="Nombre de la plantilla">
                <input value={plantilla.nombre} onChange={(e) => actualizar("nombre", e.target.value)} placeholder="Ej. Solicitud de documentación pendiente" className={inputClass} />
              </Campo>
              <Campo etiqueta="Tipología / proceso">
                <select value={plantilla.categoria} onChange={(e) => actualizar("categoria", e.target.value)} className={inputClass}>
                  {CATEGORIAS.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Destinatario (email o campo dinámico)">
                <input value={plantilla.destinatario} onChange={(e) => actualizar("destinatario", e.target.value)} placeholder="cliente@ejemplo.es o {{solicitante.email}}" className={inputClass} />
              </Campo>
              <Campo etiqueta="Con copia (CC)">
                <input value={plantilla.cc} onChange={(e) => actualizar("cc", e.target.value)} placeholder="Opcional" className={inputClass} />
              </Campo>
              <div className="md:col-span-2">
                <Campo etiqueta="Asunto del email">
                  <input value={plantilla.asunto} onChange={(e) => actualizar("asunto", e.target.value)} placeholder="Documentación pendiente · Expediente {{expediente.numero}}" className={inputClass} />
                </Campo>
              </div>
              <div className="md:col-span-2">
                <Campo etiqueta="Cuerpo del email">
                  <textarea id="correspondencia-cuerpo" value={plantilla.cuerpo} onChange={(e) => actualizar("cuerpo", e.target.value)} rows={12} placeholder={"Estimados señores:\n\nEn relación con el expediente {{expediente.numero}}, correspondiente a {{solicitante.nombre}}, les informamos de que…\n\nAtentamente,\nGestoría MOLSAN"} className={inputClass + " resize-y leading-6"} />
                </Campo>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">Insertar campo dinámico</h3>
                <span className="text-[11px] text-slate-400">{campos.length} campos disponibles</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {campos.map((campo) => <button key={campo.clave} type="button" title={"Insertar " + campo.clave} onClick={() => insertarCampo(campo.clave)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">{campo.etiqueta}</button>)}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={guardarPlantilla} disabled={guardando} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{guardando ? "Guardando…" : "💾 Guardar plantilla"}</button>
              <button type="button" onClick={() => setMostrarVistaPrevia((v) => !v)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">👁 Vista previa</button>
              {plantillaId && <button type="button" onClick={duplicarPlantilla} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">⧉ Duplicar</button>}
              {plantillaId && <button type="button" onClick={eliminarPlantilla} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100">Eliminar</button>}
            </div>
          </section>

          {mostrarVistaPrevia && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-800">Vista previa y generación</h2>
                <p className="mt-1 text-sm text-slate-500">Carga un expediente para sustituir los marcadores por datos reales.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={numeroExpediente} onChange={(e) => setNumeroExpediente(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") cargarContexto(numeroExpediente); }} placeholder="Número de expediente" className={inputClass + " min-w-0 flex-1"} />
                <button type="button" onClick={() => cargarContexto(numeroExpediente)} disabled={cargandoExpediente} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 disabled:opacity-50">{cargandoExpediente ? "Buscando…" : "Cargar expediente"}</button>
              </div>
              {expedienteContexto && <p className="mt-2 text-xs font-semibold text-emerald-700">Expediente cargado: {expedienteContexto}</p>}
              {faltantes.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-bold text-amber-800">Campos sin valor en este expediente</p><p className="mt-1 text-xs text-amber-800">{faltantes.join(", ")}</p><p className="mt-1 text-[11px] text-amber-700">Revisa los datos o modifica la plantilla antes de preparar el correo.</p></div>}
              <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
                <div><span className="text-xs font-bold uppercase text-slate-400">Para</span><p className="mt-1 break-words text-sm text-slate-700">{destinatarioFinal || "—"}</p></div>
                {ccFinal && <div><span className="text-xs font-bold uppercase text-slate-400">CC</span><p className="mt-1 break-words text-sm text-slate-700">{ccFinal}</p></div>}
                <div><span className="text-xs font-bold uppercase text-slate-400">Asunto</span><p className="mt-1 break-words text-sm font-semibold text-slate-800">{asuntoFinal || "—"}</p></div>
                <div className="border-t border-slate-100 pt-3"><span className="text-xs font-bold uppercase text-slate-400">Mensaje</span><pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">{cuerpoFinal || "Escribe el cuerpo del email para ver la vista previa."}</pre></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={abrirCorreo} disabled={hayFaltantes} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Abrir en mi correo</button>
                <span className="text-xs text-slate-500">Se abrirá tu aplicación de correo con el mensaje preparado; el envío se confirma desde esa aplicación.</span>
              </div>
            </section>
          )}
        </main>
      </div>
        </>
      )}
    </div>
  );
}
