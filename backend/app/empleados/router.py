from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
)

from sqlalchemy.orm import Session

import shutil
import os

from backend.app.database import SessionLocal

from backend.app.empleados.schemas import (
    Empleado,
    EmpleadoCreate,
    EmpleadoUpdate,
    LoginEmpleado,
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
    reset_password,
)

from backend.app.seguridad.auditoria.service import (
    obtener_auditoria_empleado,
)

from backend.app.auth.dependencies import get_current_user
from backend.app.auth.permissions import require_perm_modulo
from backend.app.storage import FOTOS_EMPLEADOS_DIR


def _permiso_empleados(accion: str):
    """Exige permiso granular en el módulo Empleados para cada operación."""
    def comprobar(usuario=Depends(get_current_user)):
        require_perm_modulo(usuario, "empleados", accion)
        return usuario
    comprobar.__name__ = f"permiso_empleados_{accion}"
    return comprobar


def _permiso_seguridad(accion: str):
    """Reserva operaciones sensibles a usuarios autorizados por Seguridad."""
    def comprobar(usuario=Depends(get_current_user)):
        require_perm_modulo(usuario, "seguridad", accion)
        return usuario
    comprobar.__name__ = f"permiso_seguridad_{accion}"
    return comprobar


# =========================================================
# ROUTER
# =========================================================

router = APIRouter(
    prefix="/empleados",
    tags=["Empleados"],
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
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("ver")),
):

    return listar_empleados(
        db,
        q=q,
        activo=activo,
    )


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    data: LoginEmpleado,
    db: Session = Depends(get_db),
):

    resultado = login_empleado(
        db,
        data.usuario,
        data.password,
    )

    if not resultado:

        raise HTTPException(
            status_code=401,
            detail="Usuario o contraseña incorrectos",
        )

    return resultado


# =========================================================
# LISTAR EMPLEADOS
# =========================================================

@router.get("/")
def listar(
    q: str | None = None,
    activo: bool | None = None,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("ver")),
):

    return listar_empleados(
        db,
        q=q,
        activo=activo,
    )


# =========================================================
# OBTENER EMPLEADO
# =========================================================

@router.get("/{empleado_id}")
def obtener(
    empleado_id: int,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("ver")),
):

    empleado = obtener_empleado(
        db,
        empleado_id,
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )

    return empleado


# =========================================================
# FICHA COMPLETA DEL EMPLEADO
# =========================================================

@router.get("/{empleado_id}/ficha")
def ficha(
    empleado_id: int,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("ver")),
):

    empleado = obtener_empleado_ficha(
        db,
        empleado_id,
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )

    # La función espera el ID numérico del empleado.
    # Pasar el nombre de usuario provocaba una lista vacía.
    auditoria = obtener_auditoria_empleado(
        db,
        empleado_id,
    )

    return {
        "empleado": empleado,
        "auditoria": auditoria,
    }


# =========================================================
# CREAR EMPLEADO
# =========================================================

@router.post("/")
def crear(
    data: EmpleadoCreate,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("crear")),
):

    try:

        empleado = crear_empleado(
            db,
            data,
        )

        return empleado

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e),
        )


# =========================================================
# EDITAR EMPLEADO
# =========================================================

@router.put("/{empleado_id}")
def editar(
    empleado_id: int,
    data: EmpleadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    empleado = obtener_empleado(db, empleado_id)
    if not empleado:
        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )

    # Si el usuario tiene permiso explícito de edición en Empleados,
    # puede administrar también su propia ficha. Antes se aplicaba siempre
    # la lista limitada de campos propios, descartando silenciosamente
    # es_colaborador cuando un administrador editaba su propia ficha.
    id_usuario = getattr(usuario, "empleado_id", None) or getattr(usuario, "id", None)
    es_ficha_propia = id_usuario is not None and int(id_usuario) == int(empleado_id)

    tiene_permiso_edicion = True
    try:
        require_perm_modulo(usuario, "empleados", "editar")
    except HTTPException as error:
        if error.status_code != 403:
            raise
        tiene_permiso_edicion = False

    if es_ficha_propia and not tiene_permiso_edicion:
        campos_autorizados = {
            "nombre", "apellidos", "dni", "telefono", "email_personal",
            "direccion", "codigo_postal", "poblacion", "provincia",
            "fecha_nacimiento", "alergias", "persona_contacto",
            "telefono_contacto", "observaciones",
        }
        try:
            valores = data.model_dump(exclude_unset=True)
        except AttributeError:
            valores = data.dict(exclude_unset=True)

        for campo, valor in valores.items():
            if campo in campos_autorizados:
                setattr(empleado, campo, valor)

        try:
            db.commit()
            db.refresh(empleado)
        except Exception:
            db.rollback()
            raise
        return empleado

    # Las fichas ajenas siguen requiriendo permiso explícito; si ya se
    # validó arriba no hace falta comprobarlo de nuevo.
    if not tiene_permiso_edicion:
        require_perm_modulo(usuario, "empleados", "editar")
    return editar_empleado(db, empleado_id, data)


