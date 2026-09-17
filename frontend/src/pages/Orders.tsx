import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { listCustomers } from "@/api/customers";
import { listCardTypes } from "@/api/cardTypes";
import { listTemplates } from "@/api/templates";
import { createOrder, listOrders, updateOrderStatus } from "@/api/orders";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type Order, type OrderStatus } from "@/types/order";
import type { Customer } from "@/types/customer";
import type { CardType } from "@/types/cardType";
import type { Template } from "@/types/template";
import "./Orders.css";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [cardTypeId, setCardTypeId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");

  async function refresh(filter?: OrderStatus | "") {
    setOrders(await listOrders(filter ? { status: filter } : undefined));
  }

  useEffect(() => {
    listCustomers("", 1, 100).then((r) => setCustomers(r.items));
    listCardTypes().then(setCardTypes);
    refresh();
  }, []);

  useEffect(() => {
    if (cardTypeId) {
      listTemplates(cardTypeId).then((all) => setTemplates(all.filter((t) => t.is_active)));
    } else {
      setTemplates([]);
    }
    setTemplateId("");
  }, [cardTypeId]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!customerId || !cardTypeId) return;
    setIsSubmitting(true);
    try {
      await createOrder({ customer_id: customerId, card_type_id: cardTypeId, template_id: templateId || undefined, quantity });
      setCustomerId("");
      setCardTypeId("");
      setTemplateId("");
      setQuantity(1);
      refresh(statusFilter);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    await updateOrderStatus(orderId, status);
    refresh(statusFilter);
  }

  function customerName(id: string): string {
    return customers.find((c) => c.id === id)?.name ?? id;
  }
  function cardTypeName(id: string): string {
    return cardTypes.find((ct) => ct.id === id)?.name ?? id;
  }

  return (
    <div>
      <h1>Orders</h1>

      <form className="card-panel order-create-form" onSubmit={handleCreate}>
        <h2>New order</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="oCustomer">Customer</label>
            <select id="oCustomer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.mobile}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="oCardType">Card type</label>
            <select id="oCardType" value={cardTypeId} onChange={(e) => setCardTypeId(e.target.value)} required>
              <option value="">Select a card type…</option>
              {cardTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>
                  {ct.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="oTemplate">Template (optional)</label>
            <select id="oTemplate" value={templateId} onChange={(e) => setTemplateId(e.target.value)} disabled={!cardTypeId}>
              <option value="">No specific template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="oQuantity">Quantity</label>
            <input
              id="oQuantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create order"}
        </button>
      </form>

      <div className="orders-filter-row">
        <label htmlFor="statusFilter">Filter by status</label>
        <select
          id="statusFilter"
          value={statusFilter}
          onChange={(e) => {
            const value = e.target.value as OrderStatus | "";
            setStatusFilter(value);
            refresh(value);
          }}
        >
          <option value="">All</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="card-panel orders-table-panel">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Card type</th>
              <th>Qty</th>
              <th>Status</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link to={`/customers/${o.customer_id}`}>{customerName(o.customer_id)}</Link>
                </td>
                <td>{cardTypeName(o.card_type_id)}</td>
                <td>{o.quantity}</td>
                <td>
                  <select value={o.status} onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="customers-row-actions">
                  <Link to={`/cards/new?customer_id=${o.customer_id}`}>Generate card</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="empty-state">No orders yet — create one above.</p>}
      </div>
    </div>
  );
}
