import "../../css/ModalesOperativosPremium.css";
import MolsanIcon from "../ui/MolsanIcon";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  editarEmpleado,
  subirFotoEmpleado,
  resetPasswordEmpleado,
  obtenerConfiguracionNotariasEncargaGest,
  guardarResponsableNotariaEncargaGest,
  obtenerReglasRepartoGestor,
  guardarReglasRepartoGestor,
  listarEmpleados,
  listarApoderados,
} from "../../api/empleados";

import {
  getMaestros,
} from "../../api/maestros";

import {
  obtenerCatalogosListadoExpedientes,
} from "../../api/expedientes";

import {
  useSeguridadStore,
} from "../../store/seguridadStore";

import MODULOS_ERP from "../../config/modulos";
import AuthenticatedPhoto from "../AuthenticatedPhoto";
import VisibilidadTablas from "../expedientes/VisibilidadTablas";
import { useAuthStore } from "../../store/authStore";

// ============================================================
// PERMISOS ESTÁNDAR DEL ERP
// ============================================================
//
// Se utilizan cuando un módulo existe en el catálogo central
// pero todavía no tiene registros de permisos globales.
//
// NO modifica el backend.
// NO asigna permisos automáticamente.
// Solo hace que las casillas aparezcan para poder marcarlas.
// ============================================================

const PERMISOS_ESTANDAR = [
  "ver",
  "crear",
  "editar",
  "eliminar",
];

/**
 * ============================================================
 * MODAL EMPLEADO — MOLSAN ERP SAAS PREMIUM 2027
 * ============================================================
 *
 * PESTAÑAS:
 *
 * - Datos básicos
 * - Datos personales
 * - Datos laborales
 * - Accesos
 * - Seguridad
 * - Auditoría
 *
 * DATOS EDITABLES:
 *
 * - Datos básicos
 * - Datos personales
 * - Datos laborales
 *
 * SEGURIDAD:
 *
 * - Módulos visibles
 * - Permisos por módulo
 * - Reset password
 *
 * MAESTROS:
 *
 * - Departamentos
 * - Secciones
 * - Cargos
 *
 * FOTO:
 *
 * - Normalización de URL
 * - Compatible con /api/fotos
 * - Compatible con /fotos
 * - Compatible con nombre de archivo
 * - Cache busting después de subir foto
 *
 * API EMPLEADOS:
 *
 * - editarEmpleado()
 * - subirFotoEmpleado()
 * - resetPasswordEmpleado()
 *
 * API MAESTROS:
 *
 * - getMaestros()
 *
 * STORE SEGURIDAD:
 *
 * - cargarFicha()
 * - asignarModulos()
 * - asignarPermisos()
 */


/* ============================================================
   HELPERS
============================================================ */

function normalizarPermisos(
  valor
) {

  if (
    !valor ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    return {};
  }

  const resultado = {};

  Object.entries(valor).forEach(
    ([modulo, permisos]) => {

      if (
        typeof modulo !== "string"
      ) {
        return;
      }

      if (
        Array.isArray(permisos)
      ) {

        resultado[modulo] =
          permisos.filter(
            (permiso) =>
              typeof permiso === "string"
          );

        return;
      }

      if (
        permisos &&
        typeof permisos === "object"
      ) {

        resultado[modulo] =
          Object.entries(permisos)
            .filter(
              ([, activo]) =>
                Boolean(activo)
            )
            .map(
              ([permiso]) =>
                permiso
            );
      }
    }
  );

  return resultado;
}


/* ============================================================
   ERRORES — CONVERTIR SIEMPRE A TEXTO
============================================================ */

