"""
Public storefront: product catalog (published + publicly visible only)
and guest checkout. Reuses ProductPricingService.resolve_effective_price
for sale/bulk pricing rather than re-deriving it — same rule, one place.
"""
import datetime
import logging
from decimal import Decimal
from typing import Optional, Union

from sqlalchemy.orm import Session

from app.models.guest_order import GuestOrder, GuestOrderItem, OrderStatus, PaymentMethod, PaymentStatus
from app.models.product import Product, ProductVisibility, ProductStatus
from app.models.product_variant import ProductVariant
from app.repositories.guest_order_repository import GuestOrderRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.storefront import CartItemInput, GuestOrderCreate
from app.services.order_notification_service import send_order_notifications
from app.services.product_pricing_service import ProductPricingService

logger = logging.getLogger(__name__)

_PUBLIC_VISIBILITY = [ProductVisibility.VISIBLE, ProductVisibility.CATALOG_ONLY]


class ProductNotAvailableError(Exception):
    pass


class OutOfStockError(Exception):
    def __init__(self, product_name: str):
        self.product_name = product_name
        super().__init__(f"{product_name} is out of stock")


class StorefrontService:
    def __init__(self, db: Session):
        self.db = db
        self.product_repo = ProductRepository(db)
        self.order_repo = GuestOrderRepository(db)
        self.pricing_service = ProductPricingService(db)

    # ---------- Catalog ----------

    def list_products(
        self, search: Optional[str] = None, category_id: Optional[str] = None, brand_id: Optional[str] = None,
        page: int = 1, page_size: int = 20,
    ) -> tuple[list[Product], int]:
        return self.product_repo.list(
            search=search, status_filter=ProductStatus.PUBLISHED, category_id=category_id, brand_id=brand_id,
            visibility_in=_PUBLIC_VISIBILITY, page=page, page_size=page_size,
        )

    def get_product(self, product_id: str) -> Product:
        product = self.product_repo.get_by_id(product_id)
        if not product or product.status != ProductStatus.PUBLISHED or product.visibility not in (
            _PUBLIC_VISIBILITY + [ProductVisibility.SEARCH_ONLY]
        ):
            raise ProductNotAvailableError(product_id)
        return product

    @staticmethod
    def is_in_stock(sellable: Union[Product, ProductVariant]) -> bool:
        if not sellable.manage_stock:
            return True
        return (sellable.stock_quantity or 0) > 0 or sellable.backorders.value != "no"

    def effective_price(self, sellable: Union[Product, ProductVariant], product_id: str, quantity: int = 1) -> Decimal:
        result = self.pricing_service.resolve_effective_price(
            sellable, customer_id=None, quantity=quantity, product_id_for_lookups=product_id
        )
        return result.price

    # ---------- Guest checkout ----------

    def _generate_order_number(self) -> str:
        today_prefix = f"ORD{datetime.date.today().strftime('%Y%m%d')}"
        # Retried on collision below, but this covers the normal case
        # without a full table scan — count of today's orders so far.
        seq = self.order_repo.count_with_number_prefix(today_prefix) + 1
        return f"{today_prefix}-{seq:04d}"

    def create_order(self, data: GuestOrderCreate) -> GuestOrder:
        line_items: list[GuestOrderItem] = []
        subtotal = Decimal("0")

        for cart_item in data.items:
            product = self.product_repo.get_by_id(cart_item.product_id)
            if not product or product.status != ProductStatus.PUBLISHED:
                raise ProductNotAvailableError(cart_item.product_id)

            sellable: Union[Product, ProductVariant] = product
            variant_label = None
            if cart_item.variant_id:
                variant = next((v for v in product.variants if v.id == cart_item.variant_id), None)
                if not variant:
                    raise ProductNotAvailableError(cart_item.variant_id)
                sellable = variant
                variant_label = ", ".join(f"{k}: {v}" for k, v in variant.attribute_values.items())

            if not self.is_in_stock(sellable):
                raise OutOfStockError(product.name)

            unit_price = self.effective_price(sellable, product.id, cart_item.quantity)
            line_total = unit_price * cart_item.quantity
            subtotal += line_total

            line_items.append(
                GuestOrderItem(
                    product_id=product.id,
                    variant_id=cart_item.variant_id,
                    product_name=product.name,
                    variant_label=variant_label,
                    unit_price=unit_price,
                    quantity=cart_item.quantity,
                    line_total=line_total,
                )
            )

        # Shipping/tax aren't modeled yet — total mirrors subtotal for now
        # rather than silently inventing a number; a future phase can add
        # a real shipping-cost/tax calculation without changing this shape.
        total = subtotal

        payment_status = PaymentStatus.COD_PENDING if data.payment_method == PaymentMethod.COD else PaymentStatus.PENDING
        order_status = OrderStatus.CONFIRMED if data.payment_method == PaymentMethod.COD else OrderStatus.PENDING

        order = GuestOrder(
            order_number=self._generate_order_number(),
            guest_name=data.guest_name,
            guest_phone=data.guest_phone,
            guest_email=data.guest_email,
            billing_address=data.billing_address,
            shipping_address=data.shipping_address,
            payment_method=data.payment_method,
            payment_status=payment_status,
            status=order_status,
            subtotal=subtotal,
            total=total,
        )
        order.items = line_items

        # Retry a couple of times on the (very unlikely) chance two
        # orders generate the same sequence number in the same instant.
        created_order = None
        for attempt in range(3):
            try:
                created_order = self.order_repo.create(order)
                break
            except Exception:
                self.db.rollback()
                if attempt == 2:
                    raise
                order.order_number = self._generate_order_number()

        # Email notifications are a nice-to-have on top of a successful
        # order, never a reason to fail one that already committed —
        # any exception here (bad credentials, network blip, whatever)
        # is caught and logged inside send_order_notifications itself,
        # but this try/except is a last-resort backstop so a surprise
        # bug in the email code path can never turn a successful order
        # into a 500 for the customer.
        try:
            send_order_notifications(created_order)
        except Exception:
            logger.exception("Order %s created successfully but notification sending failed", created_order.order_number)

        return created_order

    def get_order_for_receipt(self, order_number: str, guest_phone: str) -> Optional[GuestOrder]:
        order = self.order_repo.get_by_order_number(order_number)
        if not order or order.guest_phone != guest_phone:
            return None
        return order
