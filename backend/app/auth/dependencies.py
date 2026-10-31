from typing import Optional

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
import jwt

from backend.app.config import settings
from backend.app.database import get_db
from backend.app.empleados.models import Empleado


# ============================================================
# AUTENTICACIÓN BEARER PARA SWAGGER Y CLIENTES HTTP
# ============================================================
#
# El endpoint /api/auth/login devuelve el JWT dentro de la clave
# JSON "token"; no implementa el flujo OAuth2 de formulario.
# Por ello usamos HTTPBearer: Swagger muestra un cuadro sencillo
# donde se pega el JWT y añade la cabecera Authorization.
#
# En Swagger: Authorize -> pegar SOLO el JWT, sin escribir
# "Bearer " delante (Swagger construye esa parte).
# ============================================================

# auto_error=False permite normalizar el contrato HTTP: una petición sin
# credenciales debe recibir 401 (no el 403 que HTTPBearer genera por defecto).
bearer_scheme = HTTPBearer(auto_error=False)


def obtener_token_bearer(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """Extrae el JWT y devuelve 401 uniforme si falta o no es Bearer."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Autenticación requerida",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


# Alias por compatibilidad con módulos antiguos que importasen
# oauth2_scheme. El retorno ahora es el JWT como string, igual que
# antes, gracias a obtener_token_bearer.
oauth2_scheme = bearer_scheme


# ============================================================
# OBTENER USUARIO ACTUAL — COMPATIBILIDAD
# ============================================================
#
# Esta función devuelve un DICT. Se conserva por compatibilidad
# con módulos del ERP que ya consumen esta estructura.
# ============================================================

def obtener_usuario_actual(
    token: str = Depends(obtener_token_bearer),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
        )

        empleado_id = payload.get("id")
        if not empleado_id:
            raise HTTPException(status_code=401, detail="Token inválido")

        empleado = (
            db.query(Empleado)
            .filter(Empleado.id == empleado_id)
            .first()
        )
        if not empleado:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")

        if hasattr(empleado, "activo") and empleado.activo is False:
            raise HTTPException(status_code=401, detail="Usuario inactivo")

        modulos = (
            empleado.modulos_visibles_list
            if isinstance(empleado.modulos_visibles_list, list)
            else []
        )
        permisos = (
            empleado.permisos_modulo_dict
            if isinstance(empleado.permisos_modulo_dict, dict)
            else {}
        )

        nombre = (getattr(empleado, "nombre", None) or "").strip()
        apellidos = (getattr(empleado, "apellidos", None) or "").strip()
        nombre_completo = " ".join(parte for parte in (nombre, apellidos) if parte)

        return {
            "id": empleado.id,
            "empleado_id": empleado.id,
            "nombre": nombre,
            "apellidos": apellidos,
            "nombre_completo": nombre_completo,
            "usuario": empleado.usuario or "",
            "rol_id": empleado.rol_id,
            "rol_nombre": empleado.rol.nombre if empleado.rol else None,
            "modulos_visibles": modulos,
            "permisos_modulo": permisos,
        }

    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception as e:
        # Un fallo temporal de base de datos no significa que el JWT sea inválido.
        # No devolver 401 evita que Axios borre la sesión por saturación del pool.
        print(f"ERROR AUTENTICACIÓN / BASE DE DATOS: {e}", flush=True)
        raise HTTPException(
            status_code=503,
            detail="El servicio de autenticación no está disponible temporalmente. Inténtalo de nuevo.",
        )


# ============================================================
# GET CURRENT USER — OBJETO SQLALCHEMY
# ============================================================
#
# Devuelve el objeto Empleado real para las rutas que requieren
# acceder a sus atributos/relaciones. No concede permisos por rol:
# los permisos del módulo se siguen comprobando en permissions.py.
# ============================================================

def get_current_user(
    token: str = Depends(obtener_token_bearer),
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.ALGORITHM],
        )

        empleado_id = payload.get("id")
        if not empleado_id:
            raise HTTPException(status_code=401, detail="Token inválido")

        empleado = (
            db.query(Empleado)
            .filter(Empleado.id == empleado_id)
            .first()
        )
        if not empleado:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")

        if hasattr(empleado, "activo") and empleado.activo is False:
            raise HTTPException(status_code=401, detail="Usuario inactivo")

        return empleado

    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception as e:
        # Un fallo temporal de base de datos no significa que el JWT sea inválido.
        # No devolver 401 evita que Axios borre la sesión por saturación del pool.
        print(f"ERROR AUTENTICACIÓN / BASE DE DATOS: {e}", flush=True)
        raise HTTPException(
            status_code=503,
            detail="El servicio de autenticación no está disponible temporalmente. Inténtalo de nuevo.",
        )
