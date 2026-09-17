import { Link } from "react-router-dom";
import { useCart } from "./CartContext";
import "./CartDrawer.css";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  return (
    <>
      <div className={"cart-drawer-scrim" + (isOpen ? " is-open" : "")} onClick={onClose} />
      <aside className={"cart-drawer" + (isOpen ? " is-open" : "")} aria-hidden={!isOpen}>
        <div className="cart-drawer-header">
          <h2>Your cart</h2>
          <button className="cart-drawer-close" aria-label="Close cart" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="btn btn-secondary" onClick={onClose}>
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="cart-drawer-item">
                  <div className="cart-drawer-item-info">
                    <h4>{item.name}</h4>
                    {item.variantLabel && <p className="cart-drawer-item-variant">{item.variantLabel}</p>}
                    <div className="cart-drawer-item-qty-row">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, item.variantId, Number(e.target.value))}
                      />
                      <span className="cart-drawer-item-price">
                        ₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    className="cart-drawer-item-remove"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeItem(item.productId, item.variantId)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-drawer-total-row">
                <span>Total</span>
                <strong>₹{subtotal.toFixed(2)}</strong>
              </div>
              <Link to="/checkout" className="btn btn-primary cart-drawer-continue-btn" onClick={onClose}>
                Continue to checkout
              </Link>
              <Link to="/cart" className="cart-drawer-view-cart-link" onClick={onClose}>
                View full cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
