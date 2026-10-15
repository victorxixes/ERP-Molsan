from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.schemas import LoginRequest
from backend.app.empleados.service import login_empleado
from backend.app.seguridad.auditoria.service import registrar_auditoria
from backend.app.seguridad.logs.service import registrar_log
from backend.app.auth.route_guard import registrar_guard_global

# Instala una protección JWT global para las rutas HTTP /api.
# Se ejecutará al arrancar, cuando todos los routers ya estén registrados.
registrar_guard_global()

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post("/login")
def login(
    data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    ip = request.client.host if request.client else None

    resultado = login_empleado(
        db,
        data.usuario,
        data.password,
    )

    if not resultado:
        registrar_log(
            db=db,
            evento="login_error",
            detalle=f"Credenciales incorrectas para {data.usuario}",
            ip=ip,
        )
        registrar_auditoria(
            db=db,
            usuario=data.usuario,
            modulo="auth",
            accion="login_error",
            descripcion="Credenciales incorrectas",
            ip=ip,
        )
        raise HTTPException(
            status_code=401,
            detail="Credenciales incorrectas",
        )

    empleado = resultado["empleado"]
    token = resultado["token"]

    registrar_log(
        db=db,
        evento="login_success",
        detalle=f"Inicio de sesión correcto para {data.usuario}",
        ip=ip,
    )
    registrar_auditoria(
        db=db,
        usuario=data.usuario,
        modulo="auth",
        accion="login",
        descripcion="Inicio de sesión",
        ip=ip,
    )

    return {
        "token": token,
        "empleado": empleado,
    }
