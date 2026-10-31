"""Pruebas de orden global CTN antes de la paginación del servidor."""
import unittest
from types import SimpleNamespace

from sqlalchemy import create_engine, func
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import aliased, sessionmaker

from backend.app.ctn.models import Notaria
from backend.app.ctn.router import (
    _agregado_nombres_asociados,
    _distancia_de_notaria,
    _ordenar_query_ctn,
)


class CtnGlobalSortingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:")
        cls.Session = sessionmaker(bind=cls.engine)

    def test_default_order_has_unique_id_tiebreaker_before_pagination(self):
        session = self.Session()
        try:
            query = _ordenar_query_ctn(
                session.query(Notaria), None, "asc", page=2, page_size=15
            )
            sql = str(
                query.statement.compile(
                    dialect=postgresql.dialect(),
                    compile_kwargs={"literal_binds": True},
                )
            )
            order_pos = sql.index("ORDER BY")
            limit_pos = sql.index("LIMIT")
            offset_pos = sql.index("OFFSET")
            self.assertLess(order_pos, limit_pos)
            self.assertLess(order_pos, offset_pos)
            self.assertIn("ctn_notarios.id ASC", sql)
            self.assertIn("LIMIT 15 OFFSET 15", sql)
        finally:
            session.close()

    def test_calculated_column_uses_requested_direction_and_stable_tiebreaker(self):
        session = self.Session()
        try:
            query = _ordenar_query_ctn(
                session.query(Notaria),
                func.coalesce(Notaria.lat, ""),
                "desc",
                page=3,
                page_size=15,
            )
            sql = str(
                query.statement.compile(
                    dialect=postgresql.dialect(),
                    compile_kwargs={"literal_binds": True},
                )
            )
            self.assertIn("DESC NULLS LAST", sql)
            self.assertIn("ctn_notarios.id ASC", sql)
            self.assertIn("LIMIT 15 OFFSET 30", sql)
        finally:
            session.close()

    def test_association_aggregate_has_deterministic_name_and_id_order(self):
        notario_asociado = aliased(Notaria)
        sql = str(
            _agregado_nombres_asociados(notario_asociado).compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            )
        )
        self.assertIn("string_agg", sql.lower())
        self.assertIn("ORDER BY", sql)
        self.assertIn("lower", sql.lower())
        self.assertIn("ctn_notarios_1.id", sql)

    def test_distance_is_returned_only_for_finite_geographic_coordinates(self):
        self.assertIsInstance(
            _distancia_de_notaria(SimpleNamespace(lat="41.4", lng="2.1")),
            float,
        )
        self.assertIsNone(
            _distancia_de_notaria(SimpleNamespace(lat="NaN", lng="2.1"))
        )
        self.assertIsNone(
            _distancia_de_notaria(SimpleNamespace(lat="91", lng="2.1"))
        )
        self.assertIsNone(
            _distancia_de_notaria(SimpleNamespace(lat="41.4", lng="181"))
        )
        self.assertIsNone(
            _distancia_de_notaria(SimpleNamespace(lat=None, lng=None))
        )


if __name__ == "__main__":
    unittest.main()
