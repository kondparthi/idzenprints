import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/cart/CartContext";
import "./Shop.css";
import StorefrontHeader from "@/storefront/StorefrontHeader";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const navigate = useNavigate();

  return (
    <div className="shop-page">
      <StorefrontHeader />

      <div className="cart-page">
        <h1>Your cart</h1>

        {items.length === 0 ? (
          <div className="empty-state">
            Your cart is empty. <Link to="/shop">Continue shopping</Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="cart-item-row">
                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    {item.variantLabel && <p className="cart-item-variant">{item.variantLabel}</p>}
                    <p className="cart-item-price">₹{item.unitPrice} each</p>
                  </div>
                  <div className="cart-item-qty">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.productId, item.variantId, Number(e.target.value))}
                    />
                  </div>
                  <div className="cart-item-total">₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</div>
                  <button className="link-danger" onClick={() => removeItem(item.productId, item.variantId)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>₹{subtotal.toFixed(2)}</strong>
              </div>
              <button className="btn btn-primary cart-checkout-btn" onClick={() => navigate("/checkout")}>
                Proceed to checkout
              </button>
              <Link to="/shop" className="shop-cart-link" style={{ display: "block", textAlign: "center", marginTop: 12 }}>
                Continue shopping
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
