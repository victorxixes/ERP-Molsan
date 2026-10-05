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
        return None


# =========================================================
# WS MANAGER
# =========================================================

class WSManager:
    """
    Gestor central de WebSockets de mensajería.

    Soporta:

    - múltiples pestañas por empleado
    - presencia online/offline
    - mensajes realtime
    - archivos realtime
    - typing
    - limpieza de conexiones muertas
    - notificaciones
    """

    def __init__(self):

        # -------------------------------------------------
        # empleado_id -> [websocket, websocket, ...]
        # -------------------------------------------------

        self.conectados = {}

        # -------------------------------------------------
        # Protección del diccionario
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
        Registra una conexión.

        True:
            era la primera conexión del empleado.

        False:
            ya tenía otra conexión.
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
        Elimina una conexión.

        Solo devuelve True cuando esa conexión
        era la última del empleado.
        """

        with self.lock:

            conexiones = self.conectados.get(
                empleado_id,
                [],
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

    # =====================================================
    # IDS CONECTADOS
    # =====================================================

    def obtener_ids_conectados(self):
        """
        Devuelve una copia segura de los empleados online.
        """

        with self.lock:

            return list(
                self.conectados.keys()
            )

    # =====================================================
    # ESTÁ CONECTADO
    # =====================================================

    def esta_conectado(
        self,
        empleado_id: int,
    ):

        with self.lock:

            conexiones = self.conectados.get(
                empleado_id,
                [],
            )

            return bool(
                conexiones
            )

    # =====================================================
    # ENVIAR A UN USUARIO
    # =====================================================

    async def send_to_user(
        self,
        empleado_id: int,
        data: dict,
    ):
        """
        Envía a todas las pestañas abiertas
        del empleado.
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
        # LIMPIAR MUERTOS
        # -------------------------------------------------

        if muertos:

            ultima_conexion = False

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

                    ultima_conexion = True

            # -------------------------------------------------
            # PRESENCIA OFFLINE
            # -------------------------------------------------

            if ultima_conexion:

                try:

                    await self.broadcast(
                        {
                            "tipo": "offline",
                            "id": empleado_id,
                        }
                    )

                except Exception:

                    pass

    # =====================================================
    # BROADCAST
    # =====================================================

    async def broadcast(
        self,
        data: dict,
    ):
        """
        Envía un evento a todos los empleados online.
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

        if not muertos:
            return

        empleados_offline = set()

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

                    empleados_offline.add(
                        empleado_id
                    )

        # -------------------------------------------------
        # AVISAR OFFLINE
        # -------------------------------------------------

        for empleado_id in empleados_offline:

            try:

                await self.broadcast(
                    {
                        "tipo": "offline",
                        "id": empleado_id,
                    }
                )

            except Exception:

                pass

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
        Guarda una única vez el mensaje.

        Después lo envía:

        - remitente
        - destinatario
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
                    "tipo": "nuevo_mensaje",
                    "from": remitente_id,
                    "preview": contenido,
                },
            )

        except Exception as exc:

            print(
                "[WS-MSG] Error notificando "
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
        Guarda un archivo como mensaje
        y lo distribuye por WebSocket.
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
                "[WS-MSG] Error notificando "
                f"archivo: {exc}",
                flush=True,
            )

        return mensaje


# =========================================================
# INSTANCIA GLOBAL
# =========================================================

manager = WSManager()
