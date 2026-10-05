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
    Gestor central de WebSockets de Mensajes.

    Permite:

    - múltiples pestañas por empleado
    - presencia online/offline
    - envío a un usuario
    - broadcast global
    - typing
    - mensajes realtime
    - archivos realtime
    - limpieza de conexiones muertas
    """

    def __init__(self):

        # -------------------------------------------------
        # {
        #     empleado_id: [
        #         websocket,
        #         websocket,
        #     ]
        # }
        # -------------------------------------------------

        self.conectados = {}

        # -------------------------------------------------
        # Protección del diccionario.
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

        Devuelve True solamente si esta conexión es
        la primera conexión del empleado.
        """

        await websocket.accept()

        with self.lock:

            conexiones = self.conectados.setdefault(
                empleado_id,
                [],
            )

            era_primera = len(conexiones) == 0

            if websocket not in conexiones:
                conexiones.append(websocket)

        print(
            f"[WS-MSG] CONNECT empleado={empleado_id} "
            f"conexiones={len(self.conectados.get(empleado_id, []))}",
            flush=True,
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
        Elimina solamente esta conexión.

        Devuelve True si era la última conexión
        del empleado.
        """

        with self.lock:

            conexiones = self.conectados.get(
                empleado_id,
                [],
            )

            try:
                conexiones.remove(websocket)
            except ValueError:
                pass

            if not conexiones:

                self.conectados.pop(
                    empleado_id,
                    None,
                )

                print(
                    f"[WS-MSG] OFFLINE empleado={empleado_id}",
                    flush=True,
                )

                return True

            print(
                f"[WS-MSG] conexión cerrada empleado={empleado_id} "
                f"restantes={len(conexiones)}",
                flush=True,
            )

            return False

    # =====================================================
    # IDS CONECTADOS
    # =====================================================

    def obtener_ids_conectados(self):
        """
        Devuelve una copia de los empleados conectados.
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

            conexiones = self.conectados.get(
                empleado_id,
                [],
            )

            return bool(conexiones)

    # =====================================================
    # ENVIAR A USUARIO
    # =====================================================

    async def send_to_user(
        self,
        empleado_id: int,
        data: dict,
    ):
        """
        Envía el evento a todas las pestañas abiertas
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

            except Exception as exc:

                print(
                    f"[WS-MSG] conexión muerta "
                    f"empleado={empleado_id}: {exc}",
                    flush=True,
                )

                muertos.append(
                    websocket
                )

        # -------------------------------------------------
        # LIMPIAR MUERTOS
        # -------------------------------------------------

        if muertos:

            with self.lock:

                actuales = self.conectados.get(
                    empleado_id,
                    [],
                )

                for websocket in muertos:

                    try:
                        actuales.remove(
                            websocket
                        )
                    except ValueError:
                        pass

                if not actuales:

                    self.conectados.pop(
                        empleado_id,
                        None,
                    )

    # =====================================================
    # BROADCAST
    # =====================================================

    async def broadcast(
        self,
        data: dict,
    ):
        """
        Envía un evento a todos los empleados conectados.
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

            except Exception as exc:

                print(
                    f"[WS-MSG] broadcast falló "
                    f"empleado={empleado_id}: {exc}",
                    flush=True,
                )

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

                    actuales = self.conectados.get(
                        empleado_id,
                        [],
                    )

                    try:
                        actuales.remove(
                            websocket
                        )
                    except ValueError:
                        pass

                    if not actuales:

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
        Guarda UNA vez el mensaje y después lo distribuye
        por WebSocket al remitente y destinatario.
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
                "[WS-MSG] Error enviando "
                f"notificación: {exc}",
                flush=True,
            )

        print(
            f"[WS-MSG] MENSAJE "
            f"{remitente_id} -> {destinatario_id} "
            f"id={mensaje.id}",
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
        Guarda UNA vez el archivo como mensaje y después
        lo distribuye por WebSocket.
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
                "[WS-MSG] Error enviando "
                f"notificación archivo: {exc}",
                flush=True,
            )

        print(
            f"[WS-MSG] ARCHIVO "
            f"{remitente_id} -> {destinatario_id} "
            f"id={mensaje.id}",
            flush=True,
        )

        return mensaje


# =========================================================
# INSTANCIA GLOBAL
# =========================================================

manager = WSManager()
