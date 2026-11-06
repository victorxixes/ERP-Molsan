import MolsanIcon from "./MolsanIcon";

/**
 * Tarjeta estructural canónica Molsan Premium 2027.
 * El componente controla la composición visual; el contenido funcional
 * permanece en el consumidor para no alterar datos ni acciones.
 */
export default function MolsanPremiumCard({
  icon,
  title,
  description,
  eyebrow,
  children,
  className = "",
  iconSize = 30,
  as: Element = "article",
  ...rest
}) {
  return (
    <Element className={`molsan-premium-card ${className}`.trim()} {...rest}>
      {(icon || title || description || eyebrow) && (
        <header className="molsan-premium-card__header">
          {icon && (
            <span className="molsan-premium-card__icon" aria-hidden="true">
              <MolsanIcon name={icon} size={iconSize} tone="ocean" />
            </span>
          )}
          <span className="molsan-premium-card__identity">
            {eyebrow && <span className="molsan-premium-card__eyebrow">{eyebrow}</span>}
            {title && <span className="molsan-premium-card__title">{title}</span>}
            {description && <span className="molsan-premium-card__description">{description}</span>}
          </span>
        </header>
      )}
      {children != null && <div className="molsan-premium-card__content">{children}</div>}
    </Element>
  );
}
