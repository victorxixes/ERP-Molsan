"""Regression tests for provision tariff selection."""
import unittest
from decimal import Decimal
from types import SimpleNamespace

from fastapi import HTTPException
from backend.app.provisiones.router import _buscar_tarifa, _tarifa_aplicable, _importe_configurable, _validar_motivo_total_manual, _total_garantia_independiente


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class FakeDB:
    def __init__(self, rows):
        self.rows = rows

    def query(self, model):
        return FakeQuery(self.rows)


def tariff(id, tipo="provision", entidad="Banco A", territorio="Península", activo=True, minimo="0", maximo=None):
    return SimpleNamespace(
        id=id, tipo=tipo, entidad=entidad, territorio=territorio, activo=activo,
        capital_minimo=Decimal(minimo),
        capital_maximo=Decimal(maximo) if maximo is not None else None,
    )


class ProvisionTariffSelectionTests(unittest.TestCase):
    def test_type_and_active_filter(self):
        wrong_type = tariff(1, tipo="cancelacion")
        inactive = tariff(2, activo=False)
        valid = tariff(3)
        self.assertIs(
            _buscar_tarifa(FakeDB([wrong_type, inactive, valid]), "provision", "Banco A", Decimal("100")),
            valid,
        )

    def test_territory_filter(self):
        peninsula = tariff(1)
        canarias = tariff(2, territorio="Canarias")
        self.assertIs(
            _buscar_tarifa(FakeDB([peninsula, canarias]), "provision", "Banco A", Decimal("100"), "Canarias"),
            canarias,
        )

    def test_exact_entity_precedes_generic_tariff(self):
        generic = tariff(1, entidad="*")
        exact = tariff(2, entidad="Banco A")
        self.assertIs(_buscar_tarifa(FakeDB([generic, exact]), "provision", "Banco A", Decimal("100")), exact)

    def test_explicit_tariff_must_match_all_constraints(self):
        self.assertFalse(_tarifa_aplicable(tariff(1, activo=False), "provision", "Banco A", Decimal("100"), "Península"))
        self.assertFalse(_tarifa_aplicable(tariff(2, tipo="cancelacion"), "provision", "Banco A", Decimal("100"), "Península"))
        self.assertFalse(_tarifa_aplicable(tariff(3, territorio="Canarias"), "provision", "Banco A", Decimal("100"), "Península"))
        self.assertTrue(_tarifa_aplicable(tariff(4), "provision", "Banco A", Decimal("100"), "Península"))

    def test_explicit_zero_is_not_replaced_by_configured_amount(self):
        self.assertEqual(_importe_configurable(Decimal("0.00"), Decimal("45.00")), Decimal("0.00"))

    def test_omitted_amount_uses_configured_amount(self):
        self.assertEqual(_importe_configurable(None, Decimal("45.00")), Decimal("45.00"))

    def test_manual_total_different_from_components_requires_reason(self):
        with self.assertRaises(HTTPException) as caught:
            _validar_motivo_total_manual(Decimal("100.00"), Decimal("95.00"), "")
        self.assertEqual(caught.exception.status_code, 422)
        _validar_motivo_total_manual(Decimal("100.00"), Decimal("95.00"), "Ajuste autorizado")

    def test_independent_guarantee_total_is_recomputed_from_four_concepts(self):
        garantia = {"notaria": "10.10", "ajd": "2.50", "registro": "3.20", "gestion": "5.00", "total": "999.99"}
        self.assertEqual(_total_garantia_independiente(garantia), Decimal("20.80"))

    def test_independent_guarantee_rejects_negative_concept(self):
        from fastapi import HTTPException
        with self.assertRaises(HTTPException):
            _total_garantia_independiente({"notaria": "-1", "ajd": "0", "registro": "0", "gestion": "0"})

    def test_capital_must_be_inside_configured_range(self):
        bounded = tariff(1, minimo="100", maximo="200")
        self.assertFalse(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("99.99"), "Península"))
        self.assertTrue(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("150"), "Península"))
        self.assertFalse(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("200.01"), "Península"))


if __name__ == "__main__":
    unittest.main()
