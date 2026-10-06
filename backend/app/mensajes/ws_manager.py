from datetime import datetime
from threading import Lock

from backend.app.mensajes.models import Mensaje
from backend.app.database import SessionLocal

from backend.app.realtime.manager import realtime_manager
from backend.app.realtime.schemas import RealtimeEvent


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
        return None


# ============================================================
# WS MANAGER — MENSAJES
# ============================================================

class WSManager:
    """
    Gestor WebSocket de mensajería.

    Mantiene:

    - múltiples pestañas por empleado
    - presencia
    - envío de mensajes
    - envío de archivos
    - compatibilidad con /ws/mensajes
    - publicación adicional en /ws/realtime
    """

    def __init__(self):

        self.conectados = {}

        self.lock = Lock()


    # ========================================================
    # CONECTAR
    # ========================================================

    async def connect(
        self,
        websocket,
        empleado_id: int,
    ):

        await websocket.accept()

        with self.lock:

            conexiones = (
                self.conectados.setdefault(
                    empleado_id,
                    [],
                )
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
    # IDS CONECTADOS
    # ========================================================

    def obtener_ids_conectados(self):

        with self.lock:

            return list(
                self.conectados.keys()
            )


    # ========================================================
    # COMPROBAR CONECTADO
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

            return len(conexiones) > 0


    # ========================================================
    # ENVIAR A USUARIO
    # ========================================================

    async def send_to_user(
        self,
        empleado_id: int,
        data: dict,
    ):

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
    # BROADCAST ANTIGUO
    # ========================================================

    async def broadcast(
        self,
        data: dict,
    ):

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
    # GUARDAR + ENVIAR MENSAJE
    # ========================================================

    async def enviar_mensaje_ws(
        self,
        remitente_id: int,
        destinatario_id: int,
        contenido: str,
    ):

        db = SessionLocal()


        try:

            mensaje = Mensaje(

                remitente_id=
                    remitente_id,

                destinatario_id=
                    destinatario_id,

                contenido=
                    contenido,

                archivo_url=
                    None,

                fecha=
                    datetime.now(),

                leido=
                    False,

            )


            db.add(
                mensaje
            )


            db.commit()


            db.refresh(
                mensaje
            )


            mensaje_dict =
                mensaje.as_dict()


        except Exception:

            db.rollback()

            raise


        finally:

            db.close()


        # ====================================================
        # PAYLOAD COMPATIBILIDAD WS-MENSAJES
        # ====================================================

        payload = {

            "tipo":
                "nuevo_mensaje",

            "mensaje":
                mensaje_dict,

        }


        # ====================================================
        # CANAL ANTIGUO
        # ====================================================

        await self.send_to_user(
            remitente_id,
            payload,
        )


        if (
            destinatario_id
            != remitente_id
        ):

            await self.send_to_user(
                destinatario_id,
                payload,
            )


        # ====================================================
        # CANAL REALTIME GLOBAL
        # ====================================================

        realtime_event = RealtimeEvent(

            modulo=
                "mensajes",

            evento=
                "mensaje_nuevo",

            usuario_id=
                remitente_id,

            data={

                "tipo":
                    "nuevo_mensaje",

                "mensaje":
                    mensaje_dict,

            },

        )


        await realtime_manager.broadcast_usuario(
            remitente_id,
            realtime_event,
        )


        if (
            destinatario_id
            != remitente_id
        ):

            await realtime_manager.broadcast_usuario(
                destinatario_id,
                realtime_event,
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


        print(
            "[WS-MSG] Mensaje enviado "
            f"{remitente_id} -> "
            f"{destinatario_id}",
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

        db = SessionLocal()


        try:

            mensaje = Mensaje(

                remitente_id=
                    remitente_id,

                destinatario_id=
                    destinatario_id,

                contenido=
                    None,

                archivo_url=
                    archivo_url,

                fecha=
                    datetime.now(),

                leido=
                    False,

            )


            db.add(
                mensaje
            )


            db.commit()


            db.refresh(
                mensaje
            )


            mensaje_dict =
                mensaje.as_dict()


        except Exception:

            db.rollback()

            raise


        finally:

            db.close()


        # ====================================================
        # PAYLOAD ANTIGUO
        # ====================================================

        payload = {

            "tipo":
                "nuevo_archivo",

            "mensaje":
                mensaje_dict,

        }


        # ====================================================
        # CANAL ANTIGUO
        # ====================================================

        await self.send_to_user(
            remitente_id,
            payload,
        )


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

        realtime_event = RealtimeEvent(

            modulo=
                "mensajes",

            evento=
                "archivo_nuevo",

            usuario_id=
                remitente_id,

            data={

                "tipo":
                    "nuevo_archivo",

                "mensaje":
                    mensaje_dict,

            },

        )


        await realtime_manager.broadcast_usuario(
            remitente_id,
            realtime_event,
        )


        if (
            destinatario_id
            != remitente_id
        ):

            await realtime_manager.broadcast_usuario(
                destinatario_id,
                realtime_event,
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


        print(
            "[WS-MSG] Archivo enviado "
            f"{remitente_id} -> "
            f"{destinatario_id}",
            flush=True,
        )


        return mensaje


# ============================================================
# INSTANCIA GLOBAL
# ============================================================

manager = WSManager()
