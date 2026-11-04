"""One-time, explicit bootstrap for the first ERP administrator.

Run only after the Alembic schema has been applied to the isolated Preview DB.
Requires a unique password supplied through the process environment; never
ships a default credential and never resets an existing employee.
"""
from __future__ import annotations

import os
import sys

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app.empleados.models import Empleado
from backend.app.empleados.service import hash_password
from backend.app.seguridad.permisos.permisos_router import MODULOS_BASE
from backend.app.seguridad.roles.models import Rol


def main() -> int:
    environment = (os.getenv("MOLSAN_ENVIRONMENT") or "").strip().lower()
    confirmation = (os.getenv("MOLSAN_BOOTSTRAP_ADMIN_CONFIRM") or "").strip()
    if environment != "preview":
        print(
            "ERROR: el bootstrap solo puede ejecutarse con MOLSAN_ENVIRONMENT=preview.",
            file=sys.stderr,
        )
        return 2
    if confirmation != "CREATE_FIRST_ADMIN_IN_PREVIEW":
        print(
            "ERROR: falta MOLSAN_BOOTSTRAP_ADMIN_CONFIRM=CREATE_FIRST_ADMIN_IN_PREVIEW.",
            file=sys.stderr,
        )
        return 2

    username = (os.getenv("MOLSAN_BOOTSTRAP_ADMIN_USERNAME") or "").strip()
    password = os.getenv("MOLSAN_BOOTSTRAP_ADMIN_PASSWORD") or ""
    nombre = (os.getenv("MOLSAN_BOOTSTRAP_ADMIN_NAME") or "Administrador").strip()
    apellidos = (os.getenv("MOLSAN_BOOTSTRAP_ADMIN_SURNAME") or "MOLSAN").strip()
    email = (os.getenv("MOLSAN_BOOTSTRAP_ADMIN_EMAIL") or "").strip() or None

    if not username or len(username) > 100:
        print("ERROR: define MOLSAN_BOOTSTRAP_ADMIN_USERNAME (máximo 100 caracteres).", file=sys.stderr)
        return 2
    if len(password) < 16:
        print("ERROR: MOLSAN_BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 16 caracteres.", file=sys.stderr)
        return 2
    if len(password) > 1024:
        print("ERROR: la contraseña supera el tamaño permitido.", file=sys.stderr)
        return 2

    db: Session = SessionLocal()
    try:
        try:
            revision_actual = db.execute(text("SELECT version_num FROM alembic_version")).scalar()
        except Exception:
            print(
                "ERROR: no se pudo verificar alembic_version; aplica y valida el esquema antes del bootstrap.",
                file=sys.stderr,
            )
            return 3
        if revision_actual != "20261104_0004":
            print(
                "ERROR: el esquema no está en la revisión 20261104_0004; no se ha creado ningún usuario.",
                file=sys.stderr,
            )
            return 3

        total_empleados = db.query(Empleado).count()
        existente = db.query(Empleado).filter(Empleado.usuario == username).first()
        if existente:
            print("ERROR: el usuario indicado ya existe; no se ha cambiado ninguna contraseña.", file=sys.stderr)
            return 3
        if total_empleados:
            print(
                "ERROR: ya existen empleados. El bootstrap inicial solo funciona con la tabla empleados vacía; "
                "no se ha modificado ningún registro.",
                file=sys.stderr,
            )
            return 3

        rol = db.query(Rol).filter(Rol.nombre == "Administrador").first()
        if rol is None:
            rol = Rol(nombre="Administrador", descripcion="Administrador inicial del ERP MOLSAN.")
            db.add(rol)
            db.flush()

        permisos = {
            modulo: ["ver", "crear", "editar", "eliminar"]
            for modulo in MODULOS_BASE
        }
        admin = Empleado(
            nombre=nombre or "Administrador",
            apellidos=apellidos or "MOLSAN",
            email_empresa=email,
            usuario=username,
            password=hash_password(password),
            rol=rol,
            activo=True,
            visible_en_listado=True,
            modulos_visibles_list=list(MODULOS_BASE),
            permisos_modulo_dict=permisos,
            es_colaborador=False,
            honorarios_valor=0,
            notarias_encargagest_ids=[],
            reparto_actividades_json=[],
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"OK: administrador inicial creado (id={admin.id}, usuario={username}).")
        print("La contraseña no se ha mostrado ni guardado en el repositorio.")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