@router.delete("/{empleado_id}")
def eliminar(
    empleado_id: int,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("eliminar")),
):

    resultado = eliminar_empleado(
        db,
        empleado_id,
    )

    if not resultado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )

    return {
        "status": "ok",
    }


# =========================================================
# SUBIR FOTO
# =========================================================

@router.post("/{empleado_id}/foto")
def subir_foto(
    empleado_id: int,
    foto: UploadFile = File(...),
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("editar")),
):

    # -----------------------------------------------------
    # COMPROBAR EMPLEADO
    # -----------------------------------------------------

    empleado = obtener_empleado(
        db,
        empleado_id,
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )


    # -----------------------------------------------------
    # COMPROBAR FICHERO
    # -----------------------------------------------------

    MAX_FOTO_BYTES = 5 * 1024 * 1024

    if not foto:

        raise HTTPException(
            status_code=400,
            detail="No se ha recibido ninguna fotografía.",
        )


    if not foto.filename:

        raise HTTPException(
            status_code=400,
            detail="La fotografía no tiene nombre de archivo.",
        )


    # -----------------------------------------------------
    # COMPROBAR EXTENSIÓN
    # -----------------------------------------------------

    extension = os.path.splitext(
        foto.filename
    )[1].lower()


    extensiones_permitidas = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
    }


    if extension not in extensiones_permitidas:

        raise HTTPException(
            status_code=400,
            detail=(
                "Formato de imagen no permitido. "
                "Usa JPG, JPEG, PNG, WEBP o GIF."
            ),
        )


    # Guardar las fotos en el almacenamiento central configurable.
    # En Render debe apuntar a un Persistent Disk para sobrevivir despliegues.
    upload_dir = str(FOTOS_EMPLEADOS_DIR)
    os.makedirs(upload_dir, exist_ok=True)


    # -----------------------------------------------------
    # NOMBRE FINAL
    # -----------------------------------------------------

    filename = (
        f"empleado_{empleado_id}"
        f"{extension}"
    )


    filepath = os.path.join(
        upload_dir,
        filename,
    )


    # -----------------------------------------------------
    # VALIDAR Y GUARDAR NUEVA FOTO
    # -----------------------------------------------------

    try:
        contenido = foto.file.read(MAX_FOTO_BYTES + 1)
        if not contenido:
            raise HTTPException(status_code=400, detail="La fotografía está vacía.")
        if len(contenido) > MAX_FOTO_BYTES:
            raise HTTPException(status_code=413, detail="La fotografía supera el límite de 5 MB.")

        firmas_validas = {
            ".jpg": contenido.startswith(b"\xff\xd8\xff"),
            ".jpeg": contenido.startswith(b"\xff\xd8\xff"),
            ".png": contenido.startswith(b"\x89PNG\r\n\x1a\n"),
            ".gif": contenido.startswith((b"GIF87a", b"GIF89a")),
            ".webp": (
                len(contenido) >= 12
                and contenido.startswith(b"RIFF")
                and contenido[8:12] == b"WEBP"
            ),
        }
        if not firmas_validas.get(extension, False):
            raise HTTPException(
                status_code=415,
                detail="El contenido del archivo no coincide con el formato de imagen declarado.",
            )

        with open(filepath, "wb") as buffer:
            buffer.write(contenido)

    except HTTPException:
        raise
    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "No se pudo guardar la fotografía: "
                f"{exc}"
            ),
        )


    # -----------------------------------------------------
    # ELIMINAR FOTOS ANTIGUAS DEL MISMO EMPLEADO
    #
    # Se hace DESPUÉS de guardar la nueva.
    # -----------------------------------------------------

    extensiones_anteriores = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".gif",
    }


    for ext in extensiones_anteriores:

        archivo_anterior = os.path.join(
            upload_dir,
            f"empleado_{empleado_id}{ext}",
        )

        if (
            archivo_anterior != filepath
            and os.path.exists(
                archivo_anterior
            )
        ):

            try:

                os.remove(
                    archivo_anterior
                )

            except Exception:

                pass


    # -----------------------------------------------------
    # GUARDAR REFERENCIA EN BD
    #
    # Guardamos solamente el nombre.
    #
    # Ejemplo:
    #
    # empleado_1.png
    #
    # La URL pública será:
    #
    # /api/fotos/empleados/empleado_1.png
    # -----------------------------------------------------

    empleado.foto = filename


    try:

        db.commit()

        db.refresh(
            empleado
        )

    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "La fotografía se guardó en disco, "
                "pero no se pudo actualizar el empleado: "
                f"{exc}"
            ),
        )


    # -----------------------------------------------------
    # URL PÚBLICA
    # -----------------------------------------------------

    foto_url = (
        f"/api/fotos/empleados/{filename}"
    )


    return {
        "status": "ok",
        "foto": filename,
        "foto_url": foto_url,
        "fotoUrl": foto_url,
    }


