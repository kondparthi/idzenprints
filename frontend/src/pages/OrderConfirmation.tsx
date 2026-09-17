import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { lookupGuestOrder } from "@/api/storefront";
import type { GuestOrder } from "@/types/storefront";
import "./Shop.css";
import StorefrontHeader from "@/storefront/StorefrontHeader";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending payment",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Payment pending",
  cod_pending: "Pay on delivery",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

export default function OrderConfirmation() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const phoneFromUrl = searchParams.get("phone");

  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [phoneInput, setPhoneInput] = useState(phoneFromUrl ?? "");
  const [isLoading, setIsLoading] = useState(Boolean(phoneFromUrl));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber || !phoneFromUrl) return;
    lookupGuestOrder(orderNumber, phoneFromUrl)
      .then(setOrder)
      .catch(() => setError("Could not find that order."))
      .finally(() => setIsLoading(false));
  }, [orderNumber, phoneFromUrl]);

  async function handleLookup() {
    if (!orderNumber || !phoneInput) return;
    setError(null);
    setIsLoading(true);
    try {
      setOrder(await lookupGuestOrder(orderNumber, phoneInput));
    } catch {
      setError("No order found with that number and phone.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="shop-page">
      <StorefrontHeader />

      <div className="cart-page">
        {!order ? (
          <div className="card-panel checkout-form" style={{ maxWidth: 420, margin: "0 auto" }}>
            <h2 className="product-section-heading" style={{ marginTop: 0 }}>Find your order</h2>
            <div className="field">
              <label htmlFor="lookupPhone">Phone number used for the order</label>
              <input id="lookupPhone" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary" onClick={handleLookup} disabled={isLoading}>
              {isLoading ? "Looking up…" : "Find order"}
            </button>
          </div>
        ) : (
          <div className="order-receipt">
            <div className="register-success-icon">✓</div>
            <h1>Order placed!</h1>
            <p className="dashboard-subtitle">
              Order <strong>{order.order_number}</strong> — {STATUS_LABELS[order.status] ?? order.status}
            </p>

            <div className="card-panel" style={{ textAlign: "left", marginTop: 24 }}>
              <h2 className="product-section-heading" style={{ marginTop: 0 }}>Items</h2>
              {order.items.map((item) => (
                <div key={item.id} className="checkout-summary-row">
                  <span>
                    {item.product_name} {item.variant_label ? `(${item.variant_label})` : ""} × {item.quantity}
                  </span>
                  <span>₹{item.line_total}</span>
                </div>
              ))}
              <div className="checkout-summary-row checkout-summary-total">
                <span>Total</span>
                <span>₹{order.total}</span>
              </div>

              <h2 className="product-section-heading">Delivery</h2>
              <p>{order.guest_name}</p>
              <p>{order.shipping_address}</p>
              <p>{order.guest_phone}</p>

              <h2 className="product-section-heading">Payment</h2>
              <p>
                {order.payment_method === "cod" ? "Cash on Delivery" : "PhonePe"} —{" "}
                {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
              </p>
            </div>

            <Link to="/shop" className="btn btn-primary" style={{ marginTop: 24, display: "inline-block" }}>
              Continue shopping
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
