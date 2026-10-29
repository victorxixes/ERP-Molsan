"""Tests de regresión para la validación sin escritura de Post Firma."""
from io import BytesIO
import unittest

from openpyxl import Workbook

from backend.app.Utilidades.importadores.postfirma_importer import validar_postfirma


def crear_excel():
    libro = Workbook()
    hoja = libro.active
    hoja.append(["IDGASTO", "ESTADO", "IMPGASTO", "CONCEPTOGASTO"])
    hoja.append(["G-1", "PAGADO", 100.25, "HONORARIOS GESTORÍA"])
    hoja.append(["G-2", "PENDIENTE", 20, "FACTURA REGISTRO"])
    hoja.append(["G-1", "PAGADO", 5, "HONORARIOS GESTORÍA"])
    salida = BytesIO()
    libro.save(salida)
    libro.close()
    return salida.getvalue()


class PostFirmaValidationTests(unittest.TestCase):
    def test_validation_counts_all_rows_and_keeps_duplicate_gasto_ids(self):
        resultado = validar_postfirma(None, crear_excel())

        self.assertTrue(resultado["validacion_sin_escritura"])
        self.assertEqual(resultado["filas_excel"], 3)
        self.assertEqual(resultado["filas_con_datos"], 3)
        self.assertEqual(resultado["suma_imp_gasto"], "125.25")
        self.assertEqual(resultado["por_estado_absis"], {"PAGADO": 2, "PENDIENTE": 1})
        self.assertIn("IDGASTO", resultado["columnas_detectadas"])
        self.assertIn("CONCEPTOGASTO", resultado["columnas_detectadas"])

    def test_validation_does_not_require_optional_tipo_concepto_column(self):
        libro = Workbook()
        hoja = libro.active
        hoja.append(["IDGASTO", "IMPGASTO"])
        hoja.append(["G-3", 7.5])
        salida = BytesIO()
        libro.save(salida)
        libro.close()

        resultado = validar_postfirma(None, salida.getvalue())
        self.assertEqual(resultado["filas_con_datos"], 1)
        self.assertEqual(resultado["suma_imp_gasto"], "7.50")
        self.assertIn("TIPOCONCEPTO", resultado["columnas_detectadas"])


if __name__ == "__main__":
    unittest.main()
