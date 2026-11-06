import React from "react";

const ICONS = {
  AG: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20v-1.4a4.6 4.6 0 0 1 4.6-4.6h4.8a4.6 4.6 0 0 1 4.6 4.6V20" /><path d="m9.5 18 2.5-2 2.5 2" /></>,
  EG: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2.8h6V4M8.5 9h7M8.5 13h7M8.5 17h4" /></>,
  NG: <><path d="M4 20V5l8-3 8 3v15" /><path d="M8 20v-5h8v5M8 8h.01M12 8h.01M16 8h.01M8 11h.01M12 11h.01M16 11h.01" /></>,
  CG: <><path d="M4 20V4M4 20h17" /><rect x="7" y="11" width="3" height="6" rx=".6" /><rect x="12" y="7" width="3" height="10" rx=".6" /><rect x="17" y="4" width="3" height="13" rx=".6" /></>,
  M: <><path d="M4 19V5l8 8 8-8v14" /></>,
};

export default function MolsanPageHeader({ mark = "M", eyebrow = "MOLSAN ERP · PREMIUM 2027", title, description, actions = null, className = "" }) {
  return (
    <header className={`molsan-premium-header ${className}`.trim()}>
      <div className="molsan-premium-header__identity">
        <span className="molsan-premium-header__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[mark] || ICONS.M}
          </svg>
        </span>
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
