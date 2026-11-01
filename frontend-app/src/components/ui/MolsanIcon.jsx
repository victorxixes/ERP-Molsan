import React from "react";

/**
 * Iconografía corporativa MOLSAN ERP PREMIUM 2027.
 * Acepta nombres semánticos y los emojis históricos para facilitar una
 * migración gradual sin alterar la lógica de los módulos.
 */
const PATHS = {
  activity: <><path d="M3 12h4l2.2-7 4.1 14 2.2-7H21"/></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h3M8 17h6"/></>,
  home: <><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-6h6v6"/></>,
  dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></>,
  users: <><circle cx="9" cy="8" r="3.2"/><path d="M3 20c.2-3.6 2.6-5.7 6-5.7s5.8 2.1 6 5.7"/><path d="M16 5.2a3.1 3.1 0 0 1 0 5.8M17 14.4c2.3.7 3.6 2.5 3.8 5.1"/></>,
  pen: <><path d="m4 16.5-.9 4.4 4.4-.9L19 8.5a2.8 2.8 0 0 0-4-4Z"/><path d="m13.5 6 4.5 4.5M4 21h16"/></>,
  timer: <><circle cx="12" cy="13" r="8.2"/><path d="M12 8v5l3.3 2M9 2h6M12 2v2"/></>,
  receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,
  landmark: <><path d="m3 8 9-5 9 5H3Z"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M4 8h16"/></>,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 10h3l2-3 2 6 2-3h1"/></>,
  car: <><path d="m4 15 1.5-5.5A2 2 0 0 1 7.4 8h9.2a2 2 0 0 1 1.9 1.5L20 15v4h-2v-2H6v2H4z"/><path d="M5 14h14M7 11h10"/><circle cx="7.5" cy="15" r="1"/><circle cx="16.5" cy="15" r="1"/></>,
  chart: <><path d="M4 20V5M4 20h17"/><path d="m7 15 4-4 3 2 5-7"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 9h18"/></>,
  alert: <><path d="m12 3 9 17H3z"/><path d="M12 9v5M12 17h.01"/></>,
  euro: <><path d="M19 5.5A7.5 7.5 0 1 0 19 18.5M4 10h11M4 14h10"/></>,
  bank: <><path d="m3 8 9-5 9 5H3ZM4 20h16M6 10v8M10 10v8M14 10v8M18 10v8"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8 9h8M8 13h8M8 17h5"/></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8v3H8zM8 14h2M14 14h2M8 17h2M14 17h2"/></>,
  handshake: <><path d="m3 12 4-4 4 1 2-1 4 1 4 3-7 7-4-3-3 1-4-5Z"/><path d="m7 8 3-3 4 1 2 2M9 14l4 3M12 11l4 4"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.7 1.5c-1.1 1.2-2.2 1.5-2.2 3M12 17h.01"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19 13 2 1-2 4-2-1-2 1v2h-5v-2l-2-1-2 1-2-4 2-1v-2l-2-1 2-4 2 1 2-1V4h5v2l2 1 2-1 2 4-2 1z"/></>,
  video: <><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></>,
};
const ALIASES = {
  "👥": "users", "✍️": "pen", "✍": "pen", "⏱️": "timer",
  "🧾": "receipt", "🏛️": "landmark", "💻": "monitor", "🚗": "car",
  "📈": "chart", "📍": "pin", "📄": "file", "📁": "folder",
  "⚠️": "alert", "💶": "euro", "🏦": "bank", "📋": "clipboard",
  "📑": "file", "🧮": "calculator", "🤝": "handshake", "❔": "help",
  "📊": "chart", "⚙": "settings", "▤": "file", "▦": "calendar",
  "▥": "chart", "AG": "users", "NG": "landmark", "◇": "landmark",
  "✉": "receipt", "⌂": "home", "◫": "dashboard", "▣": "video",
};
const TONES = new Set(["ocean", "emerald", "violet", "amber", "cyan", "indigo", "slate"]);

export default function MolsanIcon({ name = "activity", size = 42, tone = "ocean", className = "", title }) {
  const key = ALIASES[name] || name;
  const glyph = PATHS[key] || PATHS.activity;
  const colorTone = TONES.has(tone) ? tone : "ocean";
  return (
    <span
      className={`molsan-icon-3d molsan-icon-3d--${colorTone} ${className}`.trim()}
      style={{ width: size, height: size }}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {glyph}
      </svg>
    </span>
  );
}
