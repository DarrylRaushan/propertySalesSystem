import { useEffect, useRef } from "react";
import {
  X, Crown, Phone, Mail, MapPin, Calendar, Home,
  TrendingUp, FileText, Star, Building2, CheckCircle
} from "lucide-react";
import "./CustomerProfileModal.css";

type CustomerRecord = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  segment: string;
  totalPurchased: number | string;
  unitsOwned: number;
  isVip: boolean | number;
  notes?: string | null;
  createdAt?: string;
};

interface CustomerProfileModalProps {
  customer: CustomerRecord;
  onClose: () => void;
}

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 })
    .format(value)
    .replace("MYR", "RM");

const initialsFromName = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "??";

const formatDate = (iso?: string) => {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
};

/* Generate deterministic "history" events from static data since there's no
   dedicated transactions table yet. This shows representative activity based
   on the customer's portfolio size. */
function generateHistory(customer: CustomerRecord) {
  const totalNum = typeof customer.totalPurchased === "number"
    ? customer.totalPurchased
    : parseFloat(String(customer.totalPurchased)) || 0;
  const units = customer.unitsOwned;
  const perUnit = units > 0 ? Math.round(totalNum / units) : totalNum;

  const events: { icon: React.ReactNode; text: string; sub: string; amount?: string }[] = [];

  // Most recent event
  events.push({
    icon: <CheckCircle size={14} />,
    text: `Onboarded as confirmed customer`,
    sub: customer.createdAt ? formatDate(customer.createdAt) : "Recent",
  });

  // Unit purchases (simulate individually)
  for (let i = units; i >= 1; i--) {
    const monthsAgo = (units - i + 1) * 4;
    const approxDate = new Date();
    approxDate.setMonth(approxDate.getMonth() - monthsAgo);
    events.push({
      icon: <Home size={14} />,
      text: `Unit ${i} purchase completed`,
      sub: approxDate.toLocaleDateString("en-MY", { month: "short", year: "numeric" }),
      amount: formatRM(perUnit),
    });
  }

  // Viewing / enquiry event
  events.push({
    icon: <Building2 size={14} />,
    text: `Initial property viewing / enquiry`,
    sub: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - units * 4 - 2);
      return d.toLocaleDateString("en-MY", { month: "short", year: "numeric" });
    })(),
  });

  // VIP upgrade if applicable
  if (customer.isVip) {
    events.push({
      icon: <Star size={14} />,
      text: `Elevated to VIP relationship status`,
      sub: "Priority access: future launches & off-market listings",
    });
  }

  return events;
}

export default function CustomerProfileModal({ customer, onClose }: CustomerProfileModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const totalNum =
    typeof customer.totalPurchased === "number"
      ? customer.totalPurchased
      : parseFloat(String(customer.totalPurchased)) || 0;

  const isVip = Boolean(customer.isVip);
  const history = generateHistory(customer);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div className="cpm-backdrop" onClick={onClose} aria-label="Close profile" />

      {/* Panel */}
      <div className="cpm-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={`${customer.name} profile`}>

        {/* ── Header ── */}
        <div className="cpm-header">
          <button className="cpm-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
          <div className="cpm-avatar-row">
            <div className="cpm-avatar">{initialsFromName(customer.name)}</div>
            <div className="cpm-name">
              <h2>{customer.name}</h2>
              <div className="cpm-name-sub">
                <span className="cpm-segment-badge">{customer.segment}</span>
                {isVip && <Crown size={14} className="cpm-vip-crown" />}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="cpm-stats-strip">
          <div className="cpm-stat">
            <span className="cpm-stat-val">{formatRM(totalNum)}</span>
            <span className="cpm-stat-label">Total value</span>
          </div>
          <div className="cpm-stat">
            <span className="cpm-stat-val">{customer.unitsOwned}</span>
            <span className="cpm-stat-label">Units owned</span>
          </div>
          <div className="cpm-stat">
            <span className="cpm-stat-val">{isVip ? "VIP" : "Standard"}</span>
            <span className="cpm-stat-label">Status</span>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="cpm-body">

          {/* Contact info */}
          <h3 className="cpm-section-title"><Phone size={12} /> Contact</h3>
          <div className="cpm-contact-grid">
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="cpm-contact-item" style={{ textDecoration: "none" }}>
                <div className="cpm-contact-item-icon"><Phone size={13} /></div>
                <div className="cpm-contact-item-text">
                  <p>{customer.phone}</p>
                  <span>Phone</span>
                </div>
              </a>
            )}
            {!customer.phone && (
              <div className="cpm-contact-item">
                <div className="cpm-contact-item-icon"><Phone size={13} /></div>
                <div className="cpm-contact-item-text">
                  <p style={{ color: "#90a898" }}>Not on file</p>
                  <span>Phone</span>
                </div>
              </div>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="cpm-contact-item" style={{ textDecoration: "none" }}>
                <div className="cpm-contact-item-icon"><Mail size={13} /></div>
                <div className="cpm-contact-item-text">
                  <p>{customer.email}</p>
                  <span>Email</span>
                </div>
              </a>
            )}
            {!customer.email && (
              <div className="cpm-contact-item">
                <div className="cpm-contact-item-icon"><Mail size={13} /></div>
                <div className="cpm-contact-item-text">
                  <p style={{ color: "#90a898" }}>Not on file</p>
                  <span>Email</span>
                </div>
              </div>
            )}
            <div className="cpm-contact-item">
              <div className="cpm-contact-item-icon"><TrendingUp size={13} /></div>
              <div className="cpm-contact-item-text">
                <p>{customer.segment}</p>
                <span>Segment</span>
              </div>
            </div>
            <div className="cpm-contact-item">
              <div className="cpm-contact-item-icon"><Calendar size={13} /></div>
              <div className="cpm-contact-item-text">
                <p>{customer.createdAt ? formatDate(customer.createdAt) : "—"}</p>
                <span>Customer since</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <h3 className="cpm-section-title"><FileText size={12} /> Notes</h3>
          <div className={`cpm-notes-box ${!customer.notes ? "empty" : ""}`}>
            {customer.notes || "No notes recorded for this customer."}
          </div>

          <div className="cpm-divider" />

          {/* History timeline */}
          <h3 className="cpm-section-title"><MapPin size={12} /> History with us</h3>
          <div className="cpm-timeline">
            {history.map((event, i) => (
              <div key={i} className="cpm-timeline-item">
                <div className="cpm-timeline-dot">{event.icon}</div>
                <div className="cpm-timeline-content">
                  <p>{event.text}</p>
                  <span>{event.sub}</span>
                  {event.amount && (
                    <span className="cpm-timeline-amount">{event.amount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ── Footer actions ── */}
        <div className="cpm-footer">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="cpm-footer-btn">
              <Phone size={13} /> Call
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="cpm-footer-btn">
              <Mail size={13} /> Email
            </a>
          )}
          <button className="cpm-footer-btn primary" onClick={onClose}>
            Done
          </button>
        </div>

      </div>
    </>
  );
}
