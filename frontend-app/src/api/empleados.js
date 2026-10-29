import axios from "./axios";


/* =========================================================
   CRUD EMPLEADOS
========================================================= */

export const buscarEmpleados = async (
  params = {}
) => {

  const res =
    await axios.get(
      "/empleados/search",
      {
        params,
      }
    );

  return {
    data:
      Array.isArray(res.data)
        ? res.data
        : [],
  };
};


export const listarEmpleados = async () => {

  const res =
    await axios.get(
      "/empleados/"
    );

  return {
    data:
      Array.isArray(res.data)
        ? res.data
        : [],
  };
};


export const obtenerEmpleado = async (
  id
) => {

  const res =
    await axios.get(
      `/empleados/${id}`
    );

  return {
    data:
      res.data || null,
  };
};


export const crearEmpleado = async (
  payload
) => {

  const res =
    await axios.post(
      "/empleados/",
      payload
    );

  return {
    data:
      res.data || null,
  };
};


export const editarEmpleado = async (
  id,
  payload
) => {

  const res =
    await axios.put(
      `/empleados/${id}`,
      payload
    );

  return {
    data:
      res.data || null,
  };
};


export const eliminarEmpleado = async (
  id
) => {

  const res =
    await axios.delete(
      `/empleados/${id}`
    );

  return {
    data:
      res.data || null,
  };
};


/* =========================================================
   FOTO
========================================================= */

export const subirFotoEmpleado = async (
  id,
  file
) => {

  const formData =
    new FormData();


  /*
   * IMPORTANTE
   *
   * Backend:
   *
   * foto: UploadFile = File(...)
   *
   * Por tanto el nombre del campo debe ser:
   *
   * "foto"
   */

  formData.append(
    "foto",
    file
  );


  const res =
    await axios.post(
      `/empleados/${id}/foto`,
      formData
    );

  return {
    data:
      res.data || null,
  };
};


/* =========================================================
   FICHA BÁSICA EMPLEADO
========================================================= */

export const obtenerFichaEmpleado =
  async (
    id
  ) => {

    const res =
      await axios.get(
        `/empleados/${id}/ficha`
      );

    return {
      data:
        res.data || null,
    };
  };


/* =========================================================
   FICHA COMPLETA DE SEGURIDAD
========================================================= */

/*
 *
 * Esta es la ficha que contiene:
 *
 * - empleado
 * - rol
 * - modulos_visibles
 * - permisos_modulo
 * - auditoria
 *
 */

export const obtenerFichaSeguridad =
  async (
    id
  ) => {

    const res =
      await axios.get(
        `/seguridad/empleado/${id}/ficha-completa`
      );

    return {
      data:
        res.data || null,
    };
  };


/* =========================================================
   ALIAS COMPATIBILIDAD
========================================================= */

export const obtenerFichaCompleta =
  obtenerFichaSeguridad;


/* =========================================================
   MÓDULOS
========================================================= */

export const actualizarModulosVisibles =
  async (
    id,
    modulos_visibles_list
  ) => {

    const modulos =
      Array.isArray(
        modulos_visibles_list
      )
        ? modulos_visibles_list
        : [];


    const res =
      await axios.put(
        `/empleados/${id}/modulos`,
        {
          modulos_visibles_list:
            modulos,
        }
      );

    return {
      data:
        res.data || null,
    };
  };


/* =========================================================
   PERMISOS
========================================================= */

export const actualizarPermisosModulo =
  async (
    id,
    permisos_modulo_dict
  ) => {

    const permisos =
      permisos_modulo_dict &&
      typeof permisos_modulo_dict ===
        "object" &&
      !Array.isArray(
        permisos_modulo_dict
      )
        ? permisos_modulo_dict
        : {};


    const res =
      await axios.put(
        `/empleados/${id}/permisos`,
        {
          permisos_modulo_dict:
            permisos,
        }
      );

    return {
      data:
        res.data || null,
    };
  };


/* =========================================================
   PASSWORD
========================================================= */

export const resetPasswordEmpleado =
  async (
    id
  ) => {

    const res =
      await axios.post(
        `/empleados/${id}/reset-password`
      );

    return {
      data:
        res.data || null,
    };
  };


/* =========================================================
   APODERADOS
========================================================= */

export const listarApoderados =
  async () => {
    const res = await listarEmpleados();
    const normalizar = (valor) => String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    // La ficha laboral devuelve seccion_nombre y cargo_nombre.
    // El criterio principal es la sección «Apoderado»; conservamos
    // compatibilidad con los indicadores/roles antiguos del empleado.
    const lista = Array.isArray(res.data)
      ? res.data.filter((empleado) => {
          const seccion = normalizar(
            empleado.seccion_nombre ||
            empleado.seccion?.nombre ||
            empleado.seccion ||
            ""
          );
          const cargo = normalizar(
            empleado.cargo_nombre ||
            empleado.cargo?.nombre ||
            empleado.cargo ||
            ""
          );
          const rol = normalizar(
            empleado.rol_nombre ||
            empleado.rol?.nombre ||
            empleado.rol
          );

          return (
            seccion === "apoderado" ||
            seccion.includes("apoderado") ||
            cargo === "apoderado" ||
            cargo.includes("apoderado") ||
            empleado.apoderado === true ||
            empleado.es_apoderado === true ||
            rol === "apoderado"
          );
        })
      : [];

    return { data: lista };
  };


/* =========================================================
   ASIGNACIÓN DE NOTARÍAS PARA ENCARGAGEST
========================================================= */
export const obtenerNotariasEncargaGest = async () => {
  const res = await axios.get("/encargagest/gestion/notarias");
  return { data: Array.isArray(res.data) ? res.data : [] };
};

export const obtenerAsignacionNotariasEncargaGest = async (empleadoId) => {
  const res = await axios.get(`/encargagest/gestion/empleados/${empleadoId}/notarias`);
  return { data: res.data || { notaria_ids: [] } };
};

export const guardarAsignacionNotariasEncargaGest = async (empleadoId, notariaIds) => {
  const res = await axios.put(`/encargagest/gestion/empleados/${empleadoId}/notarias`, {
    notaria_ids: Array.isArray(notariaIds) ? notariaIds : [],
  });
  return { data: res.data || null };
};


// =========================================================
// ENCARGAGEST · RESPONSABLES CTN Y REPARTO POR ACTIVIDAD
// =========================================================
export const obtenerConfiguracionNotariasEncargaGest = async () => {
  const res = await axios.get("/encargagest/gestion/notarias/configuracion");
  return { data: Array.isArray(res.data) ? res.data : [] };
};

export const guardarResponsableNotariaEncargaGest = async (notariaId, payload) => {
  const res = await axios.put(`/encargagest/gestion/notarias/${notariaId}/responsable`, payload);
  return { data: res.data || null };
};

export const obtenerReglasRepartoGestor = async (empleadoId) => {
  const res = await axios.get(`/encargagest/gestion/empleados/${empleadoId}/reparto`);
  return { data: res.data || { reglas: [], actividades: [], comunidades: [] } };
};

export const guardarReglasRepartoGestor = async (empleadoId, reglas) => {
  const res = await axios.put(`/encargagest/gestion/empleados/${empleadoId}/reparto`, {
    reglas: Array.isArray(reglas) ? reglas : [],
  });
  return { data: res.data || null };
};

export const obtenerEstadoRepartoGestores = async () => {
  const res = await axios.get("/encargagest/gestion/reparto/estado");
  return {
    data: res.data || {
      resumen: {},
      incidencias: [],
      carga_por_gestor_actividad: [],
    },
  };
};
