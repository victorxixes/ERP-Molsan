import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalLogin from "../../components/PortalLogin";
import "../../css/ApoderaGest.css";
import "../../css/EncargaGest.css";
import axios, { configurarSesionEncargaGest, limpiarSesionEncargaGest } from "../../api/encargagest";
import { useAuthStore } from "../../store/authStore";

const ESTADOS = [
  { valor: "", texto: "Todos los estados" },
  { valor: "RECIBIDO", texto: "Recibido" },
  { valor: "EN_REVISION", texto: "En revisión" },
  { valor: "DOCUMENTACION_PENDIENTE", texto: "Documentación pendiente" },
  { valor: "INCIDENCIA", texto: "Incidencia" },
  { valor: "AUTORIZADO", texto: "Autorizado" },
  { valor: "RESUELTO", texto: "Resuelto" },
  { valor: "CERRADO", texto: "Cerrado" },
];

const FILTROS_BANDEJA = [
  { valor: "", texto: "Total de encargos" },
  { valor: "GRUPO_EN_PROCESO", texto: "En proceso" },
  { valor: "GRUPO_REQUIEREN_ATENCION", texto: "Requieren atención" },
  { valor: "GRUPO_AUTORIZADOS", texto: "Autorizados" },
  { valor: "GRUPO_FIRMADOS", texto: "Firmados" },
];

const ESTILO_ESTADO = {
  RECIBIDO: "border-sky-200 bg-sky-50 text-sky-700",
  EN_REVISION: "border-violet-200 bg-violet-50 text-violet-700",
  DOCUMENTACION_PENDIENTE: "border-amber-200 bg-amber-50 text-amber-800",
  EN_GESTION: "border-blue-200 bg-blue-50 text-blue-700",
  INCIDENCIA: "border-rose-200 bg-rose-50 text-rose-700",
  AUTORIZADO: "border-indigo-200 bg-indigo-50 text-indigo-700",
  RESUELTO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CERRADO: "border-slate-200 bg-slate-100 text-slate-600",
};

const TEXTO_ESTADO = { RECIBIDO: "Recibido", EN_REVISION: "En revisión", DOCUMENTACION_PENDIENTE: "Documentación pendiente", EN_GESTION: "En gestión", INCIDENCIA: "Incidencia", AUTORIZADO: "Autorizado", RESUELTO: "Resuelto", CERRADO: "Cerrado" };

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
  contratos: [{ entidad_bancaria: "", numero_prestamo: "", fecha_constitucion: "", fincas: [{ numero_finca: "", capital_inscrito: "", numero_inscripcion: "", municipio_registro: "", registro_propiedad: "" }] }],
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

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100";

