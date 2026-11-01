/**
 * Formatos numéricos oficiales MOLSAN ERP.
 * Los datos se mantienen numéricos; estas funciones solo afectan a su presentación.
 * formatPercent espera el valor ya expresado en puntos porcentuales (12.5 => 12,50 %).
 */
const locale = "es-ES";

const euroFormatter = new Intl.NumberFormat(locale, {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(locale, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number"
    ? value
    : Number(String(value).trim().replace(/[€%]/g, "").replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

export function formatEuro(value, options = {}) {
  const number = finiteNumber(value);
  if (number === null) return options.empty ?? "—";
  return euroFormatter.format(number);
}

export function formatPercent(value, options = {}) {
  const number = finiteNumber(value);
  if (number === null) return options.empty ?? "—";
  return `${percentFormatter.format(number)} %`;
}

export function formatDecimal(value, options = {}) {
  const number = finiteNumber(value);
  if (number === null) return options.empty ?? "—";
  return numberFormatter.format(number);
}

export function parseLocalizedNumber(value) {
  return finiteNumber(value);
}

export const MOLSAN_LOCALE = locale;
