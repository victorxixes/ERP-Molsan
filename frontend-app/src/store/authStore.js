import { create } from "zustand";
import { login } from "../api/auth";
import { API_BASE } from "../api/config";

/**
 * =========================================================
 * AUTH STORE — MOLSAN ERP PREMIUM 2027
 * =========================================================
 *
 * Autenticación centralizada del ERP.
 *
 * - Login
 * - Persistencia JWT
 * - Hidratación inicial
 * - Validación de expiración JWT
 * - Logout
 * - Empleado normalizado
 * - Módulos visibles
 * - Permisos
 * - Perfil
 * =========================================================
 */


/* =========================================================
   FOTO
========================================================= */

function prepararFoto(foto) {

  if (!foto) {
    return null;
  }

  if (
    foto.startsWith("http://") ||
    foto.startsWith("https://")
  ) {
    return foto;
  }

  return `${API_BASE}${foto}`;
}


/* =========================================================
   COMPROBAR JWT
========================================================= */

/**
 * Comprueba si un JWT está caducado.
 *
 * No necesitamos ninguna librería externa.
 *
 * El payload JWT contiene:
 *
 * {
 *   exp: 1234567890
 * }
 *
 * exp está expresado en segundos Unix.
 *
 * Dejamos 30 segundos de margen para evitar
 * problemas de reloj entre navegador y servidor.
 */

function tokenEstaExpirado(token) {

  if (!token) {
    return true;
  }

  try {

    const partes = token.split(".");

    if (partes.length !== 3) {
      return false;
    }

    const payloadBase64 = partes[1];

    const payloadJson = decodeURIComponent(
      atob(payloadBase64)
        .split("")
        .map(
          (caracter) =>
            "%" +
            (
              "00" +
              caracter
                .charCodeAt(0)
                .toString(16)
            ).slice(-2)
        )
        .join("")
    );

    const payload = JSON.parse(
      payloadJson
    );

    /*
     * Si no existe exp no bloqueamos el token.
     *
     * Esto mantiene compatibilidad por si en algún
     * entorno el backend utiliza otro formato.
     */

    if (
      typeof payload.exp !== "number"
    ) {
      return false;
    }

    const ahora =
      Math.floor(
        Date.now() / 1000
      );

    const margen = 30;

    return payload.exp <= ahora + margen;

  } catch (error) {

    console.warn(
      "No se ha podido comprobar la expiración del JWT.",
      error
    );

    /*
     * Si no podemos interpretar el JWT,
     * dejamos que el backend determine si es válido.
     */

    return false;
  }
}


/* =========================================================
   NORMALIZAR EMPLEADO
========================================================= */

function normalizarEmpleado(empleado) {

  if (!empleado) {
    return null;
  }


  /*
   * -------------------------------------------------------
   * MÓDULOS
   * -------------------------------------------------------
   */

  let modulos =
    empleado.modulos_visibles_list;

  if (!Array.isArray(modulos)) {
    modulos = [];
  }


  /*
   * -------------------------------------------------------
   * PERMISOS
   * -------------------------------------------------------
   */

  let permisos =
    empleado.permisos_modulo_dict;

  if (
    !permisos ||
    typeof permisos !== "object" ||
    Array.isArray(permisos)
  ) {
    permisos = {};
  }


  /*
   * -------------------------------------------------------
   * EMPLEADO NORMALIZADO
   * -------------------------------------------------------
   */

  return {

    ...empleado,


    /*
     * ID PRINCIPAL
     */

    id:
      empleado.id ??
      empleado.empleado_id ??
      null,

    empleado_id:
      empleado.empleado_id ??
      empleado.id ??
      null,


    /*
     * FOTO
     */

    foto: prepararFoto(
      empleado.foto
    ),


    /*
     * MÓDULOS
     */

    modulos_visibles_list:
      modulos,

    modulos_visibles:
      modulos,


    /*
     * PERMISOS
     */

    permisos_modulo_dict:
      permisos,

    permisos_modulo:
      permisos
  };
}


/* =========================================================
   LIMPIAR SESIÓN
========================================================= */

function limpiarSesionLocal() {

  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "empleado"
  );
}


/* =========================================================
   STORE
========================================================= */

