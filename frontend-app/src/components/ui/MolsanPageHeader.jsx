import React from "react";

/**
 * Cabecera corporativa única de MOLSAN ERP PREMIUM 2027.
 * Solo varían el identificador, el título y la descripción funcional.
 */
export default function MolsanPageHeader({ mark, title, description, actions = null, className = "" }) {
  return (
    <header className={`molsan-page-header ${className}`.trim()}>
      <div className="molsan-page-header__identity">
        <div className="molsan-page-header__mark" aria-hidden="true">{mark}</div>
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
