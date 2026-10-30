import pytest
from fastapi import HTTPException
from types import SimpleNamespace

from backend.app.auth.permissions import require_perm_modulo


def test_permiso_explicito_de_modulo_y_accion_se_acepta():
    usuario = SimpleNamespace(permisos_modulo_dict={"expedientes": ["ver", "editar"]})
    assert require_perm_modulo(usuario, "expedientes", "editar") is True


def test_permiso_ausente_se_rechaza_con_403():
    usuario = SimpleNamespace(permisos_modulo_dict={"expedientes": ["ver"]})
    with pytest.raises(HTTPException) as error:
        require_perm_modulo(usuario, "expedientes", "editar")
    assert error.value.status_code == 403


def test_los_comodines_no_sustituyen_el_permiso_explicito():
    usuario = SimpleNamespace(permisos_modulo_dict={"*": ["*"], "expedientes.*": ["editar"]})
    with pytest.raises(HTTPException) as error:
        require_perm_modulo(usuario, "expedientes", "editar")
    assert error.value.status_code == 403
