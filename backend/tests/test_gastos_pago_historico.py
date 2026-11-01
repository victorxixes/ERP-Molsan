"""Regresión: los pagos nuevos no deben reinterpretar pagos históricos sin conciliar."""
import unittest

from fastapi import HTTPException

from backend.app.expedientes.gastos.router import _validar_pago_historico_conciliado


class PagoHistoricoConciliacionTests(unittest.TestCase):
    def test_rechaza_gasto_historico_pagado_sin_movimientos(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_pago_historico_conciliado("Pagado", False)
        self.assertEqual(caught.exception.status_code, 409)

    def test_rechaza_alias_historico_pagada_sin_movimientos(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_pago_historico_conciliado(" PAGADA ", False)
        self.assertEqual(caught.exception.status_code, 409)

    def test_permite_gasto_pagado_con_movimientos_conciliados(self):
        _validar_pago_historico_conciliado("Pagado", True)

    def test_permite_gasto_pendiente_sin_movimientos(self):
        _validar_pago_historico_conciliado("Pendiente", False)

    def test_permite_estado_ausente_sin_movimientos(self):
        _validar_pago_historico_conciliado(None, False)


if __name__ == "__main__":
    unittest.main()
