import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MEMBER_SIDEBAR } from "@/config/memberSidebar";
import NavIcon from "@/components/NavIcon";
import "./SearchModal.css";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  slug: string;
  label: string;
  icon: string;
  route: string;
  sectionLabel: string;
  description: string;
  badge?: "new";
  tag: string;
}

// Flattened once from the same sidebar config that drives navigation —
// so a search result and a sidebar entry can never drift out of sync
// with each other; there's only one list either reads from.
const SEARCH_INDEX: SearchResult[] = MEMBER_SIDEBAR.flatMap((section) =>
  section.items
    .filter((item) => item.slug !== "dashboard")
    .map((item) => ({
      slug: item.slug,
      label: item.label,
      icon: item.icon,
      route: item.route ?? `/member/section/${item.slug}`,
      sectionLabel: section.heading ?? "Quick Access",
      description: item.description || "Available now",
      badge: item.badge,
      tag: item.route ? "Open" : "Coming soon",
    }))
);

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? SEARCH_INDEX.filter(
          (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
        )
      : SEARCH_INDEX;
    return list.slice(0, 8);
  }, [query]);

  function goTo(route: string) {
    navigate(route);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="search-modal-scrim" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-input-row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any service, page, category or keyword…"
          />
          <button className="search-modal-close" onClick={onClose} aria-label="Close search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="search-modal-results-header">
          <span>{query ? "Search Results" : "Latest & Quick Access"}</span>
          <span className="search-modal-results-tag">Quick access</span>
        </div>

        <div className="search-modal-results">
          {results.length === 0 ? (
            <p className="empty-state" style={{ padding: "var(--space-5)" }}>
              No matches for "{query}".
            </p>
          ) : (
            results.map((item) => (
              <button key={item.slug} type="button" className="search-result-row" onClick={() => goTo(item.route)}>
                <span className="search-result-icon">
                  <NavIcon name={item.icon} />
                </span>
                <span className="search-result-body">
                  <span className="search-result-title">
                    {item.label}
                    {item.badge === "new" && <span className="search-result-badge search-result-badge-new">NEW</span>}
                    <span className="search-result-badge search-result-badge-tag">{item.tag}</span>
                  </span>
                  <span className="search-result-subtitle">
                    {item.sectionLabel} · {item.description}
                  </span>
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-result-arrow">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
