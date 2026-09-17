import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getStoreProduct, storeProductImageUrl } from "@/api/storefront";
import { useCart } from "@/cart/CartContext";
import type { PublicProductDetail, PublicVariant } from "@/types/storefront";
import "./Shop.css";
import StorefrontHeader from "@/storefront/StorefrontHeader";

export default function ProductPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<PublicProductDetail | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<PublicVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!productId) return;
    getStoreProduct(productId)
      .then((p) => {
        setProduct(p);
        if (p.product_type === "variable" && p.variants.length > 0) {
          setSelectedVariant(p.variants[0]);
        }
        const primaryIdx = p.images.findIndex((img) => img.is_primary);
        setActiveImageIndex(primaryIdx >= 0 ? primaryIdx : 0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [productId]);

  // Close the lightbox on Escape, and let arrow keys page through images
  // while it's open — the keyboard-accessible half of the carousel.
  useEffect(() => {
    if (!isLightboxOpen || !product) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsLightboxOpen(false);
      if (e.key === "ArrowRight") setActiveImageIndex((i) => (i + 1) % product!.images.length);
      if (e.key === "ArrowLeft") setActiveImageIndex((i) => (i - 1 + product!.images.length) % product!.images.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isLightboxOpen, product]);

  if (isLoading) return <p className="empty-state">Loading…</p>;
  if (notFound || !product) return <p className="empty-state">Product not found.</p>;

  const activeSellable = selectedVariant ?? product;
  const price = activeSellable.sale_price ?? activeSellable.regular_price;
  const inStock = selectedVariant ? selectedVariant.in_stock : product.in_stock;
  const images = product.images;
  const activeImage = images[activeImageIndex] ?? images[0];
  const primaryImage = images.find((img) => img.is_primary) ?? images[0];

  function goToImage(index: number) {
    setActiveImageIndex((index + images.length) % images.length);
  }

  function handleAddToCart() {
    if (!product) return;
    addItem({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      name: product.name,
      variantLabel: selectedVariant
        ? Object.entries(selectedVariant.attribute_values).map(([k, v]) => `${k}: ${v}`).join(", ")
        : null,
      unitPrice: price ?? "0",
      quantity,
      imageId: primaryImage?.id ?? null,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="shop-page">
      <StorefrontHeader />

      <div className="product-detail">
        <div className="product-gallery">
          <div className="product-detail-image">
            {activeImage ? (
              <>
                <img src={storeProductImageUrl(product.id, activeImage.id)} alt={product.name} />
                <button
                  type="button"
                  className="product-zoom-btn"
                  aria-label="Zoom image"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                  </svg>
                </button>
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="product-gallery-nav product-gallery-nav-prev"
                      aria-label="Previous image"
                      onClick={() => goToImage(activeImageIndex - 1)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="product-gallery-nav product-gallery-nav-next"
                      aria-label="Next image"
                      onClick={() => goToImage(activeImageIndex + 1)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="shop-card-image-placeholder" style={{ height: "100%" }} />
            )}
          </div>

          {images.length > 1 && (
            <div className="product-thumbnails">
              {images.map((img, idx) => (
                <button
                  type="button"
                  key={img.id}
                  className={"product-thumbnail" + (idx === activeImageIndex ? " is-active" : "")}
                  onClick={() => goToImage(idx)}
                >
                  <img src={storeProductImageUrl(product.id, img.id)} alt={`${product.name} thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail-info">
          <h1>{product.name}</h1>
          {product.short_description && <p className="product-detail-short">{product.short_description}</p>}

          <div className="product-detail-price">
            <span className="shop-price-sale">₹{price ?? "—"}</span>
            {activeSellable.sale_price && <span className="shop-price-regular">₹{activeSellable.regular_price}</span>}
          </div>

          {product.product_type === "variable" && product.variants.length > 0 && (
            <div className="field">
              <label>Options</label>
              <div className="register-member-type-grid">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={"register-member-type-chip" + (selectedVariant?.id === v.id ? " is-selected" : "")}
                    onClick={() => setSelectedVariant(v)}
                  >
                    {Object.values(v.attribute_values).join(" / ") || v.sku}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="product-detail-qty-row">
            <label htmlFor="qty">Quantity</label>
            <input
              id="qty"
              type="number"
              min="1"
              max="99"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            />
          </div>

          {!inStock ? (
            <button className="btn btn-secondary" disabled>
              Out of stock
            </button>
          ) : (
            <button className="btn btn-primary product-detail-add-btn" onClick={handleAddToCart}>
              {added ? "Added ✓" : "Add to cart"}
            </button>
          )}

          {added && (
            <button className="btn btn-secondary" style={{ marginLeft: 12 }} onClick={() => navigate("/cart")}>
              View cart
            </button>
          )}

          {product.description && (
            <>
              <h2 className="section-heading">Description</h2>
              <p className="product-detail-description">{product.description}</p>
            </>
          )}
        </div>
      </div>

      {isLightboxOpen && activeImage && (
        <div className="product-lightbox" onClick={() => setIsLightboxOpen(false)}>
          <button className="product-lightbox-close" aria-label="Close" onClick={() => setIsLightboxOpen(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img
            src={storeProductImageUrl(product.id, activeImage.id)}
            alt={product.name}
            className="product-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button
                className="product-lightbox-nav product-lightbox-nav-prev"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  goToImage(activeImageIndex - 1);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                className="product-lightbox-nav product-lightbox-nav-next"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  goToImage(activeImageIndex + 1);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              <div className="product-lightbox-counter">
                {activeImageIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
