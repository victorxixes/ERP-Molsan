from backend.app.Utilidades.importadores.clasificacion_postfirma import (
    clasificar_tipo_operacion,
    normalizar_tipo_operacion,
)


def test_solo_cancelacion_sin_provision_va_a_sin_provision():
    assert clasificar_tipo_operacion("Cancelación sin provision") == "sin_provision"
    assert clasificar_tipo_operacion("CANCELACION SIN PROVISION") == "sin_provision"
    assert clasificar_tipo_operacion("  Cancelación   sin provisión  ") == "sin_provision"


def test_cancelacion_y_cualquier_otro_tipo_van_a_con_provision():
    assert clasificar_tipo_operacion("CANCELACIÓN") == "con_provision"
    assert clasificar_tipo_operacion("Cancelación con provisión") == "con_provision"
    assert clasificar_tipo_operacion("OTROS TIPOS") == "con_provision"
    assert clasificar_tipo_operacion("") == "con_provision"
    assert clasificar_tipo_operacion(None) == "con_provision"


def test_normalizacion_no_inventa_tipoconcepto_ni_idpago():
    assert normalizar_tipo_operacion("Cancelación sin provision") == "cancelacionsinprovision"
