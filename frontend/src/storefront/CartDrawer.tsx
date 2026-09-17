import { useNavigate } from "react-router-dom";
import { useCart } from "@/cart/CartContext";
import { storeProductImageUrl } from "@/api/storefront";
import "./Storefront.css";

export default function CartDrawer() {
  const { items, isDrawerOpen, closeDrawer, updateQuantity, removeItem, subtotal } = useCart();
  const navigate = useNavigate();

  function goToCart() {
    closeDrawer();
    navigate("/cart");
  }

  function goToCheckout() {
    closeDrawer();
    navigate("/checkout");
  }

  function goToShop() {
    closeDrawer();
    navigate("/shop");
  }

  return (
    <>
      <div className={"cart-drawer-scrim" + (isDrawerOpen ? " is-open" : "")} onClick={closeDrawer} />
      <aside className={"cart-drawer" + (isDrawerOpen ? " is-open" : "")} aria-hidden={!isDrawerOpen}>
        <div className="cart-drawer-header">
          <h2>Your cart</h2>
          <button type="button" className="cart-drawer-close" onClick={closeDrawer} aria-label="Close cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="cart-drawer-empty">
            <p className="empty-state">Your cart is empty.</p>
            <button type="button" className="btn btn-secondary" onClick={goToShop}>
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-items">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="cart-drawer-item">
                  <div className="cart-drawer-item-image">
                    {item.imageId ? (
                      <img src={storeProductImageUrl(item.productId, item.imageId)} alt={item.name} />
                    ) : (
                      <div className="shop-card-image-placeholder" />
                    )}
                  </div>
                  <div className="cart-drawer-item-info">
                    <h4>{item.name}</h4>
                    {item.variantLabel && <p className="cart-item-variant">{item.variantLabel}</p>}
                    <div className="cart-drawer-item-row">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, item.variantId, Number(e.target.value))}
                      />
                      <span>₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                    </div>
                    <button className="link-danger cart-drawer-remove" onClick={() => removeItem(item.productId, item.variantId)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>₹{subtotal.toFixed(2)}</strong>
              </div>
              <button className="btn btn-primary cart-checkout-btn" onClick={goToCheckout}>
                Continue to checkout
              </button>
              <button className="btn btn-secondary cart-checkout-btn" style={{ marginTop: 8 }} onClick={goToCart}>
                View full cart
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
