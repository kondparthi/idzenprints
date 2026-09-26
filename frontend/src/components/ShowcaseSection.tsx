import NavIcon from "@/components/NavIcon";
import "./ShowcaseSection.css";

export interface ShowcaseItem {
  icon: string;
  label: string;
  tag: string;
  count?: number;
  color: string;
}

interface ShowcaseSectionProps {
  emoji: string;
  title: string;
  pill: string;
  tint: "mint" | "peach" | "lavender" | "gray";
  items: ShowcaseItem[];
}

/**
 * A titled, tinted panel of icon tiles — the same visual pattern as
 * "Top 8 Used By Me" / "Trending in TG" / etc. in the reference. Every
 * section on the dashboard below Quick Access reuses this, so they
 * stay visually consistent with each other and with Quick Access
 * itself. All content passed in is DUMMY placeholder data (labels,
 * tags, and usage counts) — matching "design first, dynamic after."
 */
export default function ShowcaseSection({ emoji, title, pill, tint, items }: ShowcaseSectionProps) {
  return (
    <div className={"showcase-panel showcase-panel-" + tint}>
      <div className="quick-access-panel-header">
        <h2>
          <span className="quick-access-panel-icon">{emoji}</span>
          {title}
        </h2>
        <span className="quick-access-panel-tag">{pill}</span>
      </div>
      <div className="service-tile-grid">
        {items.map((item, idx) => (
          <div key={idx} className="service-tile service-tile-static">
            <span className="service-tile-icon-frame" style={{ borderColor: item.color }}>
              <span className="service-tile-icon" style={{ color: item.color, background: `${item.color}1A` }}>
                <NavIcon name={item.icon} />
              </span>
              {item.count !== undefined && <span className="service-tile-count-badge">{item.count}</span>}
            </span>
            <span className="service-tile-name">{item.label}</span>
            <span className="service-tile-tag">{item.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
