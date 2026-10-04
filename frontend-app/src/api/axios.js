import axios from "axios";
import { useAuthStore } from "../store/authStore";

/**
 * ============================================================
 * AXIOS — MOLSAN ERP PREMIUM 2027
 * ============================================================
 *
 * - BaseURL desde VITE_API_URL
 * - JWT automático
 * - Recuperación del token desde Zustand/localStorage
 * - Control global de 401
 * - Logout automático ante sesión inválida
 * - Protección contra bucles de logout
 * ============================================================
 */

const instance = axios.create({

  baseURL:
    import.meta.env.VITE_API_URL,

  withCredentials: false,

});


/* ============================================================
   REQUEST INTERCEPTOR
============================================================ */

instance.interceptors.request.use(

  (config) => {

    /*
     * Primero intentamos obtener el token desde Zustand.
     */

    let token =
      useAuthStore.getState().token;


    /*
     * Si Zustand todavía no lo tiene pero existe
     * en localStorage, usamos el de localStorage.
     *
     * Esto evita peticiones sin Authorization durante
     * determinadas fases de hidratación.
     */

    if (!token) {

      token =
        localStorage.getItem(
          "token"
        );

    }


    /*
     * Añadir Authorization.
     */

    if (token) {

      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;

    }


    return config;

  },

  (error) =>
    Promise.reject(error)

);


/* ============================================================
   RESPONSE INTERCEPTOR
============================================================ */

instance.interceptors.response.use(

  /*
   * ----------------------------------------------------------
   * RESPUESTA CORRECTA
   * ----------------------------------------------------------
   */

  (response) => {

    return response;

  },


  /*
   * ----------------------------------------------------------
   * ERROR
   * ----------------------------------------------------------
   */

  (error) => {

    /*
     * --------------------------------------------------------
     * SIN RESPUESTA
     *
     * Servidor caído, red, DNS, Render, etc.
     * --------------------------------------------------------
     */

    if (!error.response) {

      console.error(
        "AXIOS — Error de red o servidor no disponible:",
        error
      );

      return Promise.reject(error);

    }


    /*
     * --------------------------------------------------------
     * 401 UNAUTHORIZED
     * --------------------------------------------------------
     *
     * El backend ha rechazado el JWT.
     *
     * No intentamos seguir trabajando con una sesión
     * inválida.
     * --------------------------------------------------------
     */

    if (
      error.response.status === 401
    ) {

      console.warn(
        "AXIOS — Sesión no autorizada. Cerrando sesión."
      );


      /*
       * Cerramos Zustand + localStorage.
       */

      useAuthStore
        .getState()
        .logout();


      /*
       * ------------------------------------------------------
       * REDIRECCIÓN
       * ------------------------------------------------------
       *
       * Solo redirigimos si no estamos ya en login.
       *
       * Usamos location.replace para evitar que el usuario
       * pueda volver con el botón atrás a una página privada.
       * ------------------------------------------------------
       */

      if (
        window.location.pathname !==
        "/login"
      ) {

        window.location.replace(
          "/login"
        );

      }

    }


    /*
     * --------------------------------------------------------
     * DEVOLVER ERROR ORIGINAL
     * --------------------------------------------------------
     *
     * Importante:
     * No sustituimos el error Axios por un objeto inventado.
     *
     * Así los componentes pueden seguir usando:
     *
     * error.response
     * error.response.status
     * error.response.data
     * --------------------------------------------------------
     */

    return Promise.reject(
      error
    );

  }

);


export default instance;
