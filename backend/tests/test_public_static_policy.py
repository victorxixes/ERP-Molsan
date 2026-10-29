"""No exponer adjuntos privados desde el montaje estático general."""
import tempfile
import unittest

from starlette.exceptions import HTTPException

from backend.app.auth.public_static import PublicStaticFiles


class PublicStaticFilesPolicyTests(unittest.IsolatedAsyncioTestCase):
    async def test_private_photo_and_message_paths_return_404(self):
        with tempfile.TemporaryDirectory() as directory:
            static = PublicStaticFiles(directory=directory)
            for path in (
                "fotos/empleados/empleado_4.jpg",
                "mensajes/adjunto.pdf",
                r"mensajes\adjunto.pdf",
            ):
                with self.subTest(path=path):
                    with self.assertRaises(HTTPException) as caught:
                        await static.get_response(
                            path,
                            {"type": "http", "method": "GET", "headers": []},
                        )
                    self.assertEqual(caught.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