function obtenerMensajeError(
  error,
  mensajeDefecto
) {

  const detail =
    error?.response?.data?.detail;

  if (
    typeof detail === "string" &&
    detail.trim()
  ) {
    return detail;
  }

  if (
    Array.isArray(detail)
  ) {

    const mensajes =
      detail
        .map(
          (item) =>
            item?.msg ||
            (
              typeof item === "string"
                ? item
                : ""
            )
        )
        .filter(Boolean);

    if (
      mensajes.length > 0
    ) {
      return mensajes.join(". ");
    }
  }

  if (
    detail &&
    typeof detail === "object"
  ) {

    if (
      typeof detail.msg === "string" &&
      detail.msg.trim()
    ) {
      return detail.msg;
    }

    try {

      return JSON.stringify(
        detail
      );

    } catch {

      return mensajeDefecto;
    }
  }

  if (
    typeof error?.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return mensajeDefecto;
}


/* ============================================================
   FOTO — NORMALIZAR URL
============================================================ */

function prepararFotoEmpleado(
  foto
) {

  if (!foto) {
    return null;
  }

  const valor =
    String(foto)
      .trim();

  if (!valor) {
    return null;
  }


  /*
   * ----------------------------------------------------------
   * URL ABSOLUTA
   * ----------------------------------------------------------
   */

  if (
    valor.startsWith("http://") ||
    valor.startsWith("https://")
  ) {
    return valor;
  }


  /*
   * ----------------------------------------------------------
   * API CONFIGURADA
   * ----------------------------------------------------------
   */

  const apiConfigurada =
    String(
      import.meta.env.VITE_API_URL || ""
    )
      .replace(
        /\/+$/,
        ""
      );


  /*
   * Si VITE_API_URL termina en /api,
   * nos quedamos con el origen.
   */

  const origen =
    (
      apiConfigurada
        ? apiConfigurada
            .replace(
              /\/api$/i,
              ""
            )
        : (
            typeof window !== "undefined"
              ? window.location.origin
              : ""
          )
    );


  /*
   * Normalizar la ruta.
   */

  const ruta =
    valor.startsWith("/")
      ? valor
      : `/${valor}`;


  /*
   * ----------------------------------------------------------
   * CASO 1
   *
   * /api/fotos/empleados/empleado_1.png
   * ----------------------------------------------------------
   */

  if (
    ruta.startsWith("/api/")
  ) {
    return (
      `${origen}${ruta}`
    );
  }


  /*
   * ----------------------------------------------------------
   * CASO 2
   *
   * /fotos/empleados/empleado_1.png
   * ----------------------------------------------------------
   */

  if (
    ruta.startsWith("/fotos/")
  ) {
    return (
      `${origen}/api${ruta}`
    );
  }


  /*
   * ----------------------------------------------------------
   * CASO 3
   *
   * /static/fotos/empleados/...
   * ----------------------------------------------------------
   */

  if (
    ruta.startsWith("/static/fotos/")
  ) {
    return (
      `${origen}${ruta}`
    );
  }


  /*
   * ----------------------------------------------------------
   * CASO 4
   *
   * /empleados/empleado_1.png
   * ----------------------------------------------------------
   */

  if (
    ruta.startsWith("/empleados/")
  ) {
    return (
      `${origen}/api/fotos${ruta}`
    );
  }


  /*
   * ----------------------------------------------------------
   * CASO 5
   *
   * Solo nombre de archivo:
   *
   * empleado_1.png
   * ----------------------------------------------------------
   */

  return (
    `${origen}/api/fotos/empleados${ruta}`
  );
}


/* ============================================================
   COMPONENTE
============================================================ */

export default function ModalEmpleado({
  open = false,
  empleadoId = null,
  onClose,
  modoAdministracion = false,
  pestanaInicial = "basicos",
}) {

  /* ==========================================================
     STORE SEGURIDAD
  ========================================================== */

  const {
    ficha,
    permisos: permisosGlobales,
    roles,
    cargarRoles,
    cargarFicha,
    asignarRol,
    asignarModulos,
    asignarPermisos,
  } = useSeguridadStore();

  const usuarioSesion = useAuthStore((s) => s.empleado);
  const actualizarEmpleadoSesion = useAuthStore((s) => s.actualizarEmpleadoSesion);

  // El rol puede llegar como texto plano, objeto anidado o solo como rol_id.
  // Si el catálogo está cargado, el nombre del rol tiene prioridad sobre el ID.
  const rolCatalogoSesion = Array.isArray(roles)
    ? roles.find((item) => Number(item?.id) === Number(usuarioSesion?.rol_id))
    : null;
  const valorRolSesion =
    usuarioSesion?.rol_nombre ||
    usuarioSesion?.nombre_rol ||
    usuarioSesion?.role_name ||
    usuarioSesion?.roleName ||
    usuarioSesion?.rol?.nombre ||
    usuarioSesion?.rol?.name ||
    (typeof usuarioSesion?.rol === "string" ? usuarioSesion.rol : "") ||
    usuarioSesion?.role?.name ||
    usuarioSesion?.role?.nombre ||
    (typeof usuarioSesion?.role === "string" ? usuarioSesion.role : "") ||
    usuarioSesion?.perfil?.nombre ||
    rolCatalogoSesion?.nombre ||
    "";
  const nombreRolSesion = String(valorRolSesion)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const rolIdSesion = Number(
    usuarioSesion?.rol_id ??
    usuarioSesion?.rol?.id ??
    usuarioSesion?.role?.id ??
    rolCatalogoSesion?.id
  );
  // El backend crea la cuenta técnica "admin" con rol_id=0.
  // No asumir que rol_id=1 es administrador: puede ser Empleado estándar.
  // Si no hay nombre de rol disponible, solo damos acceso por la cuenta
  // técnica conocida o por el ID técnico 0; ante cualquier duda, bloqueamos.
  const usuarioSesionNormalizado = String(usuarioSesion?.usuario || "")
    .trim()
    .toLowerCase();
  const esAdministrador =
    // El ID técnico 0 es administrador aunque el backend también envíe
    // un nombre de rol distinto (por ejemplo, "Superusuario").
    rolIdSesion === 0 ||
    usuarioSesionNormalizado === "admin" ||
    /admin|administrador|administradora|superusuario|superuser|root/.test(nombreRolSesion);


  /* ==========================================================
     ESTADOS
  ========================================================== */

  const [
    cargando,
    setCargando,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    subiendoFoto,
    setSubiendoFoto,
  ] = useState(false);

  const [
    resettingPassword,
    setResettingPassword,
  ] = useState(false);

  const [guardandoVisibilidadEmpleado, setGuardandoVisibilidadEmpleado] = useState(false);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    mensaje,
    setMensaje,
  ] = useState(null);

  const [
    pestana,
    setPestana,
  ] = useState(pestanaInicial);

  const [
    confirmReset,
    setConfirmReset,
  ] = useState(false);

  const [notariasEncargaGest, setNotariasEncargaGest] = useState([]);
  const [cargandoNotariasEncargaGest, setCargandoNotariasEncargaGest] = useState(false);
  const [guardandoNotariasEncargaGest, setGuardandoNotariasEncargaGest] = useState(false);
  const [errorNotariasEncargaGest, setErrorNotariasEncargaGest] = useState("");
  const [mensajeNotariasEncargaGest, setMensajeNotariasEncargaGest] = useState("");
  const [busquedaNotariaEncargaGest, setBusquedaNotariaEncargaGest] = useState("");
  const [empleadosReparto, setEmpleadosReparto] = useState([]);
  const [apoderadosReparto, setApoderadosReparto] = useState([]);
  const [reglasReparto, setReglasReparto] = useState([]);
  const [gestorRepartoId, setGestorRepartoId] = useState("");
  const [actividadesReparto, setActividadesReparto] = useState([]);
  const [comunidadesReparto, setComunidadesReparto] = useState([]);
  const [productosGtgReparto, setProductosGtgReparto] = useState([]);
  const [tiposOperacionReparto, setTiposOperacionReparto] = useState([]);
  const [estadosExpedienteReparto, setEstadosExpedienteReparto] = useState([]);
  const [cargandoCatalogosReparto, setCargandoCatalogosReparto] = useState(false);
  const [cargandoReparto, setCargandoReparto] = useState(false);
  const [guardandoReparto, setGuardandoReparto] = useState(false);
  const [errorReparto, setErrorReparto] = useState("");
  const [mensajeReparto, setMensajeReparto] = useState("");

  const [
    empleadoEdit,
    setEmpleadoEdit,
  ] = useState({});

  const [
    modulosVisibles,
    setModulosVisibles,
  ] = useState([]);

  const [
    permisosModulo,
    setPermisosModulo,
  ] = useState({});


  /* ==========================================================
     VERSION FOTO
  ========================================================== */

  const [
    fotoVersion,
    setFotoVersion,
  ] = useState(0);


  /* ==========================================================
     MAESTROS
  ========================================================== */

  const [
    departamentos,
    setDepartamentos,
  ] = useState([]);

  const [
    secciones,
    setSecciones,
  ] = useState([]);

  const [
    cargos,
    setCargos,
  ] = useState([]);


  /* ==========================================================
     CARGAR FICHA
  ========================================================== */

  useEffect(() => {

    if (
      !open ||
      empleadoId === null ||
      empleadoId === undefined ||
      empleadoId === ""
    ) {
      return;
    }

    let activo = true;

    const cargar = async () => {

      try {

        setCargando(true);
        setError(null);
        setMensaje(null);
        setPestana(pestanaInicial || "basicos");

        await cargarFicha(
          empleadoId
        );

      } catch (err) {

        console.error("No se ha podido cargar la ficha del empleado.");

        if (activo) {

          setError(
            obtenerMensajeError(
              err,
              "No se ha podido cargar la ficha del empleado."
            )
          );
        }

      } finally {

        if (activo) {

          setCargando(false);

        }
      }
    };

    cargar();

    return () => {

      activo = false;

    };

  }, [
    open,
    empleadoId,
    cargarFicha,
  ]);


  /* ==========================================================
     CARGAR MAESTROS
  ========================================================== */

  useEffect(() => {

    if (!open) {
      return;
    }

    let activo = true;

    const cargarMaestros = async () => {

      try {

        const [
          departamentosRes,
          seccionesRes,
          cargosRes,
        ] = await Promise.all([
          getMaestros("departamentos"),
          getMaestros("secciones"),
          getMaestros("cargos"),
          cargarRoles(),
        ]);

        if (!activo) {
          return;
        }

        setDepartamentos(
          Array.isArray(
            departamentosRes?.data
          )
            ? departamentosRes.data
            : []
        );

        setSecciones(
          Array.isArray(
            seccionesRes?.data
          )
            ? seccionesRes.data
            : []
        );

        setCargos(
          Array.isArray(
            cargosRes?.data
          )
            ? cargosRes.data
            : []
        );

      } catch (err) {

        console.error("No se han podido cargar los catálogos del empleado.");

        if (activo) {

          setDepartamentos([]);
          setSecciones([]);
          setCargos([]);

        }
      }
    };

    cargarMaestros();

    return () => {

      activo = false;

    };

  }, [
    open,
    cargarRoles,
  ]);


  /* ==========================================================
     SINCRONIZAR FICHA
  ========================================================== */

  useEffect(() => {

    if (!ficha) {

      setEmpleadoEdit({});
      setModulosVisibles([]);
      setPermisosModulo({});
      setFotoVersion(0);

      return;
    }


    /* --------------------------------------------------------
       EMPLEADO
    -------------------------------------------------------- */

    const empleadoFicha =
      ficha?.empleado &&
      typeof ficha.empleado === "object"
        ? ficha.empleado
        : {};

    setEmpleadoEdit(
      {
        ...empleadoFicha,
      }
    );


    /*
     * Cada vez que llega una ficha nueva,
     * permitimos volver a cargar la imagen normalmente.
     */

    setFotoVersion(0);


    /* --------------------------------------------------------
       MÓDULOS
    -------------------------------------------------------- */

    const modulos =
      Array.isArray(
        empleadoFicha.modulos_visibles_list
      )
        ? empleadoFicha.modulos_visibles_list
        : Array.isArray(
            empleadoFicha.modulos_visibles
          )
          ? empleadoFicha.modulos_visibles
          : Array.isArray(
              ficha.modulos_visibles_list
            )
            ? ficha.modulos_visibles_list
            : Array.isArray(
                ficha.modulos_visibles
              )
              ? ficha.modulos_visibles
              : [];

    setModulosVisibles(
      modulos.filter(
        (modulo) =>
          typeof modulo === "string"
      )
    );


    /* --------------------------------------------------------
       PERMISOS
    -------------------------------------------------------- */

    const permisos =
      empleadoFicha.permisos_modulo_dict &&
      typeof empleadoFicha.permisos_modulo_dict === "object" &&
      !Array.isArray(
        empleadoFicha.permisos_modulo_dict
      )
        ? empleadoFicha.permisos_modulo_dict
        : empleadoFicha.permisos_modulo &&
          typeof empleadoFicha.permisos_modulo === "object" &&
          !Array.isArray(
            empleadoFicha.permisos_modulo
          )
          ? empleadoFicha.permisos_modulo
          : ficha.permisos_modulo_dict &&
            typeof ficha.permisos_modulo_dict === "object" &&
            !Array.isArray(
              ficha.permisos_modulo_dict
            )
            ? ficha.permisos_modulo_dict
            : ficha.permisos_modulo &&
              typeof ficha.permisos_modulo === "object" &&
              !Array.isArray(
                ficha.permisos_modulo
              )
              ? ficha.permisos_modulo
              : {};

    setPermisosModulo(
      normalizarPermisos(
        permisos
      )
    );

  }, [
    ficha,
  ]);

  useEffect(() => {
    if (!open || pestana !== "encargagest" || !empleadoId || !esAdministrador) return;
    let vigente = true;
    setCargandoNotariasEncargaGest(true);
    setErrorNotariasEncargaGest("");
    setMensajeNotariasEncargaGest("");
    Promise.all([
      obtenerConfiguracionNotariasEncargaGest(),
      listarEmpleados(),
    ]).then(([lista, empleados]) => {
      if (!vigente) return;
      setNotariasEncargaGest(lista.data || []);
      setEmpleadosReparto((empleados.data || []).filter((e) => e.activo !== false));
    }).catch((e) => {
      if (!vigente) return;
      setErrorNotariasEncargaGest(e?.response?.data?.detail || "No se han podido cargar las notarías de CTN.");
    }).finally(() => {
      if (vigente) setCargandoNotariasEncargaGest(false);
    });
    return () => { vigente = false; };
  }, [open, pestana, empleadoId, esAdministrador]);

  useEffect(() => {
    if (open && empleadoId !== null && empleadoId !== undefined && empleadoId !== "") {
      setGestorRepartoId(String(empleadoId));
    }
  }, [open, empleadoId]);

  useEffect(() => {
    if (!open || pestana !== "asignaciones" || !empleadoId || !esAdministrador) return;
    let vigente = true;
    setErrorReparto("");
    Promise.all([listarEmpleados(), listarApoderados()]).then(([empleados, apoderados]) => {
      if (!vigente) return;
      const activos = (empleados.data || []).filter((e) => e.activo !== false);
      setEmpleadosReparto(activos);
      setApoderadosReparto(apoderados.data || []);
      setGestorRepartoId((actual) => actual && activos.some((e) => String(e.id) === String(actual)) ? String(actual) : String(empleadoId));
    }).catch((e) => {
      if (vigente) setErrorReparto(e?.response?.data?.detail || "No se ha podido cargar el catálogo de gestores.");
    });
    return () => { vigente = false; };
  }, [open, pestana, empleadoId, esAdministrador]);

  useEffect(() => {
    if (!open || pestana !== "asignaciones" || !esAdministrador) return;
    let vigente = true;
    setCargandoCatalogosReparto(true);
    obtenerCatalogosListadoExpedientes()
      .then((catalogos) => {
        if (!vigente) return;
        setProductosGtgReparto(Array.isArray(catalogos?.productos_gtg) ? catalogos.productos_gtg : []);
        setTiposOperacionReparto(Array.isArray(catalogos?.tipos_operacion) ? catalogos.tipos_operacion : []);
        setEstadosExpedienteReparto(
          [...new Set([
            "LIQ",
            "VIG",
            "LST",
            "RTS",
            "PVA",
            ...(Array.isArray(catalogos?.estados_expediente) ? catalogos.estados_expediente : []),
          ].map((estado) => String(estado || "").trim()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        );
      })
      .catch((e) => {
        if (!vigente) return;
        setErrorReparto(e?.response?.data?.detail || "No se han podido cargar los catálogos de producto y operación de los expedientes.");
      })
      .finally(() => {
        if (vigente) setCargandoCatalogosReparto(false);
      });
    return () => { vigente = false; };
  }, [open, pestana, esAdministrador]);

  useEffect(() => {
    if (!open || pestana !== "asignaciones" || !gestorRepartoId || !esAdministrador) return;
    let vigente = true;
    setCargandoReparto(true);
    setErrorReparto("");
    setMensajeReparto("");
    obtenerReglasRepartoGestor(gestorRepartoId).then(({ data: config }) => {
      if (!vigente) return;
      setReglasReparto((config?.reglas || []).map((r, i) => ({
        ...r,
        // La API persiste oficinas como lista; el campo de edición es texto.
        oficinas: Array.isArray(r.oficinas) ? r.oficinas.join(", ") : (r.oficinas || ""),
        comunidades: Array.isArray(r.comunidades) ? r.comunidades : (r.comunidad ? [r.comunidad] : []),
        estados_expediente: Array.isArray(r.estados_expediente) ? r.estados_expediente : (r.estado_expediente ? [r.estado_expediente] : []),
        _key: r._key || `regla-${i}-${r.actividad}-${r.oficina_tipo || ""}-${Array.isArray(r.oficinas) ? r.oficinas.join(",") : (r.oficinas || "")}`,
      })));
      setActividadesReparto(config?.actividades || []);
      setComunidadesReparto(config?.comunidades || []);
    }).catch((e) => {
      if (!vigente) return;
      setReglasReparto([]);
      setErrorReparto(e?.response?.data?.detail || "No se han podido cargar las reglas de reparto.");
    }).finally(() => {
      if (vigente) setCargandoReparto(false);
    });
    return () => { vigente = false; };
  }, [open, pestana, gestorRepartoId, esAdministrador]);


  /* ==========================================================
     BLOQUEAR SCROLL
  ========================================================== */

  useEffect(() => {

    if (!open) {
      return;
    }

    const overflowOriginal =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {

      document.body.style.overflow =
        overflowOriginal;

    };

  }, [
    open,
  ]);


  /* ==========================================================
     ESC
  ========================================================== */

  useEffect(() => {

    if (!open) {
      return;
    }

    const handleKeyDown = (
      event
    ) => {

      if (
        event.key === "Escape"
      ) {
        onClose?.();
      }

    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );

    };

  }, [
    open,
    onClose,
  ]);


  /* ==========================================================
     EMPLEADO
  ========================================================== */

  const empleado =
    ficha?.empleado &&
    typeof ficha.empleado === "object"
      ? ficha.empleado
      : null;


  /*
   * Para edición usamos siempre
   * empleadoEdit.
   */

  const empleadoFormulario =
    empleadoEdit || empleado || {};


  /* ==========================================================
     NOMBRE
  ========================================================== */

  const nombreEmpleado =
    useMemo(() => {

      if (!empleadoFormulario) {
        return "Empleado";
      }

      const nombre =
        [
          empleadoFormulario.nombre,
          empleadoFormulario.apellidos,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

      return (
        nombre ||
        empleadoFormulario.nombre_completo ||
        empleadoFormulario.usuario ||
        "Empleado"
      );

    }, [
      empleadoFormulario,
    ]);


  /* ==========================================================
     INICIALES
  ========================================================== */

  const iniciales =
    useMemo(() => {

      const partes =
        String(
          nombreEmpleado ||
            "Empleado"
        )
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      if (!partes.length) {
        return "E";
      }

      if (partes.length === 1) {

        return partes[0]
          .substring(0, 2)
          .toUpperCase();

      }

      return (
        partes[0][0] +
        partes[
          partes.length - 1
        ][0]
      ).toUpperCase();

    }, [
      nombreEmpleado,
    ]);


  /* ==========================================================
     FOTO
  ========================================================== */

  const fotoOriginal =
    empleadoFormulario?.foto_url ||
    empleadoFormulario?.fotoUrl ||
    empleadoFormulario?.foto ||
    ficha?.foto_url ||
    ficha?.fotoUrl ||
    ficha?.foto ||
    null;


  const fotoBase =
    prepararFotoEmpleado(
      fotoOriginal
    );


  const foto =
    useMemo(() => {

      if (!fotoBase) {
        return null;
      }

      if (!fotoVersion) {
        return fotoBase;
      }

      return (
        `${fotoBase}` +
        (
          fotoBase.includes("?")
            ? "&"
            : "?"
        ) +
        `v=${fotoVersion}`
      );

    }, [
      fotoBase,
      fotoVersion,
    ]);


  /* ==========================================================
     ROL
  ========================================================== */

  const rol =
    empleadoFormulario?.rol?.nombre ||
    empleadoFormulario?.rol_nombre ||
    ficha?.rol?.nombre ||
    ficha?.rol_nombre ||
    "Empleado";

  const cambiarRolEmpleado = async (valor) => {
    const rolId = Number(valor);
    if (!esAdministrador || !empleadoId || !Number.isFinite(rolId)) return;
    try {
      setGuardando(true);
      setError(null);
      setMensaje(null);
      await asignarRol(empleadoId, rolId);

      // Si se cambia el rol de la cuenta actualmente conectada,
      // sincronizamos la sesión para aplicar el bloqueo inmediatamente.
      const idSesion = usuarioSesion?.empleado_id ?? usuarioSesion?.id;
      if (Number(idSesion) === Number(empleadoId)) {
        const rolSeleccionado = Array.isArray(roles)
          ? roles.find((item) => Number(item?.id) === rolId)
          : null;
        actualizarEmpleadoSesion?.({
          rol_id: rolId,
          rol_nombre: rolSeleccionado?.nombre || "",
          rol: rolSeleccionado
            ? { id: rolSeleccionado.id, nombre: rolSeleccionado.nombre }
            : undefined,
        });
      }

      await cargarFicha(empleadoId);
      setMensaje("Rol del empleado actualizado correctamente.");
    } catch (err) {
      setError(obtenerMensajeError(err, "No se ha podido cambiar el rol del empleado."));
    } finally {
      setGuardando(false);
    }
  };


  /* ==========================================================
     PERMISOS DISPONIBLES
  ========================================================== */

/* ==========================================================
   PERMISOS DISPONIBLES
========================================================== */

const permisosDisponibles =
  useMemo(() => {

    const resultado = {};

    // --------------------------------------------------------
    // 1. PERMISOS EXISTENTES EN BACKEND
    // --------------------------------------------------------

    if (
      Array.isArray(
        permisosGlobales
      )
    ) {

      permisosGlobales.forEach(
        (permiso) => {

          if (
            !permiso ||
            typeof permiso !== "object"
          ) {
            return;
          }


          const modulo =
            typeof permiso.modulo === "string"
              ? permiso.modulo.trim()
              : "";


          const nombrePermiso =
            typeof permiso.permiso === "string"
              ? permiso.permiso.trim()
              : "";


          if (
            !modulo ||
            !nombrePermiso
          ) {
            return;
          }


          if (
            !resultado[modulo]
          ) {
            resultado[modulo] = [];
          }


          if (
            !resultado[modulo].includes(
              nombrePermiso
            )
          ) {

            resultado[modulo].push(
              nombrePermiso
            );

          }

        }
      );

    }


    // --------------------------------------------------------
    // 2. MÓDULOS DEL CATÁLOGO CENTRAL
    // --------------------------------------------------------
    //
    // Si un módulo no tiene permisos definidos todavía,
    // utilizamos los cuatro permisos estándar del ERP.
    //
    // IMPORTANTE:
    // Esto NO marca ningún permiso.
    // Solo hace visibles las cuatro casillas.
    // --------------------------------------------------------

    MODULOS_ERP.forEach(
      (modulo) => {

        if (
          !modulo ||
          typeof modulo !== "object" ||
          typeof modulo.key !== "string"
        ) {
          return;
        }


        const clave =
          modulo.key.trim();


        if (!clave) {
          return;
        }


        if (
          !Array.isArray(
            resultado[clave]
          ) ||
          resultado[clave].length === 0
        ) {

          resultado[clave] = [
            ...PERMISOS_ESTANDAR,
          ];

        }

      }
    );


    // --------------------------------------------------------
    // 3. ORDENAR Y ELIMINAR DUPLICADOS
    // --------------------------------------------------------

    Object.keys(
      resultado
    ).forEach(
      (modulo) => {

        resultado[modulo] =
          Array.from(
            new Set(
              resultado[modulo]
            )
          ).sort(
            (a, b) =>
              a.localeCompare(
                b,
                "es",
                {
                  sensitivity:
                    "base",
                }
              )
          );

      }
    );


    return resultado;

  }, [
    permisosGlobales,
  ]);


  /* ==========================================================
     MÓDULOS DISPONIBLES
  ========================================================== */

 const modulosDisponibles = useMemo(() => {

  const conjunto = new Set();

  // ----------------------------------------------------------
  // CATÁLOGO CENTRAL
  // ----------------------------------------------------------

  MODULOS_ERP.forEach((modulo) => {

    if (
      modulo &&
      typeof modulo === "object" &&
      typeof modulo.key === "string"
    ) {
      conjunto.add(
        modulo.key.trim()
      );
    }

  });


  // ----------------------------------------------------------
  // MÓDULOS ANTIGUOS / LEGACY
  // ----------------------------------------------------------

  Object.keys(
    permisosGlobales || {}
  ).forEach((modulo) => {

    if (
      typeof modulo === "string" &&
      modulo.trim()
    ) {
      conjunto.add(
        modulo.trim()
      );
    }

  });


  // ----------------------------------------------------------
  // MÓDULOS YA ASIGNADOS
  // ----------------------------------------------------------

  modulosVisibles.forEach((modulo) => {

    if (
      typeof modulo === "string" &&
      modulo.trim()
    ) {
      conjunto.add(
        modulo.trim()
      );
    }

  });


  return Array.from(conjunto)
    .sort(
      (a, b) =>
        a.localeCompare(
          b,
          "es",
          {
            sensitivity: "base",
          }
        )
    );

}, [
  modulosVisibles,
  permisosGlobales,
]);

  /* ==========================================================
     HELPERS
  ========================================================== */

  const mostrarValor = (
    valor
  ) => {

    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return "—";
    }

    if (
      typeof valor === "boolean"
    ) {
      return valor
        ? "Sí"
        : "No";
    }

    return String(
      valor
    );
  };


  const capitalizar = (
    valor
  ) => {

    if (!valor) {
      return "";
    }

    const etiquetas = {
      notargestweb: "NotarGestWeb",
      encargagestweb: "EncargaGestWeb",
      notargest: "NotarGest",
      encargagest: "EncargaGest",
    };
    const clave = String(valor).trim().toLowerCase();
    if (etiquetas[clave]) return etiquetas[clave];

    return String(valor)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letra) => letra.toUpperCase());
  };


  /* ==========================================================
     CAMBIO CAMPO
  ========================================================== */

  const cambiarCampo = (
    campo,
    valor
  ) => {

    setEmpleadoEdit(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    );

    setError(null);
    setMensaje(null);
  };


  /* ==========================================================
     GUARDAR DATOS EMPLEADO
  ========================================================== */

  // La ficha puede exponer el identificador del empleado en el objeto cargado
  // aunque la ruta/modal reciba otro alias. Comparamos solo identificadores
  // de empleado disponibles y evitamos mostrar preferencias personales en fichas ajenas.
  const idsEmpleadoSesion = [
    usuarioSesion?.empleado_id,
    usuarioSesion?.empleado?.empleado_id,
    usuarioSesion?.empleado?.id,
    usuarioSesion?.id,
  ].filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
    .map((id) => String(id).trim());

  const idsFichaEmpleado = [
    empleadoEdit?.empleado_id,
    empleadoEdit?.id,
    empleadoId,
  ].filter((id) => id !== null && id !== undefined && String(id).trim() !== "")
    .map((id) => String(id).trim());

  const esPropiaFicha = idsEmpleadoSesion.some((id) => idsFichaEmpleado.includes(id)) ||
    (String(usuarioSesion?.usuario || "").trim().toLocaleLowerCase("es") !== "" &&
      String(usuarioSesion?.usuario || "").trim().toLocaleLowerCase("es") ===
      String(empleadoEdit?.usuario || "").trim().toLocaleLowerCase("es"));

  const guardarDatosEmpleado =
    async () => {

      if ((!esAdministrador && !esPropiaFicha) || !empleadoId) {
        setError("No tienes permiso para modificar esta ficha.");
        return;
      }

      if (!empleadoId) {
        return;
      }

      try {

        setGuardando(true);
        setError(null);
        setMensaje(null);

        /*
         * Solo enviamos campos que existen
         * en EmpleadoUpdate.
         */

        // En la ficha propia, el empleado solo puede actualizar datos
        // identificativos y personales. Los datos laborales, rol, usuario,
        // estado y configuración de acceso quedan reservados a administración.
        const payload = esPropiaFicha && !esAdministrador
          ? {
              nombre: empleadoFormulario.nombre ?? null,
              apellidos: empleadoFormulario.apellidos ?? null,
              dni: empleadoFormulario.dni ?? null,
              telefono: empleadoFormulario.telefono ?? null,
              email_personal: empleadoFormulario.email_personal ?? null,
              direccion: empleadoFormulario.direccion ?? null,
              codigo_postal: empleadoFormulario.codigo_postal ?? null,
              poblacion: empleadoFormulario.poblacion ?? null,
              provincia: empleadoFormulario.provincia ?? null,
              fecha_nacimiento: empleadoFormulario.fecha_nacimiento ?? null,
              alergias: empleadoFormulario.alergias ?? null,
              persona_contacto: empleadoFormulario.persona_contacto ?? null,
              telefono_contacto: empleadoFormulario.telefono_contacto ?? null,
              observaciones: empleadoFormulario.observaciones ?? null,
            }
          : {
              nombre: empleadoFormulario.nombre ?? null,
              apellidos: empleadoFormulario.apellidos ?? null,
              dni: empleadoFormulario.dni ?? null,
              telefono: empleadoFormulario.telefono ?? null,
              email_personal: empleadoFormulario.email_personal ?? null,
              email_empresa: empleadoFormulario.email_empresa ?? null,
              extension: empleadoFormulario.extension ?? null,
              usuario: empleadoFormulario.usuario ?? null,
              direccion: empleadoFormulario.direccion ?? null,
              codigo_postal: empleadoFormulario.codigo_postal ?? null,
              poblacion: empleadoFormulario.poblacion ?? null,
              provincia: empleadoFormulario.provincia ?? null,
              fecha_nacimiento: empleadoFormulario.fecha_nacimiento ?? null,
              alergias: empleadoFormulario.alergias ?? null,
              persona_contacto: empleadoFormulario.persona_contacto ?? null,
              telefono_contacto: empleadoFormulario.telefono_contacto ?? null,
              observaciones: empleadoFormulario.observaciones ?? null,
              departamento_id: convertirNumeroONull(empleadoFormulario.departamento_id),
              seccion_id: convertirNumeroONull(empleadoFormulario.seccion_id),
              cargo_id: convertirNumeroONull(empleadoFormulario.cargo_id),
              fecha_alta: empleadoFormulario.fecha_alta ?? null,
              fecha_baja: empleadoFormulario.fecha_baja ?? null,
              activo: typeof empleadoFormulario.activo === "boolean" ? empleadoFormulario.activo : null,
              es_colaborador: Boolean(empleadoFormulario.es_colaborador),
              honorarios_valor: Math.max(0, Number(empleadoFormulario.honorarios_valor || 0)),
              rol_id: convertirNumeroONull(empleadoFormulario.rol_id),
            };


        await editarEmpleado(
          empleadoId,
          payload
        );


        /*
         * Volvemos a cargar la ficha
         * real desde backend.
         */

        await cargarFicha(
          empleadoId
        );


        setMensaje(
          "Datos del empleado actualizados correctamente."
        );

      } catch (err) {

        console.error("No se han podido guardar los datos del empleado.");

        setError(
          obtenerMensajeError(
            err,
            "No se han podido guardar los cambios."
          )
        );

      } finally {

        setGuardando(false);

      }
    };


  /* ==========================================================
     TOGGLE MÓDULO
  ========================================================== */

  const toggleModulo = (
    modulo
  ) => {

    setModulosVisibles(
      (actuales) => {

        if (
          actuales.includes(
            modulo
          )
        ) {

          return actuales.filter(
            (item) =>
              item !== modulo
          );

        }

        return [
          ...actuales,
          modulo,
        ];
      }
    );

    setError(null);
    setMensaje(null);
  };


  /* ==========================================================
     TOGGLE PERMISO
  ========================================================== */

  const togglePermiso = (
    modulo,
    permiso
  ) => {

    setPermisosModulo(
      (actuales) => {

        const actualesModulo =
          Array.isArray(
            actuales[
              modulo
            ]
          )
            ? actuales[
                modulo
              ]
            : [];

        const existe =
          actualesModulo.includes(
            permiso
          );

        return {

          ...actuales,

          [modulo]:
            existe
              ? actualesModulo.filter(
                  (item) =>
                    item !==
                    permiso
                )
              : [
                  ...actualesModulo,
                  permiso,
                ],
        };
      }
    );

    setError(null);
    setMensaje(null);
  };


  /* ==========================================================
     GUARDAR ACCESOS
  ========================================================== */

  const guardarConfiguracion =
    async () => {

      if (!esAdministrador || !empleadoId) {
        if (!esAdministrador) setError("Solo un administrador puede modificar estos datos.");
        return;
      }

      if (
        !empleadoId
      ) {
        return;
      }

      try {

        setGuardando(true);
        setError(null);
        setMensaje(null);


        await asignarModulos(
          empleadoId,
          modulosVisibles
        );


        await asignarPermisos(
          empleadoId,
          permisosModulo
        );


        await cargarFicha(
          empleadoId
        );


        setMensaje(
          "Configuración de accesos actualizada correctamente."
        );

      } catch (err) {

        console.error("No se han podido guardar los permisos del empleado.");

        setError(
          obtenerMensajeError(
            err,
            "No se ha podido guardar la configuración."
          )
        );

      } finally {

        setGuardando(false);

      }
    };


  /* ==========================================================
     RESET PASSWORD
  ========================================================== */

  const cambiarVisibilidadEmpleado = async () => {
    if (!esAdministrador || !modoAdministracion || !empleadoId || guardandoVisibilidadEmpleado) return;

    const nuevoValor = empleadoEdit.visible_en_listado === false;
    try {
      setGuardandoVisibilidadEmpleado(true);
      setError(null);
      setMensaje(null);
      await editarEmpleado(empleadoId, { visible_en_listado: nuevoValor });
      setEmpleadoEdit((anterior) => ({ ...anterior, visible_en_listado: nuevoValor }));
      await cargarFicha(empleadoId);
      setMensaje(nuevoValor
        ? "El empleado volverá a aparecer en el listado de tarjetas."
        : "El empleado se ha ocultado del listado de tarjetas.");
    } catch (err) {
      setError(obtenerMensajeError(err, "No se ha podido cambiar la visibilidad del empleado."));
    } finally {
      setGuardandoVisibilidadEmpleado(false);
    }
  };


  const ejecutarResetPassword =
    async () => {

      if (
        !empleadoId
      ) {
        return;
      }

      try {

        setResettingPassword(true);
        setError(null);
        setMensaje(null);


        const respuesta =
          await resetPasswordEmpleado(
            empleadoId
          );


        /*
         * TU BACKEND DEVUELVE:
         *
         * {
         *   status: "ok",
         *   password_temporal: "SJ12026"
         * }
         */

        const nuevaPassword =
          respuesta?.data?.password_temporal ||
          respuesta?.data?.password ||
          respuesta?.data?.nueva_password ||
          respuesta?.data?.temporary_password ||
          null;


        if (
          nuevaPassword
        ) {

          setMensaje(
            `Contraseña temporal: ${nuevaPassword}`
          );

        } else {

          setMensaje(
            "La contraseña se ha restablecido correctamente."
          );
        }


        setConfirmReset(false);

      } catch (err) {

        console.error("No se ha podido restablecer la contraseña del empleado.");

        setError(
          obtenerMensajeError(
            err,
            "No se ha podido restablecer la contraseña."
          )
        );

      } finally {

        setResettingPassword(false);

      }
    };


  /* ==========================================================
     SUBIR FOTO
  ========================================================== */

  const handleFoto = async (
    event
  ) => {

    const archivo =
      event?.target?.files?.[0];

    if (
      !archivo ||
      !empleadoId
    ) {
      return;
    }

    try {

      setSubiendoFoto(true);
      setError(null);
      setMensaje(null);


      const respuesta =
        await subirFotoEmpleado(
          empleadoId,
          archivo
        );


      const nuevaFoto =
        respuesta?.data?.foto_url ||
        respuesta?.data?.fotoUrl ||
        respuesta?.data?.foto ||
        null;


      if (
        nuevaFoto
      ) {

        /*
         * Convertimos inmediatamente la respuesta
         * del backend a una URL válida.
         */

        const nuevaFotoPreparada =
          prepararFotoEmpleado(
            nuevaFoto
          );


        /*
         * Actualizamos el formulario local.
         */

        setEmpleadoEdit(
          (actual) => ({
            ...actual,
            foto:
              nuevaFotoPreparada,
            foto_url:
              nuevaFotoPreparada,
            fotoUrl:
              nuevaFotoPreparada,
          })
        );


        /*
         * Actualizamos también el store.
         */

        useSeguridadStore.setState(
          (estado) => ({

            ficha:
              estado.ficha
                ? {

                    ...estado.ficha,

                    empleado:
                      estado.ficha.empleado
                        ? {

                            ...estado.ficha.empleado,

                            foto:
                              nuevaFotoPreparada,

                            foto_url:
                              nuevaFotoPreparada,

                            fotoUrl:
                              nuevaFotoPreparada,
                          }

                        : estado.ficha.empleado,
                  }

                : estado.ficha,
          })
        );


        /*
         * Forzar recarga de imagen
         * para evitar caché.
         */

        setFotoVersion(
          Date.now()
        );
      }


      setMensaje(
        "Fotografía actualizada correctamente."
      );

    } catch (err) {

      console.error("No se ha podido subir la foto del empleado.");

      setError(
        obtenerMensajeError(
          err,
          "No se ha podido actualizar la fotografía."
        )
      );

    } finally {

      setSubiendoFoto(false);

      if (
        event?.target
      ) {

        event.target.value = "";

      }
    }
  };


  /* ==========================================================
     PESTAÑAS Y ACCESO A LA FICHA PROPIA
  ========================================================== */

  const pestanasEmpleado = [
    { id: "basicos", label: "Datos básicos", icon: "👤" },
    { id: "personales", label: "Datos personales", icon: "🏠" },
    { id: "laborales", label: "Datos laborales", icon: "💼" },
    ...(esAdministrador && Boolean(empleadoFormulario?.es_colaborador) ? [{ id: "honorarios", label: "Honorarios", icon: "💶" }] : []),
    ...(esAdministrador ? [{ id: "visibilidad-tablas", label: "Visibilidad tablas", icon: "📊" }] : []),
    ...(esPropiaFicha ? [{ id: "mi-visibilidad", label: "Mi visibilidad de tablas", icon: "📊" }] : []),
    { id: "seguridad", label: "Seguridad", icon: "🛡️" },
    { id: "auditoria", label: "Auditoría", icon: "📋" },
  ];

  // Las opciones administrativas también están disponibles en la ficha de cada empleado.
  const pestanasAdministracion = [
    { id: "asignaciones", label: "Asignaciones", icon: "⚖️" },
    { id: "visibilidad-tablas", label: "Visibilidad tablas", icon: "📊" },
  ];
  const pestanasVisibles = modoAdministracion
    ? (esAdministrador ? pestanasAdministracion.filter((item) => item.id === pestanaInicial) : [])
    : esAdministrador
      ? pestanasEmpleado
      : esPropiaFicha
        ? pestanasEmpleado.filter((item) => ["basicos", "personales", "laborales", "mi-visibilidad"].includes(item.id))
        : [];

  useEffect(() => {
    const predeterminada = modoAdministracion
      ? (pestanasVisibles[0]?.id || "basicos")
      : (pestanasVisibles[0]?.id || "basicos");
    if (!pestanasVisibles.some((item) => item.id === pestana)) {
      setPestana(predeterminada);
    }
  }, [empleadoId, esPropiaFicha, esAdministrador, pestana, modoAdministracion, pestanaInicial]);

  /* ==========================================================
     NO RENDER
  ========================================================== */

  if (!open || (modoAdministracion && !esAdministrador)) {
    return null;
  }

  // VisibilidadTablas es un diálogo independiente de pantalla completa (z-index 12000).
  // En modo de administración no debe quedar anidado dentro del modal de empleado,
  // porque intercepta los clics de sus botones Cerrar y deja el modal exterior abierto.
  // Renderizarlo directamente y delegar el cierre al listado evita esa superposición.
  if (modoAdministracion && pestana === "visibilidad-tablas") {
    return <VisibilidadTablas empleadoId={empleadoId} onClose={onClose} />;
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div
      className="empleado-operativo-modal
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        p-3
        sm:p-6
      "
    >

      {/* ======================================================
          BACKDROP
      ====================================================== */}

      <div
        className="
          absolute
          inset-0
          bg-slate-950/55
          backdrop-blur-md
        "
        onClick={
          onClose
        }
      />


      {/* ======================================================
          MODAL
      ====================================================== */}

      <div
        className="
          relative
          z-10
          flex
          w-full
          w-[min(96vw,1600px)]
          max-w-7xl
          max-h-[94vh]
          flex-col
          overflow-hidden
          rounded-[28px]
          border
          border-slate-200/80
          bg-white
          shadow-[0_30px_100px_rgba(15,23,42,0.30)]
          animate-slideUp
        "
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >


        {/* ====================================================
            CABECERA
        ==================================================== */}

        <div
          className="
            relative
            shrink-0
            overflow-hidden
            border-b
            border-slate-200
            bg-gradient-to-br
            from-slate-50
            via-white
            to-blue-50/60
            px-5
            py-5
            sm:px-7
          "
        >

          <div
            className="
              pointer-events-none
              absolute
              -right-20
              -top-20
              h-56
              w-56
              rounded-full
              bg-blue-400/10
              blur-3xl
            "
          />


          <div
            className="
              relative
              flex
              items-center
              justify-between
              gap-4
            "
          >

            <div
              className="
                flex
                min-w-0
                items-center
                gap-4
              "
            >

              <div className="relative shrink-0">

                {foto ? (

                  <AuthenticatedPhoto
                    src={foto}
                    alt={
                      nombreEmpleado
                    }
                    className="
                      h-16
                      w-16
                      rounded-2xl
                      border
                      border-white
                      object-cover
                      shadow-lg
                    "
                  />

                ) : (

                  <div
                    className="
                      flex
                      h-16
                      w-16
                      items-center
                      justify-center
                      rounded-2xl
                      bg-gradient-to-br
                      from-blue-600
                      to-cyan-500
                      text-xl
                      font-bold
                      text-white
                      shadow-lg
                    "
                  >
                    {iniciales}
                  </div>

                )}

              </div>


              <div className="min-w-0">

                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >

                  <h2
                    className="
                      truncate
                      text-xl
                      font-bold
                      tracking-tight
                      text-slate-900
                      sm:text-2xl
                    "
                  >
                    {nombreEmpleado}
                  </h2>


                  <span
                    className="
                      rounded-full
                      border
                      border-blue-200
                      bg-blue-50
                      px-2.5
                      py-1
                      text-[11px]
                      font-semibold
                      text-blue-700
                    "
                  >
                    {rol}
                  </span>

                </div>


                <p
                  className="
                    mt-1
                    text-sm
                    text-slate-500
                  "
                >
                  Ficha de empleado
                  {empleadoId
                    ? ` · ID ${empleadoId}`
                    : ""}
                </p>

              </div>

            </div>


            <button
              type="button"
              onClick={
                onClose
              }
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                text-xl
                text-slate-400
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-700
              "
              aria-label="Cerrar"
            >
              ×
            </button>

          </div>

        </div>


        {/* ====================================================
            PESTAÑAS
        ==================================================== */}

        <div
          className="
            flex
            shrink-0
            gap-1
            overflow-x-auto
            border-b
            border-slate-200
            bg-white
            px-4
            sm:px-6
          "
        >

          {pestanasVisibles.map(
            (item) => (

              <button
                key={
                  item.id
                }
                type="button"
                onClick={() =>
                  setPestana(
                    item.id
                  )
                }
                className={`
                  relative
                  shrink-0
                  px-3
                  py-3.5
                  text-sm
                  font-semibold
                  transition
                  sm:px-4
                  ${
                    pestana ===
                    item.id
                      ? "text-blue-700"
                      : "text-slate-500 hover:text-slate-800"
                  }
                `}
              >

                <span className="mr-2">
                  <MolsanIcon name={item.icon} size={22} />
                </span>

                {item.label}


                {pestana ===
                  item.id && (

                  <span
                    className="
                      absolute
                      bottom-0
                      left-2
                      right-2
                      h-0.5
                      rounded-full
                      bg-blue-600
                    "
                  />

                )}

              </button>

            )
          )}

        </div>


        {/* ====================================================
            CONTENIDO
        ==================================================== */}

        {pestana === "visibilidad-tablas" && <div className="p-4 sm:p-6"><div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><h3 className="text-sm font-extrabold text-blue-900">Configuración administrativa por actividad</h3><p className="mt-1 text-xs text-blue-800">Define las columnas de Excel y los repositorios disponibles para este empleado. Esta configuración es independiente de sus preferencias personales.</p></div><VisibilidadTablas empleadoId={empleadoId} ambito="administracion" modal={false} titulo="Visibilidad de tablas del empleado" onClose={() => setPestana("basicos")} /></div>}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            bg-slate-50/60
            p-4
            sm:p-6
          "
        >

          {pestana === "mi-visibilidad" ? (
            <VisibilidadTablas
              empleadoId={empleadoId}
              ambito="personal"
              modal={false}
              titulo="Mi visibilidad de tablas"
            />
          ) : (

          <>
          {/* ==================================================
              LOADING
          ================================================== */}

          {cargando && (

            <div
              className="
                flex
                min-h-[300px]
                items-center
                justify-center
              "
            >

              <div className="text-center">

                <div
                  className="
                    mx-auto
                    h-10
                    w-10
                    animate-spin
                    rounded-full
                    border-4
                    border-blue-100
                    border-t-blue-600
                  "
                />

                <p
                  className="
                    mt-4
                    text-sm
                    font-medium
                    text-slate-500
                  "
                >
                  Cargando ficha...
                </p>

              </div>

            </div>
          )}


          {/* ==================================================
              ERROR
          ================================================== */}

          {!cargando &&
            error && (

              <div
                className="
                  mb-5
                  rounded-2xl
                  border
                  border-red-200
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  text-red-700
                "
              >
                {String(error)}
              </div>

            )}


          {/* ==================================================
              MENSAJE
          ================================================== */}

          {!cargando &&
            mensaje && (

              <div
                className="
                  mb-5
                  rounded-2xl
                  border
                  border-emerald-200
                  bg-emerald-50
                  px-4
                  py-3
                  text-sm
                  font-medium
                  text-emerald-700
                "
              >
                {String(mensaje)}
              </div>

            )}


          {!cargando &&
            ficha &&
            empleadoFormulario && (

              <>


                {/* =================================================
                    DATOS BÁSICOS
                ================================================= */}

                {pestana ===
                  "basicos" && (

                  <div className="space-y-5">


                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div className="mb-5">

                        <h3
                          className="
                            text-base
                            font-bold
                            text-slate-900
                          "
                        >
                          Datos básicos
                        </h3>

                        <p
                          className="
                            mt-1
                            text-sm
                            text-slate-500
                          "
                        >
                          Información principal y datos
                          de identificación del empleado.
                        </p>

                      </div>


                      <div
                        className="
                          grid
                          grid-cols-1
                          gap-4
                          md:grid-cols-2
                          lg:grid-cols-3
                        "
                      >

                        <CampoEditable
                          label="Nombre"
                          value={
                            empleadoFormulario.nombre
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "nombre",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Apellidos"
                          value={
                            empleadoFormulario.apellidos
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "apellidos",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="DNI"
                          value={
                            empleadoFormulario.dni
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "dni",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Teléfono"
                          value={
                            empleadoFormulario.telefono
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "telefono",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Email personal"
                          value={
                            empleadoFormulario.email_personal
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "email_personal",
                              value
                            )
                          }
                          type="email"
                        />


                        <CampoEditable
                          label="Email empresa"
                          disabled={!esAdministrador}
                          value={
                            empleadoFormulario.email_empresa
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "email_empresa",
                              value
                            )
                          }
                          type="email"
                        />


                        <CampoEditable
                          label="Extensión"
                          disabled={!esAdministrador}
                          value={
                            empleadoFormulario.extension
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "extension",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Usuario"
                          disabled={!esAdministrador}
                          value={
                            empleadoFormulario.usuario
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "usuario",
                              value
                            )
                          }
                        />

                      </div>

                    </section>


                    {/* FOTO */}

                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div
                        className="
                          flex
                          flex-col
                          gap-5
                          sm:flex-row
                          sm:items-center
                        "
                      >

                        <div className="shrink-0">

                          {foto ? (

                            <AuthenticatedPhoto
                              src={foto}
                              alt={
                                nombreEmpleado
                              }
                              className="
                                h-28
                                w-28
                                rounded-3xl
                                border
                                border-slate-200
                                object-cover
                                shadow-md
                              "
                            />

                          ) : (

                            <div
                              className="
                                flex
                                h-28
                                w-28
                                items-center
                                justify-center
                                rounded-3xl
                                bg-gradient-to-br
                                from-blue-600
                                to-cyan-500
                                text-3xl
                                font-bold
                                text-white
                                shadow-md
                              "
                            >
                              {iniciales}
                            </div>

                          )}

                        </div>


                        <div className="flex-1">

                          <h3
                            className="
                              text-base
                              font-bold
                              text-slate-900
                            "
                          >
                            Fotografía
                          </h3>

                          <p
                            className="
                              mt-1
                              text-sm
                              text-slate-500
                            "
                          >
                            Actualiza la fotografía
                            del empleado.
                          </p>


                          <label
                            className="
                              mt-4
                              inline-flex
                              cursor-pointer
                              items-center
                              gap-2
                              rounded-xl
                              border
                              border-slate-200
                              bg-white
                              px-4
                              py-2.5
                              text-sm
                              font-semibold
                              text-slate-700
                              shadow-sm
                              transition
                              hover:border-blue-200
                              hover:bg-blue-50
                              hover:text-blue-700
                            "
                          >

                            {subiendoFoto
                              ? "Subiendo..."
                              : "Cambiar fotografía"}

                            <input
                              type="file"
                              accept="image/*"
                              onChange={
                                handleFoto
                              }
                              disabled={
                                subiendoFoto || !esAdministrador
                              }
                              className="hidden"
                            />

                          </label>

                        </div>

                      </div>

                    </section>


                    <GuardarButton
                      onClick={
                        guardarDatosEmpleado
                      }
                      loading={
                        guardando
                      }
                    />

                  </div>

                )}


                {/* =================================================
                    DATOS PERSONALES
                ================================================= */}

                {pestana ===
                  "personales" && (

                  <fieldset disabled={!esAdministrador && !esPropiaFicha} className={!esAdministrador && !esPropiaFicha ? "space-y-5 [&_input]:cursor-default [&_textarea]:cursor-default [&_button]:hidden" : "space-y-5"}>

                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div className="mb-5">

                        <h3
                          className="
                            text-base
                            font-bold
                            text-slate-900
                          "
                        >
                          Datos personales
                        </h3>

                        <p
                          className="
                            mt-1
                            text-sm
                            text-slate-500
                          "
                        >
                          Información personal y de
                          contacto del empleado.
                        </p>

                      </div>


                      <div
                        className="
                          grid
                          grid-cols-1
                          gap-4
                          md:grid-cols-2
                          lg:grid-cols-3
                        "
                      >

                        <CampoEditable
                          label="Dirección"
                          value={
                            empleadoFormulario.direccion
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "direccion",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Código postal"
                          value={
                            empleadoFormulario.codigo_postal
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "codigo_postal",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Población"
                          value={
                            empleadoFormulario.poblacion
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "poblacion",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Provincia"
                          value={
                            empleadoFormulario.provincia
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "provincia",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Fecha de nacimiento"
                          type="date"
                          value={
                            normalizarFechaInput(
                              empleadoFormulario.fecha_nacimiento
                            )
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "fecha_nacimiento",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Alergias"
                          value={
                            empleadoFormulario.alergias
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "alergias",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Persona de contacto"
                          value={
                            empleadoFormulario.persona_contacto
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "persona_contacto",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Teléfono contacto"
                          value={
                            empleadoFormulario.telefono_contacto
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "telefono_contacto",
                              value
                            )
                          }
                        />

                      </div>


                      <div className="mt-5">

                        <CampoTextarea
                          label="Observaciones"
                          value={
                            empleadoFormulario.observaciones
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "observaciones",
                              value
                            )
                          }
                        />

                      </div>

                    </section>


                    {(esAdministrador || esPropiaFicha) && <GuardarButton
                      onClick={guardarDatosEmpleado}
                      loading={guardando}
                    />}

                  </fieldset>

                )}


                {/* =================================================
                    DATOS LABORALES
                ================================================= */}

                {pestana ===
                  "laborales" && (

                  <fieldset disabled={!esAdministrador} className={!esAdministrador ? "space-y-5 opacity-40 grayscale pointer-events-none select-none [&_input]:cursor-not-allowed [&_select]:cursor-not-allowed [&_button]:cursor-not-allowed [&_textarea]:cursor-not-allowed" : "space-y-5"}>
                  <div className="space-y-5">

                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div className="mb-5">

                        <h3
                          className="
                            text-base
                            font-bold
                            text-slate-900
                          "
                        >
                          Datos laborales
                        </h3>

                        <p
                          className="
                            mt-1
                            text-sm
                            text-slate-500
                          "
                        >
                          Información profesional y
                          situación laboral.
                        </p>

                      </div>


                      <div
                        className="
                          grid
                          grid-cols-1
                          gap-4
                          md:grid-cols-2
                          lg:grid-cols-3
                        "
                      >

                        {/* DEPARTAMENTO */}

                        <CampoSelect
                          label="Departamento"
                          value={
                            empleadoFormulario.departamento_id
                          }
                          options={
                            departamentos
                          }
                          placeholder="Sin departamento"
                          onChange={(value) =>
                            cambiarCampo(
                              "departamento_id",
                              value === ""
                                ? null
                                : Number(value)
                            )
                          }
                        />


                        {/* SECCIÓN */}

                        <CampoSelect
                          label="Sección"
                          value={
                            empleadoFormulario.seccion_id
                          }
                          options={
                            secciones
                          }
                          placeholder="Sin sección"
                          onChange={(value) =>
                            cambiarCampo(
                              "seccion_id",
                              value === ""
                                ? null
                                : Number(value)
                            )
                          }
                        />


                        {/* CARGO */}

                        <CampoSelect
                          label="Cargo"
                          value={
                            empleadoFormulario.cargo_id
                          }
                          options={
                            cargos
                          }
                          placeholder="Sin cargo"
                          onChange={(value) =>
                            cambiarCampo(
                              "cargo_id",
                              value === ""
                                ? null
                                : Number(value)
                            )
                          }
                        />


                        <CampoEditable
                          label="Fecha de alta"
                          type="date"
                          value={
                            normalizarFechaInput(
                              empleadoFormulario.fecha_alta
                            )
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "fecha_alta",
                              value
                            )
                          }
                        />


                        <CampoEditable
                          label="Fecha de baja"
                          type="date"
                          value={
                            normalizarFechaInput(
                              empleadoFormulario.fecha_baja
                            )
                          }
                          onChange={(value) =>
                            cambiarCampo(
                              "fecha_baja",
                              value
                            )
                          }
                        />

                      </div>

                    </section>


                    {/* ESTADO */}

                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div
                        className="
                          flex
                          flex-col
                          gap-4
                          sm:flex-row
                          sm:items-center
                          sm:justify-between
                        "
                      >

                        <div>

                          <h3
                            className="
                              text-base
                              font-bold
                              text-slate-900
                            "
                          >
                            Estado del empleado
                          </h3>

                          <p
                            className="
                              mt-1
                              text-sm
                              text-slate-500
                            "
                          >
                            Puedes activar o desactivar
                            el empleado.
                          </p>

                        </div>


                        <label
                          className="
                            inline-flex
                            cursor-pointer
                            items-center
                            gap-3
                          "
                        >

                          <input
                            type="checkbox"
                            checked={
                              Boolean(
                                empleadoFormulario.activo
                              )
                            }
                            onChange={(event) =>
                              cambiarCampo(
                                "activo",
                                event.target.checked
                              )
                            }
                            className="
                              h-5
                              w-5
                              accent-blue-600
                            "
                          />

                          <span
                            className={`
                              rounded-full
                              px-3
                              py-1
                              text-xs
                              font-semibold
                              ${
                                empleadoFormulario.activo
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }
                            `}
                          >
                            {empleadoFormulario.activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>

                        </label>

                      </div>

                    </section>


                    <GuardarButton
                      onClick={
                        guardarDatosEmpleado
                      }
                      loading={
                        guardando
                      }
                    />

                  </div>
                  </fieldset>

                )}


                {/* =================================================
                    ACCESOS
                ================================================= */}

                {pestana === "honorarios" && esAdministrador && Boolean(empleadoFormulario.es_colaborador) && (
                  <section className="space-y-5">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Liquidación mensual · ApoderaGest</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-900">Honorario por protocolo</h3>
                      <p className="mt-2 text-sm text-slate-600">Este importe se aplica una sola vez por número de protocolo y notario, aunque el protocolo agrupe varios expedientes del mismo cliente.</p>
                    </div>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <label className="block text-sm font-semibold text-slate-700" htmlFor="honorarios-valor-empleado">Precio / valor de los honorarios (€ netos por protocolo)</label>
                      <div className="mt-2 flex max-w-sm items-center gap-3">
                        <input id="honorarios-valor-empleado" type="number" min="0" step="0.01" value={empleadoFormulario.honorarios_valor ?? 0} onChange={(e) => cambiarCampo("honorarios_valor", e.target.value === "" ? 0 : Number(e.target.value))} disabled={!esAdministrador} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-bold text-slate-900" />
                        <span className="text-lg font-bold text-slate-500">€</span>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">La base neta se calcula con el número de protocolos únicos. El IVA se calcula por separado en Control Apoderados y Mi liquidación.</p>
                    </section>
                  </section>
                )}

                {pestana ===
                  "accesos" && (

                  <fieldset disabled={!esAdministrador} className={!esAdministrador ? "space-y-5 opacity-40 grayscale pointer-events-none select-none [&_input]:cursor-not-allowed [&_select]:cursor-not-allowed [&_button]:cursor-not-allowed [&_textarea]:cursor-not-allowed" : "space-y-5"}>
                  <div className="space-y-5">

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-center">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Rol del empleado</h3>
                          <p className="mt-1 text-sm text-slate-500">Define el nivel de acceso general al ERP.</p>
                        </div>
                        <select
                          value={empleadoFormulario.rol_id ?? empleadoFormulario.rol?.id ?? ""}
                          onChange={(event) => cambiarRolEmpleado(event.target.value)}
                          disabled={!esAdministrador || guardando || !Array.isArray(roles) || roles.length === 0}
                          className={!esAdministrador ? "w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed" : "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"}
                        >
                          <option value="">Seleccionar rol…</option>
                          {(Array.isArray(roles) ? roles : []).map((item) => (
                            <option key={item.id} value={item.id}>{item.nombre}{item.descripcion ? " — " + item.descripcion : ""}</option>
                          ))}
                        </select>
                      </div>
                      {!esAdministrador && <p className="mt-3 text-xs font-medium text-slate-500">Solo un administrador puede modificar el rol y la configuración de accesos.</p>}
                    </section>




                    {/* VISIBILIDAD EN EL MÓDULO EMPLEADOS */}
                    {esAdministrador && modoAdministracion && (
                      <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">Mostrar empleado en el listado</h4>
                            <p className="mt-1 text-sm text-slate-600">
                              {empleadoEdit.visible_en_listado === false
                                ? "Este empleado está oculto en las tarjetas del módulo Empleados. Su cuenta y sus datos se mantienen."
                                : "Este empleado aparece en las tarjetas del módulo Empleados."}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={empleadoEdit.visible_en_listado !== false}
                            onClick={cambiarVisibilidadEmpleado}
                            disabled={guardandoVisibilidadEmpleado}
                            className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${empleadoEdit.visible_en_listado === false ? "bg-slate-400" : "bg-emerald-600"}`}
                            aria-label={empleadoEdit.visible_en_listado === false ? "Mostrar empleado en el listado" : "Ocultar empleado del listado"}
                          >
                            <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${empleadoEdit.visible_en_listado === false ? "translate-x-1" : "translate-x-9"}`} />
                          </button>
                        </div>
                        <div className="mt-2 text-xs font-semibold text-slate-600">
                          {guardandoVisibilidadEmpleado ? "Guardando…" : empleadoEdit.visible_en_listado === false ? "OCULTO" : "VISIBLE"}
                        </div>
                      </div>
                    )}

                    {/* MÓDULOS */}

                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div
                        className="
                          mb-5
                          flex
                          flex-col
                          gap-2
                          sm:flex-row
                          sm:items-center
                          sm:justify-between
                        "
                      >

                        <div>

                          <h3
                            className="
                              text-base
                              font-bold
                              text-slate-900
                            "
                          >
                            Módulos visibles
                          </h3>

                          <p
                            className="
                              mt-1
                              text-sm
                              text-slate-500
                            "
                          >
                            Selecciona los módulos que
                            puede visualizar el empleado.
                          </p>

                        </div>


                        <span
                          className="
                            inline-flex
                            w-fit
                            rounded-full
                            bg-blue-50
                            px-3
                            py-1
                            text-xs
                            font-semibold
                            text-blue-700
                          "
                        >
                          {modulosVisibles.length}
                          {" "}
                          módulos
                        </span>

                      </div>


                      {modulosDisponibles.length >
                      0 ? (

                        <div
                          className="
                            grid
                            grid-cols-1
                            gap-2
                            sm:grid-cols-2
                            lg:grid-cols-3
                          "
                        >

                          {modulosDisponibles.map(
                            (
                              modulo
                            ) => {

                              const activo =
                                modulosVisibles.includes(
                                  modulo
                                );

                              return (

                                <label
                                  key={
                                    modulo
                                  }
                                  className={`
                                    flex
                                    cursor-pointer
                                    items-center
                                    gap-3
                                    rounded-xl
                                    border
                                    px-4
                                    py-3
                                    transition
                                    ${
                                      activo
                                        ? "border-blue-200 bg-blue-50"
                                        : "border-slate-200 bg-white hover:bg-slate-50"
                                    }
                                  `}
                                >

                                  <input
                                    type="checkbox"
                                    checked={
                                      activo
                                    }
                                    onChange={() =>
                                      toggleModulo(
                                        modulo
                                      )
                                    }
                                    className="
                                      h-4
                                      w-4
                                      accent-blue-600
                                    "
                                  />


                                  <span
                                    className={`
                                      text-sm
                                      font-medium
                                      ${
                                        activo
                                          ? "text-blue-700"
                                          : "text-slate-700"
                                      }
                                    `}
                                  >
                                    {MODULOS_ERP.find((item) => item.key === modulo)?.label || capitalizar(modulo)}
                                  </span>

                                </label>

                              );
                            }
                          )}

                        </div>

                      ) : (

                        <div
                          className="
                            rounded-xl
                            border
                            border-dashed
                            border-slate-300
                            bg-slate-50
                            p-6
                            text-center
                          "
                        >

                          <p
                            className="
                              text-sm
                              text-slate-500
                            "
                          >
                            No hay módulos disponibles.
                          </p>

                        </div>

                      )}

                    </section>


                    {/* PERMISOS */}

                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div className="mb-5">

                        <h3
                          className="
                            text-base
                            font-bold
                            text-slate-900
                          "
                        >
                          Permisos por módulo
                        </h3>

                        <p
                          className="
                            mt-1
                            text-sm
                            text-slate-500
                          "
                        >
                          Configura las operaciones
                          permitidas para cada módulo.
                        </p>

                      </div>


                      {modulosDisponibles.length >
                      0 ? (

                        <div className="space-y-3">

                          {modulosDisponibles.map(
                            (
                              modulo
                            ) => {

                              const disponibles =
                                permisosDisponibles[
                                  modulo
                                ] || [];

                              const activos =
                                Array.isArray(
                                  permisosModulo[
                                    modulo
                                  ]
                                )
                                  ? permisosModulo[
                                      modulo
                                    ]
                                  : [];

                              return (

                                <div
                                  key={
                                    modulo
                                  }
                                  className="
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-slate-50/60
                                    p-4
                                  "
                                >

                                  <div
                                    className="
                                      mb-3
                                      flex
                                      items-center
                                      justify-between
                                      gap-3
                                    "
                                  >

                                    <span
                                      className="
                                        text-sm
                                        font-bold
                                        text-slate-800
                                      "
                                    >
                                      {MODULOS_ERP.find((item) => item.key === modulo)?.label || capitalizar(modulo)}
                                    </span>


                                    <span
                                      className="
                                        rounded-full
                                        bg-white
                                        px-2.5
                                        py-1
                                        text-[11px]
                                        font-semibold
                                        text-slate-500
                                      "
                                    >
                                      {activos.length}
                                      {" "}
                                      activos
                                    </span>

                                  </div>


                                  {disponibles.length >
                                  0 ? (

                                    <div
                                      className="
                                        flex
                                        flex-wrap
                                        gap-2
                                      "
                                    >

                                      {disponibles.map(
                                        (
                                          permiso
                                        ) => {

                                          const activo =
                                            activos.includes(
                                              permiso
                                            );

                                          return (

                                            <label
                                              key={
                                                permiso
                                              }
                                              className={`
                                                flex
                                                cursor-pointer
                                                items-center
                                                gap-2
                                                rounded-xl
                                                border
                                                px-3
                                                py-2
                                                text-xs
                                                font-semibold
                                                transition
                                                ${
                                                  activo
                                                    ? "border-blue-200 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 bg-white text-slate-500"
                                                }
                                              `}
                                            >

                                              <input
                                                type="checkbox"
                                                checked={
                                                  activo
                                                }
                                                onChange={() =>
                                                  togglePermiso(
                                                    modulo,
                                                    permiso
                                                  )
                                                }
                                                className="
                                                  h-3.5
                                                  w-3.5
                                                  accent-blue-600
                                                "
                                              />

                                              {capitalizar(
                                                permiso
                                              )}

                                            </label>

                                          );
                                        }
                                      )}

                                    </div>

                                  ) : (

                                    <span
                                      className="
                                        text-xs
                                        text-slate-400
                                      "
                                    >
                                      Sin permisos
                                      definidos para
                                      este módulo.
                                    </span>

                                  )}

                                </div>

                              );
                            }
                          )}

                        </div>

                      ) : (

                        <div
                          className="
                            rounded-xl
                            border
                            border-dashed
                            border-slate-300
                            bg-slate-50
                            p-6
                            text-center
                          "
                        >

                          <p
                            className="
                              text-sm
                              text-slate-500
                            "
                          >
                            No hay módulos disponibles
                            para configurar permisos.
                          </p>

                        </div>

                      )}

                    </section>


                    <GuardarButton
                      onClick={
                        guardarConfiguracion
                      }
                      loading={
                        guardando
                      }
                    />

                  </div>
                  </fieldset>

                )}


                {/* =================================================
                    ENCARGAGEST · ASIGNACIÓN DE NOTARÍAS
                ================================================= */}
                {pestana === "encargagest" && (
                  <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-5">
                        <h3 className="text-base font-bold text-slate-900">Notarios CTN · habilitación y gestor responsable</h3>
                        <p className="mt-1 text-sm text-slate-500">Busca un notario, habilítalo para la gestión interna de EncargaGest y asigna el gestor responsable. Cada cambio se guarda individualmente.</p>
                      </div>
                      {!esAdministrador && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Solo un administrador puede modificar las notarías asignadas.</p>}
                      {errorNotariasEncargaGest && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorNotariasEncargaGest}</p>}
                      {mensajeNotariasEncargaGest && <p role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensajeNotariasEncargaGest}</p>}
                      <input type="search" value={busquedaNotariaEncargaGest} onChange={(e) => setBusquedaNotariaEncargaGest(e.target.value)} placeholder="Buscar notario, NIF, municipio o provincia…" className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" />
                      {cargandoNotariasEncargaGest ? (
                        <p className="py-8 text-center text-sm text-slate-500">Cargando catálogo CTN…</p>
                      ) : (
                        <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                          {notariasEncargaGest.filter((n) => [n.nombre, n.nif, n.municipio, n.provincia].some((v) => String(v || "").toLowerCase().includes(busquedaNotariaEncargaGest.trim().toLowerCase()))).map((notaria) => {
                            const id = Number(notaria.id);
                            return (
                              <div key={id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center">
                                <span className="min-w-0"><strong className="block text-sm text-slate-800">{notaria.nombre}</strong><small className="block text-xs text-slate-500">{[notaria.nif, notaria.municipio, notaria.provincia].filter(Boolean).join(" · ") || "Sin datos adicionales"}</small></span>
                                <select value={notaria.gestor_id || ""} disabled={!esAdministrador || guardandoNotariasEncargaGest} onChange={(e) => setNotariasEncargaGest((actual) => actual.map((n) => Number(n.id) === id ? { ...n, gestor_id: e.target.value ? Number(e.target.value) : null } : n))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <option value="">Seleccionar gestor…</option>
                                  {empleadosReparto.map((empleado) => <option key={empleado.id} value={empleado.id}>{[empleado.nombre, empleado.apellidos].filter(Boolean).join(" ") || empleado.usuario || ("Empleado " + empleado.id)}</option>)}
                                </select>
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={Boolean(notaria._habilitadaDraft ?? notaria.habilitada)} disabled={!esAdministrador || guardandoNotariasEncargaGest} onChange={(e) => setNotariasEncargaGest((actual) => actual.map((n) => Number(n.id) === id ? { ...n, _habilitadaDraft: e.target.checked } : n))} className="h-4 w-4 accent-emerald-600" />Habilitar</label>
                                  <button type="button" disabled={!esAdministrador || guardandoNotariasEncargaGest || Boolean((notaria._habilitadaDraft ?? notaria.habilitada) && !notaria.gestor_id)} onClick={async () => {
                                    setGuardandoNotariasEncargaGest(true); setErrorNotariasEncargaGest(""); setMensajeNotariasEncargaGest("");
                                    try {
                                      const habilitada = Boolean(notaria._habilitadaDraft ?? notaria.habilitada);
                                      const res = await guardarResponsableNotariaEncargaGest(id, { habilitada, gestor_id: habilitada ? notaria.gestor_id : null });
                                      setNotariasEncargaGest((actual) => actual.map((n) => Number(n.id) === id ? { ...n, habilitada: res.data?.habilitada ?? habilitada, gestor_id: res.data?.gestor_id ?? null, gestor_nombre: res.data?.gestor_nombre || "", _habilitadaDraft: undefined } : n));
                                      setMensajeNotariasEncargaGest("Configuración guardada para " + notaria.nombre + ".");
                                    } catch (e) { setErrorNotariasEncargaGest(e?.response?.data?.detail || "No se pudo guardar la configuración."); }
                                    finally { setGuardandoNotariasEncargaGest(false); }
                                  }} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Guardar</button>
                                </div>
                              </div>
                            );
                          })}
                          {notariasEncargaGest.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay notarías en el catálogo CTN.</p>}
                        </div>
                      )}
                      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Cada notaría se guarda individualmente para evitar cambios accidentales en otras asignaciones.</p>
                    </section>
                  </div>
                )}

                {/* =================================================
                    ASIGNACIONES · REPARTO AUTOMÁTICO POR ACTIVIDAD
                ================================================= */}
                {pestana === "asignaciones" && (
                  <div className="space-y-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Reglas de reparto de expedientes</h3>
                          <p className="mt-1 max-w-3xl text-sm text-slate-500">Conserva las reglas existentes y añade criterios por oficina, Producto GTG y tipo de operación. Puedes tener varias reglas para una misma actividad si corresponden a oficinas o productos diferentes.</p>
                        </div>
                        <button type="button" disabled={!esAdministrador || cargandoReparto || !gestorRepartoId} onClick={() => setReglasReparto((actual) => [...actual, { _key: "nueva-" + Date.now() + "-" + actual.length, actividad: actividadesReparto[0]?.key || "", departamento: "", oficina_tipo: "", oficinas: "", producto_gtg: "", tipo_operacion: "", estados_expediente: [], zona_territorial: false, comunidades: [], comunidad: "", porcentaje: 100, apoderado_id: "", activa: true }])} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">+ Añadir regla</button>
                      </div>
                      <div className="mt-4 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 md:grid-cols-[minmax(220px,360px)_1fr] md:items-end">
                        <label className="block text-xs font-bold text-slate-700">Gestor
                          <select value={gestorRepartoId} onChange={(e) => setGestorRepartoId(e.target.value)} disabled={!esAdministrador || cargandoReparto} className="mt-1 w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm font-normal">
                            <option value="">Seleccionar gestor…</option>
                            {empleadosReparto.map((gestor) => <option key={gestor.id} value={gestor.id}>{[gestor.nombre, gestor.apellidos].filter(Boolean).join(" ") || gestor.usuario || ("Empleado " + gestor.id)}</option>)}
                          </select>
                        </label>
                        <p className="text-sm text-blue-900">Selecciona cualquier gestor y configura todas las actividades que puede tramitar. Un mismo gestor puede tener múltiples actividades y varias zonas territoriales dentro de cada regla.</p>
                      </div>
                      {errorReparto && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorReparto}</p>}
                      {mensajeReparto && <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{mensajeReparto}</p>}
                      {cargandoReparto ? <p className="py-8 text-center text-sm text-slate-500">Cargando reglas de reparto…</p> : (
                        <div className="mt-4 space-y-4">
                          {reglasReparto.map((regla, indice) => (
                            <article key={regla._key || indice} className="rounded-xl border border-slate-200 p-4">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <strong className="text-sm text-slate-800">Actividad / regla {indice + 1}</strong>
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={regla.activa !== false} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, activa: e.target.checked } : r))} className="h-4 w-4 accent-blue-600" />Activa</label>
                                  <button type="button" onClick={() => setReglasReparto((actual) => actual.filter((_, i) => i !== indice))} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50">Eliminar</button>
                                </div>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <label className="block text-xs font-bold text-slate-600">Departamento<select value={regla.departamento || ""} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, departamento: e.target.value } : r))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Todos los departamentos</option>{regla.departamento && !departamentos.some((d) => String(d.nombre || "").trim() === String(regla.departamento).trim()) && <option value={regla.departamento}>{regla.departamento} (asignación existente)</option>}{departamentos.map((departamento) => <option key={departamento.id} value={departamento.nombre}>{departamento.nombre}</option>)}</select></label>
                                <label className="block text-xs font-bold text-slate-600">Actividad<select value={regla.actividad || ""} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, actividad: e.target.value } : r))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Seleccionar actividad…</option>{actividadesReparto.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select></label>
                                <label className="block text-xs font-bold text-slate-600">Tipo de oficina<select value={regla.oficina_tipo || ""} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, oficina_tipo: e.target.value } : r))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Todas</option><option value="oficina">Oficina (excepto 5316)</option><option value="cancela">Cancela (5316)</option></select></label>
                                <label className="block text-xs font-bold text-slate-600">Producto GTG<select value={regla.producto_gtg || ""} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, producto_gtg: e.target.value } : r))} disabled={cargandoCatalogosReparto} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Todos los productos</option>{regla.producto_gtg && !productosGtgReparto.includes(regla.producto_gtg) && <option value={regla.producto_gtg}>{regla.producto_gtg} (valor existente)</option>}{productosGtgReparto.map((producto) => <option key={producto} value={producto}>{producto}</option>)}</select></label>
                                <label className="block text-xs font-bold text-slate-600">Tipo de operación<select value={regla.tipo_operacion || ""} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, tipo_operacion: e.target.value } : r))} disabled={cargandoCatalogosReparto} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Todos los tipos</option>{regla.tipo_operacion && !tiposOperacionReparto.includes(regla.tipo_operacion) && <option value={regla.tipo_operacion}>{regla.tipo_operacion} (valor existente)</option>}{tiposOperacionReparto.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></label>
                                <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2 xl:col-span-3">
                                  <div className="mb-2 text-xs font-bold text-slate-700">Estado expediente (marca uno o varios; sin marcar = todos)</div>
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                    {[...new Set([...(Array.isArray(regla.estados_expediente) ? regla.estados_expediente : []), ...estadosExpedienteReparto])].filter(Boolean).map((estado) => (
                                      <label key={estado} className="flex items-center gap-2 rounded-md border border-slate-100 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                                        <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={(Array.isArray(regla.estados_expediente) ? regla.estados_expediente : []).includes(estado)} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => {
                                          if (i !== indice) return r;
                                          const seleccionados = Array.isArray(r.estados_expediente) ? r.estados_expediente : [];
                                          return { ...r, estados_expediente: e.target.checked ? [...seleccionados.filter((x) => x !== estado), estado] : seleccionados.filter((x) => x !== estado) };
                                        }))} />
                                        <span>{estado}</span>
                                      </label>
                                    ))}
                                  </div>
                                  {cargandoCatalogosReparto && <p className="mt-2 text-xs text-slate-500">Cargando estados del catálogo…</p>}
                                </div>
                                <label className="block text-xs font-bold text-slate-600">Porcentaje de reparto (%)<input type="number" min="0" max="100" step="1" value={regla.porcentaje ?? 0} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, porcentaje: e.target.value } : r))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal" /></label>
                                <label className="flex items-center gap-2 self-end rounded-lg bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={Boolean(regla.zona_territorial)} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, zona_territorial: e.target.checked, comunidades: e.target.checked ? ((Array.isArray(r.comunidades) && r.comunidades.length) ? r.comunidades : (r.comunidad ? [r.comunidad] : ["Cataluña"])) : [], comunidad: "" } : r))} className="h-4 w-4 accent-blue-600" />Limitar por zona territorial</label>
                                {regla.zona_territorial && <div className="rounded-lg border border-slate-200 p-3 md:col-span-2 xl:col-span-3">
                                  <div className="mb-2 text-xs font-bold text-slate-700">Zonas territoriales (puedes marcar varias)</div>
                                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {comunidadesReparto.map((comunidad) => <label key={comunidad} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"><input type="checkbox" checked={(Array.isArray(regla.comunidades) ? regla.comunidades : (regla.comunidad ? [regla.comunidad] : [])).includes(comunidad)} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => { if (i !== indice) return r; const zonas = Array.isArray(r.comunidades) ? r.comunidades : (r.comunidad ? [r.comunidad] : []); const nuevasZonas = e.target.checked ? [...new Set([...zonas, comunidad])] : zonas.filter((z) => z !== comunidad); return { ...r, comunidades: nuevasZonas, comunidad: "" }; }))} className="h-4 w-4 accent-blue-600" />{comunidad}</label>)}
                                  </div>
                                  {!(Array.isArray(regla.comunidades) && regla.comunidades.length) && <p className="mt-2 text-xs text-amber-700">Selecciona al menos una comunidad autónoma.</p>}
                                </div>}
                                <label className="block text-xs font-bold text-slate-600">Apoderado relacionado (opcional)<select value={regla.apoderado_id || ""} onChange={(e) => setReglasReparto((actual) => actual.map((r, i) => i === indice ? { ...r, apoderado_id: e.target.value } : r))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"><option value="">Sin apoderado específico</option>{apoderadosReparto.map((a) => <option key={a.id} value={a.id}>{[a.nombre, a.apellidos].filter(Boolean).join(" ") || a.usuario || ("Empleado " + a.id)}</option>)}</select></label>
                              </div>
                            </article>
                          ))}
                          {reglasReparto.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Todavía no hay actividades configuradas. Pulsa «Añadir actividad» para añadir la primera y repite el proceso para cada actividad que pueda tramitar este gestor.</p>}
                        </div>
                      )}
                      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-500">{reglasReparto.filter((r) => r.activa !== false).length} regla(s) activa(s)</p>
                        <button type="button" disabled={!esAdministrador || guardandoReparto || cargandoReparto || !gestorRepartoId || reglasReparto.some((r) => !r.actividad || r.zona_territorial && !(Array.isArray(r.comunidades) ? r.comunidades.length : r.comunidad))} onClick={async () => {
                          setGuardandoReparto(true); setErrorReparto(""); setMensajeReparto("");
                          try {
                            const payload = reglasReparto.map(({ _key, ...r }) => ({ ...r, comunidades: Array.isArray(r.comunidades) ? r.comunidades : (r.comunidad ? [r.comunidad] : []), estados_expediente: Array.isArray(r.estados_expediente) ? r.estados_expediente : (r.estado_expediente ? [r.estado_expediente] : []), comunidad: "", porcentaje: Number(r.porcentaje || 0), apoderado_id: r.apoderado_id || null }));
                            if (payload.some((r) => !r.actividad)) throw new Error("Selecciona una actividad en cada regla antes de guardar.");
                            if (!gestorRepartoId) throw new Error("Selecciona un gestor antes de guardar.");
                            await guardarReglasRepartoGestor(gestorRepartoId, payload);
                            // Verificación de persistencia: volver a leer desde el backend tras el commit.
                            const { data: verificacion } = await obtenerReglasRepartoGestor(gestorRepartoId);
                            const reglasConfirmadas = verificacion?.reglas;
                            if (!Array.isArray(reglasConfirmadas) || reglasConfirmadas.length !== payload.length) {
                              throw new Error("El servidor no ha confirmado todas las reglas guardadas. Vuelve a cargar el gestor antes de hacer más cambios.");
                            }
                            const normalizadas = reglasConfirmadas.map((r, i) => ({
                              ...r,
                              oficinas: Array.isArray(r.oficinas) ? r.oficinas.join(", ") : (r.oficinas || ""),
                              comunidades: Array.isArray(r.comunidades) ? r.comunidades : (r.comunidad ? [r.comunidad] : []),
                              estados_expediente: Array.isArray(r.estados_expediente) ? r.estados_expediente : (r.estado_expediente ? [r.estado_expediente] : []),
                              _key: `guardada-${i}-${r.actividad}-${r.oficina_tipo || ""}`,
                            }));
                            // Comprobar que los criterios nuevos también regresan tras leer la configuración.
                            const criteriosPerdidos = normalizadas.some((r, i) =>
                              String(r.oficina_tipo || "") !== String(payload[i].oficina_tipo || "") ||
                              JSON.stringify(Array.isArray(r.oficinas) ? r.oficinas : String(r.oficinas || "").split(/[,;]/).map(x => x.trim()).filter(Boolean)) !== JSON.stringify(Array.isArray(payload[i].oficinas) ? payload[i].oficinas : String(payload[i].oficinas || "").replace(/;/g, ",").split(",").map(x => x.trim()).filter(Boolean)) ||
                              String(r.producto_gtg || "") !== String(payload[i].producto_gtg || "") ||
                              String(r.tipo_operacion || "") !== String(payload[i].tipo_operacion || "") ||
                              JSON.stringify(Array.isArray(r.estados_expediente) ? r.estados_expediente : []) !== JSON.stringify(Array.isArray(payload[i].estados_expediente) ? payload[i].estados_expediente : []) ||
                              String(r.departamento || "") !== String(payload[i].departamento || "") ||
                              Number(r.porcentaje || 0) !== Number(payload[i].porcentaje || 0) ||
                              Boolean(r.activa) !== Boolean(payload[i].activa) ||
                              Number(r.apoderado_id || 0) !== Number(payload[i].apoderado_id || 0) ||
                              Boolean(r.zona_territorial) !== Boolean(payload[i].zona_territorial) ||
                              JSON.stringify(r.comunidades || []) !== JSON.stringify(payload[i].comunidades || [])
                            );
                            if (criteriosPerdidos) {
                              throw new Error("La configuración se ha enviado, pero la verificación detectó campos que no coinciden al volver a leerla. No sigas editando hasta revisar la respuesta del servidor.");
                            }
                            setReglasReparto(normalizadas);
                            setMensajeReparto("Guardado y verificado: " + payload.length + " regla(s) de reparto para " + (empleadosReparto.find((e) => String(e.id) === String(gestorRepartoId))?.nombre || "el gestor seleccionado") + ".");
                          } catch (e) { setErrorReparto(e?.response?.data?.detail || "No se pudieron guardar las reglas de reparto."); }
                          finally { setGuardandoReparto(false); }
                        }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{guardandoReparto ? "Guardando…" : "Guardar reglas de reparto"}</button>
                      </div>
                    </section>
                  </div>
                )}

                {/* =================================================
                    SEGURIDAD
                ================================================= */}

                {pestana ===
                  "seguridad" && (

                  <div className="space-y-5">

                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div className="mb-5">

                        <h3
                          className="
                            text-base
                            font-bold
                            text-slate-900
                          "
                        >
                          Seguridad
                        </h3>

                        <p
                          className="
                            mt-1
                            text-sm
                            text-slate-500
                          "
                        >
                          Gestiona las credenciales
                          del empleado.
                        </p>

                      </div>




                      <div
                        className="
                          rounded-2xl
                          border
                          border-amber-200
                          bg-amber-50
                          p-5
                        "
                      >

                        <div
                          className="
                            flex
                            flex-col
                            gap-4
                            sm:flex-row
                            sm:items-center
                            sm:justify-between
                          "
                        >

                          <div>

                            <h4
                              className="
                                font-bold
                                text-slate-800
                              "
                            >
                              Restablecer contraseña
                            </h4>

                            <p
                              className="
                                mt-1
                                text-sm
                                text-slate-600
                              "
                            >
                              Genera una nueva
                              contraseña temporal
                              para este empleado.
                            </p>

                          </div>


                          {!confirmReset ? (

                            <button
                              type="button"
                              onClick={() =>
                                setConfirmReset(
                                  true
                                )
                              }
                              className="
                                rounded-xl
                                bg-amber-500
                                px-4
                                py-2.5
                                text-sm
                                font-semibold
                                text-white
                                shadow-sm
                                transition
                                hover:bg-amber-600
                              "
                            >
                              Restablecer
                            </button>

                          ) : (

                            <div
                              className="
                                flex
                                flex-wrap
                                gap-2
                              "
                            >

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmReset(
                                    false
                                  )
                                }
                                disabled={
                                  resettingPassword
                                }
                                className="
                                  rounded-xl
                                  border
                                  border-slate-200
                                  bg-white
                                  px-4
                                  py-2.5
                                  text-sm
                                  font-semibold
                                  text-slate-600
                                  transition
                                  hover:bg-slate-50
                                "
                              >
                                Cancelar
                              </button>


                              <button
                                type="button"
                                onClick={
                                  ejecutarResetPassword
                                }
                                disabled={
                                  resettingPassword
                                }
                                className="
                                  rounded-xl
                                  bg-red-600
                                  px-4
                                  py-2.5
                                  text-sm
                                  font-semibold
                                  text-white
                                  transition
                                  hover:bg-red-700
                                  disabled:cursor-not-allowed
                                  disabled:opacity-50
                                "
                              >
                                {resettingPassword
                                  ? "Restableciendo..."
                                  : "Sí, restablecer"}
                              </button>

                            </div>

                          )}

                        </div>

                      </div>

                    </section>

                  </div>

                )}


                {/* =================================================
                    AUDITORÍA
                ================================================= */}

                {pestana ===
                  "auditoria" && (

                  <div className="space-y-5">

                    <section
                      className="
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        p-5
                        shadow-sm
                      "
                    >

                      <div className="mb-5">

                        <h3
                          className="
                            text-base
                            font-bold
                            text-slate-900
                          "
                        >
                          Auditoría
                        </h3>

                        <p
                          className="
                            mt-1
                            text-sm
                            text-slate-500
                          "
                        >
                          Historial de acciones
                          relacionadas con el empleado.
                        </p>

                      </div>


                      <div className="space-y-3">

                        {(
                          Array.isArray(
                            ficha?.auditoria
                          )
                            ? ficha.auditoria
                            : []
                        ).length > 0 ? (

                          ficha.auditoria.map(
                            (
                              item,
                              index
                            ) => (

                              <div
                                key={
                                  item.id ||
                                  `audit-${index}`
                                }
                                className="
                                  rounded-2xl
                                  border
                                  border-slate-200
                                  bg-slate-50/60
                                  p-5
                                "
                              >

                                <div
                                  className="
                                    grid
                                    grid-cols-1
                                    gap-4
                                    md:grid-cols-2
                                  "
                                >

                                  <DatoSimple
                                    label="Fecha"
                                    value={
                                      item.fecha
                                    }
                                  />

                                  <DatoSimple
                                    label="Módulo"
                                    value={
                                      item.modulo
                                    }
                                  />

                                  <DatoSimple
                                    label="Acción"
                                    value={
                                      item.accion
                                    }
                                  />

                                  <DatoSimple
                                    label="Descripción"
                                    value={
                                      item.descripcion
                                    }
                                  />

                                </div>

                              </div>

                            )
                          )

                        ) : (

                          <div
                            className="
                              rounded-2xl
                              border
                              border-dashed
                              border-slate-300
                              bg-slate-50
                              p-8
                              text-center
                            "
                          >

                            <div className="text-3xl">
                              <MolsanIcon name="clipboard" size={20} />
                            </div>

                            <p
                              className="
                                mt-3
                                text-sm
                                font-medium
                                text-slate-500
                              "
                            >
                              No hay registros de
                              auditoría disponibles.
                            </p>

                          </div>

                        )}

                      </div>

                    </section>

                  </div>

                )}

              </>

            )}

          </>
          )}
        </div>


        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div
          className="
            flex
            shrink-0
            flex-col
            gap-3
            border-t
            border-slate-200
            bg-white
            px-5
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-6
          "
        >

          <p
            className="
              text-xs
              text-slate-400
            "
          >
            Molsan ERP · Perfil de empleado
          </p>


          <div
            className="
              flex
              items-center
              justify-end
              gap-2
            "
          >

            <button
              type="button"
              onClick={
                onClose
              }
              className="
                rounded-xl
                bg-slate-900
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                shadow-sm
                transition
                hover:bg-slate-800
              "
            >
              Cerrar
            </button>

          </div>

        </div>

      </div>

    </div>
  );
}


