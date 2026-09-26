import { useParams } from "react-router-dom";
import { findSidebarItem } from "@/config/memberSidebar";
import NavIcon from "@/components/NavIcon";
import "./MemberSectionPlaceholder.css";

export default function MemberSectionPlaceholder() {
  const { slug } = useParams();
  const item = slug ? findSidebarItem(slug) : undefined;

  if (!item) {
    return <p className="empty-state">Section not found.</p>;
  }

  return (
    <div className="section-placeholder">
      <div className="section-placeholder-icon">
        <NavIcon name={item.icon} />
      </div>
      <h1>{item.label}</h1>
      <p>{item.description}</p>
      <span className="badge badge-warning">Coming soon</span>
    </div>
  );
}
