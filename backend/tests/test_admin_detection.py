from types import SimpleNamespace

from backend.app.expedientes.reparto import usuario_admin_expedientes


def test_rol_tecnico_cero_se_reconoce_como_administrador():
    usuario = SimpleNamespace(
        usuario="usuario-interno",
        rol_id=0,
        rol=None,
        permisos_modulo_dict={},
    )
    assert usuario_admin_expedientes(usuario) is True


def test_nombre_de_usuario_admin_se_reconoce_como_administrador():
    usuario = SimpleNamespace(
        usuario=" ADMIN ",
        rol_id=7,
        rol=None,
        permisos_modulo_dict={},
    )
    assert usuario_admin_expedientes(usuario) is True


def test_flag_administrativo_explicito_se_reconoce():
    usuario = SimpleNamespace(
        usuario="usuario-interno",
        rol_id=7,
        rol=None,
        es_admin=True,
        permisos_modulo_dict={},
    )
    assert usuario_admin_expedientes(usuario) is True


def test_permiso_explicito_de_seguridad_editar_se_reconoce():
    usuario = SimpleNamespace(
        usuario="usuario-interno",
        rol_id=7,
        rol=None,
        permisos_modulo_dict={"seguridad": ["ver", "editar"]},
    )
    assert usuario_admin_expedientes(usuario) is True


def test_usuario_sin_rol_ni_permiso_administrativo_no_se_reconoce():
    usuario = SimpleNamespace(
        usuario="usuario-interno",
        rol_id=7,
        rol=SimpleNamespace(nombre="Gestor"),
        permisos_modulo_dict={},
    )
    assert usuario_admin_expedientes(usuario) is False
