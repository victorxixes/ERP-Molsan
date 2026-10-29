"""Pruebas de seguridad de rutas y montaje del almacenamiento persistente."""
import unittest
from pathlib import Path
from unittest.mock import patch

from backend.app.storage import _validate_persistent_root, resolve_storage_paths


class StoragePathTests(unittest.TestCase):
    def test_rejects_storage_override_outside_root(self):
        with self.assertRaises(ValueError):
            resolve_storage_paths(
                "/tmp/molsan-test",
                {"MENSAJES_DIR": "/tmp/other-location"},
            )

    def test_persistent_mode_rejects_unmounted_var_data(self):
        with patch("backend.app.storage.os.path.ismount", return_value=False):
            with self.assertRaisesRegex(RuntimeError, "no parece ser un punto de montaje"):
                _validate_persistent_root(Path("/var/data/molsan"))

    def test_persistent_mode_accepts_root_inside_mounted_var_data(self):
        with patch("backend.app.storage.os.path.ismount", return_value=True):
            _validate_persistent_root(Path("/var/data/molsan"))


if __name__ == "__main__":
    unittest.main()