# =========================================================
# OBTENER FOTO
# =========================================================

@router.get("/{empleado_id}/foto")
def obtener_foto(
    empleado_id: int,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("ver")),
):

    empleado = obtener_empleado(
        db,
        empleado_id,
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )


    filename = (
        empleado.foto
        if isinstance(
            empleado.foto,
            str,
        )
        else None
    )


    if not filename:

        return {
            "foto": None,
            "foto_url": None,
        }


    # -----------------------------------------------------
    # COMPATIBILIDAD
    #
    # Si en BD ya hubiera una ruta antigua como:
    #
    # /api/fotos/empleados/empleado_1.png
    #
    # extraemos solamente el nombre.
    # -----------------------------------------------------

    filename = os.path.basename(
        filename
    )


    foto_url = (
        f"/api/fotos/empleados/{filename}"
    )


    return {
        "foto": filename,
        "foto_url": foto_url,
        "fotoUrl": foto_url,
    }


# =========================================================
# ACTUALIZAR MÓDULOS VISIBLES
# =========================================================

@router.put("/{empleado_id}/modulos")
def actualizar_modulos(
    empleado_id: int,
    modulos_visibles_list: list,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_empleados("editar")),
):

    empleado = actualizar_modulos_visibles(
        db,
        empleado_id,
        modulos_visibles_list,
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )

    return empleado


# =========================================================
# ACTUALIZAR PERMISOS DE MÓDULOS
# =========================================================

@router.put("/{empleado_id}/permisos")
def actualizar_permisos(
    empleado_id: int,
    permisos_modulo_dict: dict,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_seguridad("editar")),
):

    empleado = actualizar_permisos_modulo(
        db,
        empleado_id,
        permisos_modulo_dict,
    )

    if not empleado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )

    return empleado


# =========================================================
# HABILITAR / DESHABILITAR COLABORADOR DE APODERAGEST
# =========================================================

@router.put("/{empleado_id}/colaborador-apoderagest")
def actualizar_colaborador_apoderagest(
    empleado_id: int,
    data: dict,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_seguridad("editar")),
):
    """
    Cambia únicamente la condición de colaborador de ApoderaGest.
    La operación queda restringida al permiso de edición de Seguridad.
    """
    if not isinstance(data, dict) or not isinstance(data.get("es_colaborador"), bool):
        raise HTTPException(
            status_code=400,
            detail="Indica es_colaborador con un valor booleano.",
        )

    empleado = obtener_empleado(db, empleado_id)
    if not empleado:
        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )

    empleado.es_colaborador = data["es_colaborador"]
    try:
        db.commit()
        db.refresh(empleado)
    except Exception:
        db.rollback()
        raise

    return {
        "status": "ok",
        "empleado_id": empleado.id,
        "es_colaborador": bool(empleado.es_colaborador),
    }


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/{empleado_id}/reset-password")
def resetear_password(
    empleado_id: int,
    db: Session = Depends(get_db),
    _usuario=Depends(_permiso_seguridad("editar")),
):

    resultado = reset_password(
        db,
        empleado_id,
    )

    if not resultado:

        raise HTTPException(
            status_code=404,
            detail="Empleado no encontrado",
        )

    return resultado
