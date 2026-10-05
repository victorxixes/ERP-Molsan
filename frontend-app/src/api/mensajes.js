import axios from "./axios";

/**
 * =========================================================
 * API MENSAJES — MOLSAN ERP
 * =========================================================
 */


/* =========================================================
   CONVERSACIÓN
   ========================================================= */

export const obtenerConversacion = (
  usuarioId,
  otroId
) =>
  axios.get(
    `/mensajes/${usuarioId}/${otroId}`
  );


/* =========================================================
   USUARIOS CONECTADOS
   ========================================================= */

export const obtenerConectados = (
  usuarioId
) =>
  axios.get(
    "/mensajes/conectados",
    {
      params: {
        usuario_id: usuarioId,
      },
    }
  );


/* =========================================================
   ENVIAR MENSAJE REST
   ========================================================= */

export const enviarMensajeREST = (
  data
) =>
  axios.post(
    "/mensajes",
    data
  );


/* =========================================================
   SUBIR ARCHIVO
   ========================================================= */

export const subirArchivo = (
  file
) => {

  const fd =
    new FormData();

  fd.append(
    "file",
    file
  );

  return axios.post(
    "/mensajes/upload",
    fd
  );
};


/* =========================================================
   MARCAR MENSAJE LEÍDO
   ========================================================= */

export const marcarLeido = (
  mensajeId
) =>
  axios.put(
    `/mensajes/leido/${mensajeId}`
  );


/* =========================================================
   MARCAR CONVERSACIÓN LEÍDA
   ========================================================= */

export const marcarConversacionLeida = (
  usuarioId,
  otroId
) =>
  axios.put(
    `/mensajes/leido/conversacion/${usuarioId}/${otroId}`
  );
