import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, constr
from sqlalchemy import text
from sqlalchemy.orm import Session
import jwt
from backend.app.auth.dependencies import obtener_token_bearer
from backend.app.config import settings
from backend.app.ctn.models import Notaria
from backend.app.database import engine, get_db
from backend.app.expedientes.models import Expediente

router = APIRouter(prefix='/notargest', tags=['NotarGest'])

class LoginNotario(BaseModel):
    usuario: constr(min_length=3, max_length=50)
    password: constr(min_length=1, max_length=128)

class CambioPassword(BaseModel):
    password_actual: constr(min_length=1, max_length=128)
    password_nueva: constr(min_length=10, max_length=128)

def normalizar_nif(valor):
    return ''.join((valor or '').upper().split()).replace('-', '')

def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    rounds = 310000
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), rounds).hex()
    return 'pbkdf2_sha256$' + str(rounds) + '$' + salt + '$' + digest

def verificar_password(password, stored):
    try:
        algorithm, rounds, salt, expected = stored.split('$', 3)
        if algorithm != 'pbkdf2_sha256': return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(rounds)).hex()
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False

@router.on_event('startup')
def migrar_notargest():
    with engine.begin() as conn:
        conn.execute(text('ALTER TABLE ctn_notarios ADD COLUMN IF NOT EXISTS notargest_habilitado BOOLEAN NOT NULL DEFAULT FALSE'))
        conn.execute(text('ALTER TABLE ctn_notarios ADD COLUMN IF NOT EXISTS notargest_password_hash VARCHAR(255)'))
        conn.execute(text('ALTER TABLE ctn_notarios ADD COLUMN IF NOT EXISTS notargest_cambiar_password BOOLEAN NOT NULL DEFAULT TRUE'))

def get_notario(token=Depends(obtener_token_bearer), db: Session=Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        if payload.get('tipo') != 'notargest' or not payload.get('notaria_id'): raise HTTPException(status_code=401, detail='Sesión NotarGest inválida')
        n = db.query(Notaria).filter(Notaria.id == int(payload['notaria_id'])).first()
        if not n or not n.notargest_habilitado: raise HTTPException(status_code=403, detail='Acceso NotarGest deshabilitado')
        return n
    except HTTPException: raise
    except jwt.ExpiredSignatureError: raise HTTPException(status_code=401, detail='La sesión ha caducado')
    except Exception: raise HTTPException(status_code=401, detail='Sesión NotarGest inválida')

@router.post('/login')
def login(data: LoginNotario, db: Session=Depends(get_db)):
    nif = normalizar_nif(data.usuario)
    n = db.query(Notaria).filter(text("upper(replace(replace(nif, ' ', ''), '-', '')) = :nif")).params(nif=nif).first()
    if not n or not n.notargest_habilitado: raise HTTPException(status_code=401, detail='Acceso no habilitado. Contacta con Molsan.')
    if n.notargest_password_hash:
        valido = verificar_password(data.password, n.notargest_password_hash)
    else:
        # Primer acceso: el usuario y la contraseña inicial son el CIF/NIF completo,
        # incluida la letra. Se normalizan espacios, guiones y mayúsculas/minúsculas.
        valido = hmac.compare_digest(normalizar_nif(data.password), nif)
        if valido:
            # Guardar la versión canónica evita que el primer acceso con letra
            # minúscula provoque que el siguiente acceso con mayúscula falle.
            n.notargest_password_hash = hash_password(nif)
            n.notargest_cambiar_password = True
            db.commit()
    if not valido: raise HTTPException(status_code=401, detail='Credenciales incorrectas')
    token = jwt.encode({'tipo':'notargest','notaria_id':n.id,'exp':datetime.utcnow()+timedelta(hours=8)}, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return {'token':token,'requiere_cambio_password':bool(n.notargest_cambiar_password),'notario':{'id':n.id,'nombre':' '.join(x for x in [n.nombre,n.apellidos] if x),'nif':n.nif}}

@router.get('/me')
def me(n=Depends(get_notario)):
    return {'id':n.id,'nombre':' '.join(x for x in [n.nombre,n.apellidos] if x),'nif':n.nif,'requiere_cambio_password':bool(n.notargest_cambiar_password)}

@router.post('/cambiar-password')
def cambiar_password(data: CambioPassword, n=Depends(get_notario), db: Session=Depends(get_db)):
    if not n.notargest_password_hash or not verificar_password(data.password_actual,n.notargest_password_hash): raise HTTPException(status_code=400,detail='La contraseña actual no es correcta')
    if normalizar_nif(data.password_nueva)==normalizar_nif(n.nif or ''): raise HTTPException(status_code=400,detail='La nueva contraseña no puede ser el DNI/NIF')
    n.notargest_password_hash=hash_password(data.password_nueva); n.notargest_cambiar_password=False; db.commit()
    return {'ok':True,'mensaje':'Contraseña actualizada'}

@router.get('/expedientes')
def mis_expedientes(n=Depends(get_notario), db: Session=Depends(get_db)):
    nombre=' '.join(x for x in [n.nombre,n.apellidos] if x).strip()
    if not hasattr(Expediente,'nombre_notario'): return {'items':[],'total':0}
    filas=db.query(Expediente).filter(Expediente.nombre_notario==nombre).order_by(Expediente.id.desc()).limit(500).all()
    items=[]
    for e in filas:
        items.append({'id':getattr(e,'id',None),'numero_expediente':getattr(e,'numero_expediente',None) or getattr(e,'expediente',None) or getattr(e,'id',None),'titular':getattr(e,'nombre_titular',None) or getattr(e,'titular',None),'estado':getattr(e,'estado_expediente',None) or getattr(e,'estado',None),'actividad_actual':getattr(e,'actividad_actual',None),'fecha_envio_notario':str(getattr(e,'fecha_envio_notario','') or ''),'fecha_firma':str(getattr(e,'fecha_firma','') or '')})
    return {'items':items,'total':len(items)}
