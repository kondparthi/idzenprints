"""
Generates a PDF invoice for a guest order. Pure function of the order
data — no DB writes, no email sending — so it can be reused wherever an
invoice is needed (the confirmation email, a future "download invoice"
endpoint, etc.) without duplicating the layout logic.
"""
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT

from app.models.guest_order import GuestOrder

_BRAND_DARK = colors.HexColor("#1F3D0A")
_BRAND_ACCENT = colors.HexColor("#3F7A12")
_TEXT_MUTED = colors.HexColor("#5C5F6B")


def generate_invoice_pdf(order: GuestOrder) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=18 * mm, rightMargin=18 * mm
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("InvoiceTitle", parent=styles["Heading1"], textColor=_BRAND_DARK, fontSize=22, spaceAfter=2)
    label_style = ParagraphStyle("Label", parent=styles["Normal"], textColor=_TEXT_MUTED, fontSize=9, spaceAfter=2)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14)
    right_style = ParagraphStyle("Right", parent=body_style, alignment=TA_RIGHT)

    elements = []

    # Header: brand name + invoice meta
    header_table = Table(
        [
            [
                Paragraph("IDZEN Prints", title_style),
                Paragraph(
                    f"<b>Invoice</b><br/>Order {order.order_number}<br/>"
                    f"{order.created_at.strftime('%d %b %Y, %I:%M %p') if order.created_at else ''}",
                    right_style,
                ),
            ]
        ],
        colWidths=[100 * mm, 72 * mm],
    )
    header_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(header_table)
    elements.append(Spacer(1, 6 * mm))
    elements.append(HRFlowable(width="100%", thickness=1, color=_BRAND_ACCENT))
    elements.append(Spacer(1, 6 * mm))

    # Billing / shipping side by side
    billing_lines = f"<b>Billing to</b><br/>{order.guest_name}<br/>{(order.billing_address or order.shipping_address).replace(chr(10), '<br/>')}<br/>{order.guest_phone}<br/>{order.guest_email}"
    shipping_lines = f"<b>Shipping to</b><br/>{order.guest_name}<br/>{order.shipping_address.replace(chr(10), '<br/>')}<br/>{order.guest_phone}"
    addr_table = Table(
        [[Paragraph(billing_lines, body_style), Paragraph(shipping_lines, body_style)]],
        colWidths=[86 * mm, 86 * mm],
    )
    addr_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(addr_table)
    elements.append(Spacer(1, 8 * mm))

    # Line items
    item_rows = [["Item", "Qty", "Unit Price", "Line Total"]]
    for item in order.items:
        name = item.product_name + (f" ({item.variant_label})" if item.variant_label else "")
        item_rows.append([name, str(item.quantity), f"Rs. {item.unit_price}", f"Rs. {item.line_total}"])

    items_table = Table(item_rows, colWidths=[92 * mm, 20 * mm, 30 * mm, 30 * mm])
    items_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), _BRAND_DARK),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("ALIGN", (0, 0), (0, -1), "LEFT"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F0EA")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DAD6C9")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    elements.append(items_table)
    elements.append(Spacer(1, 4 * mm))

    # Totals
    totals_table = Table(
        [
            ["Subtotal", f"Rs. {order.subtotal}"],
            ["Total", f"Rs. {order.total}"],
        ],
        colWidths=[142 * mm, 30 * mm],
    )
    totals_table.setStyle(
        TableStyle(
            [
                ("ALIGN", (0, 0), (-1, -1), "RIGHT"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 1), (-1, 1), 12),
                ("LINEABOVE", (0, 1), (-1, 1), 1, _BRAND_DARK),
                ("TOPPADDING", (0, 1), (-1, 1), 6),
            ]
        )
    )
    elements.append(totals_table)
    elements.append(Spacer(1, 10 * mm))

    payment_label = {"cod": "Cash on Delivery", "phonepe": "PhonePe"}.get(order.payment_method.value, order.payment_method.value)
    status_label = order.payment_status.value.replace("_", " ").title().replace("Cod", "COD")
    elements.append(Paragraph(f"<b>Payment method:</b> {payment_label}", body_style))
    elements.append(Paragraph(f"<b>Payment status:</b> {status_label}", body_style))
    elements.append(Spacer(1, 10 * mm))
    elements.append(
        Paragraph(
            "Thank you for your order — this is a computer-generated invoice and does not require a signature.",
            label_style,
        )
    )

    doc.build(elements)
    return buffer.getvalue()
