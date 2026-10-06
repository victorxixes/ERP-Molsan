from datetime import datetime
from threading import Lock

from backend.app.mensajes.models import Mensaje
from backend.app.database import SessionLocal


# =========================================================
# NOTIFICACIONES
# =========================================================

try:

    from backend.app.notificaciones.router_ws import (
        send_notif_to_user,
    )

except Exception:

    async def send_notif_to_user(
        empleado_id: int,
        data: dict,
    ):
        """
        Fallback para instalaciones donde el módulo
        de notificaciones no esté disponible.
        """
        return None


# =========================================================
# WS MANAGER
# =========================================================

class WSManager:
    """
    Gestor WebSocket de mensajería.

    Funciones:

    - Conexiones por empleado.
    - Múltiples pestañas por empleado.
    - Broadcast global.
    - Envío a un usuario.
    - Limpieza de conexiones muertas.
    - Mensajes realtime.
    - Archivos realtime.
    - Typing.
    - Presencia online/offline.
    """

    def __init__(self):

        # -------------------------------------------------
        # {empleado_id: [websocket, websocket, ...]}
        # -------------------------------------------------

        self.conectados = {}

        # -------------------------------------------------
        # Lock para proteger el diccionario de conexiones.
        # -------------------------------------------------

        self.lock = Lock()

    # =====================================================
    # CONECTAR
    # =====================================================

    async def connect(
        self,
        websocket,
        empleado_id: int,
    ):
        """
        Acepta y registra una conexión.

        Devuelve:

        True
            si es la primera conexión de ese empleado.

        False
            si ya tenía otra conexión abierta.
        """

        await websocket.accept()

        with self.lock:

            conexiones = self.conectados.setdefault(
                empleado_id,
                [],
            )

            era_primera = (
                len(conexiones) == 0
            )

            conexiones.append(
                websocket
            )

        return era_primera

    # =====================================================
    # DESCONECTAR
    # =====================================================

    def disconnect(
        self,
        websocket,
        empleado_id: int,
    ):
        """
        Elimina UNA conexión.

        Importante:

        Si un empleado tiene dos pestañas abiertas,
        cerrar una no significa que el empleado esté offline.

        Devuelve:

        True
            cuando esta era la última conexión.

        False
            si todavía queda alguna conexión.
        """

        with self.lock:

            conexiones = (
                self.conectados.get(
                    empleado_id,
                    [],
                )
            )

            try:

                conexiones.remove(
                    websocket
                )

            except ValueError:
                pass

            # ---------------------------------------------
            # Ya no quedan conexiones.
            # ---------------------------------------------

            if not conexiones:

                self.conectados.pop(
                    empleado_id,
                    None,
                )

                return True

            return False

    # =====================================================
    # OBTENER CONECTADOS
    # =====================================================

    def obtener_ids_conectados(self):
        """
        Devuelve una copia de los IDs conectados.
        """

        with self.lock:

            return list(
                self.conectados.keys()
            )

    # =====================================================
    # COMPROBAR CONEXIÓN
    # =====================================================

    def esta_conectado(
        self,
        empleado_id: int,
    ):

        with self.lock:

            conexiones = (
                self.conectados.get(
                    empleado_id,
                    [],
                )
            )

            return len(conexiones) > 0

    # =====================================================
    # ENVIAR A UN USUARIO
    # =====================================================

    async def send_to_user(
        self,
        empleado_id: int,
        data: dict,
    ):
        """
        Envía un evento a todas las pestañas abiertas
        del empleado.

        Las conexiones que fallen se eliminan.
        """

        with self.lock:

            conexiones = list(
                self.conectados.get(
                    empleado_id,
                    [],
                )
            )

        if not conexiones:
            return

        muertos = []

        for websocket in conexiones:

            try:

                await websocket.send_json(
                    data
                )

            except Exception:

                muertos.append(
                    websocket
                )

        # -------------------------------------------------
        # LIMPIAR CONEXIONES MUERTAS
        # -------------------------------------------------

        if muertos:

            with self.lock:

                conexiones_actuales = (
                    self.conectados.get(
                        empleado_id,
                        [],
                    )
                )

                for websocket in muertos:

                    try:

                        conexiones_actuales.remove(
                            websocket
                        )

                    except ValueError:
                        pass

                if not conexiones_actuales:

                    self.conectados.pop(
                        empleado_id,
                        None,
                    )

    # =====================================================
    # BROADCAST GLOBAL
    # =====================================================

    async def broadcast(
        self,
        data: dict,
    ):
        """
        Envía un evento a todos los usuarios conectados.
        """

        with self.lock:

            conexiones = []

            for empleado_id, websockets in (
                self.conectados.items()
            ):

                for websocket in list(
                    websockets
                ):

                    conexiones.append(
                        (
                            empleado_id,
                            websocket,
                        )
                    )

        muertos = []

        for empleado_id, websocket in conexiones:

            try:

                await websocket.send_json(
                    data
                )

            except Exception:

                muertos.append(
                    (
                        empleado_id,
                        websocket,
                    )
                )

        # -------------------------------------------------
        # LIMPIAR MUERTOS
        # -------------------------------------------------

        if muertos:

            with self.lock:

                for empleado_id, websocket in muertos:

                    conexiones_actuales = (
                        self.conectados.get(
                            empleado_id,
                            [],
                        )
                    )

                    try:

                        conexiones_actuales.remove(
                            websocket
                        )

                    except ValueError:
                        pass

                    if not conexiones_actuales:

                        self.conectados.pop(
                            empleado_id,
                            None,
                        )

    # =====================================================
    # GUARDAR + ENVIAR MENSAJE
    # =====================================================

    async def enviar_mensaje_ws(
        self,
        remitente_id: int,
        destinatario_id: int,
        contenido: str,
    ):
        """
        Guarda un mensaje en PostgreSQL y después
        lo envía realtime al remitente y destinatario.

        El mensaje solamente se guarda UNA VEZ.
        """

        db = SessionLocal()

        try:

            mensaje = Mensaje(

                remitente_id=remitente_id,

                destinatario_id=destinatario_id,

                contenido=contenido,

                archivo_url=None,

                fecha=datetime.now(),

                leido=False,
            )

            db.add(
                mensaje
            )

            db.commit()

            db.refresh(
                mensaje
            )

            payload = {

                "tipo": "nuevo_mensaje",

                "mensaje": mensaje.as_dict(),
            }

        except Exception:

            db.rollback()

            raise

        finally:

            db.close()

        # -------------------------------------------------
        # ENVIAR AL REMITENTE
        # -------------------------------------------------

        await self.send_to_user(
            remitente_id,
            payload,
        )

        # -------------------------------------------------
        # ENVIAR AL DESTINATARIO
        # -------------------------------------------------

        if destinatario_id != remitente_id:

            await self.send_to_user(
                destinatario_id,
                payload,
            )

        # -------------------------------------------------
        # NOTIFICACIÓN
        # -------------------------------------------------

        try:

            await send_notif_to_user(
                destinatario_id,
                {
                    "tipo": "nuevo_mensaje",
                    "from": remitente_id,
                    "preview": contenido,
                },
            )

        except Exception as exc:

            print(
                f"[WS-MSG] Error notificando "
                f"mensaje: {exc}",
                flush=True,
            )

        return mensaje

    # =====================================================
    # GUARDAR + ENVIAR ARCHIVO
    # =====================================================

    async def enviar_archivo_ws(
        self,
        remitente_id: int,
        destinatario_id: int,
        archivo_url: str,
    ):
        """
        Guarda un archivo como mensaje y lo distribuye
        realtime.

        El mensaje solamente se guarda UNA VEZ.
        """

        db = SessionLocal()

        try:

            mensaje = Mensaje(

                remitente_id=remitente_id,

                destinatario_id=destinatario_id,

                contenido=None,

                archivo_url=archivo_url,

                fecha=datetime.now(),

                leido=False,
            )

            db.add(
                mensaje
            )

            db.commit()

            db.refresh(
                mensaje
            )

            payload = {

                "tipo": "nuevo_archivo",

                "mensaje": mensaje.as_dict(),
            }

        except Exception:

            db.rollback()

            raise

        finally:

            db.close()

        # -------------------------------------------------
        # REMITENTE
        # -------------------------------------------------

        await self.send_to_user(
            remitente_id,
            payload,
        )

        # -------------------------------------------------
        # DESTINATARIO
        # -------------------------------------------------

        if destinatario_id != remitente_id:

            await self.send_to_user(
                destinatario_id,
                payload,
            )

        # -------------------------------------------------
        # NOTIFICACIÓN
        # -------------------------------------------------

        try:

            await send_notif_to_user(
                destinatario_id,
                {
                    "tipo": "nuevo_archivo",
                    "from": remitente_id,
                    "archivo_url": archivo_url,
                },
            )

        except Exception as exc:

            print(
                f"[WS-MSG] Error notificando "
                f"archivo: {exc}",
                flush=True,
            )

        return mensaje


# =========================================================
# INSTANCIA GLOBAL
# =========================================================

manager = WSManager()
