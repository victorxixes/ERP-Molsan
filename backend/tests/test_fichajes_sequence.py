"""Regresión de transiciones de jornada y pausas en Fichajes."""
import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from backend.app.fichajes.router import _validar_secuencia_marcaje


def marca(tipo):
    return SimpleNamespace(tipo=tipo)


class FichajesSequenceTests(unittest.TestCase):
    def assert_conflict(self, ultimo, ultimo_jornada, tipo):
        with self.assertRaises(HTTPException) as caught:
            _validar_secuencia_marcaje(ultimo, ultimo_jornada, tipo)
        self.assertEqual(caught.exception.status_code, 409)

    def test_duplicate_entry_is_rejected(self):
        self.assert_conflict(marca("ENTRADA"), marca("ENTRADA"), "ENTRADA")

    def test_exit_requires_an_open_workday(self):
        self.assert_conflict(marca("SALIDA"), marca("SALIDA"), "SALIDA")
        self.assert_conflict(None, None, "SALIDA")

    def test_meal_pause_requires_open_workday(self):
        self.assert_conflict(None, marca("SALIDA"), "PAUSA_COMIDA_INICIO")

    def test_meal_pause_must_be_closed_with_matching_return(self):
        self.assert_conflict(
            marca("PAUSA_COMIDA_INICIO"),
            marca("ENTRADA"),
            "PAUSA_DESAYUNO_FIN",
        )
        _validar_secuencia_marcaje(
            marca("PAUSA_COMIDA_INICIO"),
            marca("ENTRADA"),
            "PAUSA_COMIDA_FIN",
        )

    def test_historical_absence_requires_return_before_next_movement(self):
        self.assert_conflict(
            marca("AUSENCIA"),
            marca("ENTRADA"),
            "PAUSA_COMIDA_INICIO",
        )
        _validar_secuencia_marcaje(
            marca("AUSENCIA"),
            marca("ENTRADA"),
            "RETORNO_AUSENCIA",
        )

    def test_new_punctual_absence_does_not_open_a_pause(self):
        _validar_secuencia_marcaje(
            marca("AUSENCIA_PUNTUAL"),
            marca("SALIDA"),
            "ENTRADA",
        )

    def test_open_pause_can_be_closed_by_exit(self):
        _validar_secuencia_marcaje(
            marca("PAUSA_COMIDA_INICIO"),
            marca("ENTRADA"),
            "SALIDA",
        )


if __name__ == "__main__":
    unittest.main()
