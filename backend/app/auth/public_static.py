import posixpath

from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class PublicStaticFiles(StaticFiles):
    """Sirve archivos estáticos públicos, excepto fotografías personales."""

    async def get_response(self, path: str, scope):
        # Normalizar separadores y segmentos antes de comprobar la zona privada.
        # Starlette también normaliza los segmentos al resolver el fichero; si no
        # lo hacemos aquí, rutas como ./fotos/... o x/../fotos/... podrían eludir
        # el bloqueo del montaje público.
        ruta = posixpath.normpath("/" + path.replace("\\", "/")).lstrip("/")
        primer_segmento = ruta.split("/", 1)[0].casefold()

        # Evitar que el montaje general /static exponga archivos privados
        # aunque se haya retirado un montaje específico más profundo.
        if primer_segmento in {"fotos", "mensajes"}:
            raise HTTPException(status_code=404, detail="Not found")

        return await super().get_response(path, scope)
