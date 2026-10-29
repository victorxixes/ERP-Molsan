from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class PublicStaticFiles(StaticFiles):
    """Sirve archivos estáticos públicos, excepto fotografías personales."""

    async def get_response(self, path: str, scope):
        ruta = path.replace("\\", "/").lstrip("/")
        primer_segmento = ruta.split("/", 1)[0].casefold()

        # Evitar que el montaje general /static exponga archivos privados
        # aunque se haya retirado un montaje específico más profundo.
        if primer_segmento in {"fotos", "mensajes"}:
            raise HTTPException(status_code=404, detail="Not found")

        return await super().get_response(path, scope)
