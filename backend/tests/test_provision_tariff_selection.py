"""Regression tests for provision tariff selection."""
import unittest
from decimal import Decimal
from types import SimpleNamespace

from backend.app.provisiones.router import _buscar_tarifa, _tarifa_aplicable


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

    def test_capital_must_be_inside_configured_range(self):
        bounded = tariff(1, minimo="100", maximo="200")
        self.assertFalse(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("99.99"), "Península"))
        self.assertTrue(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("150"), "Península"))
        self.assertFalse(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("200.01"), "Península"))


if __name__ == "__main__":
    unittest.main()
