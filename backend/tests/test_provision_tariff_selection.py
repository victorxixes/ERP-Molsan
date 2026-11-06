"""Regresión de selección de tarifas para Provisiones y Cancelaciones."""
import unittest
from decimal import Decimal
from types import SimpleNamespace

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.provisiones.models import TarifaProvision
from backend.app.provisiones.router import (
    _buscar_tarifa,
    _tarifa_aplicable,
    _importe_configurable,
    _validar_motivo_total_manual,
    _total_garantia_independiente,
    _dinero,
)


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
        id=id,
        tipo=tipo,
        entidad=entidad,
        territorio=territorio,
        activo=activo,
        capital_minimo=Decimal(minimo),
        capital_maximo=Decimal(maximo) if maximo is not None else None,
    )


class ProvisionTariffRulesTests(unittest.TestCase):
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
        with self.assertRaises(HTTPException):
            _total_garantia_independiente({"notaria": "-1", "ajd": "0", "registro": "0", "gestion": "0"})

    def test_capital_must_be_inside_configured_range(self):
        bounded = tariff(1, minimo="100", maximo="200")
        self.assertFalse(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("99.99"), "Península"))
        self.assertTrue(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("150"), "Península"))
        self.assertFalse(_tarifa_aplicable(bounded, "provision", "Banco A", Decimal("200.01"), "Península"))


class ProvisionTariffDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        TarifaProvision.__table__.create(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def add_tariff(
        self,
        *,
        tipo="provision",
        entidad="CaixaBank",
        activo=True,
        minimo="0",
        maximo=None,
        honorarios="100",
        territorio="Península",
    ):
        tarifa = TarifaProvision(
            tipo=tipo,
            entidad=entidad,
            activo=activo,
            capital_minimo=Decimal(minimo),
            capital_maximo=Decimal(maximo) if maximo is not None else None,
            honorarios=Decimal(honorarios),
            suplidos=Decimal("0"),
            gastos_registro=Decimal("0"),
            otros_gastos=Decimal("0"),
            territorio=territorio,
        )
        self.db.add(tarifa)
        self.db.commit()
        self.db.refresh(tarifa)
        return tarifa

    def test_inactive_and_other_operation_tariffs_are_never_selected(self):
        self.add_tariff(activo=False, honorarios="10")
        self.add_tariff(tipo="cancelacion", activo=True, honorarios="20")
        active = self.add_tariff(entidad="*", activo=True, honorarios="30")
        selected = _buscar_tarifa(self.db, "provision", "CaixaBank", Decimal("50000"), "Península")
        self.assertEqual(selected.id, active.id)

    def test_exact_entity_tariff_takes_precedence_over_generic_tariff(self):
        self.add_tariff(entidad="*", honorarios="90")
        exact = self.add_tariff(entidad="CaixaBank", honorarios="45")
        selected = _buscar_tarifa(self.db, "provision", "CaixaBank", Decimal("50000"), "Península")
        self.assertEqual(selected.id, exact.id)

    def test_capital_range_includes_both_endpoints(self):
        tarifa = self.add_tariff(minimo="10000", maximo="20000")
        for capital in ("10000", "20000"):
            with self.subTest(capital=capital):
                selected = _buscar_tarifa(self.db, "provision", "CaixaBank", Decimal(capital), "Península")
                self.assertEqual(selected.id, tarifa.id)
        self.assertIsNone(_buscar_tarifa(self.db, "provision", "CaixaBank", Decimal("20000.01"), "Península"))

    def test_territory_is_part_of_tariff_selection(self):
        self.add_tariff(territorio="Península")
        canarias = self.add_tariff(territorio="Canarias", honorarios="150")
        selected = _buscar_tarifa(self.db, "provision", "CaixaBank", Decimal("50000"), "Canarias")
        self.assertEqual(selected.id, canarias.id)

    def test_money_parser_rejects_negative_non_finite_and_invalid_values(self):
        self.assertEqual(_dinero("12.345"), Decimal("12.35"))
        for invalid in ("-1", "NaN", "Infinity", "abc"):
            with self.subTest(invalid=invalid):
                with self.assertRaises(HTTPException) as caught:
                    _dinero(invalid)
                self.assertEqual(caught.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
