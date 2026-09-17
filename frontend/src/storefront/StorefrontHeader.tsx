import { Link, useLocation } from "react-router-dom";
import { useCart } from "@/cart/CartContext";
import idzenLogo from "@/assets/brand/idzen-logo.png";
import "./Storefront.css";

const NAV_ITEMS = [
  { label: "Home", hash: "" },
  { label: "Services", hash: "#services" },
  { label: "How It Works", hash: "#how-it-works" },
  { label: "About Us", hash: "#about" },
  { label: "Contact", hash: "#contact" },
];

export default function StorefrontHeader() {
  const { itemCount, openDrawer } = useCart();
  const location = useLocation();
  const onHome = location.pathname === "/";

  return (
    <header className="storefront-header">
      <Link to="/" className="storefront-logo">
        <img src={idzenLogo} alt="IDZEN Prints" />
      </Link>

      <nav aria-label="Primary" className="storefront-nav">
        {NAV_ITEMS.map((item) =>
          onHome ? (
            <a key={item.label} href={item.hash || "#top"}>
              {item.label}
            </a>
          ) : (
            <Link key={item.label} to={`/${item.hash}`}>
              {item.label}
            </Link>
          )
        )}
        <Link to="/shop" className={"storefront-nav-shop" + (location.pathname.startsWith("/shop") ? " is-active" : "")}>
          Shop
        </Link>
      </nav>

      <div className="storefront-header-actions">
        <button type="button" className="storefront-cart-btn" onClick={openDrawer} aria-label="Open cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
          </svg>
          {itemCount > 0 && <span className="storefront-cart-badge">{itemCount > 99 ? "99+" : itemCount}</span>}
        </button>
        <Link to="/register" className="btn btn-gradient storefront-cta">
          Create Your Card
          <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
