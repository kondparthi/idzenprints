import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPackage, getPackage, updatePackage } from "@/api/packages";
import { listMemberTypes } from "@/api/memberTypes";
import { listCardTypes } from "@/api/cardTypes";
import type { CardType } from "@/types/cardType";
import type { MemberType } from "@/types/subscription";
import "./ProductForm.css";

export default function PackageForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [credits, setCredits] = useState("");
  const [licenseDays, setLicenseDays] = useState("365");
  const [deviceLimit, setDeviceLimit] = useState("1");
  const [pdfLimit, setPdfLimit] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedMemberTypeIds, setSelectedMemberTypeIds] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const [memberTypes, setMemberTypes] = useState<MemberType[]>([]);
  const [services, setServices] = useState<CardType[]>([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMemberTypes().then(setMemberTypes);
    listCardTypes().then(setServices);
  }, []);

  useEffect(() => {
    if (!id) return;
    getPackage(id)
      .then((pkg) => {
        setName(pkg.name);
        setPrice(pkg.price);
        setCredits(String(pkg.credits));
        setLicenseDays(String(pkg.license_days));
        setDeviceLimit(String(pkg.device_limit));
        setPdfLimit(String(pkg.pdf_generation_limit));
        setIsActive(pkg.is_active);
        setSelectedMemberTypeIds(pkg.member_types.map((mt) => mt.id));
        setSelectedServiceIds(pkg.services.map((s) => s.id));
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  function toggleMemberType(memberTypeId: string) {
    setSelectedMemberTypeIds((prev) =>
      prev.includes(memberTypeId) ? prev.filter((m) => m !== memberTypeId) : [...prev, memberTypeId]
    );
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) => (prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        price,
        credits: Number(credits),
        license_days: Number(licenseDays),
        device_limit: Number(deviceLimit),
        pdf_generation_limit: Number(pdfLimit),
        is_active: isActive,
        member_type_ids: selectedMemberTypeIds,
        service_ids: selectedServiceIds,
      };
      if (isEditMode && id) {
        await updatePackage(id, payload);
      } else {
        await createPackage(payload);
      }
      navigate("/packages");
    } catch (err: any) {
      setError("Could not save this package. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="empty-state">Loading package…</p>;
  }

  return (
    <div className="product-form-page">
      <h1>{isEditMode ? "Edit package" : "Add package"}</h1>

      <form className="card-panel product-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="pkgName">Package name</label>
          <input id="pkgName" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Basic" />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="pkgPrice">Price (₹)</label>
            <input id="pkgPrice" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pkgCredits">Credits</label>
            <input id="pkgCredits" type="number" min="0" value={credits} onChange={(e) => setCredits(e.target.value)} required />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="pkgLicenseDays">License duration (days)</label>
            <input
              id="pkgLicenseDays"
              type="number"
              min="1"
              value={licenseDays}
              onChange={(e) => setLicenseDays(e.target.value)}
              required
            />
            <span className="product-form-hint" style={{ marginTop: 4 }}>365 = 1 year</span>
          </div>
          <div className="field">
            <label htmlFor="pkgDeviceLimit">Device login limit</label>
            <input
              id="pkgDeviceLimit"
              type="number"
              min="1"
              value={deviceLimit}
              onChange={(e) => setDeviceLimit(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="pkgPdfLimit">PDF generation limit</label>
          <input id="pkgPdfLimit" type="number" min="0" value={pdfLimit} onChange={(e) => setPdfLimit(e.target.value)} required />
        </div>

        <label className="product-featured-checkbox">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>

        <div className="field">
          <label>Available member types</label>
          <div className="member-type-service-picker">
            {memberTypes.map((mt) => (
              <label key={mt.id} className="member-type-service-option">
                <input
                  type="checkbox"
                  checked={selectedMemberTypeIds.includes(mt.id)}
                  onChange={() => toggleMemberType(mt.id)}
                />
                {mt.name}
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Available services</label>
          <div className="member-type-service-picker">
            {services.map((s) => (
              <label key={s.id} className="member-type-service-option">
                <input type="checkbox" checked={selectedServiceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
                {s.name} ({s.credit_cost} credit{s.credit_cost === 1 ? "" : "s"})
              </label>
            ))}
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="product-form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate("/packages")}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save package"}
          </button>
        </div>
      </form>
    </div>
  );
}
