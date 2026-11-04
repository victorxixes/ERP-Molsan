"""Cálculos económicos compartidos por Gestión económica y liquidación."""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

CENTIMO = Decimal("0.01")
ESTADOS_LEGACY_PAGADOS = {
    "pagado", "pagada", "abonado", "abonada", "efectuado", "efectuada",
    "realizado", "realizada", "paid",
}


def decimal_economico(valor) -> Decimal:
    if valor is None or valor == "":
        return Decimal("0.00")
    try:
        numero = Decimal(str(valor).replace(",", "."))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError("Importe económico no válido.") from exc
    if not numero.is_finite():
        raise ValueError("El importe económico debe ser finito.")
    return numero.quantize(CENTIMO, rounding=ROUND_HALF_UP)


def importe_obligacion_gasto(gasto) -> Decimal:
    """Importe exigible: neto calculado, bruto histórico y, por último, importe legacy."""
    for campo in ("importe_resultante", "importe_total_bruto", "importe"):
        valor = getattr(gasto, campo, None)
        if valor is not None:
            return decimal_economico(valor)
    return Decimal("0.00")


def estado_legacy_pagado(estado) -> bool:
    return str(estado or "").strip().casefold() in ESTADOS_LEGACY_PAGADOS


def total_pagado_efectivo(estado, importe_obligacion, total_movimientos, numero_movimientos) -> Decimal:
    """Compatibilidad histórica sin confundir pagos anulados con ausencia de histórico."""
    total = decimal_economico(total_movimientos)
    if int(numero_movimientos or 0) == 0 and estado_legacy_pagado(estado):
        return decimal_economico(importe_obligacion)
    return total
