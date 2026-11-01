"""Regresión de selección de tarifas para Provisiones y Cancelaciones."""
import unittest
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.provisiones.models import TarifaProvision
from backend.app.provisiones.router import _buscar_tarifa, _dinero


class ProvisionTariffSelectionTests(unittest.TestCase):
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

        selected = _buscar_tarifa(
            self.db, "provision", "CaixaBank", Decimal("50000"), "Península"
        )
        self.assertEqual(selected.id, active.id)

    def test_exact_entity_tariff_takes_precedence_over_generic_tariff(self):
        self.add_tariff(entidad="*", honorarios="90")
        exact = self.add_tariff(entidad="CaixaBank", honorarios="45")

        selected = _buscar_tarifa(
            self.db, "provision", "CaixaBank", Decimal("50000"), "Península"
        )
        self.assertEqual(selected.id, exact.id)

    def test_capital_range_includes_both_endpoints(self):
        tarifa = self.add_tariff(minimo="10000", maximo="20000")

        for capital in ("10000", "20000"):
            with self.subTest(capital=capital):
                selected = _buscar_tarifa(
                    self.db, "provision", "CaixaBank", Decimal(capital), "Península"
                )
                self.assertEqual(selected.id, tarifa.id)

        self.assertIsNone(
            _buscar_tarifa(
                self.db, "provision", "CaixaBank", Decimal("20000.01"), "Península"
            )
        )

    def test_territory_is_part_of_tariff_selection(self):
        self.add_tariff(territorio="Península")
        canarias = self.add_tariff(territorio="Canarias", honorarios="150")

        selected = _buscar_tarifa(
            self.db, "provision", "CaixaBank", Decimal("50000"), "Canarias"
        )
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
