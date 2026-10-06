from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File
)

from sqlalchemy.orm import Session

import shutil
import os

from backend.app.database import SessionLocal

from backend.app.empleados.schemas import (
    Empleado,
    EmpleadoCreate,
    EmpleadoUpdate,
    LoginEmpleado
)

from backend.app.empleados.service import (
    listar_empleados,
    crear_empleado,
    editar_empleado,
    eliminar_empleado,
    obtener_empleado,
    obtener_empleado_ficha,
    login_empleado,
    actualizar_modulos_visibles,
    actualizar_permisos_modulo,
    reset_password
)

from backend.app.seguridad.auditoria.service import (
    obtener_auditoria_empleado
)


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/empleados",
    tags=["Empleados"]
)


# =========================================================
# DATABASE
# =========================================================

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


# =========================================================
# BUSCAR EMPLEADOS
# =========================================================

@router.get("/search")
def search_empleados(
    q: str | None = None,
    activo: bool | None = None,
    db: Session = Depends(get_db)
):

    return listar_empleados(
        db,
        q=q,
        activo=activo
    )


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    data: LoginEmpleado,
    db: Session = Depends(get_db)
):

    resultado = login_empleado(
        db,
        data.usuario,
        data.password
    )

    if not resultado:

        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos"
        )

    return resultado


# =========================================================
# LISTAR EMPLEADOS
# =========================================================

@router.get("/")
def listar(
    q: str | None = None,
    activo: bool | None = None,
    db: Session = Depends(get_db)
):

    return listar_empleados(
        db,
        q=q,
        activo=activo
    )


# =========================================================
# OBTENER EMPLEADO
# =========================================================

@router.get("/{empleado_id}")
def obtener(
    empleado_id: int,
    db: Session = Depends(get_db)
):

    empleado = obtener_empleado(
        db,
        empleado_id
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    return empleado


# =========================================================
# FICHA COMPLETA DEL EMPLEADO
#
# IMPORTANTE:
# Esta ruta utiliza obtener_empleado_ficha()
# para devolver también:
#
# - departamento_nombre
# - seccion_nombre
# - cargo_nombre
#
# =========================================================

@router.get("/{empleado_id}/ficha")
def ficha(
    empleado_id: int,
    db: Session = Depends(get_db)
):

    empleado = obtener_empleado_ficha(
        db,
        empleado_id
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    auditoria = obtener_auditoria_empleado(
        db,
        empleado["usuario"]
    )

    return {
        "empleado": empleado,
        "auditoria": auditoria
    }


# =========================================================
# CREAR EMPLEADO
# =========================================================

@router.post("/")
def crear(
    data: EmpleadoCreate,
    db: Session = Depends(get_db)
):

    try:

        empleado = crear_empleado(
            db,
            data
        )

        return empleado

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )


# =========================================================
# EDITAR EMPLEADO
# =========================================================

@router.put("/{empleado_id}")
def editar(
    empleado_id: int,
    data: EmpleadoUpdate,
    db: Session = Depends(get_db)
):

    empleado = editar_empleado(
        db,
        empleado_id,
        data
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    return empleado


# =========================================================
# ELIMINAR EMPLEADO
# =========================================================

@router.delete("/{empleado_id}")
def eliminar(
    empleado_id: int,
    db: Session = Depends(get_db)
):

    resultado = eliminar_empleado(
        db,
        empleado_id
    )

    if not resultado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    return {
        "status": "ok"
    }


# =========================================================
# SUBIR FOTO
# =========================================================

@router.post("/{empleado_id}/foto")
def subir_foto(
    empleado_id: int,
    foto: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    empleado = obtener_empleado(
        db,
        empleado_id
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    # -----------------------------------------------------
    # DIRECTORIO
    # -----------------------------------------------------

    upload_dir = "uploads/empleados"

    os.makedirs(
        upload_dir,
        exist_ok=True
    )

    # -----------------------------------------------------
    # EXTENSIÓN
    # -----------------------------------------------------

    extension = os.path.splitext(
        foto.filename or ""
    )[1]

    if not extension:

        extension = ".jpg"

    filename = (
        f"empleado_{empleado_id}{extension}"
    )

    filepath = os.path.join(
        upload_dir,
        filename
    )

    # -----------------------------------------------------
    # GUARDAR
    # -----------------------------------------------------

    with open(
        filepath,
        "wb"
    ) as buffer:

        shutil.copyfileobj(
            foto.file,
            buffer
        )

    # -----------------------------------------------------
    # GUARDAR REFERENCIA
    # -----------------------------------------------------

    empleado.foto = filename

    db.commit()

    db.refresh(
        empleado
    )

    return {
        "status": "ok",
        "foto": filename
    }


# =========================================================
# OBTENER FOTO
# =========================================================

@router.get("/{empleado_id}/foto")
def obtener_foto(
    empleado_id: int,
    db: Session = Depends(get_db)
):

    empleado = obtener_empleado(
        db,
        empleado_id
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    return {
        "foto": empleado.foto
    }


# =========================================================
# ACTUALIZAR MÓDULOS VISIBLES
# =========================================================

@router.put("/{empleado_id}/modulos")
def actualizar_modulos(
    empleado_id: int,
    modulos_visibles_list: list,
    db: Session = Depends(get_db)
):

    empleado = actualizar_modulos_visibles(
        db,
        empleado_id,
        modulos_visibles_list
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    return empleado


# =========================================================
# ACTUALIZAR PERMISOS DE MÓDULOS
# =========================================================

@router.put("/{empleado_id}/permisos")
def actualizar_permisos(
    empleado_id: int,
    permisos_modulo_dict: dict,
    db: Session = Depends(get_db)
):

    empleado = actualizar_permisos_modulo(
        db,
        empleado_id,
        permisos_modulo_dict
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    return empleado


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/{empleado_id}/reset-password")
def resetear_password(
    empleado_id: int,
    db: Session = Depends(get_db)
):

    resultado = reset_password(
        db,
        empleado_id
    )

    if not resultado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado"
        )

    return resultado
