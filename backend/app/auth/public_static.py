```python
from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class PublicStaticFiles(StaticFiles):
    """
    Sirve archivos estáticos públicos, excepto fotografías personales.

    Las fotografías bajo /static/fotos/ deben servirse mediante
    una ruta protegida por autenticación, no mediante este montaje.
    """

    async def get_response(self, path: str, scope):
        ruta = path.replace("\\", "/").lstrip("/")
        primer_segmento = ruta.split("/", 1)[0].casefold()

        if primer_segmento == "fotos":
            raise HTTPException(
                status_code=404,
                detail="Not found",
            )

        return await super().get_response(path, scope)
```
