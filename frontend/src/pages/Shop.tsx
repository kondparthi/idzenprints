import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listStoreProducts, storeProductImageUrl } from "@/api/storefront";
import type { PublicProductListItem } from "@/types/storefront";
import "./Shop.css";
import StorefrontHeader from "@/storefront/StorefrontHeader";

export default function Shop() {
  const [products, setProducts] = useState<PublicProductListItem[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      listStoreProducts({ search: search || undefined })
        .then(setProducts)
        .finally(() => setIsLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="shop-page">
      <StorefrontHeader />

      <div className="shop-hero">
        <h1>Shop</h1>
        <p>Browse our PVC cards and printed products — no account needed to order.</p>
        <input
          className="shop-search"
          type="search"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="empty-state">Loading products…</p>
      ) : products.length === 0 ? (
        <p className="empty-state">No products found.</p>
      ) : (
        <div className="shop-grid">
          {products.map((p) => (
            <Link key={p.id} to={`/shop/${p.id}`} className="shop-card">
              <div className="shop-card-image">
                {p.primary_image_id ? (
                  <img src={storeProductImageUrl(p.id, p.primary_image_id)} alt={p.name} />
                ) : (
                  <div className="shop-card-image-placeholder" />
                )}
                {!p.in_stock && <span className="shop-out-of-stock-badge">Out of stock</span>}
                {p.is_featured && p.in_stock && <span className="badge badge-accent shop-featured-badge">Featured</span>}
              </div>
              <div className="shop-card-body">
                <h3>{p.name}</h3>
                {p.short_description && <p className="shop-card-desc">{p.short_description}</p>}
                <div className="shop-card-price">
                  {p.sale_price ? (
                    <>
                      <span className="shop-price-sale">₹{p.sale_price}</span>
                      <span className="shop-price-regular">₹{p.regular_price}</span>
                    </>
                  ) : (
                    <span className="shop-price-sale">₹{p.regular_price ?? "—"}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