/* ============================================================
   CAMPO EDITABLE
============================================================ */

function CampoEditable({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}) {

  return (

    <label className="block">

      <span
        className="
          mb-2
          block
          text-[11px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </span>


      <input
        type={type}
        value={
          value === null ||
          value === undefined
            ? ""
            : value
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        disabled={disabled}
        className="
          h-11
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          text-sm
          font-medium
          text-slate-800
          outline-none
          transition
          placeholder:text-slate-300
          focus:border-blue-400
          focus:ring-2
          focus:ring-blue-100
          disabled:cursor-not-allowed
          disabled:bg-slate-100
          disabled:text-slate-400
        "
      />

    </label>
  );
}


/* ============================================================
   CAMPO SELECT
============================================================ */

function CampoSelect({
  label,
  value,
  options = [],
  placeholder = "Seleccionar",
  onChange,
}) {

  return (

    <label className="block">

      <span
        className="
          mb-2
          block
          text-[11px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </span>


      <select
        value={
          value === null ||
          value === undefined
            ? ""
            : String(value)
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="
          h-11
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          text-sm
          font-medium
          text-slate-800
          outline-none
          transition
          focus:border-blue-400
          focus:ring-2
          focus:ring-blue-100
        "
      >

        <option value="">
          {placeholder}
        </option>

        {options.map(
          (item) => (

            <option
              key={item.id}
              value={item.id}
            >
              {item.nombre}
            </option>

          )
        )}

      </select>

    </label>
  );
}


/* ============================================================
   TEXTAREA
============================================================ */

function CampoTextarea({
  label,
  value,
  onChange,
}) {

  return (

    <label className="block">

      <span
        className="
          mb-2
          block
          text-[11px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </span>


      <textarea
        rows={5}
        value={
          value === null ||
          value === undefined
            ? ""
            : value
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="
          w-full
          resize-y
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          py-3
          text-sm
          font-medium
          text-slate-800
          outline-none
          transition
          placeholder:text-slate-300
          focus:border-blue-400
          focus:ring-2
          focus:ring-blue-100
        "
      />

    </label>
  );
}


/* ============================================================
   DATO SIMPLE
============================================================ */

function DatoSimple({
  label,
  value,
}) {

  return (

    <div>

      <div
        className="
          mb-1
          text-[11px]
          font-semibold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </div>


      <div
        className="
          break-words
          text-sm
          text-slate-800
        "
      >
        {value ||
          "—"}
      </div>

    </div>
  );
}


/* ============================================================
   BOTÓN GUARDAR
============================================================ */

function GuardarButton({
  onClick,
  loading,
}) {

  return (

    <div
      className="
        flex
        justify-end
        pt-1
      "
    >

      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="
          inline-flex
          items-center
          justify-center
          rounded-xl
          bg-blue-600
          px-5
          py-2.5
          text-sm
          font-semibold
          text-white
          shadow-sm
          transition
          hover:bg-blue-700
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >

        {loading
          ? "Guardando..."
          : "Guardar cambios"}

      </button>

    </div>
  );
}


/* ============================================================
   CONVERTIR NÚMERO
============================================================ */

function convertirNumeroONull(
  valor
) {

  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero =
    Number(valor);

  return Number.isFinite(
    numero
  )
    ? numero
    : null;
}


/* ============================================================
   FECHA PARA INPUT DATE
============================================================ */

function normalizarFechaInput(
  valor
) {

  if (
    !valor
  ) {
    return "";
  }

  const texto =
    String(valor);

  /*
   * Ya viene YYYY-MM-DD.
   */

  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      texto
    )
  ) {
    return texto;
  }

  /*
   * Compatibilidad con:
   *
   * DD/MM/YYYY
   */

  const match =
    texto.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (match) {

    return (
      `${match[3]}-` +
      `${match[2]}-` +
      `${match[1]}`
    );
  }

  /*
   * Compatibilidad con ISO
   * con hora.
   */

  if (
    texto.length >= 10 &&
    /^\d{4}-\d{2}-\d{2}/.test(
      texto
    )
  ) {
    return texto.substring(
      0,
      10
    );
  }

  return "";
}
