/* ============================================================
   MOLSAN ERP PREMIUM 2027 — CTN · LISTADO
   Estilos encapsulados para no afectar a otros módulos.
   ============================================================ */

.ctn-listado-page {
  --ctn-primary: var(--erp-primary, #3346a8);
  --ctn-primary-soft: var(--erp-primary-soft, #eef2ff);
  --ctn-text: var(--erp-text, #1e293b);
  --ctn-muted: var(--erp-muted, #64748b);
  --ctn-border: var(--erp-border, #e2e8f0);
  --ctn-surface: var(--erp-surface, #ffffff);

  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  min-width: 0;
  padding: 24px;
  color: var(--ctn-text);
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;
}

.ctn-listado-page *,
.ctn-listado-page *::before,
.ctn-listado-page *::after {
  box-sizing: border-box;
}

/* ============================================================
   CABECERA
   ============================================================ */

.ctn-listado-page .ctn-listado-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px;
  overflow: hidden;
  background: var(--ctn-surface);
  border: 1px solid var(--ctn-border);
  border-radius: 22px;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
}

.ctn-listado-page .ctn-listado-header::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--ctn-primary),
    #818cf8,
    #38bdf8
  );
}

.ctn-listado-page .ctn-listado-header > div {
  min-width: 0;
}

.ctn-listado-page .ctn-listado-header h1 {
  margin: 0;
  color: var(--ctn-text);
  font-size: clamp(22px, 2vw, 29px);
  font-weight: 750;
  line-height: 1.25;
  letter-spacing: -0.035em;
}

.ctn-listado-page .ctn-listado-header p {
  margin: 7px 0 0;
  color: var(--ctn-muted);
  font-size: 13px;
}

/* ============================================================
   FILTROS
   ============================================================ */

.ctn-listado-page .ctn-filtros {
  padding: 22px;
  background: var(--ctn-surface);
  border: 1px solid var(--ctn-border);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.045);
}

.ctn-listado-page .ctn-filtros-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.ctn-listado-page .ctn-filtros-grid label {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 650;
}

.ctn-listado-page .ctn-filtros-grid input,
.ctn-listado-page .ctn-filtros-grid select {
  display: block;
  width: 100%;
  min-width: 0;
  height: 42px;
  margin: 0;
  padding: 0 12px;
  color: #1e293b;
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  background-color: #fff;
  border: 1px solid #d8e0eb;
  border-radius: 10px;
  outline: none;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.ctn-listado-page .ctn-filtros-grid input::placeholder {
  color: #94a3b8;
  opacity: 1;
}

.ctn-listado-page .ctn-filtros-grid input:hover,
.ctn-listado-page .ctn-filtros-grid select:hover {
  border-color: #b6c3d6;
}

.ctn-listado-page .ctn-filtros-grid input:focus,
.ctn-listado-page .ctn-filtros-grid select:focus {
  border-color: var(--ctn-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
}

/* ============================================================
   BOTONES
   ============================================================ */

.ctn-listado-page .ctn-btn,
.ctn-listado-page .ctn-paginacion button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 39px;
  padding: 9px 15px;
  color: #334155;
  font-family: inherit;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  background: #fff;
  border: 1px solid #dbe2ec;
  border-radius: 10px;
  cursor: pointer;
  transition:
    transform 150ms ease,
    box-shadow 150ms ease,
    background-color 150ms ease,
    border-color 150ms ease;
}

.ctn-listado-page .ctn-btn:hover:not(:disabled),
.ctn-listado-page .ctn-paginacion button:hover:not(:disabled) {
  border-color: #b8c4d8;
  background: #f8fafc;
  box-shadow: 0 3px 9px rgba(15, 23, 42, 0.07);
}

.ctn-listado-page .ctn-btn:active:not(:disabled),
.ctn-listado-page .ctn-paginacion button:active:not(:disabled) {
  transform: translateY(1px);
}

.ctn-listado-page .ctn-btn:disabled,
.ctn-listado-page .ctn-paginacion button:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.ctn-listado-page .ctn-btn-primary,
.ctn-listado-page .ctn-btn-excel {
  color: #fff;
  background: var(--ctn-primary);
  border-color: var(--ctn-primary);
  box-shadow: 0 4px 10px rgba(51, 70, 168, 0.15);
}

.ctn-listado-page .ctn-btn-primary:hover:not(:disabled),
.ctn-listado-page .ctn-btn-excel:hover:not(:disabled) {
  color: #fff;
  background: #29398d;
  border-color: #29398d;
}

.ctn-listado-page .ctn-btn-secondary {
  color: #475569;
  background: #fff;
}

.ctn-listado-page .ctn-btn-small {
  min-height: 32px;
  padding: 7px 11px;
  color: var(--ctn-primary);
  background: var(--ctn-primary-soft);
  border-color: #dbe3ff;
}

.ctn-listado-page .ctn-btn-small:hover:not(:disabled) {
  color: #fff;
  background: var(--ctn-primary);
  border-color: var(--ctn-primary);
}

.ctn-listado-page .ctn-filtros-acciones {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding-top: 17px;
  border-top: 1px solid #edf0f5;
}

/* ============================================================
   RESUMEN
   ============================================================ */

.ctn-listado-page .ctn-listado-resumen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 19px;
  color: var(--ctn-muted);
  background: #f8faff;
  border: 1px solid var(--ctn-border);
  border-radius: 14px;
  font-size: 12px;
}

.ctn-listado-page .ctn-listado-resumen strong {
  color: var(--ctn-text);
  font-size: 14px;
  font-weight: 750;
}

/* ============================================================
   TABLA
   ============================================================ */

.ctn-listado-page .ctn-tabla-contenedor {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--ctn-surface);
  border: 1px solid var(--ctn-border);
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.045);
}

