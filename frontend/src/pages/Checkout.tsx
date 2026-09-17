import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/cart/CartContext";
import { placeGuestOrder } from "@/api/storefront";
import type { PaymentMethod } from "@/types/storefront";
import "./Shop.css";
import StorefrontHeader from "@/storefront/StorefrontHeader";

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [deliverySameAsBilling, setDeliverySameAsBilling] = useState(true);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // While the checkbox is checked, the delivery address stays a live
  // clone of billing — every keystroke in billing propagates instantly,
  // not just a one-time copy at the moment the box is ticked.
  useEffect(() => {
    if (deliverySameAsBilling) {
      setDeliveryAddress(billingAddress);
    }
  }, [deliverySameAsBilling, billingAddress]);

  if (items.length === 0) {
    return (
      <div className="shop-page">
        <StorefrontHeader />
        <div className="cart-page">
          <p className="empty-state">
            Your cart is empty. <Link to="/shop">Go shopping</Link>
          </p>
        </div>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const order = await placeGuestOrder({
        guest_name: name.trim(),
        guest_phone: phone.trim(),
        guest_email: email.trim(),
        billing_address: billingAddress.trim(),
        shipping_address: (deliverySameAsBilling ? billingAddress : deliveryAddress).trim(),
        payment_method: paymentMethod,
        items: items.map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.quantity })),
      });
      clearCart();
      navigate(`/order-confirmation/${order.order_number}?phone=${encodeURIComponent(order.guest_phone)}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        // FastAPI/Pydantic validation errors (422) come back as a list of
        // {loc, msg, type} objects, never a plain string — parse it so
        // the person sees exactly which field and why, not a generic
        // "check your details" message.
        const first = detail[0];
        const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : null;
        const fieldLabel = typeof field === "string" ? field.replace(/_/g, " ") : null;
        setError(fieldLabel ? `${fieldLabel}: ${first.msg}` : first?.msg || "Check your details and try again.");
      } else {
        setError("Could not place your order. Check your details and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="shop-page">
      <StorefrontHeader />

      <div className="checkout-layout">
        <form className="card-panel checkout-form" onSubmit={handleSubmit}>
          <h2 className="product-section-heading" style={{ marginTop: 0 }}>Billing details</h2>
          <div className="field-row">
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="9876543210" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="billingAddress">Billing address</label>
            <textarea
              id="billingAddress"
              rows={3}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              required
            />
          </div>

          <h2 className="product-section-heading">Delivery details</h2>
          <label className="checkout-same-as-checkbox">
            <input
              type="checkbox"
              checked={deliverySameAsBilling}
              onChange={(e) => setDeliverySameAsBilling(e.target.checked)}
            />
            Delivery address same as billing address
          </label>
          {!deliverySameAsBilling && (
            <div className="field">
              <label htmlFor="deliveryAddress">Delivery address</label>
              <textarea
                id="deliveryAddress"
                rows={3}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
              />
            </div>
          )}
          {deliverySameAsBilling && billingAddress && (
            <p className="checkout-same-as-preview">{billingAddress}</p>
          )}

          <h2 className="product-section-heading">Payment method</h2>
          <div className="checkout-payment-options">
            <label className={"checkout-payment-option" + (paymentMethod === "cod" ? " is-selected" : "")}>
              <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
              <div>
                <strong>Cash on Delivery</strong>
                <p>Pay in cash when your order arrives.</p>
              </div>
            </label>
            <label className={"checkout-payment-option" + (paymentMethod === "phonepe" ? " is-selected" : "")}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "phonepe"}
                onChange={() => setPaymentMethod("phonepe")}
              />
              <div>
                <strong>PhonePe</strong>
                <p>Pay securely via UPI, card, or net banking.</p>
              </div>
            </label>
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary checkout-submit-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Placing order…" : `Place order — ₹${subtotal.toFixed(2)}`}
          </button>
        </form>

        <div className="card-panel checkout-summary">
          <h2 className="product-section-heading" style={{ marginTop: 0 }}>Order summary</h2>
          {items.map((item) => (
            <div key={`${item.productId}-${item.variantId}`} className="checkout-summary-row">
              <span>
                {item.name} {item.variantLabel ? `(${item.variantLabel})` : ""} × {item.quantity}
              </span>
              <span>₹{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="checkout-summary-row checkout-summary-total">
            <span>Total</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
