import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { deleteProduct, duplicateProduct, listProducts, setProductStatus } from "@/api/products";
import { listProductCategories } from "@/api/productCategories";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PRODUCT_STATUS_LABELS, type Product, type ProductCategory, type ProductStatus } from "@/types/product";
import "./Products.css";

const STATUS_OPTIONS: ProductStatus[] = ["draft", "published", "private", "out_of_stock"];

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const pageSize = 20;

  async function refresh() {
    setIsLoading(true);
    try {
      const result = await listProducts({
        search: debouncedSearch,
        status: statusFilter || undefined,
        page,
        pageSize,
      });
      setProducts(result.items);
      setTotal(result.total);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    listProductCategories().then(setCategories);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, page]);

  async function handleDuplicate(product: Product) {
    await duplicateProduct(product.id);
    refresh();
  }

  async function handleToggleStatus(product: Product) {
    const next = product.status === "published" ? "draft" : "published";
    await setProductStatus(product.id, next);
    refresh();
  }

  async function handleDeleteConfirmed() {
    if (!pendingDelete) return;
    await deleteProduct(pendingDelete.id);
    setPendingDelete(null);
    refresh();
  }

  function categoryName(id: string | null): string {
    if (!id) return "—";
    return categories.find((c) => c.id === id)?.name ?? "—";
  }

  function statusBadgeClass(status: ProductStatus): string {
    if (status === "published") return "badge-success";
    if (status === "out_of_stock") return "badge-danger";
    if (status === "private") return "badge-warning";
    return "badge-neutral";
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="products-header">
        <h1>Products</h1>
        <Link to="/products/new" className="btn btn-primary">
          Add product
        </Link>
      </div>

      <div className="products-filters">
        <input
          className="products-search"
          type="search"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value as ProductStatus | "");
          }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {PRODUCT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="data-table-panel">
        {isLoading ? (
          <p className="data-table-empty">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="data-table-empty">No products found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Type</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <Link to={`/products/${product.id}`} className="products-name-link">
                      {product.name}
                    </Link>
                    {product.is_featured && <span className="badge badge-accent products-featured-badge">Featured</span>}
                  </td>
                  <td>{product.sku}</td>
                  <td className="products-type-cell">{product.product_type}</td>
                  <td>{categoryName(product.category_id)}</td>
                  <td>
                    <span className={"badge " + statusBadgeClass(product.status)}>
                      {PRODUCT_STATUS_LABELS[product.status]}
                    </span>
                  </td>
                  <td className="customers-row-actions">
                    <button className="link-action" onClick={() => handleToggleStatus(product)}>
                      {product.status === "published" ? "Unpublish" : "Publish"}
                    </button>
                    <button className="link-action" onClick={() => handleDuplicate(product)}>
                      Duplicate
                    </button>
                    <button className="link-danger" onClick={() => setPendingDelete(product)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="products-pagination">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete product"
          message={`Delete "${pendingDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