export const useAuthStore = create(
  (set) => ({

    /*
     * -----------------------------------------------------
     * ESTADO
     * -----------------------------------------------------
     */

    empleado: null,

    token: null,

    loading: true,

    authReady: false,


    /*
     * -----------------------------------------------------
     * MODAL PERFIL
     * -----------------------------------------------------
     */

    perfilModal: null,


    setPerfilModal: (id) => {

      set({
        perfilModal: id
      });

    },


    /*
     * =====================================================
     * HIDRATACIÓN INICIAL
     * =====================================================
     */

    init: async () => {

      const token =
        localStorage.getItem(
          "token"
        );

      const empleadoLS =
        localStorage.getItem(
          "empleado"
        );


      /*
       * ---------------------------------------------------
       * NO HAY SESIÓN
       * ---------------------------------------------------
       */

      if (
        !token ||
        !empleadoLS
      ) {

        limpiarSesionLocal();

        set({

          token: null,

          empleado: null,

          loading: false,

          authReady: true

        });

        return;
      }


      /*
       * ---------------------------------------------------
       * COMPROBAR EXPIRACIÓN DEL JWT
       * ---------------------------------------------------
       */

      if (
        tokenEstaExpirado(token)
      ) {

        console.warn(
          "JWT expirado. Cerrando sesión."
        );

        limpiarSesionLocal();

        set({

          token: null,

          empleado: null,

          loading: false,

          authReady: true

        });

        return;
      }


      /*
       * ---------------------------------------------------
       * RECUPERAR EMPLEADO
       * ---------------------------------------------------
       */

      try {

        const empleadoGuardado =
          JSON.parse(
            empleadoLS
          );


        const empleado =
          normalizarEmpleado(
            empleadoGuardado
          );


        /*
         * El empleado debe tener ID.
         */

        if (
          !empleado ||
          !empleado.empleado_id
        ) {

          throw new Error(
            "Empleado almacenado inválido"
          );

        }


        /*
         * -------------------------------------------------
         * RESTAURAR SESIÓN
         * -------------------------------------------------
         */

        set({

          token,

          empleado,

          loading: false,

          authReady: true

        });

      }

      catch (error) {

        console.warn(
          "Sesión almacenada inválida. Cerrando sesión.",
          error
        );


        limpiarSesionLocal();


        set({

          token: null,

          empleado: null,

          loading: false,

          authReady: true

        });

      }

    },


    /*
     * =====================================================
     * INICIAR SESIÓN
     * =====================================================
     */

    iniciarSesion: async (
      usuario,
      password
    ) => {

      try {

        /*
         * -------------------------------------------------
         * LOGIN BACKEND
         * -------------------------------------------------
         */

        const res =
          await login(
            usuario,
            password
          );


        /*
         * -------------------------------------------------
         * COMPROBAR RESPUESTA
         * -------------------------------------------------
         */

        if (
          !res.data ||
          !res.data.token ||
          !res.data.empleado
        ) {

          console.error(
            "Respuesta de login inválida:",
            res.data
          );

          return false;

        }


        /*
         * -------------------------------------------------
         * COMPROBAR TOKEN
         * -------------------------------------------------
         */

        if (
          tokenEstaExpirado(
            res.data.token
          )
        ) {

          console.error(
            "El backend ha devuelto un token expirado."
          );

          return false;

        }


        /*
         * -------------------------------------------------
         * EMPLEADO
         * -------------------------------------------------
         */

        const empleado =
          normalizarEmpleado(
            res.data.empleado
          );


        /*
         * -------------------------------------------------
         * COMPROBAR EMPLEADO
         * -------------------------------------------------
         */

        if (
          !empleado ||
          !empleado.empleado_id
        ) {

          console.error(
            "El backend no ha devuelto un empleado válido:",
            res.data.empleado
          );

          return false;

        }


        /*
         * -------------------------------------------------
         * GUARDAR SESIÓN
         *
         * Primero localStorage y después Zustand.
         * Así ambas fuentes quedan sincronizadas.
         * -------------------------------------------------
         */

        localStorage.setItem(
          "token",
          res.data.token
        );

        localStorage.setItem(
          "empleado",
          JSON.stringify(
            empleado
          )
        );


        set({

          empleado,

          token:
            res.data.token,

          loading: false,

          authReady: true

        });


        /*
         * -------------------------------------------------
         * DEBUG
         * -------------------------------------------------
         */

        console.log(
          "========================================"
        );

        console.log(
          "LOGIN CORRECTO"
        );

        console.log(
          "USUARIO:",
          empleado.usuario
        );

        console.log(
          "ID:",
          empleado.empleado_id
        );

        console.log(
          "ROL:",
          empleado.rol_id
        );

        console.log(
          "ROL NOMBRE:",
          empleado.rol_nombre
        );

        console.log(
          "MÓDULOS:",
          empleado.modulos_visibles_list
        );

        console.log(
          "PERMISOS:",
          empleado.permisos_modulo_dict
        );

        console.log(
          "========================================"
        );


        return true;

      }

      catch (error) {

        console.error(
          "ERROR LOGIN:",
          error
        );

        return false;

      }

    },


    /*
     * =====================================================
     * LOGOUT
     * =====================================================
     */

    logout: () => {

      limpiarSesionLocal();


      set({

        empleado: null,

        token: null,

        loading: false,

        authReady: true,

        perfilModal: null

      });

    }

  })
);