.ctn-listado-page .ctn-tabla-scroll {
  width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
}

.ctn-listado-page .ctn-tabla {
  width: 100%;
  min-width: 1050px;
  margin: 0;
  border-collapse: separate;
  border-spacing: 0;
  color: #334155;
  font-size: 12px;
  text-align: left;
}

.ctn-listado-page .ctn-tabla thead {
  background: #f1f5fb;
}

.ctn-listado-page .ctn-tabla th {
  padding: 13px 14px;
  color: #475569;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
  background: #f1f5fb;
  border-bottom: 1px solid #dfe6f0;
}

.ctn-listado-page .ctn-tabla th:first-child {
  padding-left: 18px;
}

.ctn-listado-page .ctn-tabla td {
  padding: 12px 14px;
  vertical-align: middle;
  border-bottom: 1px solid #edf1f6;
  line-height: 1.45;
}

.ctn-listado-page .ctn-tabla td:first-child {
  padding-left: 18px;
  color: #475569;
  font-variant-numeric: tabular-nums;
}

.ctn-listado-page .ctn-tabla tbody tr {
  background: #fff;
  transition: background-color 120ms ease;
}

.ctn-listado-page .ctn-tabla tbody tr:nth-child(even) {
  background: #fbfcfe;
}

.ctn-listado-page .ctn-tabla tbody tr:hover {
  background: #f1f5ff;
}

.ctn-listado-page .ctn-tabla tbody tr:last-child td {
  border-bottom: 0;
}

.ctn-listado-page .ctn-tabla .ctn-orden {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.ctn-listado-page .ctn-tabla .ctn-orden:hover {
  color: var(--ctn-primary);
}

.ctn-listado-page .ctn-tabla-vacio {
  padding: 38px 18px !important;
  color: var(--ctn-muted);
  text-align: center;
  font-size: 13px;
}

/* ============================================================
   PAGINACIÓN
   ============================================================ */

.ctn-listado-page .ctn-paginacion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 15px 17px;
  background: var(--ctn-surface);
  border: 1px solid var(--ctn-border);
  border-radius: 15px;
}

.ctn-listado-page .ctn-paginacion button {
  min-height: 35px;
  padding: 8px 11px;
  font-size: 11px;
}

.ctn-listado-page .ctn-paginacion span {
  margin: 0 5px;
  color: var(--ctn-muted);
  font-size: 12px;
  font-weight: 600;
}

/* ============================================================
   ACCESIBILIDAD
   ============================================================ */

.ctn-listado-page button:focus-visible {
  outline: 3px solid rgba(79, 70, 229, 0.3);
  outline-offset: 2px;
}

/* ============================================================
   TABLET
   ============================================================ */

@media (max-width: 1050px) {
  .ctn-listado-page {
    padding: 18px;
    gap: 17px;
  }

  .ctn-listado-page .ctn-filtros-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ctn-listado-page .ctn-listado-header {
    padding: 21px;
  }
}

/* ============================================================
   MÓVIL
   ============================================================ */

@media (max-width: 600px) {
  .ctn-listado-page {
    padding: 12px;
    gap: 14px;
  }

  .ctn-listado-page .ctn-listado-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 20px 17px;
    border-radius: 17px;
  }

  .ctn-listado-page .ctn-btn-excel {
    width: 100%;
  }

  .ctn-listado-page .ctn-filtros {
    padding: 16px;
    border-radius: 16px;
  }

  .ctn-listado-page .ctn-filtros-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .ctn-listado-page .ctn-filtros-acciones {
    align-items: stretch;
    flex-direction: column;
  }

  .ctn-listado-page .ctn-filtros-acciones .ctn-btn {
    width: 100%;
  }

  .ctn-listado-page .ctn-listado-resumen {
    align-items: flex-start;
    flex-direction: column;
  }

  .ctn-listado-page .ctn-paginacion {
    justify-content: center;
    padding: 12px 8px;
  }
}

/* ============================================================
   MOVIMIENTO REDUCIDO
   ============================================================ */

@media (prefers-reduced-motion: reduce) {
  .ctn-listado-page *,
  .ctn-listado-page *::before,
  .ctn-listado-page *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
