// ============================================================
// MOLSAN ERP — CLIENTE REALTIME GLOBAL
// ============================================================

let realtimeSocket = null;


// ============================================================
// REGISTRAR SOCKET
// ============================================================

export const setRealtimeSocket = (
  socket
) => {

  realtimeSocket = socket;

};


// ============================================================
// OBTENER SOCKET
// ============================================================

export const getRealtimeSocket = () => {

  return realtimeSocket;

};


// ============================================================
// LIMPIAR SOCKET
// ============================================================

export const clearRealtimeSocket = (
  socket = null
) => {

  if (
    !socket ||
    realtimeSocket === socket
  ) {

    realtimeSocket = null;

  }

};


// ============================================================
// ENVIAR EVENTO
// ============================================================

export const sendRealtime = (
  payload
) => {

  if (
    !realtimeSocket ||
    typeof WebSocket === "undefined" ||
    realtimeSocket.readyState !== WebSocket.OPEN
  ) {

    console.warn(
      "[REALTIME] WebSocket no disponible."
    );

    return false;

  }

  try {

    realtimeSocket.send(
      JSON.stringify(payload)
    );

    return true;

  } catch (error) {

    console.error(
      "[REALTIME] Error enviando evento:",
      error
    );

    return false;

  }

};
