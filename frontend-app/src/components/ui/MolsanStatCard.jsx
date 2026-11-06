import React from "react";
import MolsanIcon from "./MolsanIcon";

/** Tarjeta KPI compartida: estructura y comportamiento visual únicos para los portales. */
export default function MolsanStatCard({
  title, value, description, icon, tone = "ocean", onClick, className = "", ariaLabel,
}) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`molsan-stat-card molsan-stat-card--${tone} ${onClick ? "is-interactive" : ""} ${className}`.trim()}
      onClick={onClick}
      aria-label={ariaLabel || (onClick ? `Ver: ${title}` : undefined)}
    >
      <div className="molsan-stat-card__top">
        <span className="molsan-stat-card__title">{title}</span>
        <span className="molsan-stat-card__icon" aria-hidden="true"><MolsanIcon name={icon} size={27} tone={tone} /></span>
      </div>
      <div className="molsan-stat-card__value">{value}</div>
      {description ? <p className="molsan-stat-card__description">{description}</p> : null}
      {onClick ? <span className="molsan-stat-card__action">Ver detalle <MolsanIcon name="arrowRight" size={13} bare /></span> : null}
    </Tag>
  );
}
