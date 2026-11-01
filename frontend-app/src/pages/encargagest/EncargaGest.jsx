import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalLogin from "../../components/PortalLogin";
import Sidebar from "../../components/Sidebar";
import "../../css/PortalProfesionalShared.css";
import "../../css/EncargaGest.css";
import axios, { configurarSesionEncargaGest, limpiarSesionEncargaGest } from "../../api/encargagest";
import { useAuthStore } from "../../store/authStore";

const ESTADOS = [
  { valor: "", texto: "Todos los estados" },
  { valor: "EN_PROCESO", texto: "Recibido · pendiente de autorizar" },
  { valor: "RECIBIDO", texto: "Recibido" },
  { valor: "AUTORIZADO", texto: "Autorizado" },
  { valor: "INCIDENCIA", texto: "Incidencia" },
];

const FILTROS_BANDEJA = [
  { valor: "", texto: "Todos los encargos" },
  { valor: "GRUPO_RECIBIDOS", texto: "Recibidos" },
  { valor: "GRUPO_AUTORIZADOS", texto: "Autorizados" },
  { valor: "GRUPO_INCIDENCIAS", texto: "Incidencias" },
];

const ESTILO_ESTADO = {
  EN_PROCESO: "border-amber-200 bg-amber-50 text-amber-800",
  RECIBIDO: "border-sky-200 bg-sky-50 text-sky-700",
  AUTORIZADO: "border-indigo-200 bg-indigo-50 text-indigo-700",
  INCIDENCIA: "border-rose-200 bg-rose-50 text-rose-700",
  FIRMADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const TEXTO_ESTADO = { EN_PROCESO: "Recibido", RECIBIDO: "Recibido", AUTORIZADO: "Autorizado", INCIDENCIA: "Incidencia", FIRMADO: "Firma pendiente de integración", EN_REVISION: "Recibido", DOCUMENTACION_PENDIENTE: "Recibido", EN_GESTION: "Recibido", RESUELTO: "Firma pendiente de integración", CERRADO: "Firma pendiente de integración" };

const NUEVO_ENCARGO = {
  notaria_id: "",
  tipo_encargo: "Cancelación hipotecaria",
  prioridad: "Normal",
  titular: "",
  nif_titular: "",
  entidad_bancaria: "",
  numero_prestamo: "",
  capital_inscrito: "",
  fecha_constitucion: "",
  numero_finca: "",
  municipio_registro: "",
  registro_propiedad: "",
  observaciones: "",
  contratos: [{ entidad_bancaria: "", numero_prestamo: "", fecha_constitucion: "", fincas: [{ numero_finca: "", capital_inscrito: "", numero_inscripcion: "", seccion: "", municipio_registro: "", registro_propiedad: "" }] }],
};

const CATEGORIAS_DOCUMENTO = [
  {
    nombre: "Hoja de solicitud",
    descripcion: "Formulario de solicitud firmado",
    icono: "01",
  },
  {
    nombre: "Certificado de saldo cero / deuda",
    descripcion: "Certificado emitido por la entidad bancaria",
    icono: "02",
  },
  {
    nombre: "Nota simple registral (vigencia de 3 meses)",
    descripcion: "Nota simple actualizada del Registro de la Propiedad",
    icono: "03",
  },
  {
    nombre: "Otros",
    descripcion: "Documentos complementarios del expediente",
    icono: "04",
  },
];

const EXTENSIONES_DOCUMENTO = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.eml,.msg,.txt";

function fechaHora(valor) {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
}

function euros(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  return Number(valor).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function nombreArchivoTamano(bytes) {
  const n = Number(bytes || 0);
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " KB";
  return (n / (1024 * 1024)).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " MB";
}

function EtiquetaEstado({ estado }) {
  return (
    <span className={"inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wide " + (ESTILO_ESTADO[estado] || ESTILO_ESTADO.CERRADO)}>
      {TEXTO_ESTADO[estado] || estado || "Sin estado"}
    </span>
  );
}

function Campo({ etiqueta, children, className = "" }) {
  return (
    <label className={"block min-w-0 " + className}>
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-500">{etiqueta}</span>
      {children}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function EncargaGest({ accessMode = "auto" } = {}) {
  const navigate = useNavigate();
  const empleado = useAuthStore((state) => state.empleado);
  const tokenERP = useAuthStore((state) => state.token);
  const rolEncargaGest = String(empleado?.rol?.nombre || empleado?.rol_nombre || empleado?.nombre_rol || "").trim().toLowerCase();
  const esAdminEncargaGest = String(empleado?.usuario || "").trim().toLowerCase() === "admin" || /^(admin|administrador|administradora|superadmin)$/.test(rolEncargaGest);
  const [modo, setModo] = useState(() => (
    accessMode === "external"
      ? (localStorage.getItem("encargagest_token") ? "externo" : "login")
      : (empleado && tokenERP ? "interno" : (localStorage.getItem("encargagest_token") ? "externo" : "login"))
  ));
  const [sesion, setSesion] = useState(null);
  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginCargando, setLoginCargando] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [modalAccesos, setModalAccesos] = useState(false);
  const [accesos, setAccesos] = useState([]);
  const [accesoNotariaId, setAccesoNotariaId] = useState("");
  const [accesoPassword, setAccesoPassword] = useState("");
  const [accesoHabilitado, setAccesoHabilitado] = useState(true);
  const [guardandoAcceso, setGuardandoAcceso] = useState(false);
  const [resumen, setResumen] = useState({ total: 0, por_estado: {}, requieren_atencion: 0 });
  const [items, setItems] = useState([]);
  const [notarias, setNotarias] = useState([]);
  const [directorioBusqueda, setDirectorioBusqueda] = useState("");
  const [directorioTodos, setDirectorioTodos] = useState(false);
  const [directorioPagina, setDirectorioPagina] = useState(1);
  const [directorioItems, setDirectorioItems] = useState([]);
  const [directorioTotal, setDirectorioTotal] = useState(0);
  const [directorioCargando, setDirectorioCargando] = useState(false);
  const [filtroNotariaId, setFiltroNotariaId] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [seleccionadoId, setSeleccionadoId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState("");
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ ...NUEVO_ENCARGO });
  const [catalogoMunicipiosRegistro, setCatalogoMunicipiosRegistro] = useState([]);
  useEffect(() => {
    let activo = true;
    axios.get("/municipios")
      .then(({ data }) => {
        if (activo) setCatalogoMunicipiosRegistro(Array.isArray(data) ? data.filter((item) => item.activo !== false) : []);
      })
      .catch(() => { if (activo) setCatalogoMunicipiosRegistro([]); });
    return () => { activo = false; };
  }, []);
  const [archivosSolicitud, setArchivosSolicitud] = useState({});
  const [categoriaDocumento, setCategoriaDocumento] = useState("Otros");
  const [detalleContratoIndex, setDetalleContratoIndex] = useState(0);
  const [archivoPrevisualizado, setArchivoPrevisualizado] = useState(null);
  const [urlPrevisualizacion, setUrlPrevisualizacion] = useState("");
  const [documentoAbierto, setDocumentoAbierto] = useState(null);
  const [actividad, setActividad] = useState("");
  const [guardandoActividad, setGuardandoActividad] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [errorAccion, setErrorAccion] = useState("");
  const [modalIncidencia, setModalIncidencia] = useState(false);
  const [motivoIncidencia, setMotivoIncidencia] = useState("");
  const [guardandoIncidencia, setGuardandoIncidencia] = useState(false);
  const [perfilAbierto, setPerfilAbierto] = useState(false);
  const [passwordActualPerfil, setPasswordActualPerfil] = useState("");
  const [passwordNuevaPerfil, setPasswordNuevaPerfil] = useState("");
  const [passwordConfirmarPerfil, setPasswordConfirmarPerfil] = useState("");
  const [guardandoPasswordPerfil, setGuardandoPasswordPerfil] = useState(false);
  const [mensajePasswordPerfil, setMensajePasswordPerfil] = useState("");
  const [errorPasswordPerfil, setErrorPasswordPerfil] = useState("");

  useEffect(() => {
    if (!archivoPrevisualizado) {
      setUrlPrevisualizacion("");
      return undefined;
    }
    const url = URL.createObjectURL(archivoPrevisualizado);
    setUrlPrevisualizacion(url);
    return () => URL.revokeObjectURL(url);
  }, [archivoPrevisualizado]);

  useEffect(() => {
    return () => {
      if (documentoAbierto?.url) URL.revokeObjectURL(documentoAbierto.url);
    };
  }, [documentoAbierto]);

  const cargarListado = useCallback(async (paginaSolicitada = pagina, q = busqueda, estado = filtroEstado, notariaId = filtroNotariaId) => {
    const respuesta = await axios.get("/encargagest/encargos", {
      params: { pagina: paginaSolicitada, por_pagina: 20, q: q.trim() || undefined, estado: estado || undefined, notaria_id: modo === "interno" && notariaId ? Number(notariaId) : undefined },
    });
    const data = respuesta.data || {};
    const filas = Array.isArray(data) ? data : data.items || [];
    setItems(filas);
    setTotal(Number(data.total ?? filas.length));
    if (filas.length) {
      setSeleccionadoId((actual) =>
        actual && filas.some((x) => x.id === actual) ? actual : filas[0].id
      );
    } else {
      setSeleccionadoId(null);
      setDetalle(null);
    }
  }, [pagina, busqueda, filtroEstado, filtroNotariaId, modo]);

  const cargarTodo = useCallback(async (notariaIdSolicitada = filtroNotariaId) => {
    setCargando(true);
    setError("");
    try {
      const [nts, me] = await Promise.all([
        axios.get("/encargagest/notarias"),
        axios.get("/encargagest/me"),
      ]);
      const listaNotarias = Array.isArray(nts.data) ? nts.data : [];
      setNotarias(listaNotarias);
      setSesion(me.data || null);
      if (me.data?.modo === "externo") {
        setForm((actual) => ({ ...actual, notaria_id: String(me.data.notaria_id || "") }));
      }
      const notariaActiva = notariaIdSolicitada;
      const params = { notaria_id: modo === "interno" && notariaActiva ? Number(notariaActiva) : undefined };
      const res = await axios.get("/encargagest/resumen", { params });
      setResumen(res.data || { total: 0, por_estado: {}, requieren_atencion: 0 });
      await cargarListado(1, busqueda, filtroEstado, notariaActiva);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se han podido cargar los datos de EncargaGest. Comprueba los permisos del módulo y vuelve a intentarlo.");
    } finally {
      setCargando(false);
    }
  }, [cargarListado, pagina, busqueda, filtroEstado, filtroNotariaId, modo, esAdminEncargaGest]);

  useEffect(() => {
    // Las rutas públicas de notaría deben mantener su sesión independiente,
    // incluso si el navegador conserva credenciales del ERP interno.
    if (accessMode === "external") {
      if (localStorage.getItem("encargagest_token")) {
        configurarSesionEncargaGest("externo");
        setModo("externo");
      } else {
        limpiarSesionEncargaGest();
        setModo("login");
      }
      return;
    }
    if (empleado && tokenERP) {
      configurarSesionEncargaGest("interno");
      setModo("interno");
      return;
    }
    if (localStorage.getItem("encargagest_token")) {
      configurarSesionEncargaGest("externo");
      setModo("externo");
    } else {
      setModo("login");
    }
  }, [empleado, tokenERP, accessMode]);

  useEffect(() => {
    if (modo !== "interno" && modo !== "externo") return;
    configurarSesionEncargaGest(modo);
    // La carga inicial se ejecuta solo al cambiar el tipo de sesión. La función
    // cargarTodo también depende de los filtros para el botón Actualizar; incluirla
    // aquí provocaría peticiones repetidas al cambiar la selección o escribir filtros.
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo]);

  useEffect(() => {
    if (!seleccionadoId) {
      setDetalle(null);
      return;
    }
    let vigente = true;
    setCargandoDetalle(true);
    axios.get("/encargagest/encargos/" + seleccionadoId)
      .then((r) => { if (vigente) setDetalle(r.data); })
      .catch((e) => {
        if (vigente) setErrorAccion(e?.response?.data?.detail || "No se ha podido abrir la ficha del encargo.");
      })
      .finally(() => { if (vigente) setCargandoDetalle(false); });
    return () => { vigente = false; };
  }, [seleccionadoId]);

  useEffect(() => {
    if (modo !== "interno" && modo !== "externo") return undefined;
    const intervalo = window.setInterval(async () => {
      try {
        const [res, listado] = await Promise.all([
          axios.get("/encargagest/resumen", { params: modo === "interno" && filtroNotariaId ? { notaria_id: Number(filtroNotariaId) } : undefined }),
          axios.get("/encargagest/encargos", { params: { pagina, por_pagina: 20, q: busqueda.trim() || undefined, estado: filtroEstado || undefined, notaria_id: modo === "interno" && filtroNotariaId ? Number(filtroNotariaId) : undefined } }),
        ]);
        setResumen(res.data || { total: 0, por_estado: {} });
        const data = listado.data || {};
        const nuevasFilas = Array.isArray(data) ? data : data.items || [];
        setItems(nuevasFilas);
        setTotal(Number(data.total ?? nuevasFilas.length));
        if (seleccionadoId) {
          const actual = await axios.get("/encargagest/encargos/" + seleccionadoId);
          setDetalle(actual.data);
        }
      } catch {
        // La siguiente actualización automática volverá a intentarlo sin interrumpir el trabajo.
      }
    }, 5000);
    return () => window.clearInterval(intervalo);
  }, [modo, pagina, busqueda, filtroEstado, filtroNotariaId, seleccionadoId]);

  const filas = useMemo(() => items, [items]);
  const totalPaginas = Math.max(1, Math.ceil(total / 20));
  const totalPaginasDirectorio = Math.max(1, Math.ceil(directorioTotal / 12));

  useEffect(() => {
    if (modo !== "interno" || !esAdminEncargaGest) return undefined;
    let vigente = true;
    setDirectorioCargando(true);
    axios.get("/encargagest/directorio/notarias", {
      params: {
        q: directorioBusqueda.trim() || undefined,
        alcance: directorioTodos ? "todas" : "habilitadas",
        pagina: directorioPagina,
        por_pagina: 12,
      },
    }).then((respuesta) => {
      if (!vigente) return;
      setDirectorioItems(Array.isArray(respuesta.data?.items) ? respuesta.data.items : []);
      setDirectorioTotal(Number(respuesta.data?.total || 0));
    }).catch((e) => {
      if (vigente) setError(e?.response?.data?.detail || "No se ha podido cargar el directorio de notarías.");
    }).finally(() => { if (vigente) setDirectorioCargando(false); });
    return () => { vigente = false; };
  }, [modo, esAdminEncargaGest, directorioBusqueda, directorioTodos, directorioPagina]);

  function aplicarFiltroRapido(estado) {
    setFiltroEstado(estado);
    setPagina(1);
    cargarListado(1, busqueda, estado).catch((e) => setError(e?.response?.data?.detail || "No se pudo filtrar la bandeja."));
  }

  const cambiarFiltro = (campo, valor) => setForm((actual) => ({ ...actual, [campo]: valor }));
  const cambiarContrato = (indice, campo, valor) => setForm((actual) => ({ ...actual, contratos: actual.contratos.map((contrato, i) => i === indice ? { ...contrato, [campo]: valor } : contrato) }));
  const cambiarFinca = (indiceContrato, indiceFinca, campo, valor) => setForm((actual) => ({ ...actual, contratos: actual.contratos.map((contrato, i) => i !== indiceContrato ? contrato : { ...contrato, fincas: contrato.fincas.map((finca, j) => j === indiceFinca ? { ...finca, [campo]: valor } : finca) }) }));
  const anadirContrato = () => setForm((actual) => ({ ...actual, contratos: [...actual.contratos, { entidad_bancaria: "", numero_prestamo: "", fecha_constitucion: "", fincas: [{ numero_finca: "", capital_inscrito: "", numero_inscripcion: "", seccion: "", municipio_registro: "", registro_propiedad: "" }] }] }));
  const quitarContrato = (indice) => setForm((actual) => ({ ...actual, contratos: actual.contratos.filter((_, i) => i !== indice) }));
  const anadirFinca = (indice) => setForm((actual) => ({ ...actual, contratos: actual.contratos.map((contrato, i) => i === indice ? { ...contrato, fincas: [...contrato.fincas, { numero_finca: "", capital_inscrito: "", numero_inscripcion: "", seccion: "", municipio_registro: "", registro_propiedad: "" }] } : contrato) }));
  const quitarFinca = (indiceContrato, indiceFinca) => setForm((actual) => ({ ...actual, contratos: actual.contratos.map((contrato, i) => i === indiceContrato ? { ...contrato, fincas: contrato.fincas.filter((_, j) => j !== indiceFinca) } : contrato) }));

  async function aplicarFiltros(event) {
    event?.preventDefault();
    setPagina(1);
    setCargando(true);
    try {
      await cargarListado(1, busqueda, filtroEstado);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se ha podido filtrar el listado.");
    } finally {
      setCargando(false);
    }
  }

  function abrirEdicion() {
    if (!detalle) return;
    const contratosOrigen = Array.isArray(detalle.contratos) && detalle.contratos.length
      ? detalle.contratos
      : [{
          entidad_bancaria: detalle.entidad_bancaria || "",
          numero_prestamo: detalle.numero_prestamo || "",
          fecha_constitucion: detalle.fecha_constitucion || "",
          fincas: [{
            numero_finca: detalle.numero_finca || "",
            capital_inscrito: detalle.capital_inscrito ?? "",
            numero_inscripcion: "",
            seccion: "",
            municipio_registro: detalle.municipio_registro || "",
            registro_propiedad: detalle.registro_propiedad || "",
          }],
        }];
    setEditForm({
      titular: detalle.titular || "",
      nif_titular: detalle.nif_titular || "",
      tipo_encargo: detalle.tipo_encargo || "Cancelación hipotecaria",
      prioridad: detalle.prioridad || "Normal",
      contacto_nombre: detalle.contacto_nombre || "",
      contacto_email: detalle.contacto_email || "",
      contacto_telefono: detalle.contacto_telefono || "",
      importe: detalle.importe ?? "",
      fecha_objetivo: detalle.fecha_objetivo || "",
      observaciones: detalle.observaciones || "",
      observaciones_internas: detalle.observaciones_internas || "",
      contratos: contratosOrigen.map((contrato) => ({
        entidad_bancaria: contrato.entidad_bancaria || "",
        numero_prestamo: contrato.numero_prestamo || "",
        fecha_constitucion: contrato.fecha_constitucion || "",
        fincas: (contrato.fincas?.length ? contrato.fincas : [{}]).map((finca) => ({
          numero_finca: finca.numero_finca || "",
          capital_inscrito: finca.capital_inscrito ?? contrato.capital_inscrito ?? "",
          numero_inscripcion: finca.numero_inscripcion || "",
          seccion: finca.seccion || "",
          municipio_registro: finca.municipio_registro || "",
          registro_propiedad: finca.registro_propiedad || "",
        })),
      })),
    });
    setErrorAccion("");
    setMensaje("");
    setModalEditar(true);
  }

  const cambiarDatoEdicion = (campo, valor) => setEditForm((actual) => ({ ...actual, [campo]: valor }));
  const cambiarContratoEdicion = (indice, campo, valor) => setEditForm((actual) => ({
    ...actual,
    contratos: actual.contratos.map((contrato, i) => i === indice ? { ...contrato, [campo]: valor } : contrato),
  }));
  const cambiarFincaEdicion = (indiceContrato, indiceFinca, campo, valor) => setEditForm((actual) => ({
    ...actual,
    contratos: actual.contratos.map((contrato, i) => i !== indiceContrato ? contrato : {
      ...contrato,
      fincas: contrato.fincas.map((finca, j) => j === indiceFinca ? { ...finca, [campo]: valor } : finca),
    }),
  }));
  const anadirContratoEdicion = () => setEditForm((actual) => ({
    ...actual,
    contratos: [...actual.contratos, { entidad_bancaria: "", numero_prestamo: "", fecha_constitucion: "", fincas: [{ numero_finca: "", capital_inscrito: "", numero_inscripcion: "", seccion: "", municipio_registro: "", registro_propiedad: "" }] }],
  }));
  const anadirFincaEdicion = (indice) => setEditForm((actual) => ({
    ...actual,
    contratos: actual.contratos.map((contrato, i) => i === indice ? {
      ...contrato,
      fincas: [...contrato.fincas, { numero_finca: "", capital_inscrito: "", numero_inscripcion: "", seccion: "", municipio_registro: "", registro_propiedad: "" }],
    } : contrato),
  }));

  async function guardarEdicion(event) {
    event.preventDefault();
    if (!detalle || !editForm) return;
    setGuardandoEdicion(true);
    setErrorAccion("");
    setMensaje("");
    try {
      const contratos = editForm.contratos.map((contrato) => ({
        ...contrato,
        fecha_constitucion: contrato.fecha_constitucion || null,
        fincas: contrato.fincas.map((finca) => ({
          ...finca,
          capital_inscrito: finca.capital_inscrito === "" || finca.capital_inscrito == null ? null : Number(finca.capital_inscrito),
        })),
      }));
      await axios.put("/encargagest/encargos/" + detalle.id, {
        titular: editForm.titular.trim(),
        nif_titular: editForm.nif_titular,
        tipo_encargo: editForm.tipo_encargo,
        prioridad: editForm.prioridad,
        contacto_nombre: editForm.contacto_nombre,
        contacto_email: editForm.contacto_email,
        contacto_telefono: editForm.contacto_telefono,
        importe: editForm.importe === "" || editForm.importe == null ? null : Number(editForm.importe),
        fecha_objetivo: editForm.fecha_objetivo || null,
        observaciones: editForm.observaciones,
        observaciones_internas: editForm.observaciones_internas,
        contratos,
      });
      const actualizado = await axios.get("/encargagest/encargos/" + detalle.id);
      setDetalle(actualizado.data);
      await cargarTodo();
      setModalEditar(false);
      setEditForm(null);
      setMensaje("Datos del encargo, contratos y fincas guardados correctamente y disponibles en ambos portales.");
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se han podido guardar los cambios del encargo.");
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function crearEncargo(event) {
    event.preventDefault();
    setGuardando(true);
    setErrorAccion("");
    setMensaje("");
    try {
      const contratosNormalizados = form.contratos.map((contrato) => ({ ...contrato, fecha_constitucion: contrato.fecha_constitucion || null, fincas: (contrato.fincas || []).map((finca) => ({ ...finca, capital_inscrito: finca.capital_inscrito === "" || finca.capital_inscrito == null ? null : Number(finca.capital_inscrito), numero_inscripcion: finca.numero_inscripcion || "", seccion: finca.seccion || "" })) }));
      const primerContrato = contratosNormalizados[0] || {};
      const primeraFinca = primerContrato.fincas?.[0] || {};
      const payload = {
        ...form,
        notaria_id: modo === "interno" ? Number(form.notaria_id) : undefined,
        contratos: contratosNormalizados,
        entidad_bancaria: primerContrato.entidad_bancaria || "",
        numero_prestamo: primerContrato.numero_prestamo || "",
        capital_inscrito: primeraFinca.capital_inscrito ?? null,
        fecha_constitucion: primerContrato.fecha_constitucion || null,
        numero_finca: primeraFinca.numero_finca || "",
        municipio_registro: primeraFinca.municipio_registro || "",
        registro_propiedad: primeraFinca.registro_propiedad || "",
      };
      const respuesta = await axios.post("/encargagest/encargos", payload);
      const creado = respuesta.data;
      const fallosDocumento = [];
      for (let contratoIndex = 0; contratoIndex < form.contratos.length; contratoIndex += 1) {
      for (const categoria of CATEGORIAS_DOCUMENTO) {
        const seleccionados = archivosSolicitud[contratoIndex + "|" + categoria.nombre] || [];
        for (const archivoSeleccionado of seleccionados) {
          const body = new FormData();
          body.append("archivo", archivoSeleccionado);
          body.append("categoria", categoria.nombre);
          body.append("contrato_index", String(contratoIndex));
          try {
            await axios.post("/encargagest/encargos/" + creado.id + "/documentos", body);
          } catch (errorDocumento) {
            fallosDocumento.push(archivoSeleccionado.name);
          }
        }
      }
      }
      setModalNuevo(false);
      setForm({ ...NUEVO_ENCARGO, contratos: [{ entidad_bancaria: "", numero_prestamo: "", fecha_constitucion: "", fincas: [{ numero_finca: "", capital_inscrito: "", numero_inscripcion: "", seccion: "", municipio_registro: "", registro_propiedad: "" }] }] });
      setArchivosSolicitud({});
      setArchivoPrevisualizado(null);
      setPagina(1);
      setMensaje(
        fallosDocumento.length
          ? "Encargo " + (creado.referencia || "") + " registrado. No se pudieron adjuntar estos documentos: " + fallosDocumento.join(", ") + ". Puedes subirlos desde la ficha."
          : "Encargo " + (creado.referencia || "") + " registrado con su documentación."
      );
      await cargarTodo();
      setSeleccionadoId(creado.id);
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido registrar el encargo.");
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(nuevoEstado, comentario = "") {
    if (!detalle || !nuevoEstado || nuevoEstado === detalle.estado) return;
    setErrorAccion("");
    setMensaje("");
    try {
      await axios.post("/encargagest/encargos/" + detalle.id + "/estado", {
        estado: nuevoEstado,
        comentario: comentario.trim() || undefined,
      });
      await cargarTodo();
      const actualizado = await axios.get("/encargagest/encargos/" + detalle.id);
      setDetalle(actualizado.data);
      setMensaje(nuevoEstado === "INCIDENCIA" ? "Incidencia registrada y comunicada a la notaría." : "Fase de gestión validada correctamente.");
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido validar la fase de gestión.");
      throw e;
    }
  }

  async function registrarIncidencia(event) {
    event.preventDefault();
    if (!detalle || !motivoIncidencia.trim()) {
      setErrorAccion("Indica el motivo de la incidencia para que la notaría pueda verlo.");
      return;
    }
    setGuardandoIncidencia(true);
    try {
      await cambiarEstado("INCIDENCIA", motivoIncidencia.trim());
      setModalIncidencia(false);
      setMotivoIncidencia("");
    } catch {
      // El mensaje de error ya se muestra en la ficha.
    } finally {
      setGuardandoIncidencia(false);
    }
  }

  async function guardarActividad(event) {
    event.preventDefault();
    if (!detalle || !actividad.trim()) return;
    setGuardandoActividad(true);
    setErrorAccion("");
    setMensaje("");
    try {
      await axios.post("/encargagest/encargos/" + detalle.id + "/actividad", {
        mensaje: actividad.trim(),
        visible_notaria: true,
        tipo: "COMENTARIO",
      });
      setActividad("");
      const actualizado = await axios.get("/encargagest/encargos/" + detalle.id);
      setDetalle(actualizado.data);
      setMensaje("Nota añadida a la actividad del encargo.");
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido guardar la nota.");
    } finally {
      setGuardandoActividad(false);
    }
  }

  async function subirDocumento(event) {
    event.preventDefault();
    if (!detalle || !archivo) return;
    setSubiendo(true);
    setErrorAccion("");
    setMensaje("");
    const body = new FormData();
    body.append("archivo", archivo);
    body.append("categoria", categoriaDocumento);
    body.append("contrato_index", String(detalleContratoIndex || 0));
    try {
      await axios.post("/encargagest/encargos/" + detalle.id + "/documentos", body);
      setArchivo(null);
      setCategoriaDocumento("Otros");
      const selector = document.getElementById("encargagest-archivo");
      if (selector) selector.value = "";
      const actualizado = await axios.get("/encargagest/encargos/" + detalle.id);
      setDetalle(actualizado.data);
      setMensaje("Documento subido y guardado.");
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido subir el documento.");
    } finally {
      setSubiendo(false);
    }
  }

  async function obtenerBlobDocumento(doc) {
    if (!detalle) return null;
    const respuesta = await axios.get(
      "/encargagest/encargos/" + detalle.id + "/documentos/" + doc.id + "/descargar",
      { responseType: "blob" }
    );
    return respuesta.data;
  }

  async function verDocumento(doc) {
    setErrorAccion("");
    try {
      const blob = await obtenerBlobDocumento(doc);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setDocumentoAbierto({ url, nombre: doc.nombre_original || "Documento", tipo: blob.type || "" });
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido abrir la vista previa del documento.");
    }
  }

  async function descargarDocumento(doc) {
    setErrorAccion("");
    try {
      const blob = await obtenerBlobDocumento(doc);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = doc.nombre_original || "documento";
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido descargar el documento.");
    }
  }

  async function eliminarDocumento(doc) {
    if (!detalle || !window.confirm("¿Eliminar el documento «" + doc.nombre_original + "»?")) return;
    setErrorAccion("");
    try {
      await axios.delete("/encargagest/encargos/" + detalle.id + "/documentos/" + doc.id);
      const actualizado = await axios.get("/encargagest/encargos/" + detalle.id);
      setDetalle(actualizado.data);
      setMensaje("Documento eliminado.");
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido eliminar el documento.");
    }
  }

  async function iniciarSesion(event) {
    event.preventDefault();
    setLoginCargando(true);
    setLoginError("");
    try {
      const respuesta = await axios.post("/encargagest/login", { usuario: loginUsuario, password: loginPassword });
      configurarSesionEncargaGest("externo", respuesta.data.token);
      setSesion({
        modo: "externo",
        notaria_id: respuesta.data.notaria?.id,
        notaria_nombre: respuesta.data.notaria?.nombre,
        usuario: respuesta.data.usuario,
      });
      setLoginPassword("");
      setModo("externo");
    } catch (e) {
      setLoginError(e?.response?.data?.detail || "No se ha podido iniciar sesión. Comprueba el usuario y la contraseña.");
    } finally {
      setLoginCargando(false);
    }
  }


  async function cambiarPasswordPerfil(event) {
    event.preventDefault();
    setErrorPasswordPerfil("");
    setMensajePasswordPerfil("");
    if (passwordNuevaPerfil !== passwordConfirmarPerfil) {
      setErrorPasswordPerfil("Las nuevas contraseñas no coinciden.");
      return;
    }
    if (passwordNuevaPerfil.trim().length < 8) {
      setErrorPasswordPerfil("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setGuardandoPasswordPerfil(true);
    try {
      const respuesta = await axios.post("/encargagest/cambiar-password", {
        password_actual: passwordActualPerfil,
        password_nueva: passwordNuevaPerfil,
      });
      setMensajePasswordPerfil(respuesta.data?.mensaje || "Contraseña actualizada correctamente.");
      setPasswordActualPerfil("");
      setPasswordNuevaPerfil("");
      setPasswordConfirmarPerfil("");
    } catch (e) {
      setErrorPasswordPerfil(e?.response?.data?.detail || "No se ha podido actualizar la contraseña.");
    } finally {
      setGuardandoPasswordPerfil(false);
    }
  }

  function salirEncargaGest() {
    if (modo === "externo") {
      limpiarSesionEncargaGest();
      setSesion(null);
      setDetalle(null);
      setItems([]);
      setResumen({ total: 0, por_estado: {}, requieren_atencion: 0 });
      setModo("login");
    } else {
      limpiarSesionEncargaGest();
      useAuthStore.getState().logout();
      navigate("/login", { replace: true });
    }
  }

  function irAModulos() {
    navigate("/modulos");
  }

  async function abrirAccesos() {
    setErrorAccion("");
    try {
      const respuesta = await axios.get("/encargagest/accesos");
      const lista = Array.isArray(respuesta.data) ? respuesta.data : [];
      setAccesos(lista);
      setAccesoNotariaId((actual) => actual || String(lista[0]?.notaria_id || ""));
      setModalAccesos(true);
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se han podido consultar los accesos externos. Revisa el permiso de edición de EncargaGest.");
    }
  }

  const accesoSeleccionado = accesos.find((item) => String(item.notaria_id) === String(accesoNotariaId));

  async function guardarAcceso(event) {
    event.preventDefault();
    if (!accesoNotariaId) return;
    if (!accesoSeleccionado?.tiene_acceso && accesoPassword && accesoPassword.length < 8) {
      setErrorAccion("La contraseña personalizada debe tener al menos 8 caracteres. Si la dejas vacía, se utilizará el NIF completo como contraseña inicial.");
      return;
    }
    setGuardandoAcceso(true);
    setErrorAccion("");
    try {
      await axios.post("/encargagest/accesos", {
        notaria_id: Number(accesoNotariaId),
        password: accesoPassword || null,
        habilitado: accesoHabilitado,
      });
      const respuesta = await axios.get("/encargagest/accesos");
      const lista = Array.isArray(respuesta.data) ? respuesta.data : [];
      setAccesos(lista);
      setAccesoPassword("");
      setMensaje("Acceso EncargaGest actualizado. El usuario de acceso es el NIF de la notaría registrado en CTN.");
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido guardar el acceso externo.");
    } finally {
      setGuardandoAcceso(false);
    }
  }

  if (modo === "login") {
    return (
      <PortalLogin
        variant="encargagest"
        title="EncargaGest EP"
        subtitle="Portal profesional para que las notarías colaboradoras envíen encargos, aporten documentación y consulten su seguimiento."
        usernameLabel="Usuario · NIF de la notaría"
        usernamePlaceholder="NIF registrado en CTN"
        passwordPlaceholder="Tu contraseña de EncargaGest"
        footnote="Usuario y contraseña inicial: NIF completo con letra, sin espacios ni guiones. Después podrás cambiarla en Mi perfil. El acceso es independiente de NotarGest."
        submitLabel="Entrar en EncargaGest EP"
        username={loginUsuario}
        setUsername={setLoginUsuario}
        password={loginPassword}
        setPassword={setLoginPassword}
        onSubmit={iniciarSesion}
        loading={loginCargando}
        error={loginError}
      />
    );
  }

  const fechaActual = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="apoderagest encargagest">
      {modo === "interno" && (
        <Sidebar
          brandName="EncargaGest"
          navigationItems={[
            { key: "ctn", label: "CTN", icon: "building" },
            { key: "agenda", label: "Agenda", icon: "calendar" },
            { key: "mensajes", label: "Mensajes", icon: "message" },
            { key: "intranet", label: "Intranet", icon: "file-text" },
            { key: "encargos", label: "Encargos", icon: "clipboard" },
          ]}
          activeNavigationItem="Encargos"
          onNavigationItemClick={(label) => {
            const rutas = { CTN: "/encargagest/ctn", Agenda: "/encargagest/agenda", Mensajes: "/encargagest/mensajes", Intranet: "/encargagest/intranet", Encargos: "/encargagest" };
            if (rutas[label]) navigate(rutas[label]);
          }}
        />
      )}
      {modo === "externo" && (
        <Sidebar
          brandName="EncargaGest"
          navigationItems={[]}
          headerActions={
            <>
              <div className="ag-fecha-actual" aria-label={`Fecha actual: ${fechaActual}`}>
                <span className="ag-punto-vivo" aria-hidden="true" />
                <span>{fechaActual}</span>
              </div>
              <button
                type="button"
                onClick={cargarTodo}
                disabled={cargando}
                className="ag-boton-actualizar"
                aria-live="polite"
              >
                <span className={cargando ? "ag-icono-girando" : ""} aria-hidden="true">↻</span>
                {cargando ? "Actualizando…" : "Actualizar datos"}
              </button>
            </>
          }
          onProfileClick={() => {
            setPerfilAbierto(true);
            setMensajePasswordPerfil("");
            setErrorPasswordPerfil("");
          }}
          onLogoutClick={salirEncargaGest}
        />
      )}
      <div className="ag-fondo-decorativo" aria-hidden="true" />
      <header className="ag-hero eg-hero molsan-page-header">
        <div className="ag-hero-identidad molsan-page-header__identity">
          <div className="ag-marca eg-marca molsan-page-header__mark" aria-label="EncargaGest">EG</div>
          <div>
            <div className="ag-eyebrow molsan-page-header__eyebrow">MOLSAN ERP · PREMIUM 2027</div>
            <h1 className="molsan-page-header__title">EncargaGest</h1>
            <p className="molsan-page-header__description">{modo === "externo" ? "Portal profesional · " + (sesion?.notaria_nombre || "Sesión externa") : "Recepción y seguimiento de encargos notariales externos."}</p>
          </div>
        </div>
        <div className="ag-hero-acciones molsan-page-header__actions">
          {modo === "interno" && (
            <>
              <div className="ag-fecha-actual">
                <span className="ag-punto-vivo" aria-hidden="true" />
                <span>{fechaActual}</span>
              </div>
              <button type="button" onClick={irAModulos} className="eg-secondary"><span aria-hidden="true">▦</span> Ir a módulos</button>
              <button type="button" onClick={salirEncargaGest} className="eg-secondary">Cerrar sesión</button>
              <button type="button" onClick={cargarTodo} disabled={cargando} className="ag-boton-actualizar">
                <span className={cargando ? "ag-icono-girando" : ""} aria-hidden="true">↻</span>
                {cargando ? "Actualizando…" : "Actualizar datos"}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="eg-main w-full max-w-none px-1 pb-4">
        <section role="status" aria-live="polite" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm">
          <span aria-hidden="true" className="mt-0.5 text-xl">⚠️</span>
          <div>
            <p className="text-sm font-extrabold">Conexiones con bancos pendientes</p>
            <p className="mt-1 text-sm">La conexión mediante API con las entidades bancarias está pendiente de implantación. Puedes acceder y trabajar en EncargaGest Gestoría con normalidad; las funciones que requieran conexión bancaria quedarán disponibles cuando se complete la integración.</p>
          </div>
        </section>
        {modo === "interno" && !esAdminEncargaGest && (
          <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Notarías asignadas</p><p className="mt-1 text-xs text-slate-500">Solo aparecen las notarías asignadas a tu usuario.</p></div>
            <label className="w-full sm:max-w-xl"><span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Notaría activa</span><select value={filtroNotariaId} onChange={(e) => { const id = e.target.value; setFiltroNotariaId(id); setPagina(1); cargarTodo(id); }} className={inputClass}><option value="">Todas mis notarías asignadas</option>{notarias.map((n) => <option key={n.id} value={String(n.id)}>{n.nombre}{n.nif ? " · " + n.nif : ""}{n.provincia ? " · " + n.provincia : ""}</option>)}</select></label>
          </section>
        )}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <div className="ag-kpi ag-kpi-azul eg-kpi"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Total de encargos</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-slate-900">{resumen.total || 0}</strong><span className="text-xl text-blue-600">▤</span></div><p className="mt-1 text-xs text-slate-500">Todas las solicitudes</p></div>
          <button type="button" onClick={() => aplicarFiltroRapido("GRUPO_RECIBIDOS")} className="ag-kpi ag-kpi-verde eg-kpi text-left"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Recibidos</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-sky-700">{(resumen.por_estado?.EN_PROCESO || 0) + (resumen.por_estado?.RECIBIDO || 0) + (resumen.por_estado?.EN_REVISION || 0) + (resumen.por_estado?.DOCUMENTACION_PENDIENTE || 0) + (resumen.por_estado?.EN_GESTION || 0)}</strong><span className="text-xl text-sky-500">↓</span></div><p className="mt-1 text-xs text-slate-500">Pendientes de revisión y autorización</p></button>
          <button type="button" onClick={() => aplicarFiltroRapido("GRUPO_AUTORIZADOS")} className="ag-kpi eg-kpi border border-indigo-100 bg-indigo-50/60 text-left"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">Autorizados</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-indigo-800">{resumen.por_estado?.AUTORIZADO || 0}</strong><span className="text-xl text-indigo-600">✓</span></div><p className="mt-1 text-xs text-indigo-800">Validados para continuar</p></button>
          <button type="button" onClick={() => aplicarFiltroRapido("GRUPO_INCIDENCIAS")} className="ag-kpi ag-kpi-ambar eg-kpi text-left"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-rose-700">Incidencias</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-rose-800">{resumen.por_estado?.INCIDENCIA || 0}</strong><span className="text-xl text-rose-600">!</span></div><p className="mt-1 text-xs text-rose-800">Requieren actuación</p></button>
          <div className="ag-kpi ag-kpi-verde eg-kpi border border-slate-200 bg-slate-50" aria-label="Firmados pendiente de integración con ApoderaGest"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Firmados · próximamente</p><div className="mt-2 flex items-end justify-between"><strong className="text-lg font-black text-slate-600">EN ESPERA</strong><span className="text-xl text-slate-400">◷</span></div><p className="mt-1 text-xs leading-4 text-slate-500">Pendiente de integración con las firmas reales de ApoderaGest.</p></div>
        </section>

        {modo === "interno" && esAdminEncargaGest && (
          <section className="eg-directorio mb-6">
            <div className="eg-directorio-cabecera">
              <div>
                <p className="eg-directorio-eyebrow">RED NACIONAL · CTN</p>
                <h2>Directorio de notarías</h2>
                <p>La vista inicial muestra solo las notarías habilitadas en EncargaGest. Puedes ampliar la búsqueda a todo el catálogo CTN.</p>
              </div>
              <div className="eg-directorio-contador"><strong>{directorioTotal.toLocaleString("es-ES")}</strong><span>{directorioTodos ? "resultados CTN" : "notarías habilitadas"}</span></div>
            </div>
            <form className="eg-directorio-busqueda" onSubmit={(event) => { event.preventDefault(); setDirectorioPagina(1); }}>
              <label className="eg-directorio-input-wrap"><span aria-hidden="true">⌕</span><input value={directorioBusqueda} onChange={(event) => { setDirectorioBusqueda(event.target.value); setDirectorioPagina(1); }} placeholder="Buscar por notario, NIF, municipio o provincia…" aria-label="Buscar notarios en el directorio CTN" /></label>
              <label className="eg-directorio-alcance"><input type="checkbox" checked={directorioTodos} onChange={(event) => { setDirectorioTodos(event.target.checked); setDirectorioPagina(1); }} /><span>Buscar en todo CTN</span></label>
              {filtroNotariaId && <button type="button" className="eg-directorio-global" onClick={() => { setFiltroNotariaId(""); setPagina(1); cargarTodo(""); }}>← Volver a visión global</button>}
            </form>
            {directorioCargando ? <div className="eg-directorio-vacio">Consultando directorio…</div> : directorioItems.length ? (
              <div className="eg-directorio-tabla-wrap">
                <table className="eg-directorio-tabla">
                  <thead><tr><th>Notaría</th><th>NIF</th><th>Municipio</th><th>Provincia</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {directorioItems.map((notaria) => (
                      <tr key={notaria.id}>
                        <td className="eg-directorio-tabla-nombre">{notaria.nombre || "Sin nombre"}</td>
                        <td>{notaria.nif || "—"}</td>
                        <td>{notaria.municipio || "—"}</td>
                        <td>{notaria.provincia || "—"}</td>
                        <td><span className={notaria.habilitada ? "eg-directorio-estado is-enabled" : "eg-directorio-estado"}>{notaria.habilitada ? "Habilitada" : notaria.tiene_acceso ? "Deshabilitada" : "Sin acceso"}</span></td>
                        <td><div className="eg-directorio-tabla-acciones">
                          <button type="button" disabled={!notaria.habilitada} onClick={() => { setFiltroNotariaId(String(notaria.id)); setPagina(1); cargarTodo(String(notaria.id)); }} className="eg-directorio-gestionar">{notaria.habilitada ? "Ver encargos →" : "No habilitada"}</button>
                          {!notaria.habilitada && <button type="button" onClick={() => { abrirAccesos().then(() => setAccesoNotariaId(String(notaria.id))); }} className="eg-directorio-habilitar">Gestionar acceso</button>}
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="eg-directorio-vacio">No hay notarías que coincidan con la búsqueda.</div>}
            <div className="eg-directorio-paginacion"><span>Página {directorioPagina} de {totalPaginasDirectorio}</span><div><button type="button" disabled={directorioPagina <= 1 || directorioCargando} onClick={() => setDirectorioPagina((p) => Math.max(1, p - 1))}>← Anterior</button><button type="button" disabled={directorioPagina >= totalPaginasDirectorio || directorioCargando} onClick={() => setDirectorioPagina((p) => Math.min(totalPaginasDirectorio, p + 1))}>Siguiente →</button></div></div>
          </section>
        )}
        {error && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            <span>{error}</span>
            <button type="button" className="font-bold underline" onClick={cargarTodo}>Reintentar</button>
          </div>
        )}
        {mensaje && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensaje}</div>}
        {errorAccion && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{errorAccion}</div>}

        {(modo !== "interno" || !esAdminEncargaGest || Boolean(filtroNotariaId)) && (
        <section className="mt-6 grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(380px,0.92fr)_minmax(0,1.45fr)]">
          <div className="eg-panel min-w-0">
            <div className="eg-panel-head">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-extrabold text-slate-900">Bandeja de encargos</h2><p className="mt-1 text-xs text-slate-500">{total} solicitudes encontradas</p></div><div className="flex items-center gap-2"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Página {pagina} / {totalPaginas}</span>{modo === "externo" && <button type="button" onClick={() => { setModalNuevo(true); setErrorAccion(""); }} className="eg-button-primary whitespace-nowrap">＋ Nuevo encargo</button>}</div></div>
              <form className="mt-4 space-y-2" onSubmit={aplicarFiltros}>
                <input className={inputClass} type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar referencia, notaría, titular o banco…" />
                <div className="flex gap-2">
                  <select aria-label="Filtrar bandeja por grupo del panel" className={inputClass} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    {FILTROS_BANDEJA.map((estado) => <option key={estado.valor || "todos"} value={estado.valor}>{estado.texto}</option>)}
                  </select>
                  <button type="submit" className="shrink-0 rounded-xl bg-blue-600 px-4 text-xs font-extrabold text-blue-950 hover:bg-blue-500">Filtrar</button>
                </div>
              </form>
            </div>
            {cargando ? <div className="p-10 text-center text-sm text-slate-500">Cargando encargos…</div> : !filas.length ? (
              <div className="p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-400">▤</div><h3 className="mt-3 text-sm font-bold text-slate-800">Todavía no hay encargos</h3><p className="mt-1 text-xs leading-5 text-slate-500">Cuando una notaría registre un encargo, aparecerá aquí automáticamente.</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filas.map((item) => (
                  <button type="button" key={item.id} onClick={() => { setSeleccionadoId(item.id); setErrorAccion(""); }} className={"block w-full border-l-4 p-4 text-left transition hover:bg-blue-50/50 " + (seleccionadoId === item.id ? "border-blue-600 bg-blue-50/70" : "border-transparent")}>
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black tracking-wide text-blue-700">{item.referencia || ("EG-" + item.id)}</p><h3 className="mt-1 truncate text-sm font-extrabold text-slate-900">{item.titular}</h3><p className="mt-1 truncate text-xs text-slate-500">{item.notaria_nombre}</p></div><EtiquetaEstado estado={item.estado} /></div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500"><span>{item.entidad_bancaria || "Entidad no indicada"}</span><span>{fechaHora(item.actualizado_en)}</span></div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <button type="button" disabled={pagina <= 1 || cargando} onClick={() => { const p = pagina - 1; setPagina(p); cargarListado(p).catch((e) => setError(e?.response?.data?.detail || "Error al cargar la página.")); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">← Anterior</button>
              <span className="text-[10px] text-slate-400">20 por página</span>
              <button type="button" disabled={pagina >= totalPaginas || cargando} onClick={() => { const p = pagina + 1; setPagina(p); cargarListado(p).catch((e) => setError(e?.response?.data?.detail || "Error al cargar la página.")); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40">Siguiente →</button>
            </div>
          </div>

          <div className="eg-panel min-w-0">
            {!detalle ? (
              <div className="grid min-h-[500px] place-items-center p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-2xl text-blue-600">EG</div><h2 className="mt-4 font-extrabold text-slate-900">Ficha del encargo</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Selecciona un encargo de la bandeja o registra una nueva solicitud.</p></div></div>
            ) : (
              <>
                <div className="eg-panel-head p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0"><p className="text-[10px] font-black tracking-[0.18em] text-blue-700">{detalle.referencia || ("EG-" + detalle.id)} · FICHA DE ENCARGO</p><h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">{detalle.titular}</h2><p className="mt-1 text-sm font-bold text-slate-600">{detalle.notaria_nombre}</p>{detalle.notaria_contacto && <div className="mt-2 flex max-w-3xl flex-wrap gap-x-4 gap-y-1 text-[11px] leading-5 text-slate-500"><span><strong className="font-bold text-slate-600">NIF:</strong> {detalle.notaria_contacto.nif || "—"}</span><span><strong className="font-bold text-slate-600">Dirección:</strong> {[detalle.notaria_contacto.direccion, detalle.notaria_contacto.cp].filter(Boolean).join(" · ") || "—"}</span><span><strong className="font-bold text-slate-600">Municipio · Provincia:</strong> {[detalle.notaria_contacto.municipio, detalle.notaria_contacto.provincia].filter(Boolean).join(" · ") || "—"}</span><span><strong className="font-bold text-slate-600">Teléfono:</strong> {detalle.notaria_contacto.telefono || "—"}</span>{detalle.notaria_contacto.departamento_cancelaciones && <span><strong className="font-bold text-slate-600">Departamento de cancelaciones:</strong> {detalle.notaria_contacto.departamento_cancelaciones}</span>}</div>}</div>
                    <div className="min-w-[220px] max-w-[300px]"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Estado de gestión</span>{modo === "interno" && detalle.estado !== "FIRMADO" && <button type="button" onClick={abrirEdicion} className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:border-blue-300 hover:bg-blue-50">Editar datos, contratos y fincas</button>}<div className="pt-1"><EtiquetaEstado estado={detalle.estado} /></div>{modo === "interno" && detalle.estado !== "FIRMADO" && <div className="mt-3 space-y-2">{["EN_PROCESO","RECIBIDO"].includes(detalle.estado) && <button type="button" onClick={() => cambiarEstado("AUTORIZADO").catch(() => {})} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700">✓ Validar documentación y autorizar</button>}{detalle.estado === "INCIDENCIA" && <button type="button" onClick={() => cambiarEstado("AUTORIZADO").catch(() => {})} className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-indigo-700">✓ Incidencia resuelta · volver a autorizados</button>}{["EN_PROCESO","RECIBIDO","AUTORIZADO"].includes(detalle.estado) && <button type="button" onClick={() => { setMotivoIncidencia(""); setModalIncidencia(true); setErrorAccion(""); }} className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-extrabold text-rose-700 hover:bg-rose-100">! Registrar incidencia</button>}</div>}{detalle.estado === "FIRMADO" && <p className="mt-1 text-[10px] font-semibold text-slate-500">El cierre por firma se integrará desde ApoderaGest.</p>}{detalle.estado === "INCIDENCIA" && <p className="mt-2 text-[10px] leading-4 text-rose-700">La notaría puede consultar el motivo en la actividad del encargo.</p>}</div>
                  </div>
{modo === "externo" ? (
                  <div className="mt-5" />
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 xl:grid-cols-2">
                  <>
                  <section className="min-w-0 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                    <div className="mb-4 flex items-center gap-3 border-b border-indigo-100 pb-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-indigo-100 bg-white text-xs font-black text-indigo-700">01</span>
                      <div><p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-indigo-500">Datos principales</p><h3 className="mt-0.5 text-sm font-extrabold text-slate-900">Datos del encargo</h3></div>
                    </div>
                    <dl className="space-y-3 text-xs">
                      <div className="border-b border-indigo-100 pb-2"><dt className="mb-1 text-slate-500">Nombre del solicitante</dt><dd className="break-words font-semibold text-slate-800">{detalle.titular || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-indigo-100 pb-2"><dt className="text-slate-500">NIF / CIF del solicitante</dt><dd className="break-all text-right font-semibold text-slate-800">{detalle.nif_titular || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-indigo-100 pb-2"><dt className="text-slate-500">Tipo de encargo</dt><dd className="text-right font-semibold text-slate-800">{detalle.tipo_encargo || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-indigo-100 pb-2"><dt className="text-slate-500">Prioridad</dt><dd className="text-right font-semibold text-slate-800">{detalle.prioridad || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3"><dt className="text-slate-500">Entidad bancaria</dt><dd className="text-right font-semibold text-slate-800">{detalle.entidad_bancaria || "—"}</dd></div>
                    </dl>
                  </section>
                  <section className="min-w-0">
                    <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-extrabold text-slate-900">Datos de la solicitud</h3><span className="shrink-0 text-[10px] text-slate-400">CTN · ID {detalle.notaria_id}</span></div>
                    <dl className="mt-3 space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Capital inscrito</dt><dd className="text-right font-semibold text-slate-800">{euros(detalle.capital_inscrito)}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Fecha de constitución</dt><dd className="text-right font-semibold text-slate-800">{detalle.fecha_constitucion ? new Date(detalle.fecha_constitucion + "T00:00:00").toLocaleDateString("es-ES") : "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Número de préstamo</dt><dd className="text-right font-semibold text-slate-800">{detalle.numero_prestamo || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Número de finca</dt><dd className="text-right font-semibold text-slate-800">{detalle.numero_finca || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Inscripción</dt><dd className="text-right font-semibold text-slate-800">{detalle.contratos?.[0]?.fincas?.[0]?.numero_inscripcion || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Sección</dt><dd className="text-right font-semibold text-slate-800">{detalle.contratos?.[0]?.fincas?.[0]?.seccion || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Municipio del registro</dt><dd className="text-right font-semibold text-slate-800">{detalle.municipio_registro || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Registro de la propiedad</dt><dd className="text-right font-semibold text-slate-800">{detalle.registro_propiedad || "—"}</dd></div>
                      <div className="border-b border-slate-100 pb-3"><dt className="mb-1 text-slate-500">Observaciones de la solicitud</dt><dd className="whitespace-pre-wrap leading-5 text-slate-700">{detalle.observaciones || "Sin observaciones."}</dd></div>
                      {modo === "interno" && detalle.observaciones_internas ? <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3"><dt className="mb-1 font-bold text-blue-900">Nota interna MOLSAN</dt><dd className="whitespace-pre-wrap leading-5 text-blue-900">{detalle.observaciones_internas}</dd></div> : null}
                    </dl>
                  </section>
                  </>

                  <section className="xl:col-span-2 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div><h3 className="text-sm font-black text-slate-900">Todos los contratos y fincas</h3><p className="mt-1 text-xs text-slate-500">Detalle completo compartido entre EncargaGest MOLSAN y EncargaGest Notaría.</p></div>
                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold text-blue-800">{(detalle.contratos || []).length || 1} contrato(s)</span>
                    </div>
                    {(detalle.contratos?.length ? detalle.contratos : [{ entidad_bancaria: detalle.entidad_bancaria, numero_prestamo: detalle.numero_prestamo, fecha_constitucion: detalle.fecha_constitucion, fincas: [{ numero_finca: detalle.numero_finca, capital_inscrito: detalle.capital_inscrito, municipio_registro: detalle.municipio_registro, registro_propiedad: detalle.registro_propiedad }] }]).map((contrato, contratoIndex) => (
                      <div key={"detalle-contrato-" + contratoIndex} className="mb-3 last:mb-0 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                          <div><p className="text-[10px] font-black uppercase tracking-wider text-blue-700">Contrato {contratoIndex + 1}</p><h4 className="mt-1 text-sm font-extrabold text-slate-900">{contrato.entidad_bancaria || "Entidad no indicada"} · {contrato.numero_prestamo || "Sin número de préstamo"}</h4></div>
                          <p className="text-xs text-slate-500">Constitución: {contrato.fecha_constitucion ? new Date(contrato.fecha_constitucion + "T00:00:00").toLocaleDateString("es-ES") : "—"}</p>
                        </div>
                        <div className="mt-3 space-y-3">
                          {(contrato.fincas?.length ? contrato.fincas : [{}]).map((finca, fincaIndex) => (
                            <div key={"detalle-finca-" + contratoIndex + "-" + fincaIndex} className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-3 2xl:grid-cols-6">
                              <div><p className="text-[10px] text-slate-500">Número de finca</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{finca.numero_finca || "—"}</p></div>
                              <div><p className="text-[10px] text-slate-500">Inscripción</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{finca.numero_inscripcion || "—"}</p></div>
                              <div><p className="text-[10px] text-slate-500">Sección</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{finca.seccion || "—"}</p></div>
                              <div><p className="text-[10px] text-slate-500">Capital inscrito</p><p className="mt-1 text-xs font-bold text-slate-800">{euros(finca.capital_inscrito ?? contrato.capital_inscrito)}</p></div>
                              <div><p className="text-[10px] text-slate-500">Municipio del registro</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{finca.municipio_registro || "—"}</p></div>
                              <div><p className="text-[10px] text-slate-500">Registro de la Propiedad</p><p className="mt-1 break-words text-xs font-bold text-slate-800">{finca.registro_propiedad || "—"}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                  <section className="xl:col-span-2">
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                      <h4 className="text-xs font-extrabold text-slate-800">Añadir documentación al encargo</h4>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">Los archivos se guardan en la carpeta del contrato seleccionado y quedan disponibles para ambas partes.</p>
                      <form onSubmit={subirDocumento} className="mt-3 grid grid-cols-1 items-end gap-3 md:grid-cols-4">
                        <Campo etiqueta="Contrato">
                          <select value={detalleContratoIndex} onChange={(e) => setDetalleContratoIndex(Number(e.target.value))} className={inputClass}>
                            {(detalle.contratos?.length ? detalle.contratos : [{}]).map((contrato, index) => <option key={index} value={index}>Contrato {index + 1}{contrato.numero_prestamo ? " · " + contrato.numero_prestamo : ""}</option>)}
                          </select>
                        </Campo>
                        <Campo etiqueta="Categoría documental">
                          <select value={categoriaDocumento} onChange={(e) => setCategoriaDocumento(e.target.value)} className={inputClass}>
                            {CATEGORIAS_DOCUMENTO.map((categoria) => <option key={categoria.nombre} value={categoria.nombre}>{categoria.nombre}</option>)}
                          </select>
                        </Campo>
                        <Campo etiqueta="Archivo">
                          <input id="encargagest-archivo" type="file" accept={EXTENSIONES_DOCUMENTO} required disabled={subiendo} onChange={(e) => setArchivo(e.target.files?.[0] || null)} className={inputClass} />
                        </Campo>
                        <button type="submit" disabled={!archivo || subiendo || detalle.estado === "FIRMADO"} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40">{subiendo ? "Subiendo…" : "Subir documento"}</button>
                      </form>
                      {detalle.estado === "FIRMADO" && <p className="mt-2 text-[10px] text-rose-700">El encargo está cerrado y no admite nuevos documentos.</p>}
                    </div>
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="min-w-0 space-y-4">
                        {(detalle.contratos || [{}]).map((contrato, contratoIndex) => {
                          const docsContrato = (detalle.documentos || []).filter((doc) => Number(doc.contrato_index || 0) === contratoIndex);
                          return <div key={"contrato-carpeta-" + contratoIndex} className="rounded-xl border border-blue-100 bg-white p-3">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="text-xs font-extrabold text-blue-800">Contrato {contratoIndex + 1} · {contrato.numero_prestamo || "sin número de préstamo"}</h4><span className="text-[10px] text-slate-400">{docsContrato.length} archivos</span></div>
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              {CATEGORIAS_DOCUMENTO.map((categoria) => {
                                const docsCategoria = docsContrato.filter((doc) => (doc.categoria || "Otros") === categoria.nombre);
                                return <div key={categoria.nombre} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                  <div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-blue-100 text-[10px] font-black text-blue-800">{categoria.icono}</span><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{categoria.nombre}</p><p className="text-[10px] text-slate-400">{docsCategoria.length} archivo(s)</p></div></div>
                                  {docsCategoria.length === 0 ? <p className="text-[10px] text-slate-400">Sin documentos en esta categoría.</p> : <div className="space-y-2">{docsCategoria.map((doc) => <div key={doc.id} className={"rounded-lg border bg-white p-2 " + (documentoAbierto?.nombre === (doc.nombre_original || "Documento") ? "border-blue-300" : "border-slate-200")}>
                                    <p className="break-words text-[11px] font-bold text-slate-800">{doc.nombre_original}</p><p className="mt-1 text-[10px] text-slate-400">{nombreArchivoTamano(doc.tamano_bytes)} · {fechaHora(doc.fecha_subida)}</p>
                                    <div className="mt-2 flex flex-wrap gap-1"><button type="button" onClick={() => verDocumento(doc)} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[10px] font-bold text-blue-800 hover:bg-blue-100">Ver documento</button><button type="button" onClick={() => descargarDocumento(doc)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold hover:bg-slate-50">Descargar</button>{modo === "interno" && <button type="button" onClick={() => eliminarDocumento(doc)} className="rounded-lg border border-rose-200 px-2 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50">Eliminar</button>}</div>
                                  </div>)}</div>}
                                </div>;
                              })}
                            </div>
                          </div>;
                        })}
                      </div>
                      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3"><div className="min-w-0"><h4 className="text-xs font-extrabold text-slate-800">Carpeta digital · Visor de documentos</h4><p className="mt-1 break-all text-[10px] text-slate-500">{documentoAbierto?.nombre || "Selecciona un documento de las categorías para visualizarlo aquí."}</p></div>{documentoAbierto && <div className="flex gap-2"><a href={documentoAbierto.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100">Abrir aparte</a><button type="button" onClick={() => setDocumentoAbierto(null)} className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white">Cerrar</button></div>}</div>
                        {documentoAbierto ? (documentoAbierto.tipo.toLowerCase().includes("pdf") || documentoAbierto.nombre.toLowerCase().endsWith(".pdf") ? <iframe title={"Vista previa de " + documentoAbierto.nombre} src={documentoAbierto.url} className="h-[620px] w-full bg-white" /> : documentoAbierto.tipo.toLowerCase().startsWith("image/") ? <div className="flex h-[620px] justify-center overflow-auto p-3"><img src={documentoAbierto.url} alt={documentoAbierto.nombre} className="max-h-full max-w-full object-contain" /></div> : <div className="flex h-[620px] flex-col items-center justify-center gap-2 p-5 text-center"><p className="text-xs font-bold text-slate-700">La vista integrada está disponible para PDF e imágenes.</p><p className="break-all text-[10px] text-slate-500">{documentoAbierto.nombre}</p><a href={documentoAbierto.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">Abrir documento aparte</a></div>) : <div className="flex h-[620px] flex-col items-center justify-center gap-3 p-6 text-center text-slate-400"><span className="text-4xl">▤</span><p className="text-sm font-bold text-slate-600">Visor de documentos</p><p className="max-w-xs text-xs leading-5">Selecciona «Ver documento» junto a un archivo para abrirlo aquí sin salir de la ficha.</p></div>}
                      </div>
                    </div></section>

                  <section className="xl:col-span-2">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-slate-900">Seguimiento e incidencias</h3><span className="text-[10px] text-slate-400">Historial cronológico</span></div>
                    {modo === "interno" && <form onSubmit={guardarActividad} className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <textarea rows={3} maxLength={5000} value={actividad} onChange={(e) => setActividad(e.target.value)} placeholder="Añade un comentario de gestión o registra una incidencia…" className={inputClass + " resize-y"} />
                      <div className="mt-2 flex justify-end"><button disabled={!actividad.trim() || guardandoActividad} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-extrabold text-blue-950 disabled:opacity-40">{guardandoActividad ? "Guardando…" : "Añadir al seguimiento"}</button></div>
                    </form>}
                    <div className="mt-4 space-y-3">
                      {!(modo === "interno" ? detalle.actividad : (detalle.actividad || []).filter((entrada) => entrada.visible_notaria)).length ? <p className="py-3 text-xs text-slate-500">El historial aparecerá aquí conforme avance la gestión.</p> : (modo === "interno" ? detalle.actividad : (detalle.actividad || []).filter((entrada) => entrada.visible_notaria)).map((entrada) => (
                        <article key={entrada.id} className="relative border-l-2 border-blue-200 pl-4">
                          <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-blue-600" />
                          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-extrabold text-slate-800">{entrada.autor_nombre} <span className="ml-1 font-medium text-slate-400">· {entrada.tipo}</span></p><time className="text-[10px] text-slate-400">{fechaHora(entrada.creado_en)}</time></div>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{entrada.mensaje}</p>
                          {!entrada.visible_notaria && <span className="mt-1 inline-flex rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">Solo interno MOLSAN</span>}
                        </article>
                      ))}
                    </div>
                  </section>
                  {cargandoDetalle && <div className="xl:col-span-2 text-xs text-slate-400">Actualizando la ficha…</div>}
                </div>
              </>
            )}
          </div>
        </section>
        )}
        <p className="mt-6 text-center text-[10px] font-medium tracking-wide text-slate-400">MOLSAN ERP · EncargaGest · Portal independiente conectado al catálogo CTN</p>
      </main>

      {modalNuevo && (
        <div
          className="eg-modal-overlay"
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) setModalNuevo(false); }}
        >
          <form onSubmit={crearEncargo} className="eg-modal-form">
            <datalist id="eg-catalogo-municipios-registro">
              {catalogoMunicipiosRegistro.map((item) => <option key={item.id} value={item.municipio}>{item.provincia}</option>)}
            </datalist>
            <header className="eg-modal-header">
              <div className="eg-modal-brand">EG</div>
              <div className="eg-modal-heading">
                <span className="ag-eyebrow">MOLSAN ERP · PREMIUM 2027</span>
                <h2>Registrar nuevo encargo</h2>
                <p>Completa los datos de la solicitud y adjunta la documentación en su categoría.</p>
              </div>
              <button type="button" disabled={guardando} onClick={() => setModalNuevo(false)} className="eg-modal-close" aria-label="Cerrar modal">×</button>
            </header>

            {modo === "interno" ? (
              <div className="eg-modal-contexto">
                <Campo etiqueta="Notaría vinculada · catálogo CTN *">
                  <select required value={form.notaria_id} onChange={(e) => cambiarFiltro("notaria_id", e.target.value)} className={inputClass}>
                    <option value="">Selecciona una notaría…</option>
                    {notarias.map((n) => <option key={n.id} value={n.id}>{n.nombre}{n.nif ? " · " + n.nif : ""}{n.provincia ? " · " + n.provincia : ""}</option>)}
                  </select>
                  {!notarias.length && <span className="mt-1 block text-[10px] text-rose-600">No hay notarías CTN disponibles o no se han podido cargar.</span>}
                </Campo>
              </div>
            ) : (
              <div className="eg-modal-contexto">
                <div className="eg-modal-notaria">
                  <span className="eg-modal-contexto-punto" aria-hidden="true" />
                  El encargo se vinculará a <strong>{sesion?.notaria_nombre || "tu notaría"}</strong>, registrada en el catálogo CTN.
                </div>
              </div>
            )}

            <div className="eg-modal-layout">
              <section className="eg-modal-section eg-modal-datos">
                <div className="eg-modal-section-heading">
                  <span className="eg-modal-section-icono">01</span>
                  <div><span>DATOS PRINCIPALES</span><h3>Datos del encargo</h3></div>
                </div>

                <div className="eg-modal-field-grid">
                  <Campo etiqueta="Nombre del solicitante *" className="eg-span-2">
                    <input required minLength={2} maxLength={300} value={form.titular} onChange={(e) => cambiarFiltro("titular", e.target.value)} placeholder="Nombre y apellidos / razón social" className={inputClass} />
                  </Campo>
                  <Campo etiqueta="NIF / CIF del solicitante">
                    <input maxLength={50} value={form.nif_titular} onChange={(e) => cambiarFiltro("nif_titular", e.target.value)} placeholder="Documento identificativo" className={inputClass} />
                  </Campo>
                  <Campo etiqueta="Tipo de encargo *">
                    <select required value={form.tipo_encargo} onChange={(e) => cambiarFiltro("tipo_encargo", e.target.value)} className={inputClass}>
                      <option>Cancelación hipotecaria</option><option>Crédito hipotecario</option><option>Otros</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="Prioridad">
                    <select value={form.prioridad} onChange={(e) => cambiarFiltro("prioridad", e.target.value)} className={inputClass}>
                      <option>Normal</option><option>Alta</option><option>Urgente</option><option>Baja</option>
                    </select>
                  </Campo>
                  <div className="eg-span-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Contratos y fincas</p><p className="mt-1 text-xs text-slate-500">Cada contrato conserva su carpeta digital. Una misma finca puede estar asociada a contratos diferentes.</p></div>
                    <button type="button" onClick={anadirContrato} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white">＋ Añadir otro contrato</button>
                  </div>
                  {form.contratos.map((contrato, indiceContrato) => (
                    <div key={indiceContrato} className="eg-span-2 eg-contrato-layout rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3"><h4 className="text-sm font-black text-slate-900">Contrato {indiceContrato + 1}</h4>{form.contratos.length > 1 && <button type="button" onClick={() => quitarContrato(indiceContrato)} className="text-xs font-bold text-rose-700">Eliminar contrato</button>}</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Campo etiqueta="Entidad bancaria"><select value={contrato.entidad_bancaria} onChange={(e) => cambiarContrato(indiceContrato, "entidad_bancaria", e.target.value)} className={inputClass}><option value="">Selecciona una entidad…</option><option value="BBVA">BBVA</option><option value="CaixaBank">CaixaBank</option></select></Campo>
                        <Campo etiqueta="Número de préstamo"><input maxLength={150} value={contrato.numero_prestamo} onChange={(e) => cambiarContrato(indiceContrato, "numero_prestamo", e.target.value)} placeholder="Referencia del préstamo" className={inputClass} /></Campo>
                        <Campo etiqueta="Fecha de constitución"><input type="date" value={contrato.fecha_constitucion} onChange={(e) => cambiarContrato(indiceContrato, "fecha_constitucion", e.target.value)} className={inputClass} /></Campo>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h5 className="text-xs font-black uppercase tracking-wider text-slate-700">Fincas del contrato ({contrato.fincas.length})</h5><button type="button" onClick={() => anadirFinca(indiceContrato)} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-[11px] font-extrabold text-blue-800">＋ Añadir finca</button></div>
                      <div className="mt-3 space-y-3">
                        {contrato.fincas.map((finca, indiceFinca) => (
                          <div key={indiceFinca} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                            <Campo etiqueta="Número de finca"><input maxLength={150} value={finca.numero_finca} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "numero_finca", e.target.value)} placeholder="N.º finca registral" className={inputClass} /></Campo>
                            <Campo etiqueta="Inscripción"><input maxLength={100} value={finca.numero_inscripcion ?? ""} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "numero_inscripcion", e.target.value)} placeholder="Inscripción registral" className={inputClass} /></Campo>
                            <Campo etiqueta="Sección"><input maxLength={100} value={finca.seccion ?? ""} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "seccion", e.target.value)} placeholder="Sección registral" className={inputClass} /></Campo>
                            <Campo etiqueta="Capital inscrito en el registro (€)"><input type="number" min="0" step="0.01" value={finca.capital_inscrito ?? ""} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "capital_inscrito", e.target.value)} placeholder="0,00" className={inputClass} /></Campo>
                            <Campo etiqueta="Municipio del registro"><input maxLength={200} list="eg-catalogo-municipios-registro" value={finca.municipio_registro} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "municipio_registro", e.target.value)} placeholder="Busca un municipio…" autoComplete="off" className={inputClass} /></Campo>
                            <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Campo etiqueta="Registro de la Propiedad"><input maxLength={200} value={finca.registro_propiedad} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "registro_propiedad", e.target.value)} placeholder="Registro de la Propiedad" className={inputClass} /></Campo></div>{contrato.fincas.length > 1 && <button type="button" onClick={() => quitarFinca(indiceContrato, indiceFinca)} className="mb-0.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">×</button>}</div>
                          </div>
                        ))}
                      </div>

                    </div>
                  ))}
                                    <Campo etiqueta="Observaciones de la solicitud" className="eg-span-2">
                    <textarea rows={4} maxLength={10000} value={form.observaciones} onChange={(e) => cambiarFiltro("observaciones", e.target.value)} placeholder="Indicaciones y particularidades del encargo…" className={inputClass + " resize-y"} />
                  </Campo>
                </div>
              </section>
              <aside className="eg-modal-carpeta-lateral">
                {form.contratos.map((contrato, indiceContrato) => (
                  <div key={indiceContrato} className="eg-modal-carpeta-contrato">
                      <div className="eg-modal-carpeta-panel">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-blue-800">Carpeta digital · Contrato {indiceContrato + 1}</p>
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                          <div className="min-w-0 grid grid-cols-1 gap-2 md:grid-cols-2">
                            {CATEGORIAS_DOCUMENTO.map((categoria) => {
                              const clave = indiceContrato + "|" + categoria.nombre;
                              const seleccionados = archivosSolicitud[clave] || [];
                              return <div key={clave} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-[10px] font-black text-blue-800">{categoria.icono}</span><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{categoria.nombre}</p><p className="text-[10px] text-slate-400">{seleccionados.length} archivo(s)</p></div></div>
                                <input type="file" multiple accept={EXTENSIONES_DOCUMENTO} disabled={guardando} className="block w-full text-xs" onChange={(e) => { const nuevos = Array.from(e.target.files || []); if (nuevos[0]) setArchivoPrevisualizado(nuevos[0]); setArchivosSolicitud((actual) => ({ ...actual, [clave]: [...(actual[clave] || []), ...nuevos] })); e.target.value = ""; }} />
                                {seleccionados.length > 0 && <ul className="mt-2 space-y-1">{seleccionados.map((f, idx) => <li key={f.name + idx} className="truncate text-[10px] text-slate-600">{f.name}</li>)}</ul>}
                              </div>;
                            })}
                          </div>
                          <div className="min-h-[280px] min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <div className="border-b border-slate-200 bg-white px-3 py-2"><p className="truncate text-xs font-bold text-slate-700">{archivoPrevisualizado?.name || "Visor de documentos"}</p></div>
                            {archivoPrevisualizado && urlPrevisualizacion ? (/^application\/pdf$/i.test(archivoPrevisualizado.type) || /\.pdf$/i.test(archivoPrevisualizado.name) ? <iframe title={"Vista previa de " + archivoPrevisualizado.name} src={urlPrevisualizacion} className="h-[340px] w-full bg-white" /> : (/^image\//i.test(archivoPrevisualizado.type) ? <div className="flex h-[340px] items-center justify-center overflow-auto p-3"><img src={urlPrevisualizacion} alt={archivoPrevisualizado.name} className="max-h-full max-w-full object-contain" /></div> : <div className="flex h-[340px] flex-col items-center justify-center gap-2 p-5 text-center"><p className="text-xs font-bold text-slate-700">Este formato se guardará, pero no tiene vista previa integrada.</p><p className="break-all text-[10px] text-slate-500">{archivoPrevisualizado.name}</p></div>)) : <div className="flex h-[340px] flex-col items-center justify-center gap-2 p-5 text-center text-slate-400"><span className="text-3xl">▤</span><p className="text-xs font-semibold">Selecciona un archivo para ver su contenido aquí.</p></div>}
                          </div>
                        </div>
                      </div>
                  </div>
                ))}
              </aside>

            </div>

            {errorAccion && <p className="eg-modal-error" role="alert">{errorAccion}</p>}
            <footer className="eg-modal-footer">
              <span>{Object.values(archivosSolicitud).reduce((total, archivos) => total + archivos.length, 0)} archivo(s) seleccionado(s)</span>
              <div>
                <button type="button" disabled={guardando} onClick={() => setModalNuevo(false)} className="eg-secondary">Cancelar</button>
                <button type="submit" disabled={guardando || (modo === "interno" && !notarias.length)} className="eg-button-primary">
                  {guardando ? "Guardando encargo y documentos…" : "Guardar encargo"}
                </button>
              </div>
            </footer>
          </form>
        </div>
      )}

      {modalEditar && detalle && editForm && (
        <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6">
          <form onSubmit={guardarEdicion} className="my-auto max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-white/70 bg-white shadow-2xl">
            <datalist id="eg-catalogo-municipios-registro-edicion">
              {catalogoMunicipiosRegistro.map((item) => <option key={item.id} value={item.municipio}>{item.provincia}</option>)}
            </datalist>
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div><p className="text-[9px] font-black tracking-[0.18em] text-blue-700">ENCARGAGEST · EDICIÓN COMPARTIDA</p><h2 className="mt-1 text-xl font-black text-slate-900">Editar encargo {detalle.referencia}</h2><p className="mt-1 text-xs text-slate-500">Los cambios se guardan en el registro común y se mostrarán también en el portal de la notaría.</p></div>
              <button type="button" disabled={guardandoEdicion} onClick={() => setModalEditar(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500">×</button>
            </header>
            <div className="space-y-5 p-5 sm:p-7">
              <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                <Campo etiqueta="Nombre del solicitante *"><input required minLength={2} maxLength={300} value={editForm.titular} onChange={(e) => cambiarDatoEdicion("titular", e.target.value)} className={inputClass} /></Campo>
                <Campo etiqueta="NIF / CIF"><input maxLength={50} value={editForm.nif_titular} onChange={(e) => cambiarDatoEdicion("nif_titular", e.target.value)} className={inputClass} /></Campo>
                <Campo etiqueta="Tipo de encargo"><select value={editForm.tipo_encargo} onChange={(e) => cambiarDatoEdicion("tipo_encargo", e.target.value)} className={inputClass}><option>Cancelación hipotecaria</option><option>Crédito hipotecario</option><option>Otros</option></select></Campo>
                <Campo etiqueta="Prioridad"><select value={editForm.prioridad} onChange={(e) => cambiarDatoEdicion("prioridad", e.target.value)} className={inputClass}><option>Baja</option><option>Normal</option><option>Alta</option><option>Urgente</option></select></Campo>
                <Campo etiqueta="Persona de contacto"><input maxLength={200} value={editForm.contacto_nombre} onChange={(e) => cambiarDatoEdicion("contacto_nombre", e.target.value)} className={inputClass} /></Campo>
                <Campo etiqueta="Correo de contacto"><input type="email" maxLength={320} value={editForm.contacto_email} onChange={(e) => cambiarDatoEdicion("contacto_email", e.target.value)} className={inputClass} /></Campo>
                <Campo etiqueta="Teléfono de contacto"><input maxLength={60} value={editForm.contacto_telefono} onChange={(e) => cambiarDatoEdicion("contacto_telefono", e.target.value)} className={inputClass} /></Campo>
                <Campo etiqueta="Importe (€)"><input type="number" min="0" step="0.01" value={editForm.importe} onChange={(e) => cambiarDatoEdicion("importe", e.target.value)} className={inputClass} /></Campo>
                <Campo etiqueta="Fecha objetivo"><input type="date" value={(editForm.fecha_objetivo || "").slice(0,10)} onChange={(e) => cambiarDatoEdicion("fecha_objetivo", e.target.value)} className={inputClass} /></Campo>
                <Campo etiqueta="Observaciones de la solicitud" className="md:col-span-2 xl:col-span-3"><textarea rows={2} maxLength={10000} value={editForm.observaciones} onChange={(e) => cambiarDatoEdicion("observaciones", e.target.value)} className={inputClass} /></Campo>
                <Campo etiqueta="Nota interna MOLSAN" className="md:col-span-2 xl:col-span-3"><textarea rows={2} maxLength={10000} value={editForm.observaciones_internas} onChange={(e) => cambiarDatoEdicion("observaciones_internas", e.target.value)} className={inputClass} /></Campo>
              </section>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3"><div><h3 className="text-sm font-black text-slate-900">Contratos y fincas</h3><p className="mt-1 text-xs text-slate-500">Puedes añadir o modificar varios contratos y todas sus fincas.</p></div><button type="button" onClick={anadirContratoEdicion} className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white">＋ Añadir contrato</button></div>
              {editForm.contratos.map((contrato, contratoIndex) => (
                <section key={"editar-contrato-" + contratoIndex} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-black text-slate-900">Contrato {contratoIndex + 1}</h4>{editForm.contratos.length > 1 && <button type="button" onClick={() => setEditForm((actual) => ({ ...actual, contratos: actual.contratos.filter((_, i) => i !== contratoIndex) }))} className="text-xs font-bold text-rose-700">Eliminar contrato</button>}</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <Campo etiqueta="Entidad bancaria"><input maxLength={200} value={contrato.entidad_bancaria} onChange={(e) => cambiarContratoEdicion(contratoIndex, "entidad_bancaria", e.target.value)} className={inputClass} /></Campo>
                    <Campo etiqueta="Número de préstamo"><input maxLength={150} value={contrato.numero_prestamo} onChange={(e) => cambiarContratoEdicion(contratoIndex, "numero_prestamo", e.target.value)} className={inputClass} /></Campo>
                    <Campo etiqueta="Fecha de constitución"><input type="date" value={(contrato.fecha_constitucion || "").slice(0,10)} onChange={(e) => cambiarContratoEdicion(contratoIndex, "fecha_constitucion", e.target.value)} className={inputClass} /></Campo>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h5 className="text-xs font-black uppercase tracking-wider text-slate-700">Fincas ({contrato.fincas.length})</h5><button type="button" onClick={() => anadirFincaEdicion(contratoIndex)} className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-[11px] font-extrabold text-blue-800">＋ Añadir finca</button></div>
                  <div className="mt-3 space-y-3">
                    {contrato.fincas.map((finca, fincaIndex) => (
                      <div key={"editar-finca-" + contratoIndex + "-" + fincaIndex} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                        <Campo etiqueta="Número de finca"><input maxLength={150} value={finca.numero_finca} onChange={(e) => cambiarFincaEdicion(contratoIndex, fincaIndex, "numero_finca", e.target.value)} className={inputClass} /></Campo>
                        <Campo etiqueta="Inscripción"><input maxLength={100} value={finca.numero_inscripcion} onChange={(e) => cambiarFincaEdicion(contratoIndex, fincaIndex, "numero_inscripcion", e.target.value)} placeholder="Inscripción registral" className={inputClass} /></Campo>
                        <Campo etiqueta="Sección"><input maxLength={100} value={finca.seccion ?? ""} onChange={(e) => cambiarFincaEdicion(contratoIndex, fincaIndex, "seccion", e.target.value)} placeholder="Sección registral" className={inputClass} /></Campo>
                        <Campo etiqueta="Capital inscrito (€)"><input type="number" min="0" step="0.01" value={finca.capital_inscrito ?? ""} onChange={(e) => cambiarFincaEdicion(contratoIndex, fincaIndex, "capital_inscrito", e.target.value)} className={inputClass} /></Campo>
                        <Campo etiqueta="Municipio del registro"><input maxLength={200} list="eg-catalogo-municipios-registro-edicion" value={finca.municipio_registro} onChange={(e) => cambiarFincaEdicion(contratoIndex, fincaIndex, "municipio_registro", e.target.value)} placeholder="Busca un municipio…" autoComplete="off" className={inputClass} /></Campo>
                        <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Campo etiqueta="Registro de la Propiedad"><input maxLength={200} value={finca.registro_propiedad} onChange={(e) => cambiarFincaEdicion(contratoIndex, fincaIndex, "registro_propiedad", e.target.value)} className={inputClass} /></Campo></div>{contrato.fincas.length > 1 && <button type="button" onClick={() => setEditForm((actual) => ({ ...actual, contratos: actual.contratos.map((c, i) => i !== contratoIndex ? c : { ...c, fincas: c.fincas.filter((_, j) => j !== fincaIndex) }) }))} className="mb-0.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">×</button>}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {errorAccion && <p className="mx-5 mb-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 sm:mx-7">{errorAccion}</p>}
            <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7"><button type="button" disabled={guardandoEdicion} onClick={() => setModalEditar(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancelar</button><button type="submit" disabled={guardandoEdicion || !editForm.titular.trim()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-blue-950 disabled:opacity-50">{guardandoEdicion ? "Guardando cambios…" : "Guardar todos los cambios"}</button></footer>
          </form>
        </div>
      )}

      {modalIncidencia && detalle && (
        <div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
          <form onSubmit={registrarIncidencia} className="my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-2xl">
            <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 sm:px-7">
              <p className="text-[9px] font-extrabold tracking-[0.18em] text-rose-700">ENCARGAGEST · GESTIÓN DE INCIDENCIAS</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Indicar motivo de la incidencia</h2>
              <p className="mt-2 text-xs leading-5 text-slate-600">El motivo quedará registrado en el seguimiento y será visible para la notaría, para que pueda actuar y aportar lo que falte.</p>
            </div>
            <div className="space-y-3 p-5 sm:p-7">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><span className="text-slate-500">Encargo</span><p className="mt-1 font-extrabold text-slate-900">{detalle.referencia} · {detalle.titular}</p></div>
              <Campo etiqueta="Motivo detallado de la incidencia *"><textarea required minLength={5} maxLength={2000} rows={5} value={motivoIncidencia} onChange={(e) => setMotivoIncidencia(e.target.value)} className={inputClass} placeholder="Explica qué documento falta, qué dato debe corregirse o qué actuación se necesita…" /></Campo>
              <p className="text-[10px] text-slate-500">Este texto se comunicará a la notaría. No incluyas notas internas de Molsan.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-7">
              <button type="button" onClick={() => setModalIncidencia(false)} disabled={guardandoIncidencia} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancelar</button>
              <button type="submit" disabled={guardandoIncidencia || motivoIncidencia.trim().length < 5} className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">{guardandoIncidencia ? "Registrando…" : "Registrar y comunicar incidencia"}</button>
            </div>
          </form>
        </div>
      )}


      {perfilAbierto && modo === "externo" && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4 lg:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) setPerfilAbierto(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="eg-perfil-titulo" className="eg-modal-perfil my-0 w-full max-w-[1180px] min-w-0 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-white/70 bg-white shadow-2xl">
            <header className="eg-perfil-cabecera flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
              <div><p className="text-[9px] font-extrabold tracking-[0.18em] text-blue-700">ENCARGAGEST · FICHA CTN</p><h2 id="eg-perfil-titulo" className="mt-1 text-xl font-black text-slate-900">Ficha del notario</h2><p className="mt-1 text-xs text-slate-500">Datos de la notaría registrados en el catálogo CTN.</p></div>
              <button type="button" onClick={() => setPerfilAbierto(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500">×</button>
            </header>
            <div className="eg-perfil-layout grid min-w-0 grid-cols-1 gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] lg:gap-6 lg:p-7">
              <div>
                <div className="eg-perfil-identidad mb-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4"><div className="eg-perfil-avatar" aria-hidden="true">EG</div><div className="min-w-0"><p className="text-xs font-bold text-blue-800">{sesion?.notaria_nombre || sesion?.nombre || "Notaría"}</p><p className="mt-1 text-[11px] text-slate-500">Usuario de acceso</p><p className="mt-1 break-all font-black tracking-wide text-slate-900">{sesion?.usuario || sesion?.nif || "—"}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">La contraseña no se muestra aquí. Si no se ha cambiado, la contraseña inicial es el NIF completo.</p></div></div>
                <div className="eg-perfil-datos grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Nombre</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.notaria_nombre || sesion?.nombre || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">NIF</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.nif || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Usuario</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.usuario || sesion?.nif || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Teléfono</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.telefono || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Dirección</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.direccion || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Código postal</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.cp || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Municipio</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.municipio || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Provincia</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.provincia || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Código CTN</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.codigo || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Videoconferencia</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.vc || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Apoderado asociado</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.apoderado || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Departamento cancelaciones</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.departamento_cancelaciones || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Departamento copias</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.departamento_copias || "—"}</strong></div>
                  <div className="eg-perfil-dato rounded-xl border border-slate-100 p-3"><small className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Otros departamentos</small><strong className="mt-1 block break-words text-xs text-slate-700">{sesion?.otros_departamentos || "—"}</strong></div>
                </div>
                {sesion?.observacion && <div className="eg-perfil-observacion mt-3 rounded-xl bg-slate-50 p-3 text-xs"><small className="font-bold text-slate-500">Observaciones CTN</small><p className="mt-1 whitespace-pre-wrap text-slate-700">{sesion.observacion}</p></div>}
              </div>
              <form onSubmit={cambiarPasswordPerfil} className="eg-perfil-seguridad h-fit space-y-3 rounded-2xl border border-slate-200 p-4">
                <h3 className="text-sm font-extrabold text-slate-900">Cambiar contraseña</h3>
                {mensajePasswordPerfil && <p role="status" className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{mensajePasswordPerfil}</p>}
                {errorPasswordPerfil && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{errorPasswordPerfil}</p>}
                <label className="block text-xs font-semibold text-slate-600">Contraseña actual<input required type="password" autoComplete="current-password" value={passwordActualPerfil} onChange={e=>setPasswordActualPerfil(e.target.value)} className={inputClass + " mt-1"} /></label>
                <label className="block text-xs font-semibold text-slate-600">Nueva contraseña<input required minLength={8} type="password" autoComplete="new-password" value={passwordNuevaPerfil} onChange={e=>setPasswordNuevaPerfil(e.target.value)} className={inputClass + " mt-1"} /></label>
                <label className="block text-xs font-semibold text-slate-600">Repetir nueva contraseña<input required minLength={8} type="password" autoComplete="new-password" value={passwordConfirmarPerfil} onChange={e=>setPasswordConfirmarPerfil(e.target.value)} className={inputClass + " mt-1"} /></label>
                <button type="submit" disabled={guardandoPasswordPerfil} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-extrabold text-white disabled:opacity-60">{guardandoPasswordPerfil ? "Guardando…" : "Guardar nueva contraseña"}</button>
              </form>
            </div>
          </section>
        </div>
      )}

      {modalAccesos && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <form onSubmit={guardarAcceso} className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
              <div><p className="text-[9px] font-extrabold tracking-[0.18em] text-blue-700">ENCARGAGEST · CONTROL DE ACCESO</p><h2 className="mt-1 text-xl font-black text-slate-900">Accesos de notarías externas</h2><p className="mt-1 text-xs leading-5 text-slate-500">Las cuentas son independientes de NotarGest. El usuario de entrada se obtiene del NIF de CTN.</p></div>
              <button type="button" onClick={() => setModalAccesos(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500">×</button>
            </div>
            <div className="space-y-4 p-5 sm:p-7">
              <Campo etiqueta="Notaría del catálogo CTN *"><select required value={accesoNotariaId} onChange={(e) => { setAccesoNotariaId(e.target.value); setAccesoPassword(""); const seleccionado = accesos.find((x) => String(x.notaria_id) === e.target.value); setAccesoHabilitado(seleccionado?.habilitado ?? true); }} className={inputClass}><option value="">Selecciona una notaría…</option>{accesos.map((x) => <option key={x.notaria_id} value={x.notaria_id}>{x.nombre}{x.nif ? " · " + x.nif : ""}{x.tiene_acceso ? (x.habilitado ? " · acceso activo" : " · acceso deshabilitado") : " · sin acceso"}</option>)}</select></Campo>
              {accesoSeleccionado && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><p className="text-slate-500">Usuario de acceso</p><p className="mt-1 font-black tracking-wide text-slate-900">{accesoSeleccionado.usuario || "Completa el NIF de CTN"}</p><p className="mt-1 leading-5 text-slate-500">La contraseña se almacena protegida. En una cuenta nueva, déjala vacía para usar el NIF completo como contraseña inicial; si ya existe la cuenta, dejarla vacía conserva la actual.</p></div>}
              <Campo etiqueta={accesoSeleccionado?.tiene_acceso ? "Nueva contraseña (opcional)" : "Contraseña inicial *"}><input type="password" autoComplete="new-password" minLength={8} value={accesoPassword} onChange={(e) => setAccesoPassword(e.target.value)} className={inputClass} placeholder="Déjala vacía para usar el NIF o escribe una nueva (mínimo 8 caracteres)" /></Campo>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-700"><input type="checkbox" checked={accesoHabilitado} onChange={(e) => setAccesoHabilitado(e.target.checked)} />Permitir acceso al portal EncargaGest</label>
              <p className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-blue-900">Las notarías solo verán encargos asociados a su propio registro CTN. La información interna y los estados de gestión quedan reservados a MOLSAN.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-7"><button type="button" onClick={() => setModalAccesos(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cerrar</button><button type="submit" disabled={guardandoAcceso || !accesoNotariaId} className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-extrabold text-blue-950 disabled:opacity-50">{guardandoAcceso ? "Guardando acceso…" : "Guardar acceso"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
