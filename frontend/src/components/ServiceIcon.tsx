/**
 * Small, recognizable line-art icons per service type — colorful
 * circular badges matching the reference dashboard's icon-tile style,
 * rather than a plain letter avatar. Matched by keyword against the
 * service name so it still degrades gracefully (falls back to a
 * generic card icon) for any future service name that doesn't match
 * one of these.
 */
import type { CSSProperties } from "react";

const ICON_STROKE_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function FingerprintIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ICON_STROKE_PROPS}>
      <path d="M12 11c0 3-1 5-2 7M8 15c1-2 1.5-3.5 1.5-6a2.5 2.5 0 015 0v1M5 10a7 7 0 0113.9-1M5.5 14a9 9 0 003.5 5.5M12 5v0M16 8.5c.5 1 .8 2.2.8 3.5 0 2-.4 3.5-1 5" />
    </svg>
  );
}

function RationBasketIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ICON_STROKE_PROPS}>
      <path d="M4 9h16l-1.5 10a2 2 0 01-2 1.7H7.5a2 2 0 01-2-1.7L4 9zM8 9V6a4 4 0 018 0v3" />
    </svg>
  );
}

function BadgeIdIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ICON_STROKE_PROPS}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <circle cx="12" cy="11" r="2.2" />
      <path d="M8 17c.7-1.6 2.1-2.5 4-2.5s3.3.9 4 2.5M8 5V3.5M16 5V3.5" />
    </svg>
  );
}

function GraduationCapIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ICON_STROKE_PROPS}>
      <path d="M2 9l10-5 10 5-10 5-10-5z" />
      <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" />
    </svg>
  );
}

function BusinessCardIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ICON_STROKE_PROPS}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="8" cy="12" r="1.8" />
      <path d="M13 10h5M13 14h5M6.5 15.3c.4-1 1.2-1.5 1.5-1.5s1.1.5 1.5 1.5" />
    </svg>
  );
}

function CustomSparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ICON_STROKE_PROPS}>
      <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z" />
      <path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" />
    </svg>
  );
}

function GenericCardIcon() {
  return (
    <svg viewBox="0 0 24 24" {...ICON_STROKE_PROPS}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

const ICON_MATCHERS: { test: RegExp; Icon: () => JSX.Element; color: string }[] = [
  { test: /aadhaar/i, Icon: FingerprintIcon, color: "#1F6FA8" },
  { test: /ration|fsc/i, Icon: RationBasketIcon, color: "#B3821F" },
  { test: /employee/i, Icon: BadgeIdIcon, color: "#5B3A8A" },
  { test: /student/i, Icon: GraduationCapIcon, color: "#1F7A3D" },
  { test: /visiting/i, Icon: BusinessCardIcon, color: "#A83E5C" },
  { test: /custom/i, Icon: CustomSparkleIcon, color: "#C9601F" },
];

export function getServiceColor(name: string): string {
  return ICON_MATCHERS.find((m) => m.test.test(name))?.color ?? "#3F7A12";
}

export default function ServiceIcon({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  const match = ICON_MATCHERS.find((m) => m.test.test(name));
  const Icon = match?.Icon ?? GenericCardIcon;
  const color = match?.color ?? "#3F7A12";
  return (
    <span className={className} style={{ ...style, color, background: `${color}1A` }}>
      <Icon />
    </span>
  );
}
