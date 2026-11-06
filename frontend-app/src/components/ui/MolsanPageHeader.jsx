import React from "react";

/**
 * Cabecera compartida del ERP. Las páginas solo aportan identidad,
 * título, descripción y acciones; la geometría y jerarquía son comunes.
 */
export default function MolsanPageHeader({ mark = "M", eyebrow = "MOLSAN ERP · PREMIUM 2027", title, description, actions = null, className = "" }) {
  return (
    <header className={`molsan-premium-header ${className}`.trim()}>
      <div className="molsan-premium-header__identity">
        <span className="molsan-premium-header__mark" aria-hidden="true">{mark}</span>
        <div className="molsan-premium-header__copy">
          <p className="molsan-premium-header__eyebrow">{eyebrow}</p>
          <h1 className="molsan-premium-header__title">{title}</h1>
          {description ? <p className="molsan-premium-header__description">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="molsan-premium-header__actions">{actions}</div> : null}
    </header>
  );
}