export default function EncargaGest() {
  const navigate = useNavigate();
  const empleado = useAuthStore((state) => state.empleado);
  const tokenERP = useAuthStore((state) => state.token);
  const [modo, setModo] = useState(() => (
    empleado && tokenERP ? "interno" : (localStorage.getItem("encargagest_token") ? "externo" : "login")
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
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ ...NUEVO_ENCARGO });
  const [archivosSolicitud, setArchivosSolicitud] = useState({});
  const [categoriaDocumento, setCategoriaDocumento] = useState("Otros");
  const [detalleContratoIndex, setDetalleContratoIndex] = useState(0);
  const [archivoPrevisualizado, setArchivoPrevisualizado] = useState(null);
  const [urlPrevisualizacion, setUrlPrevisualizacion] = useState("");
  const [documentoAbierto, setDocumentoAbierto] = useState(null);
  const [actividad, setActividad] = useState("");
  const [visibleNotaria, setVisibleNotaria] = useState(true);
  const [guardandoActividad, setGuardandoActividad] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [errorAccion, setErrorAccion] = useState("");

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

  const cargarListado = useCallback(async (paginaSolicitada = pagina, q = busqueda, estado = filtroEstado) => {
    const respuesta = await axios.get("/encargagest/encargos", {
      params: { pagina: paginaSolicitada, por_pagina: 20, q: q.trim() || undefined, estado: estado || undefined },
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
  }, [pagina, busqueda, filtroEstado]);

  const cargarTodo = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const [res, nts, me] = await Promise.all([
        axios.get("/encargagest/resumen"),
        axios.get("/encargagest/notarias"),
        axios.get("/encargagest/me"),
      ]);
      setResumen(res.data || { total: 0, por_estado: {}, requieren_atencion: 0 });
      setNotarias(Array.isArray(nts.data) ? nts.data : []);
      setSesion(me.data || null);
      if (me.data?.modo === "externo") {
        setForm((actual) => ({ ...actual, notaria_id: String(me.data.notaria_id || "") }));
      }
      await cargarListado(pagina, busqueda, filtroEstado);
    } catch (e) {
      setError(e?.response?.data?.detail || "No se han podido cargar los datos de EncargaGest. Comprueba los permisos del módulo y vuelve a intentarlo.");
    } finally {
      setCargando(false);
    }
  }, [cargarListado, pagina, busqueda, filtroEstado, modo]);

  useEffect(() => {
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
  }, [empleado, tokenERP]);

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

  const filas = useMemo(() => items, [items]);
  const totalPaginas = Math.max(1, Math.ceil(total / 20));

  const cambiarFiltro = (campo, valor) => setForm((actual) => ({ ...actual, [campo]: valor }));
  const cambiarContrato = (indice, campo, valor) => setForm((actual) => ({ ...actual, contratos: actual.contratos.map((contrato, i) => i === indice ? { ...contrato, [campo]: valor } : contrato) }));
  const cambiarFinca = (indiceContrato, indiceFinca, campo, valor) => setForm((actual) => ({ ...actual, contratos: actual.contratos.map((contrato, i) => i !== indiceContrato ? contrato : { ...contrato, fincas: contrato.fincas.map((finca, j) => j === indiceFinca ? { ...finca, [campo]: valor } : finca) }) }));
  const anadirContrato = () => setForm((actual) => ({ ...actual, contratos: [...actual.contratos, { entidad_bancaria: "", numero_prestamo: "", fecha_constitucion: "", fincas: [{ numero_finca: "", capital_inscrito: "", numero_inscripcion: "", municipio_registro: "", registro_propiedad: "" }] }] }));
  const quitarContrato = (indice) => setForm((actual) => ({ ...actual, contratos: actual.contratos.filter((_, i) => i !== indice) }));
  const anadirFinca = (indice) => setForm((actual) => ({ ...actual, contratos: actual.contratos.map((contrato, i) => i === indice ? { ...contrato, fincas: [...contrato.fincas, { numero_finca: "", capital_inscrito: "", numero_inscripcion: "", municipio_registro: "", registro_propiedad: "" }] } : contrato) }));
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

  async function crearEncargo(event) {
    event.preventDefault();
    setGuardando(true);
    setErrorAccion("");
    setMensaje("");
    try {
      const contratosNormalizados = form.contratos.map((contrato) => ({ ...contrato, fecha_constitucion: contrato.fecha_constitucion || null, fincas: (contrato.fincas || []).map((finca) => ({ ...finca, capital_inscrito: finca.capital_inscrito === "" || finca.capital_inscrito == null ? null : Number(finca.capital_inscrito), numero_inscripcion: finca.numero_inscripcion || "" })) }));
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
      setForm({ ...NUEVO_ENCARGO, contratos: [{ entidad_bancaria: "", numero_prestamo: "", fecha_constitucion: "", fincas: [{ numero_finca: "", capital_inscrito: "", numero_inscripcion: "", municipio_registro: "", registro_propiedad: "" }] }] });
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

  async function cambiarEstado(nuevoEstado) {
    if (!detalle || !nuevoEstado || nuevoEstado === detalle.estado) return;
    setErrorAccion("");
    setMensaje("");
    try {
      await axios.post("/encargagest/encargos/" + detalle.id + "/estado", { estado: nuevoEstado });
      await cargarTodo();
      const actualizado = await axios.get("/encargagest/encargos/" + detalle.id);
      setDetalle(actualizado.data);
      setMensaje("Estado actualizado.");
    } catch (e) {
      setErrorAccion(e?.response?.data?.detail || "No se ha podido cambiar el estado.");
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
        visible_notaria: visibleNotaria,
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

  function salirEncargaGest() {
    if (modo === "externo") {
      limpiarSesionEncargaGest();
      setSesion(null);
      setDetalle(null);
      setItems([]);
      setResumen({ total: 0, por_estado: {}, requieren_atencion: 0 });
      setModo("login");
    } else {
      navigate("/modulos");
    }
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
    if (!accesoSeleccionado?.tiene_acceso && accesoPassword.length < 10) {
      setErrorAccion("La contraseña inicial debe tener al menos 10 caracteres.");
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
        footnote="Solicita tus credenciales a MOLSAN. El acceso de EncargaGest es independiente de NotarGest."
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
      <div className="ag-fondo-decorativo" aria-hidden="true" />
      <header className="ag-hero eg-hero">
        <div className="ag-hero-identidad">
          <div className="ag-marca eg-marca" aria-label="EncargaGest">EG</div>
          <div>
            <div className="ag-eyebrow">MOLSAN ERP · PREMIUM 2027</div>
            <h1>EncargaGest</h1>
            <p>{modo === "externo" ? "Portal profesional · " + (sesion?.notaria_nombre || "Sesión externa") : "Recepción y seguimiento de encargos notariales externos."}</p>
          </div>
        </div>
        <div className="ag-hero-acciones">
          <div className="ag-fecha-actual">
            <span className="ag-punto-vivo" aria-hidden="true" />
            <span>{fechaActual}</span>
          </div>
          <button type="button" onClick={salirEncargaGest} className="eg-secondary">
            {modo === "externo" ? "Cerrar sesión" : <><span aria-hidden="true">▦</span> Ir a módulos</>}
          </button>
          <button type="button" onClick={cargarTodo} disabled={cargando} className="ag-boton-actualizar">
            <span className={cargando ? "ag-icono-girando" : ""} aria-hidden="true">↻</span>
            {cargando ? "Actualizando…" : "Actualizar datos"}
          </button>
          {modo === "interno" && <button type="button" onClick={abrirAccesos} className="eg-secondary">Accesos externos</button>}
        </div>
      </header>

      <main className="eg-main w-full max-w-none px-1 pb-4">
        {error && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
            <span>{error}</span>
            <button type="button" className="font-bold underline" onClick={cargarTodo}>Reintentar</button>
          </div>
        )}
        {mensaje && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensaje}</div>}
        {errorAccion && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">{errorAccion}</div>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="ag-kpi ag-kpi-azul eg-kpi"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Total de encargos</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-slate-900">{resumen.total || 0}</strong><span className="text-xl text-amber-500">▤</span></div><p className="mt-1 text-xs text-slate-500">Solicitudes registradas</p></div>
          <div className="ag-kpi ag-kpi-verde eg-kpi"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">En proceso</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-sky-700">{resumen.por_estado?.RECIBIDO || 0}</strong><span className="text-xl text-sky-500">↓</span></div><p className="mt-1 text-xs text-slate-500">Encargos recibidos pendientes de gestión</p></div>
          <div className="ag-kpi ag-kpi-ambar eg-kpi"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-amber-700">Requieren atención</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-amber-900">{resumen.requieren_atencion || 0}</strong><span className="text-xl text-amber-600">!</span></div><p className="mt-1 text-xs text-amber-800">Incidencias o documentación pendiente</p></div>
          <div className="ag-kpi eg-kpi border border-indigo-100 bg-indigo-50/60"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-indigo-700">Autorizados</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-indigo-800">{resumen.por_estado?.AUTORIZADO || 0}</strong><span className="text-xl text-indigo-600">✓</span></div><p className="mt-1 text-xs text-indigo-800">Encargos autorizados para continuar</p></div>
          <div className="ag-kpi ag-kpi-verde eg-kpi"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">Firmados</p><div className="mt-2 flex items-end justify-between"><strong className="text-3xl font-black text-emerald-800">{(resumen.por_estado?.RESUELTO || 0) + (resumen.por_estado?.CERRADO || 0)}</strong><span className="text-xl text-emerald-600">✓</span></div><p className="mt-1 text-xs text-slate-500">Encargos resueltos o cerrados</p></div>
        </section>

        <section className="mt-6 grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(380px,0.92fr)_minmax(0,1.45fr)]">
          <div className="eg-panel min-w-0">
            <div className="eg-panel-head">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-extrabold text-slate-900">Bandeja de encargos</h2><p className="mt-1 text-xs text-slate-500">{total} solicitudes encontradas</p></div><div className="flex items-center gap-2"><span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Página {pagina} / {totalPaginas}</span><button type="button" onClick={() => { setModalNuevo(true); setErrorAccion(""); }} className="eg-button-primary whitespace-nowrap">＋ Nuevo encargo</button></div></div>
              <form className="mt-4 space-y-2" onSubmit={aplicarFiltros}>
                <input className={inputClass} type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar referencia, notaría, titular o banco…" />
                <div className="flex gap-2">
                  <select aria-label="Filtrar bandeja por grupo del panel" className={inputClass} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    {FILTROS_BANDEJA.map((estado) => <option key={estado.valor || "todos"} value={estado.valor}>{estado.texto}</option>)}
                  </select>
                  <button type="submit" className="shrink-0 rounded-xl bg-amber-500 px-4 text-xs font-extrabold text-amber-950 hover:bg-amber-400">Filtrar</button>
                </div>
              </form>
            </div>
            {cargando ? <div className="p-10 text-center text-sm text-slate-500">Cargando encargos…</div> : !filas.length ? (
              <div className="p-10 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-xl text-slate-400">▤</div><h3 className="mt-3 text-sm font-bold text-slate-800">Todavía no hay encargos</h3><p className="mt-1 text-xs leading-5 text-slate-500">Crea el primer encargo con el botón Nuevo encargo del encabezado de esta bandeja.</p></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filas.map((item) => (
                  <button type="button" key={item.id} onClick={() => { setSeleccionadoId(item.id); setErrorAccion(""); }} className={"block w-full border-l-4 p-4 text-left transition hover:bg-amber-50/50 " + (seleccionadoId === item.id ? "border-amber-500 bg-amber-50/70" : "border-transparent")}>
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-black tracking-wide text-amber-700">{item.referencia || ("EG-" + item.id)}</p><h3 className="mt-1 truncate text-sm font-extrabold text-slate-900">{item.titular}</h3><p className="mt-1 truncate text-xs text-slate-500">{item.notaria_nombre}</p></div><EtiquetaEstado estado={item.estado} /></div>
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
              <div className="grid min-h-[500px] place-items-center p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-600">EG</div><h2 className="mt-4 font-extrabold text-slate-900">Ficha del encargo</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Selecciona un encargo de la bandeja o registra una nueva solicitud.</p></div></div>
            ) : (
              <>
                <div className="eg-panel-head p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0"><p className="text-[10px] font-black tracking-[0.18em] text-amber-700">{detalle.referencia || ("EG-" + detalle.id)} · FICHA DE ENCARGO</p><h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">{detalle.titular}</h2><p className="mt-1 text-sm text-slate-500">{detalle.notaria_nombre}</p></div>
                    <div className="min-w-[190px]"><span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Estado de gestión</span>{modo === "interno" ? <select aria-label="Cambiar estado del encargo" value={detalle.estado} onChange={(e) => cambiarEstado(e.target.value)} className={inputClass}>{ESTADOS.filter((x) => x.valor).map((x) => <option key={x.valor} value={x.valor}>{x.texto}</option>)}</select> : <div className="pt-1"><EtiquetaEstado estado={detalle.estado} /></div>}</div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Tipo de encargo</span><p className="mt-1 text-xs font-bold text-slate-800">{detalle.tipo_encargo}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Capital inscrito</span><p className="mt-1 text-xs font-bold text-slate-800">{euros(detalle.capital_inscrito)}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Prioridad</span><p className="mt-1 text-xs font-bold text-slate-800">{detalle.prioridad}</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Fecha de constitución</span><p className="mt-1 text-xs font-bold text-slate-800">{detalle.fecha_constitucion ? new Date(detalle.fecha_constitucion + "T00:00:00").toLocaleDateString("es-ES") : "—"}</p></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 xl:grid-cols-2">
                  <section>
                    <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-slate-900">Datos de la solicitud</h3><span className="text-[10px] text-slate-400">CTN · ID {detalle.notaria_id}</span></div>
                    <dl className="mt-3 space-y-3 text-xs">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">NIF / CIF del solicitante</dt><dd className="text-right font-semibold text-slate-800">{detalle.nif_titular || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Entidad bancaria</dt><dd className="text-right font-semibold text-slate-800">{detalle.entidad_bancaria || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Número de préstamo</dt><dd className="text-right font-semibold text-slate-800">{detalle.numero_prestamo || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Número de finca</dt><dd className="text-right font-semibold text-slate-800">{detalle.numero_finca || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Municipio del registro</dt><dd className="text-right font-semibold text-slate-800">{detalle.municipio_registro || "—"}</dd></div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2"><dt className="text-slate-500">Registro de la propiedad</dt><dd className="text-right font-semibold text-slate-800">{detalle.registro_propiedad || "—"}</dd></div>
                      <div className="border-b border-slate-100 pb-3"><dt className="mb-1 text-slate-500">Observaciones de la solicitud</dt><dd className="whitespace-pre-wrap leading-5 text-slate-700">{detalle.observaciones || "Sin observaciones."}</dd></div>
                      {modo === "interno" && detalle.observaciones_internas ? <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3"><dt className="mb-1 font-bold text-amber-900">Nota interna MOLSAN</dt><dd className="whitespace-pre-wrap leading-5 text-amber-900">{detalle.observaciones_internas}</dd></div> : null}
                    </dl>
                  </section>

                  <section className="xl:col-span-2">
                    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-slate-900">Documentación adjunta</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{detalle.documentos?.length || 0} archivos</span></div>
                    {modo === "interno" && <form className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3" onSubmit={subirDocumento}>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                        <select aria-label="Contrato al que pertenece el documento" value={detalleContratoIndex} onChange={(e) => setDetalleContratoIndex(Number(e.target.value))} className={inputClass}>
                          {(detalle.contratos || [{}]).map((contrato, index) => <option key={index} value={index}>Contrato {index + 1} · {contrato.numero_prestamo || "sin número de préstamo"}</option>)}
                        </select>
                        <select aria-label="Categoría del documento" value={categoriaDocumento} onChange={(e) => setCategoriaDocumento(e.target.value)} className={inputClass}>
                          {CATEGORIAS_DOCUMENTO.map((categoria) => <option key={categoria.nombre} value={categoria.nombre}>{categoria.nombre}</option>)}
                        </select>
                        <div className="flex items-center gap-2"><input id="encargagest-archivo" type="file" accept={EXTENSIONES_DOCUMENTO} onChange={(e) => setArchivo(e.target.files?.[0] || null)} className="block min-w-0 w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-700" /><button type="submit" disabled={!archivo || subiendo} className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-40">{subiendo ? "Subiendo…" : "Subir archivo"}</button></div>
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400">PDF, Office, imagen o correo · máx. 25 MB</p>
                    </form>}
                    <div className="mt-3 space-y-2">
                      {!detalle.documentos?.length ? <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">Todavía no se ha adjuntado documentación.</p> : (detalle.contratos || [{}]).map((contrato, contratoIndex) => {
                        const docsContrato = detalle.documentos.filter((doc) => Number(doc.contrato_index || 0) === contratoIndex);
                        return <div key={"contrato-docs-" + contratoIndex} className="space-y-2 rounded-xl border border-amber-100 p-3"><h4 className="text-xs font-extrabold text-amber-800">Contrato {contratoIndex + 1} · {contrato.numero_prestamo || "sin número de préstamo"} <span className="font-medium text-slate-400">({docsContrato.length} archivos)</span></h4>{docsContrato.length === 0 ? <p className="text-xs text-slate-400">Sin documentos en este contrato.</p> : docsContrato.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                            <div className="min-w-0"><p className="break-words text-xs font-bold text-slate-800">{doc.nombre_original}</p><p className="mt-1 text-[10px] text-slate-400">{doc.categoria || "Otros"} · {nombreArchivoTamano(doc.tamano_bytes)} · {fechaHora(doc.fecha_subida)}</p></div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-1"><button type="button" onClick={() => verDocumento(doc)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100">Vista previa</button><button type="button" onClick={() => descargarDocumento(doc)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-bold hover:bg-slate-50">Descargar</button>{modo === "interno" && <button type="button" onClick={() => eliminarDocumento(doc)} className="rounded-lg border border-rose-200 px-2 py-1.5 text-[10px] font-bold text-rose-700 hover:bg-rose-50">×</button>}</div>
                          </div>
                        ))}</div>;
                      })}
                    </div>
                    {documentoAbierto && <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3"><div className="min-w-0"><h4 className="text-xs font-extrabold text-slate-800">Visor de documentos</h4><p className="mt-1 break-all text-[10px] text-slate-500">{documentoAbierto.nombre}</p></div><div className="flex gap-2"><a href={documentoAbierto.url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100">Abrir aparte</a><button type="button" onClick={() => setDocumentoAbierto(null)} className="rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white">Cerrar visor</button></div></div>
                      {documentoAbierto.tipo.toLowerCase().includes("pdf") || documentoAbierto.nombre.toLowerCase().endsWith(".pdf") ? <iframe title={"Vista previa de " + documentoAbierto.nombre} src={documentoAbierto.url} className="h-[620px] w-full bg-slate-100" /> : documentoAbierto.tipo.toLowerCase().startsWith("image/") ? <div className="flex max-h-[620px] justify-center overflow-auto bg-slate-100 p-3"><img src={documentoAbierto.url} alt={documentoAbierto.nombre} className="max-h-[590px] max-w-full object-contain" /></div> : <div className="p-5 text-xs text-slate-600">La vista previa integrada está disponible para PDF e imágenes. Para este formato, utiliza «Abrir aparte» o «Descargar».</div>}
                    </div>}
                  </section>

                  <section className="xl:col-span-2">
                    <div className="flex items-center justify-between"><h3 className="text-sm font-extrabold text-slate-900">Seguimiento e incidencias</h3><span className="text-[10px] text-slate-400">Historial cronológico</span></div>
                    {modo === "interno" && <form onSubmit={guardarActividad} className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <textarea rows={3} maxLength={5000} value={actividad} onChange={(e) => setActividad(e.target.value)} placeholder="Añade un comentario de gestión o registra una incidencia…" className={inputClass + " resize-y"} />
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={visibleNotaria} onChange={(e) => setVisibleNotaria(e.target.checked)} /> Visible para la notaría</label><button disabled={!actividad.trim() || guardandoActividad} type="submit" className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-extrabold text-amber-950 disabled:opacity-40">{guardandoActividad ? "Guardando…" : "Añadir al seguimiento"}</button></div>
                    </form>}
                    <div className="mt-4 space-y-3">
                      {!(modo === "interno" ? detalle.actividad : (detalle.actividad || []).filter((entrada) => entrada.visible_notaria)).length ? <p className="py-3 text-xs text-slate-500">El historial aparecerá aquí conforme avance la gestión.</p> : (modo === "interno" ? detalle.actividad : (detalle.actividad || []).filter((entrada) => entrada.visible_notaria)).map((entrada) => (
                        <article key={entrada.id} className="relative border-l-2 border-amber-200 pl-4">
                          <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-amber-500" />
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
        <p className="mt-6 text-center text-[10px] font-medium tracking-wide text-slate-400">MOLSAN ERP · EncargaGest · Portal independiente conectado al catálogo CTN</p>
      </main>

      {modalNuevo && (
        <div
          className="eg-modal-overlay"
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) setModalNuevo(false); }}
        >
          <form onSubmit={crearEncargo} className="eg-modal-form">
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
                    <div><p className="text-xs font-black uppercase tracking-wider text-amber-700">Contratos y fincas</p><p className="mt-1 text-xs text-slate-500">Cada contrato conserva su carpeta digital. Una misma finca puede estar asociada a contratos diferentes.</p></div>
                    <button type="button" onClick={anadirContrato} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white">＋ Añadir otro contrato</button>
                  </div>
                  {form.contratos.map((contrato, indiceContrato) => (
                    <div key={indiceContrato} className="eg-span-2 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3"><h4 className="text-sm font-black text-slate-900">Contrato {indiceContrato + 1}</h4>{form.contratos.length > 1 && <button type="button" onClick={() => quitarContrato(indiceContrato)} className="text-xs font-bold text-rose-700">Eliminar contrato</button>}</div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Campo etiqueta="Entidad bancaria"><select value={contrato.entidad_bancaria} onChange={(e) => cambiarContrato(indiceContrato, "entidad_bancaria", e.target.value)} className={inputClass}><option value="">Selecciona una entidad…</option><option value="BBVA">BBVA</option><option value="CaixaBank">CaixaBank</option></select></Campo>
                        <Campo etiqueta="Número de préstamo"><input maxLength={150} value={contrato.numero_prestamo} onChange={(e) => cambiarContrato(indiceContrato, "numero_prestamo", e.target.value)} placeholder="Referencia del préstamo" className={inputClass} /></Campo>
                        <Campo etiqueta="Fecha de constitución"><input type="date" value={contrato.fecha_constitucion} onChange={(e) => cambiarContrato(indiceContrato, "fecha_constitucion", e.target.value)} className={inputClass} /></Campo>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h5 className="text-xs font-black uppercase tracking-wider text-slate-700">Fincas del contrato ({contrato.fincas.length})</h5><button type="button" onClick={() => anadirFinca(indiceContrato)} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-[11px] font-extrabold text-amber-800">＋ Añadir finca</button></div>
                      <div className="mt-3 space-y-3">
                        {contrato.fincas.map((finca, indiceFinca) => (
                          <div key={indiceFinca} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-5">
                            <Campo etiqueta="Número de finca"><input maxLength={150} value={finca.numero_finca} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "numero_finca", e.target.value)} placeholder="N.º finca registral" className={inputClass} /></Campo>
                            <Campo etiqueta="Capital inscrito en el registro (€)"><input type="number" min="0" step="0.01" value={finca.capital_inscrito ?? ""} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "capital_inscrito", e.target.value)} placeholder="0,00" className={inputClass} /></Campo>
                            <Campo etiqueta="Nº Inscripción"><input maxLength={100} value={finca.numero_inscripcion ?? ""} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "numero_inscripcion", e.target.value)} placeholder="N.º inscripción" className={inputClass} /></Campo>
                            <Campo etiqueta="Municipio del registro"><input maxLength={200} value={finca.municipio_registro} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "municipio_registro", e.target.value)} placeholder="Municipio" className={inputClass} /></Campo>
                            <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><Campo etiqueta="Registro de la Propiedad"><input maxLength={200} value={finca.registro_propiedad} onChange={(e) => cambiarFinca(indiceContrato, indiceFinca, "registro_propiedad", e.target.value)} placeholder="Registro de la Propiedad" className={inputClass} /></Campo></div>{contrato.fincas.length > 1 && <button type="button" onClick={() => quitarFinca(indiceContrato, indiceFinca)} className="mb-0.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">×</button>}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 border-t border-amber-200 pt-3">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-amber-800">Carpeta digital · Contrato {indiceContrato + 1}</p>
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                          <div className="min-w-0 grid grid-cols-1 gap-2 md:grid-cols-2">
                            {CATEGORIAS_DOCUMENTO.map((categoria) => {
                              const clave = indiceContrato + "|" + categoria.nombre;
                              const seleccionados = archivosSolicitud[clave] || [];
                              return <div key={clave} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="mb-2 flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-[10px] font-black text-amber-800">{categoria.icono}</span><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{categoria.nombre}</p><p className="text-[10px] text-slate-400">{seleccionados.length} archivo(s)</p></div></div>
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
                                    <Campo etiqueta="Observaciones de la solicitud" className="eg-span-2">
                    <textarea rows={4} maxLength={10000} value={form.observaciones} onChange={(e) => cambiarFiltro("observaciones", e.target.value)} placeholder="Indicaciones y particularidades del encargo…" className={inputClass + " resize-y"} />
                  </Campo>
                </div>
              </section>

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

      {modalAccesos && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <form onSubmit={guardarAcceso} className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7">
              <div><p className="text-[9px] font-extrabold tracking-[0.18em] text-amber-700">ENCARGAGEST · CONTROL DE ACCESO</p><h2 className="mt-1 text-xl font-black text-slate-900">Accesos de notarías externas</h2><p className="mt-1 text-xs leading-5 text-slate-500">Las cuentas son independientes de NotarGest. El usuario de entrada se obtiene del NIF de CTN.</p></div>
              <button type="button" onClick={() => setModalAccesos(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500">×</button>
            </div>
            <div className="space-y-4 p-5 sm:p-7">
              <Campo etiqueta="Notaría del catálogo CTN *"><select required value={accesoNotariaId} onChange={(e) => { setAccesoNotariaId(e.target.value); setAccesoPassword(""); const seleccionado = accesos.find((x) => String(x.notaria_id) === e.target.value); setAccesoHabilitado(seleccionado?.habilitado ?? true); }} className={inputClass}><option value="">Selecciona una notaría…</option>{accesos.map((x) => <option key={x.notaria_id} value={x.notaria_id}>{x.nombre}{x.nif ? " · " + x.nif : ""}{x.tiene_acceso ? (x.habilitado ? " · acceso activo" : " · acceso deshabilitado") : " · sin acceso"}</option>)}</select></Campo>
              {accesoSeleccionado && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"><p className="text-slate-500">Usuario de acceso</p><p className="mt-1 font-black tracking-wide text-slate-900">{accesoSeleccionado.usuario || "Completa el NIF de CTN"}</p><p className="mt-1 leading-5 text-slate-500">No se muestra ni se almacena la contraseña en texto plano. Si ya existe la cuenta, déjala vacía para conservarla.</p></div>}
              <Campo etiqueta={accesoSeleccionado?.tiene_acceso ? "Nueva contraseña (opcional)" : "Contraseña inicial *"}><input type="password" autoComplete="new-password" minLength={10} required={!accesoSeleccionado?.tiene_acceso} value={accesoPassword} onChange={(e) => setAccesoPassword(e.target.value)} className={inputClass} placeholder="Mínimo 10 caracteres" /></Campo>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs text-slate-700"><input type="checkbox" checked={accesoHabilitado} onChange={(e) => setAccesoHabilitado(e.target.checked)} />Permitir acceso al portal EncargaGest</label>
              <p className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-5 text-blue-900">Las notarías solo verán encargos asociados a su propio registro CTN. La información interna y los estados de gestión quedan reservados a MOLSAN.</p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-7"><button type="button" onClick={() => setModalAccesos(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cerrar</button><button type="submit" disabled={guardandoAcceso || !accesoNotariaId} className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-amber-950 disabled:opacity-50">{guardandoAcceso ? "Guardando acceso…" : "Guardar acceso"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
