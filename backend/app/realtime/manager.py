from typing import Any, Dict, List, Set
from threading import Lock

from fastapi import WebSocket

from .schemas import RealtimeEvent


# ============================================================
# REALTIME MANAGER — MOLSAN ERP
# ============================================================

class RealtimeManager:

    def __init__(self):

        # --------------------------------------------------------
        # TODAS LAS CONEXIONES
        # --------------------------------------------------------

        self.global_connections: Set[WebSocket] = set()

        # --------------------------------------------------------
        # CONEXIONES POR USUARIO
        # --------------------------------------------------------

        self.user_connections: Dict[
            int,
            Set[WebSocket]
        ] = {}

        # --------------------------------------------------------
        # INFORMACIÓN DEL USUARIO
        # --------------------------------------------------------

        self.user_info: Dict[
            int,
            Dict[str, Any]
        ] = {}

        # --------------------------------------------------------
        # CONEXIONES POR ROL
        # --------------------------------------------------------

        self.role_connections: Dict[
            str,
            Set[WebSocket]
        ] = {}

        # --------------------------------------------------------
        # CONEXIONES POR MÓDULO
        # --------------------------------------------------------

        self.module_connections: Dict[
            str,
            Set[WebSocket]
        ] = {}

        # --------------------------------------------------------
        # CONEXIONES POR GRUPO
        # --------------------------------------------------------

        self.group_connections: Dict[
            str,
            Set[WebSocket]
        ] = {}

        # --------------------------------------------------------
        # LOCK
        # --------------------------------------------------------

        self.lock = Lock()


    # ============================================================
    # CONECTAR
    # ============================================================

    async def connect(
        self,
        websocket: WebSocket,
        usuario_id: int | None = None,
        rol: str | None = None,
        modulo: str | None = None,
        grupo: str | None = None,
        usuario_info: Dict[str, Any] | None = None,
    ):

        await websocket.accept()

        with self.lock:

            self.global_connections.add(
                websocket
            )

            era_primera = False

            if usuario_id is not None:

                conexiones = (
                    self.user_connections
                    .setdefault(
                        usuario_id,
                        set(),
                    )
                )

                era_primera = (
                    len(conexiones) == 0
                )

                conexiones.add(
                    websocket
                )

                if usuario_info:

                    self.user_info[
                        usuario_id
                    ] = dict(
                        usuario_info
                    )

            if rol is not None:

                self.role_connections \
                    .setdefault(
                        rol,
                        set(),
                    ) \
                    .add(
                        websocket
                    )

            if modulo is not None:

                self.module_connections \
                    .setdefault(
                        modulo,
                        set(),
                    ) \
                    .add(
                        websocket
                    )

            if grupo is not None:

                self.group_connections \
                    .setdefault(
                        grupo,
                        set(),
                    ) \
                    .add(
                        websocket
                    )

        return era_primera


    # ============================================================
    # DESCONECTAR
    # ============================================================

    def disconnect(
        self,
        websocket: WebSocket,
    ):

        usuario_id = None

        era_ultima = False

        with self.lock:

            self.global_connections.discard(
                websocket
            )

            # ----------------------------------------------------
            # USUARIO
            # ----------------------------------------------------

            for key in list(
                self.user_connections.keys()
            ):

                conexiones = (
                    self.user_connections[
                        key
                    ]
                )

                if websocket in conexiones:

                    usuario_id = key

                    conexiones.discard(
                        websocket
                    )

                    if not conexiones:

                        del self.user_connections[
                            key
                        ]

                        self.user_info.pop(
                            key,
                            None,
                        )

                        era_ultima = True

                    break

            # ----------------------------------------------------
            # AGRUPACIONES
            # ----------------------------------------------------

            for d in (
                self.role_connections,
                self.module_connections,
                self.group_connections,
            ):

                for key in list(
                    d.keys()
                ):

                    d[key].discard(
                        websocket
                    )

                    if not d[key]:

                        del d[key]

        return (
            usuario_id,
            era_ultima,
        )


    # ============================================================
    # USUARIOS CONECTADOS
    # ============================================================

    def obtener_usuarios_conectados(
        self,
    ) -> List[Dict[str, Any]]:

        with self.lock:

            resultado = []

            for usuario_id, info in (
                self.user_info.items()
            ):

                resultado.append({
                    "id": usuario_id,
                    **info,
                })

            return resultado


    # ============================================================
    # ENVIAR
    # ============================================================

    async def _safe_send(
        self,
        websocket: WebSocket,
        event: RealtimeEvent,
    ):

        try:

            await websocket.send_json(
                event.dict()
            )

        except Exception:

            self.disconnect(
                websocket
            )


    # ============================================================
    # BROADCAST GLOBAL
    # ============================================================

    async def broadcast_global(
        self,
        event: RealtimeEvent,
    ):

        for websocket in list(
            self.global_connections
        ):

            await self._safe_send(
                websocket,
                event,
            )


    # ============================================================
    # BROADCAST GLOBAL EXCEPTO SOCKET
    # ============================================================

    async def broadcast_global_except(
        self,
        websocket_excluido: WebSocket,
        event: RealtimeEvent,
    ):

        for websocket in list(
            self.global_connections
        ):

            if websocket is websocket_excluido:

                continue

            await self._safe_send(
                websocket,
                event,
            )


    # ============================================================
    # BROADCAST USUARIO
    # ============================================================

    async def broadcast_usuario(
        self,
        usuario_id: int,
        event: RealtimeEvent,
    ):

        for websocket in list(
            self.user_connections.get(
                usuario_id,
                set(),
            )
        ):

            await self._safe_send(
                websocket,
                event,
            )


    # ============================================================
    # BROADCAST ROL
    # ============================================================

    async def broadcast_rol(
        self,
        rol: str,
        event: RealtimeEvent,
    ):

        for websocket in list(
            self.role_connections.get(
                rol,
                set(),
            )
        ):

            await self._safe_send(
                websocket,
                event,
            )


    # ============================================================
    # BROADCAST MÓDULO
    # ============================================================

    async def broadcast_modulo(
        self,
        modulo: str,
        event: RealtimeEvent,
    ):

        for websocket in list(
            self.module_connections.get(
                modulo,
                set(),
            )
        ):

            await self._safe_send(
                websocket,
                event,
            )


    # ============================================================
    # BROADCAST GRUPO
    # ============================================================

    async def broadcast_grupo(
        self,
        grupo: str,
        event: RealtimeEvent,
    ):

        for websocket in list(
            self.group_connections.get(
                grupo,
                set(),
            )
        ):

            await self._safe_send(
                websocket,
                event,
            )


# ============================================================
# INSTANCIA GLOBAL
# ============================================================

realtime_manager = RealtimeManager()
