import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.auth.permissions import require_perm_modulo


class PermissionContractTests(unittest.TestCase):
    def test_permiso_explicito_de_modulo_y_accion_se_acepta(self):
        usuario = SimpleNamespace(permisos_modulo_dict={"expedientes": ["ver", "editar"]})
        self.assertTrue(require_perm_modulo(usuario, "expedientes", "editar"))

    def test_permiso_ausente_se_rechaza_con_403(self):
        usuario = SimpleNamespace(permisos_modulo_dict={"expedientes": ["ver"]})
        with self.assertRaises(HTTPException) as error:
            require_perm_modulo(usuario, "expedientes", "editar")
        self.assertEqual(error.exception.status_code, 403)

    def test_los_comodines_no_sustituyen_el_permiso_explicito(self):
        usuario = SimpleNamespace(permisos_modulo_dict={"*": ["*"], "expedientes.*": ["editar"]})
        with self.assertRaises(HTTPException) as error:
            require_perm_modulo(usuario, "expedientes", "editar")
        self.assertEqual(error.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
