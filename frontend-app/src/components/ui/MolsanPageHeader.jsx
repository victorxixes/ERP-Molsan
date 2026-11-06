import React from "react";
import MolsanIcon from "./MolsanIcon";

const ICONOS_MARCA = {
  CG: "dashboard",
  AG: "calendar",
  AP: "users",
  NG: "courthouse",
  EG: "briefcase",
  CTN: "courthouse",
  MSG: "message",
  CAT: "book",
  UT: "tools",
  EXP: "file",
  EMP: "users",
  INF: "chart",
  SEG: "shield",
  SG: "shield",
  SEGURIDAD: "shield",
  AUD: "shield",
  LOG: "activity",
  MAE: "book",
  FIC: "calendar",
  HERR: "tools",
  PRO: "wallet",
  FUS: "merge",
  NOT: "bell",
  IN: "newspaper",
  NT: "bell",
  PT: "monitor",
  MT: "tools",
  RP: "building",
  EB: "bank",
  BAN: "bank",
  OL: "building",
  MUN: "pin",
  TE: "file",
  TIP: "file",
  AE: "zap",
  PF: "wallet",
  MOD: "dashboard",
  VF: "receipt",
};

/**
 * Cabecera corporativa única de MOLSAN ERP PREMIUM 2027.
 * Solo varían el identificador, el título y la descripción funcional.
 */
export default function MolsanPageHeader({ mark, title, description, actions = null, className = "" }) {
  const iconoMarca = typeof mark === "string" ? ICONOS_MARCA[mark.trim().toUpperCase()] : null;
  return (
    <header className={`molsan-page-header ${className}`.trim()}>
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true">{iconoMarca ? <MolsanIcon name={iconoMarca} size={24} tone="inherit" bare /> : mark}</div>
        <div className="molsan-page-header__content">
          <h1 className="molsan-page-header__title">{title}</h1>
          {description ? (
            <p className="molsan-page-header__description">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="molsan-page-header__actions">{actions}</div> : null}
    </header>
  );
}
