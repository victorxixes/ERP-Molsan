import { useCallback, useMemo, useState } from "react";
import axios from "../../api/axios";
import { API_BASE } from "../../api/config";
import { puedeVerModulo } from "../../utils/permisos";

import "../../css/ComponentesOperativosPremium.css";

/**
 * MANTENIMIENTO TÉCNICO — MOLSAN ERP PREMIUM 2027
 *
 * Usa el cliente Axios del ERP para conservar el token JWT.
 * Las rutas /debug/* están fuera del prefijo /api en el backend;
 * por eso se construye la URL raíz a partir de API_BASE.
 *
 * IMPORTANTE:
 * - No ejecuta operaciones automáticamente al abrir la página.
 * - Las migraciones requieren confirmación expresa.
 * - No incluye operaciones destructivas como borrar tablas o resetear la intranet.
 */

const API_ORIGIN = String(API_BASE || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const DIAGNOSTICOS = [
  {
    id: "salud",
    titulo: "Estado del backend y de la base de datos",
    descripcion: "Comprueba que el backend responde y que puede consultar la base de datos.",
    metodo: "GET",
    url: `${API_ORIGIN}/debug/health`,
  },
  {
    id: "resumen",
    titulo: "Resumen técnico de la base de datos",
    descripcion: "Consulta versión de PostgreSQL, tamaño de la base de datos, número de tablas, conexiones activas y sesiones bloqueadas.",
    metodo: "GET",
    url: `${API_ORIGIN}/debug/resumen`,
  },
  {
    id: "tablas",
    titulo: "Tablas de la base de datos",
    descripcion: "Lista las tablas del esquema actual. Solo consulta metadatos.",
    metodo: "GET",
    url: `${API_ORIGIN}/debug/tablas`,
  },
  {
    id: "bloqueos",
    titulo: "Bloqueos de base de datos",
    descripcion: "Consulta las sesiones que están esperando un bloqueo, sin mostrar datos de negocio.",
    metodo: "GET",
    url: `${API_ORIGIN}/debug/bloqueos`,
  },
];

const MIGRACIONES = [
  {
    id: "actividades",
    titulo: "Migración de actividades de expedientes",
    descripcion:
      "Aplica la migración del flujo de actividades de expedientes.",
    endpoint: "/expedientes/migraciones/actividades",
    confirmar:
      "¿Quieres ejecutar la migración de actividades de expedientes? Revisa el resultado antes de repetirla.",
  },
  {
    id: "gastos",
    titulo: "Migración de gastos de expedientes",
    descripcion:
      "Ejecuta el proceso de migración de gastos disponible en el backend.",
    endpoint: "/expedientes/gastos/migracion/aplicar",
    confirmar:
      "¿Quieres ejecutar la migración de gastos de expedientes? Comprueba primero que sea necesario.",
  },
  {
    id: "unaccent",
    titulo: "Instalar extensión unaccent",
    descripcion:
      "Solicita al backend instalar la extensión PostgreSQL unaccent.",
    endpoint: "/admin/install-unaccent",
    confirmar:
      "¿Quieres solicitar la instalación de unaccent en PostgreSQL?",
  },
];

function obtenerMensajeError(error) {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (data?.detail) {
    return typeof data.detail === "string"
      ? data.detail
      : JSON.stringify(data.detail, null, 2);
  }
  if (data) return JSON.stringify(data, null, 2);
  return error?.message || "Se ha producido un error inesperado.";
}

function bloqueJson(valor) {
  if (typeof valor === "string") return valor;
  try {
    return JSON.stringify(valor, null, 2);
  } catch {
    return String(valor);
  }
}

export default function MantenimientoTecnico() {
  const [cargando, setCargando] = useState("");
  const [validacionTecnica, setValidacionTecnica] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorVisible, setErrorVisible] = useState("");
  const [tabla, setTabla] = useState("");
  const [limiteFilas, setLimiteFilas] = useState(25);
  const [filtroTabla, setFiltroTabla] = useState("");
  const [tablasDisponibles, setTablasDisponibles] = useState([]);
  const [cargandoTablas, setCargandoTablas] = useState(false);

  const accesoPermitido = puedeVerModulo("utilidades");

  const ejecutarGet = useCallback(async (id, titulo, url) => {
    setCargando(id);
    setValidacionTecnica(false);
    setResultado(null);
    setErrorVisible("");

    try {
      const res = await axios.get(url);
      setResultado({
        titulo,
        estado: res.status,
        fecha: new Date().toLocaleString("es-ES"),
        datos: res.data,
      });
    } catch (error) {
      setErrorVisible(obtenerMensajeError(error));
    } finally {
      setCargando("");
    }
  }, []);

  const cargarListaTablas = useCallback(async () => {
    setCargandoTablas(true);
    setValidacionTecnica(false);
    setErrorVisible("");
    try {
      const res = await axios.get(`${API_ORIGIN}/debug/tablas`);
      const lista = Array.isArray(res.data?.tablas) ? res.data.tablas : [];
      setTablasDisponibles(lista);
      if (!tabla && lista.length) setTabla(lista[0].table_name || "");
      setResultado({
        titulo: "Tablas disponibles en la base de datos",
        estado: res.status,
        fecha: new Date().toLocaleString("es-ES"),
        datos: res.data,
      });
    } catch (error) {
      setErrorVisible(obtenerMensajeError(error));
    } finally {
      setCargandoTablas(false);
    }
  }, [tabla]);

  const cargarDetalleTabla = useCallback(async (tipo) => {
    const nombre = tabla.trim();

    if (!nombre) {
      setErrorVisible("Selecciona o escribe el nombre de una tabla.");
      return;
    }

    // El nombre de tabla se codifica para no romper la URL.
    const rutas = {
      columnas: `${API_ORIGIN}/debug/describe/${encodeURIComponent(nombre)}`,
      indices: `${API_ORIGIN}/debug/indices/${encodeURIComponent(nombre)}`,
      claves: `${API_ORIGIN}/debug/claves-foraneas/${encodeURIComponent(nombre)}`,
      contenido: `${API_ORIGIN}/debug/contenido/${encodeURIComponent(nombre)}?limite=${Math.min(100, Math.max(1, Number(limiteFilas) || 25))}`,
    };

    const titulos = {
      columnas: `Columnas de ${nombre}`,
      indices: `Índices de ${nombre}`,
      claves: `Claves foráneas de ${nombre}`,
      contenido: `Vista previa de datos de ${nombre}`,
    };

    await ejecutarGet(`tabla-${tipo}`, titulos[tipo], rutas[tipo]);
  }, [tabla, limiteFilas, ejecutarGet]);

  const ejecutarMigracion = useCallback(async (item) => {
    const aceptado = window.confirm(item.confirmar);
    if (!aceptado) return;

    setCargando(item.id);
    setValidacionTecnica(false);
    setResultado(null);
    setErrorVisible("");

    try {
      const res = await axios.post(item.endpoint);
      setResultado({
        titulo: item.titulo,
        estado: res.status,
        fecha: new Date().toLocaleString("es-ES"),
        datos: res.data,
      });
    } catch (error) {
      setErrorVisible(obtenerMensajeError(error));
    } finally {
      setCargando("");
    }
  }, []);

  const ejecutarDiagnosticoCompleto = useCallback(async () => {
    setCargando("diagnostico-completo");
    setValidacionTecnica(false);
    setResultado(null);
    setErrorVisible("");
    try {
      const comprobaciones = await Promise.allSettled(
        DIAGNOSTICOS.map(async (item) => {
          const res = await axios.get(item.url);
          return {
            id: item.id,
            titulo: item.titulo,
            ok: true,
            http: res.status,
            datos: res.data,
          };
        })
      );
      const informe = comprobaciones.map((item, index) => {
        if (item.status === "fulfilled") return item.value;
        return {
          id: DIAGNOSTICOS[index].id,
          titulo: DIAGNOSTICOS[index].titulo,
          ok: false,
          error: obtenerMensajeError(item.reason),
        };
      });
      setValidacionTecnica(informe.every((item) => item.ok));
      setResultado({
        titulo: "Diagnóstico técnico completo",
        estado: informe.every((item) => item.ok) ? 200 : 207,
        fecha: new Date().toLocaleString("es-ES"),
        datos: {
          resumen: informe.every((item) => item.ok)
            ? "Todas las comprobaciones han respondido correctamente."
            : "Una o más comprobaciones han fallado. Revisa el detalle de cada resultado.",
          comprobaciones: informe,
        },
      });
    } catch (error) {
      setErrorVisible(obtenerMensajeError(error));
    } finally {
      setCargando("");
    }
  }, []);

  const tablaNormalizada = useMemo(
    () => filtroTabla.trim().toLowerCase(),
    [filtroTabla]
  );

  if (!accesoPermitido) {
    return (
      <div className="mantenimiento-tecnico-premium p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <div className="text-2xl">🔒 Acceso restringido</div>
          <p className="mt-2 text-sm text-slate-600">
            Tu usuario no tiene habilitado el módulo Utilidades. Si necesitas
            acceder, solicita que se active desde la ficha del empleado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="molsan-page-header relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <span>⚙️</span> HERRAMIENTAS DEL SISTEMA
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${validacionTecnica ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                <span className={`h-2 w-2 rounded-full ${validacionTecnica ? "bg-emerald-500" : "bg-amber-500"}`} />
                {validacionTecnica ? "Diagnóstico técnico correcto" : "Pendiente de validación técnica"}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Mantenimiento técnico
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Centro de diagnóstico y mantenimiento integrado en el ERP. Ejecuta primero las comprobaciones y revisa el resultado antes de realizar cambios.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(cargando)}
            onClick={ejecutarDiagnosticoCompleto}
            className="shrink-0 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-50"
          >
            {cargando === "diagnostico-completo" ? "Ejecutando diagnóstico…" : "▶ Ejecutar diagnóstico completo"}
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-xl">🔎</div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Diagnóstico rápido</h2>
              <p className="mt-1 text-sm text-slate-500">
                Consultas de solo lectura para revisar el estado técnico sin abrir herramientas externas.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {DIAGNOSTICOS.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{item.titulo}</div>
                  <p className="mt-1 text-sm text-slate-500">{item.descripcion}</p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(cargando)}
                  onClick={() => ejecutarGet(item.id, item.titulo, item.url)}
                  className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-50"
                >
                  {cargando === item.id ? "Consultando…" : "Consultar"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">🧱</div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Inspección de tablas</h2>
              <p className="mt-1 text-sm text-slate-500">
                Consulta la estructura de una tabla: columnas, índices y claves foráneas. Los endpoints están protegidos para administradores y no muestran filas ni datos personales.
              </p>
            </div>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="tabla-tecnica">
              Tabla de la base de datos
            </label>
            <button
              type="button"
              disabled={cargandoTablas || Boolean(cargando)}
              onClick={cargarListaTablas}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
            >
              {cargandoTablas ? "Cargando tablas…" : "Cargar lista real de tablas"}
            </button>
          </div>
          {tablasDisponibles.length > 0 ? (
            <select
              id="tabla-tecnica"
              value={tabla}
              onChange={(e) => setTabla(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Selecciona una tabla…</option>
              {tablasDisponibles
                .filter((item) => !tablaNormalizada || String(item.table_name || "").toLowerCase().includes(tablaNormalizada))
                .map((item) => (
                  <option key={item.table_name} value={item.table_name}>
                    {item.table_name}{item.table_type ? ` · ${item.table_type}` : ""}
                  </option>
                ))}
            </select>
          ) : (
            <input
              id="tabla-tecnica"
              value={tabla}
              onChange={(e) => setTabla(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") cargarDetalleTabla("columnas");
              }}
              placeholder="Carga la lista o escribe: expedientes"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          )}

          <label className="mb-2 mt-3 block text-sm font-semibold text-slate-700" htmlFor="filtro-tabla">
            Acceso rápido (tablas habituales)
          </label>
          <input
            id="filtro-tabla"
            value={filtroTabla}
            onChange={(e) => setFiltroTabla(e.target.value)}
            placeholder="Filtrar sugerencias…"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {["expedientes", "agenda_citas", "empleados", "expediente_defectos", "defecto_subtipos", "expediente_observaciones"]
              .filter((nombre) => !tablaNormalizada || nombre.includes(tablaNormalizada))
              .map((nombre) => (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => setTabla(nombre)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {nombre}
                </button>
              ))}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <label htmlFor="limite-filas-tecnico" className="mb-1 block text-xs font-semibold text-slate-600">
                Filas de vista previa (máximo 100)
              </label>
              <input
                id="limite-filas-tecnico"
                type="number"
                min="1"
                max="100"
                value={limiteFilas}
                onChange={(e) => setLimiteFilas(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                className="w-36 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["columnas", "Columnas"],
              ["indices", "Índices"],
              ["claves", "Claves foráneas"],
              ["contenido", "Vista previa de datos"],
            ].map(([tipo, etiqueta]) => (
              <button
                key={tipo}
                type="button"
                disabled={Boolean(cargando)}
                onClick={() => cargarDetalleTabla(tipo)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
              >
                {cargando === `tabla-${tipo}` ? "…" : etiqueta}
              </button>
            ))}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            La vista previa solo devuelve un máximo de 100 filas y oculta columnas cuyo nombre parece contener contraseñas, tokens o claves secretas. No permite modificar ni borrar datos.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl">⚠️</div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Migraciones y mantenimiento</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Estas acciones se ejecutan desde el ERP. Lee cada descripción y confirma expresamente antes de lanzar una migración o tarea de mantenimiento.
              No se ofrecen acciones para borrar tablas ni resetear la intranet.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {MIGRACIONES.map((item) => (
            <article key={item.id} className="flex flex-col justify-between gap-4 rounded-xl border border-white bg-white p-4 shadow-sm">
              <div>
                <h3 className="font-semibold text-slate-900">{item.titulo}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">{item.descripcion}</p>
                <code className="mt-2 inline-block break-all rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  Acción técnica protegida · requiere permiso administrativo
                </code>
              </div>
              <button
                type="button"
                disabled={Boolean(cargando)}
                onClick={() => ejecutarMigracion(item)}
                className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-50"
              >
                {cargando === item.id ? "Ejecutando…" : "Ejecutar con confirmación"}
              </button>
            </article>
          ))}
        </div>
      </section>

      {(resultado || errorVisible) && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className={`flex flex-col gap-2 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${errorVisible ? "border-rose-100 bg-rose-50" : "border-emerald-100 bg-emerald-50"}`}>
            <div>
              <h2 className={`font-bold ${errorVisible ? "text-rose-800" : "text-emerald-800"}`}>
                {errorVisible ? "La operación ha devuelto un error" : "Resultado de la operación"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {resultado ? `${resultado.titulo} · HTTP ${resultado.estado} · ${resultado.fecha}` : "Revisa el mensaje devuelto por el backend."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setResultado(null);
                setErrorVisible("");
              }}
              className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:self-auto"
            >
              Limpiar resultado
            </button>
          </div>
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words p-5 text-xs leading-5 text-slate-800">
            {errorVisible || bloqueJson(resultado?.datos)}
          </pre>
        </section>
      )}

      <footer className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
        Esta pantalla comprueba el permiso de módulo <strong>utilidades</strong>. Las consultas técnicas del backend exigen además autorización administrativa; las migraciones se ejecutan solo bajo confirmación. No se habilitan acciones para borrar tablas o restablecer datos.
      </footer>
    </main>
  );
}
