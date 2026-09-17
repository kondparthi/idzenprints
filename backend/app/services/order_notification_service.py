"""
Sends the order-confirmation email (to the customer) and the new-order
notification (to the admin inbox), both with the same PDF invoice
attached. Called after a guest order successfully commits — never
before, and never allowed to roll back the order itself if email
sending fails (see the try/except at the call site in
StorefrontService.create_order).
"""
import logging

from app.config.settings import get_settings
from app.models.guest_order import GuestOrder
from app.services.email_service import EmailService
from app.services.invoice_service import generate_invoice_pdf

logger = logging.getLogger(__name__)


def _money_rows(order: GuestOrder) -> str:
    rows = ""
    for item in order.items:
        label = item.product_name + (f" ({item.variant_label})" if item.variant_label else "")
        rows += (
            f"<tr><td style='padding:8px;border-bottom:1px solid #DAD6C9;'>{label} × {item.quantity}</td>"
            f"<td style='padding:8px;border-bottom:1px solid #DAD6C9;text-align:right;'>₹{item.line_total}</td></tr>"
        )
    return rows


def _customer_email_html(order: GuestOrder) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:#1F3D0A;padding:20px 24px;border-radius:8px 8px 0 0;">
        <span style="color:#fff;font-size:20px;font-weight:bold;">IDZEN Prints</span>
      </div>
      <div style="padding:24px;border:1px solid #DAD6C9;border-top:none;border-radius:0 0 8px 8px;">
        <h2 style="color:#1F3D0A;margin-top:0;">Thanks for your order, {order.guest_name}!</h2>
        <p>Your order <b>{order.order_number}</b> has been received and is
        <b>{order.status.value.replace('_', ' ')}</b>. Your invoice is attached to this email as a PDF.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          {_money_rows(order)}
          <tr><td style="padding:8px;font-weight:bold;">Total</td>
          <td style="padding:8px;text-align:right;font-weight:bold;">₹{order.total}</td></tr>
        </table>
        <p style="margin-top:20px;"><b>Delivery address:</b><br/>{order.shipping_address}</p>
        <p><b>Payment:</b> {"Cash on Delivery" if order.payment_method.value == "cod" else "PhonePe"}</p>
        <p style="color:#5C5F6B;font-size:13px;margin-top:24px;">
          If you have any questions about this order, just reply to this email.
        </p>
      </div>
    </div>
    """


def _admin_email_html(order: GuestOrder) -> str:
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
      <h2 style="color:#1F3D0A;">New order received — {order.order_number}</h2>
      <p><b>{order.guest_name}</b> ({order.guest_phone}, {order.guest_email})</p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        {_money_rows(order)}
        <tr><td style="padding:8px;font-weight:bold;">Total</td>
        <td style="padding:8px;text-align:right;font-weight:bold;">₹{order.total}</td></tr>
      </table>
      <p style="margin-top:16px;"><b>Billing address:</b><br/>{order.billing_address or order.shipping_address}</p>
      <p><b>Shipping address:</b><br/>{order.shipping_address}</p>
      <p><b>Payment:</b> {"Cash on Delivery" if order.payment_method.value == "cod" else "PhonePe"}
      ({order.payment_status.value.replace('_', ' ')})</p>
    </div>
    """


def send_order_notifications(order: GuestOrder) -> None:
    email_service = EmailService()
    if not email_service.is_configured:
        logger.info("SMTP not configured — order %s created without email notifications", order.order_number)
        return

    try:
        invoice_pdf = generate_invoice_pdf(order)
    except Exception:
        logger.exception("Failed to generate invoice PDF for order %s — sending notifications without it", order.order_number)
        invoice_pdf = None

    filename = f"Invoice-{order.order_number}.pdf"

    email_service.send(
        to_email=order.guest_email,
        subject=f"Order confirmed — {order.order_number} — IDZEN Prints",
        html_body=_customer_email_html(order),
        attachment_bytes=invoice_pdf,
        attachment_filename=filename if invoice_pdf else None,
    )

    admin_email = get_settings().admin_email
    if admin_email:
        email_service.send(
            to_email=admin_email,
            subject=f"New order — {order.order_number} — ₹{order.total}",
            html_body=_admin_email_html(order),
            attachment_bytes=invoice_pdf,
            attachment_filename=filename if invoice_pdf else None,
        )
