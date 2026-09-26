/**
 * Simple single-tone stroke icons for sidebar nav items — matches the
 * existing .app-nav-link icon style (plain currentColor SVGs), not the
 * colorful circular badges used for the dashboard's service tiles.
 */
const STROKE = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PATHS: Record<string, string> = {
  dashboard: "M4 13h6V4H4v9zM14 20h6v-9h-6v9zM4 20h6v-4H4v4zM14 10h6V4h-6v6",
  gift: "M20 12v9H4v-9M2 7h20v5H2V7zM12 22V7M12 7c-1.5 0-4-1-4-3a2.2 2.2 0 014-1 2.2 2.2 0 014 1c0 2-2.5 3-4 3z",
  bank: "M3 21h18M4 21V10M20 21V10M2 10l10-6 10 6M6 10v6M10 10v6M14 10v6M18 10v6",
  printer: "M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-5a1 1 0 011-1h16a1 1 0 011 1v5a1 1 0 01-1 1h-2M6 14h12v7H6v-7z",
  fingerprint: "M12 11c0 3-1 5-2 7M8 15c1-2 1.5-3.5 1.5-6a2.5 2.5 0 015 0v1M5 10a7 7 0 0113.9-1M5.5 14a9 9 0 003.5 5.5M16 8.5c.5 1 .8 2.2.8 3.5 0 2-.4 3.5-1 5",
  truck: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM6.5 19a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM16.5 19a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z",
  cardPlus: "M3 6h18v12H3zM3 10h18M12 14v3M10.5 15.5h3",
  creditCard: "M3 6h18v12H3zM3 10h18M7 14h4",
  handshake: "M2 12l4-4 4 2 4-4 4 4-3 3-3-3-3 3-3-1M6 8l4 4M18 8l-4 4",
  cart: "M3 4h2l2.4 12.2a2 2 0 002 1.8h7.6a2 2 0 002-1.7L21 8H6M9 21a1 1 0 100-2 1 1 0 000 2zM18 21a1 1 0 100-2 1 1 0 000 2z",
  briefcase: "M3 7h18v13H3zM8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 12h18",
  piggyBank: "M4 12a6 6 0 016-6h4a6 6 0 016 6v1a2 2 0 002 2v2h-3l-1 3H8l-1-3H5v-3a2 2 0 01-1-1.7V12zM8 12v.01M6 8l-2-2",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.4 2.7 3.6 6 3.6 9s-1.2 6.3-3.6 9c-2.4-2.7-3.6-6-3.6-9S9.6 5.7 12 3z",
  bell: "M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM9.5 18a2.5 2.5 0 005 0",
  clock: "M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z",
  hourglass: "M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9",
  shield: "M9 12l2 2 4-4M7.8 4.7A3.4 3.4 0 009.8 4a3.4 3.4 0 014.4 0 3.4 3.4 0 002 .7A3.4 3.4 0 0119 7.8a3.4 3.4 0 00.8 2 3.4 3.4 0 010 4.4 3.4 3.4 0 00-.8 2 3.4 3.4 0 01-3.1 3.1 3.4 3.4 0 00-2 .8 3.4 3.4 0 01-4.4 0 3.4 3.4 0 00-2-.8 3.4 3.4 0 01-3.1-3.1 3.4 3.4 0 00-.8-2 3.4 3.4 0 010-4.4 3.4 3.4 0 00.8-2A3.4 3.4 0 017.8 4.7z",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  video: "M15 10l5-3v10l-5-3M3 6h10a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z",
  tag: "M20.6 11.6L12.4 3.4a2 2 0 00-1.4-.6H5a2 2 0 00-2 2v6a2 2 0 00.6 1.4l8.2 8.2a2 2 0 002.8 0l6-6a2 2 0 000-2.8zM7 8v0",
  headset: "M4 13v-1a8 8 0 0116 0v1M4 13v5a2 2 0 002 2h1v-7H5a1 1 0 00-1 1zM20 13v5a2 2 0 01-2 2h-1v-7h2a1 1 0 011 1z",
};

export default function NavIcon({ name, className }: { name: string; className?: string }) {
  const d = PATHS[name] ?? PATHS.tag;
  return (
    <svg viewBox="0 0 24 24" className={className} {...STROKE}>
      <path d={d} />
    </svg>
  );
}
