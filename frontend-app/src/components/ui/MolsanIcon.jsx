import React from "react";

const paths = {
  user: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20v-1.4a4.6 4.6 0 0 1 4.6-4.6h4.8a4.6 4.6 0 0 1 4.6 4.6V20" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2.8h6V4M8.5 9h7M8.5 13h7M8.5 17h4" /></>,
  building: <><path d="M4 20V5l8-3 8 3v15" /><path d="M8 20v-5h8v5M8 8h.01M12 8h.01M16 8h.01M8 11h.01M12 11h.01M16 11h.01" /></>,
  chart: <><path d="M4 20V4M4 20h17" /><rect x="7" y="11" width="3" height="6" rx=".6" /><rect x="12" y="7" width="3" height="10" rx=".6" /><rect x="17" y="4" width="3" height="13" rx=".6" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="17" rx="2" /><path d="M16 2.5v4M8 2.5v4M3 9h18" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  copy: <><rect x="8" y="7" width="12" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h2" /></>,
  euro: <><path d="M18 5.5a7 7 0 1 0 0 13M4 10h10M4 14h9" /></>,
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h2m4 0h2M8 16h2m4 0h2" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  alert: <><path d="m12 3 9 17H3L12 3Z" /><path d="M12 9v5m0 3h.01" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
  zap: <path d="m13 2-9 12h7l-1 8 10-13h-7l0-7Z" />,
  home: <><path d="m3 10 9-7 9 7M5 9v11h14V9M9 20v-6h6v6" /></>,
  message: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H11l-4.5 4v-4.2A2.5 2.5 0 0 1 4 12.5z" /><path d="M8 8h8M8 11h5" /></>,
  shield: <><path d="M12 3 20 6v5.5c0 4.8-3.2 8.3-8 9.5-4.8-1.2-8-4.7-8-9.5V6z" /><path d="m9 12 2 2 4-4" /></>,
  file: <><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h6" /></>,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4M7 10l3 3 3-4 2 2 2-3" /></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" /></>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2" /></>,
  signature: <><path d="m4 17 9-9 4 4-9 9H4zM13 8l2-2a2.8 2.8 0 0 1 4 4l-2 2M4 21h16" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8Z" /></>,
};

export default function MolsanIcon({ name = "file", size = 22, className = "" }) {
  return <svg className={className} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.file}</svg>;
}
