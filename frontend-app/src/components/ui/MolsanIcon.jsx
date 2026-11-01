import React from "react";

/**
 * Iconografía corporativa MOLSAN ERP PREMIUM 2027.
 * Acepta nombres semánticos y los emojis históricos para facilitar una
 * migración gradual sin alterar la lógica de los módulos.
 */
const PATHS = {
  activity: <><path d="M3 12h4l2.2-7 4.1 14 2.2-7H21"/></>,
  merge: <><path d="M7 3v5c0 2.2 1.8 4 4 4h2c2.2 0 4-1.8 4-4V3"/><path d="M7 21v-5c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4v5"/><path d="M4 3h6M14 21h6"/></>,
  x: <><path d="m6 6 12 12M18 6 6 18"/></>,
  archive: <><path d="M3 4h18v4H3zM5 8v12h14V8M9 12h6"/></>,
  fileCheck: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M8.5 15l2 2 4-4"/></>,
  files: <><path d="M7 4h11v15H7z"/><path d="M4 7v13h11M10 8h5M10 12h5"/></>,
  clipboardList: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h4"/></>,
  zap: <><path d="m13 2-9 12h7l-1 8 10-13h-7z"/></>,

  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M8 14h3M8 17h6"/></>,
  home: <><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-6h6v6"/></>,
  dashboard: <><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 7h16M8 11h8M8 15h6"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m7.5 12 3 3 6-6"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 17 6l3 6M4 12l3 6a7 7 0 0 0 11.5-3"/></>,
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
  person: <><circle cx="12" cy="8" r="3.2"/><path d="M5 21c.2-4.1 2.6-6.2 7-6.2s6.8 2.1 7 6.2"/></>,
  courthouse: <><path d="m3 8 9-5 9 5H3Z"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M4 8h16"/></>,
  scroll: <><path d="M7 4h12v15H7a3 3 0 1 1 0-6h12"/><path d="M7 4a3 3 0 1 0 0 6h12M10 8h5M10 16h5"/></>,
  building: <><path d="M4 21V4l8-2 8 2v17M2 21h20M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/></>,
  meal: <><path d="M4 3v7M7 3v7M4 7h3M5.5 10v11M16 3v18M16 3c3 2 4 5 4 8h-4"/></>,
  shield: <><path d="M12 3 20 6v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
  newspaper: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 9h4v4H7zM14 9h4M14 12h4M7 16h11"/></>,
  tools: <><path d="M14 6a5 5 0 0 0-6.5 6.5L3 17l4 4 4.5-4.5A5 5 0 0 0 18 10l-3 3-4-4z"/><path d="m14 6 4-4 4 4-4 4"/></>,
  attachment: <><path d="m8 12 7-7a4 4 0 0 1 6 6l-9 9a6 6 0 0 1-9-9l9-9"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 8h18M15 13h6M17 15h.01"/></>,
  folderOpen: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2l-2 9H4L2 9a2 2 0 0 1 1-2z"/><path d="M3 11h18"/></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3.2 4.1M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7c1 0 2-.2 2.8-.5"/></>,

  upload: <><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/></>,
  message: <><path d="M4 5h16v12H9l-5 4z"/><path d="M8 9h8M8 13h5"/></>,
  coffee: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM17 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  arrowRight: <><path d="M4 12h15M13 6l6 6-6 6"/></>,
  arrowLeft: <><path d="M20 12H5M11 6l-6 6 6 6"/></>,
  link: <><path d="m10 13 4-4M8 16H6a4 4 0 0 1 0-8h4M16 8h2a4 4 0 0 1 0 8h-4"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  pause: <><circle cx="12" cy="12" r="9"/><path d="M10 8v8M14 8v8"/></>,
  truck: <><path d="M3 6h11v12H3zM14 10h4l3 4v4h-7z"/><circle cx="7" cy="19" r="1.5"/><circle cx="18" cy="19" r="1.5"/></>,
  scale: <><path d="M12 3v18M5 6h14M7 6l-4 7h8zM17 6l-4 7h8zM8 21h8"/></>,
  key: <><circle cx="8" cy="10" r="4"/><path d="m11 13 9 8M16 18l2-2M18 20l2-2"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
  download: <><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></>,
  inbox: <><path d="M4 4h16l2 12h-6l-2 3h-4l-2-3H2z"/><path d="M2 16h6M16 16h6"/></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  tag: <><path d="M3 12V4h8l10 10-7 7z"/><circle cx="8" cy="8" r="1"/></>,
  plug: <><path d="M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-6 6v3M12 18v3"/></>,
  door: <><path d="M5 21V3h14v18M9 21V9h6v12M12 15h.01"/></>,



};
const ALIASES = {
  "👥": "users", "✍️": "pen", "✍": "pen", "⏱️": "timer",
  "🧾": "receipt", "🏛️": "landmark", "💻": "monitor", "🚗": "car",
  "📈": "chart", "📍": "pin", "📄": "file", "📁": "folder",
  "⚠️": "alert", "💶": "euro", "🏦": "bank", "📋": "clipboard",
  "📑": "file", "🧮": "calculator", "🤝": "handshake", "❔": "help",
  "👤": "person", "🏛": "courthouse", "🏛️": "courthouse", "📜": "scroll",
  "🏢": "building", "🍽": "meal", "🍽️": "meal", "🚬": "pause",
  "📅": "calendar", "🛡": "shield", "🛡️": "shield", "🔒": "lock", "🔐": "lock",
  "🔎": "search", "📰": "newspaper", "🛠": "tools", "🛠️": "tools",
  "📎": "attachment", "🏠": "home", "💰": "wallet", "📂": "folderOpen",
  "📨": "mail", "💬": "message", "👁": "eye", "📤": "upload", "🗑": "trash",
  "☕": "coffee", "✒️": "pen", "✓": "check", "↗": "arrowRight", "↙": "arrowLeft",
  "↩": "refresh", "◉": "eye", "🛠️": "tools",
  "🏘": "building", "🏘️": "building", "🖋️": "pen", "✉️": "mail", "🚚": "truck",
  "🕒": "clock", "🗂️": "folder", "🗃️": "archive", "⚖️": "scale", "🔑": "key",
  "🔀": "refresh", "📝": "pen", "🖥️": "monitor", "📡": "monitor", "🌐": "globe",
  "📦": "archive", "📥": "download", "📮": "mail", "📭": "inbox", "🏆": "trophy",
  "🟢": "check", "🔔": "bell", "🔕": "bell", "🏷️": "tag", "🙈": "eye",
  "🔌": "plug", "🧱": "building", "🚫": "alert", "💥": "alert", "🚪": "door",
  "🔓": "lock", "🗓": "calendar", "🗓️": "calendar", "🗂": "folder", "🗃": "archive",
  "📗": "fileCheck", "clipboard-list": "clipboardList", "file-check": "fileCheck", "folder-check": "fileCheck", "book-check": "book", "alert-triangle": "alert", "check-circle": "check", "files": "files", "zap": "zap", "🏷": "tag", "🚧": "alert", "🔧": "tools", "🖋": "pen",
  "🖥": "monitor", "🛡": "shield", "🏛": "courthouse", "📡": "monitor",



  "📊": "chart", "⚙": "settings", "▤": "file", "💼": "briefcase", "📚": "book", "✅": "check", "🔄": "refresh", "▦": "calendar",
  "▥": "chart", "AG": "users", "NG": "landmark", "◇": "landmark",
  "✉": "receipt", "⌂": "home", "◫": "dashboard", "▣": "video",
};
const TONES = new Set(["ocean", "emerald", "violet", "amber", "cyan", "indigo", "slate"]);

export default function MolsanIcon({ name = "activity", size = 42, tone = "ocean", className = "", title, bare = false }) {
  const key = ALIASES[name] || name;
  const glyph = PATHS[key] || PATHS.activity;
  const colorTone = TONES.has(tone) ? tone : "ocean";
  return (
    <span
      className={`molsan-icon-3d molsan-icon-3d--${colorTone} ${bare ? "molsan-icon-3d--bare" : ""} ${className}`.trim()}
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
