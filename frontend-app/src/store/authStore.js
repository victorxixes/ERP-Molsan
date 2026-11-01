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

    // JWT usa Base64URL: normalizamos sus dos caracteres especiales
    // y completamos el padding antes de pasarlo a atob().
    const payloadBase64 = partes[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const payloadBase64Padded = payloadBase64.padEnd(
      Math.ceil(payloadBase64.length / 4) * 4,
      "="
    );

    const payloadJson = decodeURIComponent(
      atob(payloadBase64Padded)
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
      "No se ha podido comprobar la expiración del JWT."
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

  // La API y las pantallas de seguridad pueden exponer la asignación
  // con cualquiera de estos nombres. No descartamos un campo por el hecho
  // de que el otro exista pero llegue vacío.
  const normalizarListaModulos = (valor) => {
    if (Array.isArray(valor)) return valor;
    if (typeof valor !== "string" || !valor.trim()) return [];
    try {
      const parseado = JSON.parse(valor);
      if (Array.isArray(parseado)) return parseado;
    } catch {
      // Compatibilidad con listas separadas por comas.
    }
    return valor.split(",").map((item) => item.trim()).filter(Boolean);
  };

  const modulos = [
    ...normalizarListaModulos(empleado.modulos_visibles_list),
    ...normalizarListaModulos(empleado.modulos_visibles),
  ].filter((modulo, indice, lista) =>
    lista.findIndex((otro) =>
      String(otro || "").trim().toLocaleLowerCase("es") ===
      String(modulo || "").trim().toLocaleLowerCase("es")
    ) === indice
  );


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


    // Sincroniza los cambios del empleado conectado con Zustand y localStorage.
    // Se utiliza, entre otros casos, cuando un administrador cambia su propio rol.
    actualizarEmpleadoSesion: (cambios) => {
      set((state) => {
        const empleado = {
          ...(state.empleado || {}),
          ...(cambios || {}),
        };

        try {
          localStorage.setItem("empleado", JSON.stringify(empleado));
        } catch (error) {
          console.warn("No se pudo sincronizar el empleado de la sesión.");
        }

        return { empleado };
      });
    },


    /*
     * =====================================================
     * HIDRATACIÓN INICIAL
     * =====================================================
     */

    init: async () => {
      try {

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
          "Sesión almacenada inválida. Cerrando sesión."
        );


        limpiarSesionLocal();


        set({

          token: null,

          empleado: null,

          loading: false,

          authReady: true

        });

      }

      } catch (error) {
        console.error("No se pudo inicializar la sesión del ERP.");
        try {
          limpiarSesionLocal();
        } catch (storageError) {
          console.warn("No se pudo limpiar el almacenamiento local.");
        }
        set({ token: null, empleado: null });
      } finally {
        // Ningún error de almacenamiento debe dejar bloqueada la pantalla de acceso.
        set({ loading: false, authReady: true });
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

          console.error("Respuesta de login inválida.");

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

          console.error("El backend no ha devuelto un empleado válido.");

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


        return true;

      }

      catch (error) {

        console.error("No se ha podido completar el inicio de sesión.");

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
