import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addProductImage,
  addProductVariant,
  createProduct,
  deleteProductImage,
  deleteProductVariant,
  fetchProductImageUrl,
  getProduct,
  setPrimaryProductImage,
  updateProduct,
  listBulkTiers,
  addBulkTier,
  deleteBulkTier,
  listCustomerPrices,
  setCustomerPrice,
  deleteCustomerPrice,
  adjustStock,
  listInventoryHistory,
} from "@/api/products";
import { listProductCategories } from "@/api/productCategories";
import { listBrands } from "@/api/brands";
import { createTag, listTags } from "@/api/tags";
import { listCustomers } from "@/api/customers";
import {
  PRODUCT_STATUS_LABELS,
  PRODUCT_VISIBILITY_LABELS,
  TAX_CLASS_LABELS,
  TAX_STATUS_LABELS,
  STOCK_STATUS_LABELS,
  BACKORDERS_LABELS,
  type Backorders,
  type Brand,
  type InventoryAdjustment,
  type Product,
  type ProductBulkPricingTier,
  type ProductCategory,
  type ProductCustomerPrice,
  type ProductImage,
  type ProductStatus,
  type ProductType,
  type ProductVariant,
  type ProductVisibility,
  type StockStatus,
  type Tag,
  type TaxClass,
  type TaxStatus,
} from "@/types/product";
import type { Customer } from "@/types/customer";
import "./ProductForm.css";

const STATUS_OPTIONS: ProductStatus[] = ["draft", "published", "private", "out_of_stock"];
const VISIBILITY_OPTIONS: ProductVisibility[] = ["visible", "catalog_only", "search_only", "hidden"];
const TAX_STATUS_OPTIONS: TaxStatus[] = ["taxable", "shipping_only", "none"];
const TAX_CLASS_OPTIONS: TaxClass[] = ["standard", "reduced_rate", "zero_rate"];
const STOCK_STATUS_OPTIONS: StockStatus[] = ["in_stock", "out_of_stock", "on_backorder"];
const BACKORDERS_OPTIONS: Backorders[] = ["no", "notify", "yes"];

