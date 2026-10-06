from datetime import datetime
from threading import Lock

from backend.app.mensajes.models import Mensaje
from backend.app.database import SessionLocal

from backend.app.realtime.manager import (
    realtime_manager,
)

from backend.app.realtime.schemas import (
    RealtimeEvent,
)


# ============================================================
# NOTIFICACIONES
# ============================================================

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


# ============================================================
# WS MANAGER
# ============================================================

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
    - Compatibilidad con el WebSocket antiguo.
    - Publicación en el Realtime global.
    """

    def __init__(self):

        # -----------------------------------------------------
        # {empleado_id: [websocket, websocket, ...]}
        # -----------------------------------------------------

        self.conectados = {}

        # -----------------------------------------------------
        # Lock para proteger el diccionario.
        # -----------------------------------------------------

        self.lock = Lock()


    # ========================================================
    # CONECTAR
    # ========================================================

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


    # ========================================================
    # DESCONECTAR
    # ========================================================

    def disconnect(
        self,
        websocket,
        empleado_id: int,
    ):
        """
        Elimina UNA conexión.

        Si el empleado tiene varias pestañas abiertas,
        cerrar una no significa que esté offline.

        Devuelve:

        True
            cuando era la última conexión.

        False
            si todavía quedan conexiones.
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

            if not conexiones:

                self.conectados.pop(
                    empleado_id,
                    None,
                )

                return True

            return False


    # ========================================================
    # OBTENER IDS CONECTADOS
    # ========================================================

    def obtener_ids_conectados(self):

        with self.lock:

            return list(
                self.conectados.keys()
            )


    # ========================================================
    # COMPROBAR CONEXIÓN
    # ========================================================

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

            return len(
                conexiones
            ) > 0


    # ========================================================
    # ENVIAR A UN USUARIO
    # ========================================================

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


    # ========================================================
    # BROADCAST GLOBAL
    # ========================================================

    async def broadcast(
        self,
        data: dict,
    ):
        """
        Envía un evento a todos los empleados conectados
        al WebSocket de Mensajes antiguo.
        """

        with self.lock:

            conexiones = []

            for (
                empleado_id,
                websockets,
            ) in self.conectados.items():

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

        for (
            empleado_id,
            websocket,
        ) in conexiones:

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

        if muertos:

            with self.lock:

                for (
                    empleado_id,
                    websocket,
                ) in muertos:

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


    # ========================================================
    # PUBLICAR MENSAJE EN REALTIME GLOBAL
    # ========================================================

    async def publicar_mensaje_realtime(
        self,
        remitente_id: int,
        mensaje: Mensaje,
    ):
        """
        Publica el mensaje en el canal Realtime global.

        El frontend global lo recibe aunque el usuario
        esté en cualquier módulo del ERP.
        """

        event = RealtimeEvent(
            modulo="mensajes",

            evento="mensaje_nuevo",

            usuario_id=remitente_id,

            data={
                "tipo": "nuevo_mensaje",

                "mensaje": (
                    mensaje.as_dict()
                ),
            },
        )

        await realtime_manager.broadcast_usuario(
            remitente_id,
            event,
        )

        if (
            mensaje.destinatario_id
            != remitente_id
        ):

            await realtime_manager.broadcast_usuario(
                mensaje.destinatario_id,
                event,
            )


    # ========================================================
    # PUBLICAR ARCHIVO EN REALTIME GLOBAL
    # ========================================================

    async def publicar_archivo_realtime(
        self,
        remitente_id: int,
        mensaje: Mensaje,
    ):
        """
        Publica el archivo en el canal Realtime global.
        """

        event = RealtimeEvent(
            modulo="mensajes",

            evento="archivo_nuevo",

            usuario_id=remitente_id,

            data={
                "tipo": "nuevo_archivo",

                "mensaje": (
                    mensaje.as_dict()
                ),
            },
        )

        await realtime_manager.broadcast_usuario(
            remitente_id,
            event,
        )

        if (
            mensaje.destinatario_id
            != remitente_id
        ):

            await realtime_manager.broadcast_usuario(
                mensaje.destinatario_id,
                event,
            )


    # ========================================================
    # GUARDAR + ENVIAR MENSAJE
    # ========================================================

    async def enviar_mensaje_ws(
        self,
        remitente_id: int,
        destinatario_id: int,
        contenido: str,
    ):
        """
        Guarda un mensaje en PostgreSQL y lo distribuye
        por:

        1. WebSocket antiguo de Mensajes.
        2. Realtime global.

        El mensaje se guarda UNA sola vez.
        """

        db = SessionLocal()

        try:

            mensaje = Mensaje(

                remitente_id=(
                    remitente_id
                ),

                destinatario_id=(
                    destinatario_id
                ),

                contenido=(
                    contenido
                ),

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

        except Exception:

            db.rollback()

            raise

        finally:

            db.close()


        # ====================================================
        # PAYLOAD WS ANTIGUO
        # ====================================================

        payload = {

            "tipo":
                "nuevo_mensaje",

            "mensaje":
                mensaje.as_dict(),
        }


        # ====================================================
        # ENVIAR AL REMITENTE
        # ====================================================

        await self.send_to_user(
            remitente_id,
            payload,
        )


        # ====================================================
        # ENVIAR AL DESTINATARIO
        # ====================================================

        if (
            destinatario_id
            != remitente_id
        ):

            await self.send_to_user(
                destinatario_id,
                payload,
            )


        # ====================================================
        # REALTIME GLOBAL
        # ====================================================

        await self.publicar_mensaje_realtime(
            remitente_id,
            mensaje,
        )


        # ====================================================
        # NOTIFICACIÓN
        # ====================================================

        try:

            await send_notif_to_user(
                destinatario_id,
                {
                    "tipo":
                        "nuevo_mensaje",

                    "from":
                        remitente_id,

                    "preview":
                        contenido,
                },
            )

        except Exception as exc:

            print(
                "[WS-MSG] Error notificando "
                f"mensaje: {exc}",
                flush=True,
            )


        return mensaje


    # ========================================================
    # GUARDAR + ENVIAR ARCHIVO
    # ========================================================

    async def enviar_archivo_ws(
        self,
        remitente_id: int,
        destinatario_id: int,
        archivo_url: str,
    ):
        """
        Guarda un archivo como mensaje y lo distribuye
        por:

        1. WebSocket antiguo de Mensajes.
        2. Realtime global.

        El mensaje se guarda UNA sola vez.
        """

        db = SessionLocal()

        try:

            mensaje = Mensaje(

                remitente_id=(
                    remitente_id
                ),

                destinatario_id=(
                    destinatario_id
                ),

                contenido=None,

                archivo_url=(
                    archivo_url
                ),

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

        except Exception:

            db.rollback()

            raise

        finally:

            db.close()


        # ====================================================
        # PAYLOAD WS ANTIGUO
        # ====================================================

        payload = {

            "tipo":
                "nuevo_archivo",

            "mensaje":
                mensaje.as_dict(),
        }


        # ====================================================
        # ENVIAR AL REMITENTE
        # ====================================================

        await self.send_to_user(
            remitente_id,
            payload,
        )


        # ====================================================
        # ENVIAR AL DESTINATARIO
        # ====================================================

        if (
            destinatario_id
            != remitente_id
        ):

            await self.send_to_user(
                destinatario_id,
                payload,
            )


        # ====================================================
        # REALTIME GLOBAL
        # ====================================================

        await self.publicar_archivo_realtime(
            remitente_id,
            mensaje,
        )


        # ====================================================
        # NOTIFICACIÓN
        # ====================================================

        try:

            await send_notif_to_user(
                destinatario_id,
                {
                    "tipo":
                        "nuevo_archivo",

                    "from":
                        remitente_id,

                    "archivo_url":
                        archivo_url,
                },
            )

        except Exception as exc:

            print(
                "[WS-MSG] Error notificando "
                f"archivo: {exc}",
                flush=True,
            )


        return mensaje


# ============================================================
# INSTANCIA GLOBAL
# ============================================================

manager = WSManager()
