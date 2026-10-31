from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.auth.dependencies import get_current_user

router = APIRouter(
    dependencies=[Depends(get_current_user)],prefix="/catalogos-absis", tags=["Catálogo ABSIS"])


class EntradaCatalogo(BaseModel):
    categoria: str = Field(min_length=1, max_length=100)
    valor: str = Field(default="", max_length=300)
    codigo: str | None = Field(default=None, max_length=40)
    descripcion: str = Field(default="", max_length=2000)
    activo: bool = True


def serializar(fila):
    return {
        "id": fila["id"],
        "categoria": fila["categoria"],
        "valor": fila["valor"],
        "codigo": fila["codigo"],
        "descripcion": fila["descripcion"] or "",
        "activo": fila["activo"],
    }


class NuevaCategoria(BaseModel):
    categoria: str = Field(min_length=1, max_length=100)


def asegurar_tabla_categorias(db: Session):
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS public.catalogos_absis_categorias (
            id BIGSERIAL PRIMARY KEY,
            categoria VARCHAR(100) NOT NULL UNIQUE,
            creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    db.commit()


@router.get("/categorias")
def listar_categorias(db: Session = Depends(get_db)):
    asegurar_tabla_categorias(db)
    filas = db.execute(text("""
        SELECT categoria FROM public.catalogos_absis_categorias
        UNION
        SELECT DISTINCT categoria FROM public.catalogos_absis
        ORDER BY categoria
    """)).scalars().all()
    return filas


@router.post("/categorias")
def crear_categoria(datos: NuevaCategoria, db: Session = Depends(get_db)):
    asegurar_tabla_categorias(db)
    categoria = datos.categoria.strip()
    if not categoria:
        raise HTTPException(status_code=400, detail="El nombre de la lista es obligatorio.")
    existente = db.execute(text("""
        SELECT categoria FROM public.catalogos_absis_categorias
        WHERE LOWER(categoria) = LOWER(:categoria)
        UNION
        SELECT categoria FROM public.catalogos_absis
        WHERE LOWER(categoria) = LOWER(:categoria)
        LIMIT 1
    """), {"categoria": categoria}).first()
    if existente:
        raise HTTPException(status_code=409, detail="Ya existe una lista con ese nombre.")
    db.execute(text("""
        INSERT INTO public.catalogos_absis_categorias (categoria)
        VALUES (:categoria)
    """), {"categoria": categoria})
    db.commit()
    return {"categoria": categoria}


@router.get("")
def listar_catalogo(categoria: str | None = None, db: Session = Depends(get_db)):
    consulta = """
        SELECT id, categoria, valor, codigo, descripcion, activo
        FROM catalogos_absis
    """
    parametros = {}
    if categoria:
        consulta += " WHERE categoria = :categoria"
        parametros["categoria"] = categoria
    consulta += " ORDER BY categoria, COALESCE(codigo, ''), valor, id"
    filas = db.execute(text(consulta), parametros).mappings().all()
    return [serializar(fila) for fila in filas]


@router.post("")
def crear_entrada(datos: EntradaCatalogo, db: Session = Depends(get_db)):
    categoria = datos.categoria.strip()
    valor = datos.valor.strip()
    codigo = datos.codigo.strip() if datos.codigo and datos.codigo.strip() else None
    descripcion = datos.descripcion.strip()
    if not categoria:
        raise HTTPException(status_code=400, detail="La categoría es obligatoria.")
    if not valor and not codigo:
        raise HTTPException(status_code=400, detail="Indica un valor o un código.")
    duplicado = db.execute(
        text("""
            SELECT id FROM catalogos_absis
            WHERE categoria = :categoria
              AND ((:codigo IS NOT NULL AND codigo = :codigo)
                   OR (:codigo IS NULL AND codigo IS NULL AND LOWER(valor) = LOWER(:valor)))
            LIMIT 1
        """),
        {"categoria": categoria, "codigo": codigo, "valor": valor},
    ).first()
    if duplicado:
        raise HTTPException(status_code=409, detail="Ya existe una entrada con ese código o valor en esta categoría.")
    fila = db.execute(
        text("""
            INSERT INTO catalogos_absis (categoria, valor, codigo, descripcion, activo)
            VALUES (:categoria, :valor, :codigo, :descripcion, :activo)
            RETURNING id, categoria, valor, codigo, descripcion, activo
        """),
        {"categoria": categoria, "valor": valor, "codigo": codigo, "descripcion": descripcion, "activo": datos.activo},
    ).mappings().one()
    db.commit()
    return serializar(fila)


@router.put("/{entrada_id}")
def actualizar_entrada(entrada_id: int, datos: EntradaCatalogo, db: Session = Depends(get_db)):
    categoria = datos.categoria.strip()
    valor = datos.valor.strip()
    codigo = datos.codigo.strip() if datos.codigo and datos.codigo.strip() else None
    descripcion = datos.descripcion.strip()
    if not categoria or (not valor and not codigo):
        raise HTTPException(status_code=400, detail="La categoría y un valor o código son obligatorios.")
    actual = db.execute(
        text("SELECT id FROM catalogos_absis WHERE id = :id"),
        {"id": entrada_id},
    ).first()
    if not actual:
        raise HTTPException(status_code=404, detail="Entrada de catálogo no encontrada.")
    duplicado = db.execute(
        text("""
            SELECT id FROM catalogos_absis
            WHERE id <> :id AND categoria = :categoria
              AND ((:codigo IS NOT NULL AND codigo = :codigo)
                   OR (:codigo IS NULL AND codigo IS NULL AND LOWER(valor) = LOWER(:valor)))
            LIMIT 1
        """),
        {"id": entrada_id, "categoria": categoria, "codigo": codigo, "valor": valor},
    ).first()
    if duplicado:
        raise HTTPException(status_code=409, detail="Ya existe otra entrada con ese código o valor en esta categoría.")
    fila = db.execute(
        text("""
            UPDATE catalogos_absis
            SET categoria=:categoria, valor=:valor, codigo=:codigo,
                descripcion=:descripcion, activo=:activo
            WHERE id=:id
            RETURNING id, categoria, valor, codigo, descripcion, activo
        """),
        {"id": entrada_id, "categoria": categoria, "valor": valor, "codigo": codigo, "descripcion": descripcion, "activo": datos.activo},
    ).mappings().one()
    db.commit()
    return serializar(fila)


@router.delete("/{entrada_id}")
def eliminar_entrada(entrada_id: int, db: Session = Depends(get_db)):
    resultado = db.execute(
        text("DELETE FROM catalogos_absis WHERE id = :id RETURNING id"),
        {"id": entrada_id},
    ).first()
    if not resultado:
        db.rollback()
        raise HTTPException(status_code=404, detail="Entrada de catálogo no encontrada.")
    db.commit()
    return {"ok": True, "id": entrada_id}