export default function ProductForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productType, setProductType] = useState<ProductType>("simple");
  const [status, setStatus] = useState<ProductStatus>("draft");
  const [visibility, setVisibility] = useState<ProductVisibility>("visible");
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");

  const [regularPrice, setRegularPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleStartDate, setSaleStartDate] = useState("");
  const [saleEndDate, setSaleEndDate] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [taxStatus, setTaxStatus] = useState<TaxStatus>("taxable");
  const [taxClass, setTaxClass] = useState<TaxClass>("standard");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");

  const [manageStock, setManageStock] = useState(false);
  const [stockQuantity, setStockQuantity] = useState<number | null>(null);
  const [stockStatus, setStockStatus] = useState<StockStatus>("in_stock");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [backorders, setBackorders] = useState<Backorders>("no");

  const [adjustTargetVariantId, setAdjustTargetVariantId] = useState("");
  const [adjustMode, setAdjustMode] = useState<"set" | "delta">("set");
  const [adjustValue, setAdjustValue] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [inventoryHistory, setInventoryHistory] = useState<InventoryAdjustment[]>([]);
  const [stockError, setStockError] = useState<string | null>(null);

  const [bulkTiers, setBulkTiers] = useState<ProductBulkPricingTier[]>([]);
  const [tierMinQty, setTierMinQty] = useState("");
  const [tierMaxQty, setTierMaxQty] = useState("");
  const [tierPrice, setTierPrice] = useState("");

  const [customerPrices, setCustomerPrices] = useState<ProductCustomerPrice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerPriceValue, setCustomerPriceValue] = useState("");

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProductCategories().then(setCategories);
    listBrands().then(setBrands);
    listTags().then(setAllTags);
    listCustomers("", 1, 100).then((r) => setCustomers(r.items));
  }, []);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((product: Product) => {
        setName(product.name);
        setSku(product.sku);
        setDescription(product.description ?? "");
        setShortDescription(product.short_description ?? "");
        setCategoryId(product.category_id ?? "");
        setBrandId(product.brand_id ?? "");
        setProductType(product.product_type);
        setStatus(product.status);
        setVisibility(product.visibility);
        setIsFeatured(product.is_featured);
        setSelectedTagIds(product.tags.map((t) => t.id));
        setImages(product.images);
        setVariants(product.variants);
        setRegularPrice(product.regular_price ?? "");
        setSalePrice(product.sale_price ?? "");
        setSaleStartDate(product.sale_start_date ?? "");
        setSaleEndDate(product.sale_end_date ?? "");
        setCostPrice(product.cost_price ?? "");
        setTaxStatus(product.tax_status);
        setTaxClass(product.tax_class);
        setMinQuantity(product.min_quantity?.toString() ?? "");
        setMaxQuantity(product.max_quantity?.toString() ?? "");
        setManageStock(product.manage_stock);
        setStockQuantity(product.stock_quantity);
        setStockStatus(product.stock_status);
        setLowStockThreshold(product.low_stock_threshold?.toString() ?? "");
        setBackorders(product.backorders);
      })
      .finally(() => setIsLoading(false));
    listBulkTiers(id).then(setBulkTiers);
    listCustomerPrices(id).then(setCustomerPrices);
    listInventoryHistory(id).then(setInventoryHistory);
  }, [id]);

  useEffect(() => {
    if (!id || images.length === 0) return;
    let cancelled = false;
    images.forEach((img) => {
      if (imagePreviews[img.id]) return;
      fetchProductImageUrl(id, img.id).then((url) => {
        if (!cancelled) setImagePreviews((prev) => ({ ...prev, [img.id]: url }));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, images]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]));
  }

  async function handleAddNewTag() {
    if (!newTagName.trim()) return;
    const tag = await createTag(newTagName.trim());
    setNewTagName("");
    setAllTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]));
    setSelectedTagIds((prev) => (prev.includes(tag.id) ? prev : [...prev, tag.id]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        sku,
        description: description || undefined,
        short_description: shortDescription || undefined,
        category_id: categoryId || null,
        brand_id: brandId || null,
        product_type: productType,
        status,
        visibility,
        is_featured: isFeatured,
        tag_ids: selectedTagIds,
        regular_price: regularPrice || null,
        sale_price: salePrice || null,
        sale_start_date: saleStartDate || null,
        sale_end_date: saleEndDate || null,
        cost_price: costPrice || null,
        tax_status: taxStatus,
        tax_class: taxClass,
        min_quantity: minQuantity ? Number(minQuantity) : null,
        max_quantity: maxQuantity ? Number(maxQuantity) : null,
        manage_stock: manageStock,
        low_stock_threshold: lowStockThreshold ? Number(lowStockThreshold) : null,
        backorders,
        // stock_status is only manually settable when stock isn't managed —
        // when it is, the adjust-stock action derives it automatically and
        // this field is left out so it can't clobber that with a stale value.
        ...(manageStock ? {} : { stock_status: stockStatus }),
      };
      if (isEditMode && id) {
        await updateProduct(id, payload);
        navigate("/products");
      } else {
        const created = await createProduct(payload);
        // Images and variants need a saved product first — jump straight
        // into edit mode so those panels appear.
        navigate(`/products/${created.id}`, { replace: true });
      }
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError("That SKU is already in use by another product.");
      } else if (err?.response?.status === 422) {
        const detail = err.response.data?.detail;
        const rawMessage = Array.isArray(detail) ? detail[0]?.msg : detail;
        const message = typeof rawMessage === "string" ? rawMessage.replace(/^Value error,\s*/, "") : rawMessage;
        setError(message || "Check the pricing and other fields — something didn't validate.");
      } else {
        setError("Could not save this product. Check the details and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (!id) return;
    await addProductImage(id, file, images.length === 0);
    const refreshed = await getProduct(id);
    setImages(refreshed.images);
  }

  async function handleSetPrimary(imageId: string) {
    if (!id) return;
    await setPrimaryProductImage(id, imageId);
    const refreshed = await getProduct(id);
    setImages(refreshed.images);
  }

  async function handleDeleteImage(imageId: string) {
    if (!id) return;
    await deleteProductImage(id, imageId);
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  const [variantSku, setVariantSku] = useState("");
  const [variantAttrs, setVariantAttrs] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantMinQty, setVariantMinQty] = useState("");
  const [variantManageStock, setVariantManageStock] = useState(false);
  const [variantStockQty, setVariantStockQty] = useState("");

  async function handleAddVariant() {
    if (!id || !variantSku.trim()) return;
    const attribute_values: Record<string, string> = {};
    variantAttrs.split(",").forEach((pair) => {
      const [key, value] = pair.split(":").map((s) => s.trim());
      if (key && value) attribute_values[key] = value;
    });
    const variant = await addProductVariant(id, {
      sku: variantSku.trim(),
      attribute_values,
      regular_price: variantPrice || null,
      min_quantity: variantMinQty ? Number(variantMinQty) : null,
      manage_stock: variantManageStock,
      stock_quantity: variantManageStock && variantStockQty ? Number(variantStockQty) : null,
    });
    setVariants((prev) => [...prev, variant]);
    setVariantSku("");
    setVariantAttrs("");
    setVariantPrice("");
    setVariantMinQty("");
    setVariantManageStock(false);
    setVariantStockQty("");
  }

  async function handleDeleteVariant(variantId: string) {
    if (!id) return;
    await deleteProductVariant(id, variantId);
    setVariants((prev) => prev.filter((v) => v.id !== variantId));
  }

  async function handleAddBulkTier() {
    if (!id || !tierMinQty || !tierPrice) return;
    const tier = await addBulkTier(id, {
      min_quantity: Number(tierMinQty),
      max_quantity: tierMaxQty ? Number(tierMaxQty) : null,
      price: tierPrice,
    });
    setBulkTiers((prev) => [...prev, tier].sort((a, b) => a.min_quantity - b.min_quantity));
    setTierMinQty("");
    setTierMaxQty("");
    setTierPrice("");
  }

  async function handleDeleteBulkTier(tierId: string) {
    if (!id) return;
    await deleteBulkTier(id, tierId);
    setBulkTiers((prev) => prev.filter((t) => t.id !== tierId));
  }

  async function handleSetCustomerPrice() {
    if (!id || !selectedCustomerId || !customerPriceValue) return;
    const entry = await setCustomerPrice(id, selectedCustomerId, customerPriceValue);
    setCustomerPrices((prev) => [...prev.filter((p) => p.customer_id !== selectedCustomerId), entry]);
    setSelectedCustomerId("");
    setCustomerPriceValue("");
  }

  async function handleDeleteCustomerPrice(priceId: string) {
    if (!id) return;
    await deleteCustomerPrice(id, priceId);
    setCustomerPrices((prev) => prev.filter((p) => p.id !== priceId));
  }

  function customerName(customerId: string): string {
    return customers.find((c) => c.id === customerId)?.name ?? customerId;
  }

  async function handleAdjustStock() {
    if (!id || !adjustValue) return;
    setStockError(null);
    try {
      const adjustment = await adjustStock(id, {
        variant_id: adjustTargetVariantId || null,
        ...(adjustMode === "set" ? { quantity: Number(adjustValue) } : { delta: Number(adjustValue) }),
        reason: adjustReason || undefined,
      });
      setInventoryHistory((prev) => [adjustment, ...prev]);
      if (!adjustTargetVariantId) {
        setStockQuantity(adjustment.new_quantity);
        const refreshed = await getProduct(id);
        setStockStatus(refreshed.stock_status);
      } else {
        const refreshed = await getProduct(id);
        setVariants(refreshed.variants);
      }
      setAdjustValue("");
      setAdjustReason("");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setStockError("Turn on stock management before adjusting quantity.");
      } else if (err?.response?.status === 422) {
        setStockError(err.response.data?.detail || "That adjustment isn't valid.");
      } else {
        setStockError("Could not record this stock adjustment.");
      }
    }
  }

  function variantLabel(variantId: string | null): string {
    if (!variantId) return "This product";
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return variantId;
    const attrs = Object.entries(variant.attribute_values)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    return `${variant.sku}${attrs ? ` (${attrs})` : ""}`;
  }

  if (isLoading) {
    return <p className="empty-state">Loading product…</p>;
  }

  const subCategories = categories.filter((c) => c.parent_id);
  const topCategories = categories.filter((c) => !c.parent_id);

  return (
    <div className="product-form-page">
      <h1>{isEditMode ? "Edit product" : "Add product"}</h1>

      <form className="card-panel product-form" onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="name">Product name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="sku">SKU / Product code</label>
            <input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
          </div>
        </div>

        <div className="field">
          <label htmlFor="shortDescription">Short description</label>
          <textarea id="shortDescription" rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="category">Category</label>
            <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {topCategories.map((c) => (
                <optgroup key={c.id} label={c.name}>
                  <option value={c.id}>{c.name}</option>
                  {subCategories
                    .filter((sc) => sc.parent_id === c.id)
                    .map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        — {sc.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="brand">Brand</label>
            <select id="brand" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">No brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Tags</label>
          <div className="product-tags-picker">
            {allTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={"product-tag-chip" + (selectedTagIds.includes(tag.id) ? " is-selected" : "")}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
          <div className="product-tag-add-row">
            <input
              placeholder="New tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddNewTag();
                }
              }}
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddNewTag}>
              Add tag
            </button>
          </div>
        </div>

        <div className="field">
          <label>Product type</label>
          <div className="product-type-options">
            <label className="product-radio">
              <input
                type="radio"
                name="productType"
                checked={productType === "simple"}
                onChange={() => setProductType("simple")}
              />
              Simple product — single product without variations
            </label>
            <label className="product-radio">
              <input
                type="radio"
                name="productType"
                checked={productType === "variable"}
                onChange={() => setProductType("variable")}
              />
              Variable product — has size, color, etc.
            </label>
          </div>
        </div>

        {productType === "simple" ? (
          <div className="product-pricing-section">
            <h3 className="product-section-heading">Pricing</h3>
            <div className="field-row">
              <div className="field">
                <label htmlFor="regularPrice">Regular price (₹)</label>
                <input id="regularPrice" type="number" min="0" step="0.01" value={regularPrice} onChange={(e) => setRegularPrice(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="salePrice">Sale price (₹)</label>
                <input id="salePrice" type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="saleStartDate">Sale start date</label>
                <input id="saleStartDate" type="date" value={saleStartDate} onChange={(e) => setSaleStartDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="saleEndDate">Sale end date</label>
                <input id="saleEndDate" type="date" value={saleEndDate} onChange={(e) => setSaleEndDate(e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="costPrice">Cost price (₹)</label>
                <input id="costPrice" type="number" min="0" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="taxStatus">Tax status</label>
                <select id="taxStatus" value={taxStatus} onChange={(e) => setTaxStatus(e.target.value as TaxStatus)}>
                  {TAX_STATUS_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {TAX_STATUS_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="taxClass">Tax class</label>
                <select id="taxClass" value={taxClass} onChange={(e) => setTaxClass(e.target.value as TaxClass)}>
                  {TAX_CLASS_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {TAX_CLASS_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="minQuantity">Minimum order quantity</label>
                <input id="minQuantity" type="number" min="1" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="maxQuantity">Maximum order quantity</label>
                <input id="maxQuantity" type="number" min="1" value={maxQuantity} onChange={(e) => setMaxQuantity(e.target.value)} />
              </div>
            </div>
          </div>
        ) : (
          <p className="product-form-hint">
            Pricing for variable products is set per variant below (after saving), since size/color combinations
            often cost different amounts.
          </p>
        )}

        {productType === "simple" && (
          <div className="product-pricing-section">
            <h3 className="product-section-heading">Inventory</h3>
            <label className="product-featured-checkbox">
              <input type="checkbox" checked={manageStock} onChange={(e) => setManageStock(e.target.checked)} />
              Track stock quantity for this product
            </label>

            {manageStock ? (
              <p className="product-form-hint">
                Current quantity: <strong>{stockQuantity ?? 0}</strong> — stock status updates automatically as you
                adjust it below. Use the "Adjust stock" panel after saving to change the quantity (so it's logged in
                the history).
              </p>
            ) : (
              <div className="field">
                <label htmlFor="stockStatus">Stock status</label>
                <select id="stockStatus" value={stockStatus} onChange={(e) => setStockStatus(e.target.value as StockStatus)}>
                  {STOCK_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STOCK_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field-row">
              <div className="field">
                <label htmlFor="lowStockThreshold">Low stock threshold</label>
                <input
                  id="lowStockThreshold"
                  type="number"
                  min="0"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="backorders">Allow backorders</label>
                <select id="backorders" value={backorders} onChange={(e) => setBackorders(e.target.value as Backorders)}>
                  {BACKORDERS_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {BACKORDERS_LABELS[b]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="field-row">
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {PRODUCT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="visibility">Visibility</label>
            <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as ProductVisibility)}>
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {PRODUCT_VISIBILITY_LABELS[v]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="product-featured-checkbox">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          Featured product
        </label>

        {error && <p className="error-text">{error}</p>}

        <div className="product-form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/products")}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save product"}
          </button>
        </div>
      </form>

      {isEditMode && id && (
        <div className="card-panel product-images-panel">
          <h2>Images</h2>
          <p className="product-form-hint">The first image (or the one you mark) is the featured image shown in listings; the rest are gallery images.</p>
          <div className="product-images-grid">
            {images.map((img) => (
              <div key={img.id} className={"product-image-tile" + (img.is_primary ? " is-primary" : "")}>
                {imagePreviews[img.id] ? (
                  <img src={imagePreviews[img.id]} alt={img.original_filename} />
                ) : (
                  <div className="product-image-loading">Loading…</div>
                )}
                {img.is_primary && <span className="badge badge-accent product-image-badge">Featured</span>}
                <div className="product-image-actions">
                  {!img.is_primary && (
                    <button type="button" className="link-action" onClick={() => handleSetPrimary(img.id)}>
                      Make featured
                    </button>
                  )}
                  <button type="button" className="link-danger" onClick={() => handleDeleteImage(img.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            <label className="product-image-upload-tile">
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = "";
                }}
              />
              + Upload image
            </label>
          </div>
        </div>
      )}

      {isEditMode && id && productType === "variable" && (
        <div className="card-panel product-variants-panel">
          <h2>Variants</h2>
          <p className="product-form-hint">Each variant needs its own SKU. Attributes like Size and Color, comma-separated (e.g. Size:M, Color:Red).</p>

          <div className="product-variant-add-row">
            <input placeholder="Variant SKU" value={variantSku} onChange={(e) => setVariantSku(e.target.value)} />
            <input
              placeholder="Size:M, Color:Red"
              value={variantAttrs}
              onChange={(e) => setVariantAttrs(e.target.value)}
            />
            <input
              placeholder="Price (₹)"
              type="number"
              min="0"
              step="0.01"
              value={variantPrice}
              onChange={(e) => setVariantPrice(e.target.value)}
            />
            <input
              placeholder="Min qty"
              type="number"
              min="1"
              value={variantMinQty}
              onChange={(e) => setVariantMinQty(e.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddVariant}>
              Add variant
            </button>
          </div>
          <label className="product-radio product-variant-stock-toggle">
            <input type="checkbox" checked={variantManageStock} onChange={(e) => setVariantManageStock(e.target.checked)} />
            Track stock for this variant
          </label>
          {variantManageStock && (
            <input
              className="product-variant-stock-qty-input"
              placeholder="Starting quantity"
              type="number"
              min="0"
              value={variantStockQty}
              onChange={(e) => setVariantStockQty(e.target.value)}
            />
          )}

          {variants.length === 0 ? (
            <p className="empty-state">No variants yet — add one above.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Attributes</th>
                  <th>Price</th>
                  <th>Min qty</th>
                  <th>Stock</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td>{v.sku}</td>
                    <td>
                      {Object.entries(v.attribute_values)
                        .map(([k, val]) => `${k}: ${val}`)
                        .join(", ") || "—"}
                    </td>
                    <td>{v.regular_price ? `₹${v.regular_price}` : "—"}</td>
                    <td>{v.min_quantity ?? "—"}</td>
                    <td>
                      {v.manage_stock ? (
                        <span className={"badge " + (v.stock_status === "in_stock" ? "badge-success" : v.stock_status === "on_backorder" ? "badge-warning" : "badge-danger")}>
                          {v.stock_quantity ?? 0} — {STOCK_STATUS_LABELS[v.stock_status]}
                        </span>
                      ) : (
                        "Not tracked"
                      )}
                    </td>
                    <td className="customers-row-actions">
                      <button className="link-danger" onClick={() => handleDeleteVariant(v.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isEditMode && id && productType === "simple" && (
        <div className="card-panel product-bulk-pricing-panel">
          <h2>Bulk pricing</h2>
          <p className="product-form-hint">
            Quantity-based price breaks — e.g. 10-49 units at ₹90 each, 50+ at ₹80. Leave "up to" blank for the top,
            open-ended tier.
          </p>

          <div className="product-variant-add-row">
            <input placeholder="Min qty" type="number" min="1" value={tierMinQty} onChange={(e) => setTierMinQty(e.target.value)} />
            <input placeholder="Up to (optional)" type="number" min="1" value={tierMaxQty} onChange={(e) => setTierMaxQty(e.target.value)} />
            <input placeholder="Price (₹)" type="number" min="0" step="0.01" value={tierPrice} onChange={(e) => setTierPrice(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={handleAddBulkTier}>
              Add tier
            </button>
          </div>

          {bulkTiers.length === 0 ? (
            <p className="empty-state">No bulk pricing tiers yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {bulkTiers.map((tier) => (
                  <tr key={tier.id}>
                    <td>
                      {tier.min_quantity}
                      {tier.max_quantity ? `–${tier.max_quantity}` : "+"}
                    </td>
                    <td>₹{tier.price}</td>
                    <td className="customers-row-actions">
                      <button className="link-danger" onClick={() => handleDeleteBulkTier(tier.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isEditMode && id && productType === "simple" && (
        <div className="card-panel product-customer-pricing-panel">
          <h2>Customer-specific pricing</h2>
          <p className="product-form-hint">A negotiated price that overrides everything else for one specific customer.</p>

          <div className="product-variant-add-row">
            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.mobile}
                </option>
              ))}
            </select>
            <input
              placeholder="Price (₹)"
              type="number"
              min="0"
              step="0.01"
              value={customerPriceValue}
              onChange={(e) => setCustomerPriceValue(e.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={handleSetCustomerPrice}>
              Set price
            </button>
          </div>

          {customerPrices.length === 0 ? (
            <p className="empty-state">No customer-specific prices yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Price</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {customerPrices.map((p) => (
                  <tr key={p.id}>
                    <td>{customerName(p.customer_id)}</td>
                    <td>₹{p.price}</td>
                    <td className="customers-row-actions">
                      <button className="link-danger" onClick={() => handleDeleteCustomerPrice(p.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isEditMode && id && manageStock && (
        <div className="card-panel product-stock-adjust-panel">
          <h2>Adjust stock</h2>
          <p className="product-form-hint">Every change here is recorded in the history below.</p>

          {productType === "variable" && (
            <div className="field">
              <label htmlFor="adjustTarget">Adjust stock for</label>
              <select id="adjustTarget" value={adjustTargetVariantId} onChange={(e) => setAdjustTargetVariantId(e.target.value)}>
                <option value="">This product</option>
                {variants
                  .filter((v) => v.manage_stock)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {variantLabel(v.id)}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="product-variant-add-row">
            <select value={adjustMode} onChange={(e) => setAdjustMode(e.target.value as "set" | "delta")}>
              <option value="set">Set to</option>
              <option value="delta">Add/subtract</option>
            </select>
            <input
              placeholder={adjustMode === "set" ? "New quantity" : "e.g. -5 or 20"}
              type="number"
              value={adjustValue}
              onChange={(e) => setAdjustValue(e.target.value)}
            />
            <input placeholder="Reason (optional)" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={handleAdjustStock}>
              Adjust
            </button>
          </div>
          {stockError && <p className="error-text">{stockError}</p>}
        </div>
      )}

      {isEditMode && id && inventoryHistory.length > 0 && (
        <div className="card-panel product-inventory-history-panel">
          <h2>Inventory history</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Change</th>
                <th>New quantity</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {inventoryHistory.map((h) => (
                <tr key={h.id}>
                  <td>{variantLabel(h.variant_id)}</td>
                  <td className={h.change_quantity >= 0 ? "product-stock-change-up" : "product-stock-change-down"}>
                    {h.change_quantity >= 0 ? "+" : ""}
                    {h.change_quantity}
                  </td>
                  <td>{h.new_quantity}</td>
                  <td>{h.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
