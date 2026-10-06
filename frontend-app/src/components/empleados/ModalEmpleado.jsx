import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  editarEmpleado,
  subirFotoEmpleado,
  resetPasswordEmpleado,
} from "../../api/empleados";

import {
  getMaestros,
} from "../../api/maestros";

import {
  useSeguridadStore,
} from "../../store/seguridadStore";

import MODULOS_ERP from "../config/modulos";

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
}) {

  /* ==========================================================
     STORE SEGURIDAD
  ========================================================== */

  const {
    ficha,
    permisos: permisosGlobales,
    cargarFicha,
    asignarModulos,
    asignarPermisos,
  } = useSeguridadStore();


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
  ] = useState("basicos");

  const [
    confirmReset,
    setConfirmReset,
  ] = useState(false);

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
        setPestana("basicos");

        await cargarFicha(
          empleadoId
        );

      } catch (err) {

        console.error(
          "MODAL EMPLEADO — ERROR CARGANDO FICHA:",
          err
        );

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

        console.error(
          "MODAL EMPLEADO — ERROR CARGANDO MAESTROS:",
          err
        );

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


  /* ==========================================================
     PERMISOS DISPONIBLES
  ========================================================== */

  const permisosDisponibles =
    useMemo(() => {

      const resultado = {};

      if (
        !Array.isArray(
          permisosGlobales
        )
      ) {
        return resultado;
      }

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
            !resultado[
              modulo
            ].includes(
              nombrePermiso
            )
          ) {
            resultado[
              modulo
            ].push(
              nombrePermiso
            );
          }
        }
      );


      Object.keys(
        resultado
      ).forEach(
        (modulo) => {

          resultado[
            modulo
          ].sort(
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

    return String(
      valor
    )
      .replace(
        /_/g,
        " "
      )
      .replace(
        /\b\w/g,
        (letra) =>
          letra.toUpperCase()
      );
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

  const guardarDatosEmpleado =
    async () => {

      if (
        !empleadoId
      ) {
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

        const payload = {

          nombre:
            empleadoFormulario.nombre ??
            null,

          apellidos:
            empleadoFormulario.apellidos ??
            null,

          dni:
            empleadoFormulario.dni ??
            null,

          telefono:
            empleadoFormulario.telefono ??
            null,

          email_personal:
            empleadoFormulario.email_personal ??
            null,

          email_empresa:
            empleadoFormulario.email_empresa ??
            null,

          extension:
            empleadoFormulario.extension ??
            null,

          usuario:
            empleadoFormulario.usuario ??
            null,

          direccion:
            empleadoFormulario.direccion ??
            null,

          codigo_postal:
            empleadoFormulario.codigo_postal ??
            null,

          poblacion:
            empleadoFormulario.poblacion ??
            null,

          provincia:
            empleadoFormulario.provincia ??
            null,

          fecha_nacimiento:
            empleadoFormulario.fecha_nacimiento ??
            null,

          alergias:
            empleadoFormulario.alergias ??
            null,

          persona_contacto:
            empleadoFormulario.persona_contacto ??
            null,

          telefono_contacto:
            empleadoFormulario.telefono_contacto ??
            null,

          observaciones:
            empleadoFormulario.observaciones ??
            null,

          departamento_id:
            convertirNumeroONull(
              empleadoFormulario.departamento_id
            ),

          seccion_id:
            convertirNumeroONull(
              empleadoFormulario.seccion_id
            ),

          cargo_id:
            convertirNumeroONull(
              empleadoFormulario.cargo_id
            ),

          fecha_alta:
            empleadoFormulario.fecha_alta ??
            null,

          fecha_baja:
            empleadoFormulario.fecha_baja ??
            null,

          activo:
            typeof empleadoFormulario.activo ===
            "boolean"
              ? empleadoFormulario.activo
              : null,

          rol_id:
            convertirNumeroONull(
              empleadoFormulario.rol_id
            ),
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

        console.error(
          "MODAL EMPLEADO — ERROR GUARDANDO DATOS:",
          err
        );

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

        console.error(
          "MODAL EMPLEADO — ERROR GUARDANDO ACCESOS:",
          err
        );

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

        console.error(
          "MODAL EMPLEADO — ERROR RESETEANDO PASSWORD:",
          err
        );

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

      console.error(
        "MODAL EMPLEADO — ERROR SUBIENDO FOTO:",
        err
      );

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
     NO RENDER
  ========================================================== */

  if (!open) {
    return null;
  }


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <div
      className="
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
          max-w-6xl
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

                  <img
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

          {[
            {
              id: "basicos",
              label: "Datos básicos",
              icon: "👤",
            },
            {
              id: "personales",
              label: "Datos personales",
              icon: "🏠",
            },
            {
              id: "laborales",
              label: "Datos laborales",
              icon: "💼",
            },
            {
              id: "accesos",
              label: "Accesos",
              icon: "🔐",
            },
            {
              id: "seguridad",
              label: "Seguridad",
              icon: "🛡️",
            },
            {
              id: "auditoria",
              label: "Auditoría",
              icon: "📋",
            },
          ].map(
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
                  {item.icon}
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

                            <img
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
                                subiendoFoto
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
                    DATOS LABORALES
                ================================================= */}

                {pestana ===
                  "laborales" && (

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

                )}


                {/* =================================================
                    ACCESOS
                ================================================= */}

                {pestana ===
                  "accesos" && (

                  <div className="space-y-5">


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
                                    {capitalizar(
                                      modulo
                                    )}
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
                                      {capitalizar(
                                        modulo
                                      )}
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
                              📋
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
