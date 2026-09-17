import { useState } from "react";
import { Link } from "react-router-dom";
import CartButton from "@/cart/CartButton";
import CartDrawer from "@/cart/CartDrawer";
import "./Shop.css";

export default function StorefrontHeader() {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <header className="shop-header">
        <Link to="/" className="shop-logo">
          <span className="register-logo-mark" aria-hidden="true"></span>
          IDZEN
        </Link>
        <nav className="shop-nav" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/#services">Services</Link>
          <Link to="/#how-it-works">How It Works</Link>
          <Link to="/#about">About Us</Link>
          <Link to="/#contact">Contact</Link>
          <Link to="/shop" className="is-active">
            Shop
          </Link>
        </nav>
        <CartButton onClick={() => setIsCartOpen(true)} />
      </header>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
