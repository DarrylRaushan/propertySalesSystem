import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BedDouble,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Images,
  MapPin,
  Ruler,
  ScanLine,
  Sparkles,
  Zap,
  Calculator,
  ShieldCheck,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";
import ModelViewer from "@/components/ModelViewer";
import { trpc } from "@/lib/trpc";
import { getCarouselIndex, getPropertyGalleryImages, type PropertyListing } from "./propertyBrowser";
import AiBuyerFitModal, { type FitPerson } from "./AiBuyerFitModal";
import PrivateViewingModal from "./PrivateViewingModal";
import FullListingModal from "./FullListingModal";
import "./PropertyDossierRevamp.css";

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 })
    .format(value)
    .replace("MYR", "RM ");

const initialsFromName = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "??";

const FALLBACK_LEADS = [
  { id: 1, name: "Aiman Faris", location: "Petaling Jaya, Selangor", probability: 92, value: 1250000, segment: "Ready Buyer", property: "Asteria Residences" },
  { id: 2, name: "Sarah Lim", location: "Mont Kiara, Kuala Lumpur", probability: 87, value: 980000, segment: "Investor", property: "The Mews KL" },
  { id: 3, name: "Muhammad Zaki", location: "Shah Alam, Selangor", probability: 78, value: 760000, segment: "Ready Buyer", property: "Elmina Green" },
  { id: 4, name: "Joanne Chong", location: "Bangsar South, Kuala Lumpur", probability: 69, value: 1350000, segment: "Researcher", property: "Southlink Suites" },
  { id: 5, name: "Ravi Nair", location: "Cyberjaya, Selangor", probability: 58, value: 620000, segment: "Investor", property: "Mutiara Ville" },
  { id: 6, name: "Nadia Ismail", location: "Setapak, Kuala Lumpur", probability: 73, value: 840000, segment: "Ready Buyer", property: "Seri Wangi" },
  { id: 7, name: "Tan Wei Ming", location: "Damansara, Selangor", probability: 66, value: 1120000, segment: "Investor", property: "Verde Heights" },
];

const FALLBACK_CUSTOMERS = [
  { id: 1, name: "Sarah Lim", segment: "Investor", totalPurchased: 1980000, isVip: true },
  { id: 2, name: "Daniel Wong", segment: "Upgrade", totalPurchased: 1250000, isVip: false },
  { id: 3, name: "Amelia Tan", segment: "First-time Buyer", totalPurchased: 760000, isVip: false },
  { id: 4, name: "Siti Aisyah", segment: "Luxury", totalPurchased: 2680000, isVip: true },
];

const asNumber = (value: number | string | null | undefined) =>
  typeof value === "number" ? value : parseFloat(String(value ?? "")) || 0;

function overlapScore(left: string, right: string) {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 28;
  if (a.includes(b) || b.includes(a)) return 18;
  const token = a.split(/[,\s]+/).find((part) => part.length > 3 && b.includes(part));
  return token ? 12 : 0;
}

function scoreLead(lead: { name: string; location?: string | null; probability?: number | null; value?: number | string | null; segment?: string | null; property?: string | null }, listing: PropertyListing) {
  let score = 45;
  score += overlapScore(lead.property ?? "", listing.name);
  score += Math.min(overlapScore(lead.location ?? "", listing.location), 14);
  const budget = asNumber(lead.value);
  if (budget) {
    const ratio = budget / listing.price;
    if (ratio >= 0.85 && ratio <= 1.15) score += 15;
    else if (ratio >= 0.7 && ratio <= 1.35) score += 8;
  }
  score += Math.round((lead.probability ?? 0) * 0.14);
  if (lead.segment === "Ready Buyer") score += 8;
  if (lead.segment === "Investor" && /condo|service|apartment/i.test(listing.type)) score += 6;
  return Math.min(98, Math.max(65, score));
}

function scoreCustomer(customer: { name: string; segment?: string | null; totalPurchased?: number | string | null; isVip?: boolean | null }, listing: PropertyListing) {
  let score = 50;
  const purchased = asNumber(customer.totalPurchased);
  if (purchased) {
    const ratio = purchased / listing.price;
    if (ratio >= 0.9) score += 16;
    else if (ratio >= 0.55) score += 8;
  }
  if (customer.segment === "Investor" && /condo|service|apartment/i.test(listing.type)) score += 10;
  if (customer.segment === "Luxury" && listing.price >= 1_000_000) score += 12;
  if (customer.segment === "Upgrade" && /landed|terrace|semi/i.test(listing.type)) score += 10;
  if (customer.segment === "First-time Buyer" && listing.price <= 900000) score += 10;
  if (customer.isVip) score += 8;
  return Math.min(99, Math.max(68, score));
}

function rankFits(
  listing: PropertyListing,
  leads: Array<{ id: number; name: string; location?: string | null; probability?: number | null; value?: number | string | null; segment?: string | null; property?: string | null }>,
  customers: Array<{ id: number; name: string; segment?: string | null; totalPurchased?: number | string | null; isVip?: boolean | null }>,
): FitPerson[] {
  const ranked: FitPerson[] = [
    ...leads.map((lead) => ({
      key: `lead-${lead.id}`,
      name: lead.name,
      initials: initialsFromName(lead.name),
      kind: "Lead" as const,
      detail: lead.segment || lead.location || "Pipeline Lead",
      score: scoreLead(lead, listing),
    })),
    ...customers.map((customer) => ({
      key: `customer-${customer.id}`,
      name: customer.name,
      initials: initialsFromName(customer.name),
      kind: "Customer" as const,
      detail: customer.isVip ? `${customer.segment || "Client"} · VIP` : customer.segment || "Existing Buyer",
      score: scoreCustomer(customer, listing),
    })),
  ];

  const unique = new Map<string, FitPerson>();
  for (const person of ranked.sort((a, b) => b.score - a.score)) {
    const nameKey = person.name.toLowerCase();
    if (!unique.has(nameKey)) unique.set(nameKey, person);
  }
  return Array.from(unique.values()).slice(0, 4);
}

interface PropertyDossierRevampProps {
  property: PropertyListing;
  onBack: () => void;
}

export default function PropertyDossierRevamp({ property: p, onBack }: PropertyDossierRevampProps) {
  const [show3D, setShow3D] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedBuyer, setSelectedBuyer] = useState<FitPerson | null>(null);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [showFullListing, setShowFullListing] = useState(false);

  const galleryImages = getPropertyGalleryImages(p);
  const activeImage = galleryImages[galleryIndex] ?? p.image;
  const { data: apiLeads } = trpc.leads.list.useQuery({ limit: 200 });
  const { data: apiCustomers } = trpc.customers.list.useQuery();

  const fits = useMemo(
    () => rankFits(p, apiLeads?.length ? apiLeads : FALLBACK_LEADS, apiCustomers?.length ? apiCustomers : FALLBACK_CUSTOMERS),
    [apiCustomers, apiLeads, p],
  );

  // Compute calculated metrics (Price per SqFt, Est. Installment)
  const sqftNumber = parseInt(p.size.replace(/[^0-9]/g, ""), 10) || 1200;
  const pricePerSqft = Math.round(p.price / sqftNumber);
  const estInstallment = Math.round((p.price * 0.9 * 0.042) / 12 + (p.price * 0.9) / (30 * 12));

  useEffect(() => {
    const html = document.documentElement;
    const { overflow: htmlOverflow } = html.style;
    const { overflow: bodyOverflow } = document.body.style;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  const toggleView = () => {
    setShow3D((v) => !v);
    setGalleryIndex(0);
  };

  return (
    <div className="pd-root">
      {/* Workspace Header */}
      <header className="pd-workspace-header">
        <div className="pd-workspace-header-inner">
          <div className="pd-workspace-title">
            <button className="pd-back" onClick={onBack} aria-label="Back to browser">
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="pd-eyebrow">Listing Dossier</span>
                <span className="text-[10px] text-[#4a9070] font-bold px-1.5 py-0.5 rounded bg-[#eaf5eb]">
                  Malaysia Portfolio
                </span>
              </div>
              <h1>{p.name} <em className="text-[#3b7a5a]">· Strategic Dossier</em></h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="pd-status-chip">
              <span className="pd-status-dot" />
              {p.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Board Layout */}
      <div className="pd-board">
        {/* Left Visual Pane */}
        <section className="pd-visual">
          <div className="pd-visual-bar">
            <span className="pd-visual-label">
              <span className="pd-visual-dot" />
              {show3D ? "Architectural Massing · Interactive" : "Reference Photography"}
            </span>
            <span className="pd-visual-mode">{show3D ? "3D CANVAS" : `IMG ${galleryIndex + 1}/${galleryImages.length}`}</span>
          </div>

          <div className="pd-visual-stage">
            {show3D ? (
              <ModelViewer
                propertyName={p.name}
                propertyType={p.type}
                modelUrl={p.modelUrl}
                fill
                hideChrome
              />
            ) : (
              <>
                <img className="pd-gallery-image" src={activeImage} alt={`${p.name} gallery ${galleryIndex + 1}`} />
                <button
                  className="pd-gallery-nav prev"
                  onClick={() => setGalleryIndex((i) => getCarouselIndex(i, -1, galleryImages.length))}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="pd-gallery-nav next"
                  onClick={() => setGalleryIndex((i) => getCarouselIndex(i, 1, galleryImages.length))}
                  aria-label="Next image"
                >
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>

          <div className="pd-visual-footer">
            <span className="pd-visual-hint">
              <ScanLine size={12} />
              {show3D ? "Drag to orbit model, scroll to zoom" : "Browse property gallery"}
            </span>
            <button className="pd-mode-btn" onClick={toggleView}>
              {show3D ? <><Images size={12} /> View Gallery</> : <><Zap size={12} /> Interactive 3D</>}
            </button>
          </div>
        </section>

        {/* Right Intelligence Rail */}
        <div className="pd-rail">
          {/* Top: Property Overview Card */}
          <section className="pd-info-card">
            <div className="flex items-center justify-between mb-1">
              <span className="pd-developer">{p.developer}</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="size-3 text-emerald-600" />
                Verified Listing
              </span>
            </div>

            <h2 className="pd-property-name">{p.name}</h2>
            <div className="pd-location-row">
              <MapPin size={13} className="text-[#3b7a5a]" /> {p.location}
            </div>

            {/* Luxury Price & Financials Block */}
            <div className="pd-price-block">
              <div className="flex items-center justify-between">
                <span className="pd-price-label">Current Entry Point</span>
                <span className="text-[11px] font-semibold text-[#d7ef73]/80">
                  RM {pricePerSqft.toLocaleString()}/sq ft
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-0.5">
                <strong className="pd-price-value">{formatRM(p.price)}</strong>
                <span className="text-[11px] text-white/70 font-medium">
                  ~RM {estInstallment.toLocaleString()}/mo
                </span>
              </div>
            </div>

            {/* Spec Chips Grid */}
            <div className="pd-stats-grid">
              <div className="pd-stat-card">
                <CircleDot size={14} className="text-[#10484b]" />
                <b>{p.type}</b>
                <small>Category</small>
              </div>
              <div className="pd-stat-card">
                <BedDouble size={14} className="text-[#10484b]" />
                <b>{p.beds} Bedrooms</b>
                <small>Layout</small>
              </div>
              <div className="pd-stat-card">
                <Ruler size={14} className="text-[#10484b]" />
                <b>{p.size}</b>
                <small>Built-up Area</small>
              </div>
            </div>

            {/* AI Match Candidates Card — full-width row above action buttons */}
            <div className="pd-fit-card pd-fit-card--inline">
              <div className="pd-fit-header">
                <div className="flex items-center justify-between">
                  <span className="pd-fit-eyebrow">
                    <Sparkles size={11} className="text-[#d7ef73]" /> Best-Fit Buyers
                  </span>
                  <span className="text-[10px] font-bold text-[#d7ef73]/80 bg-white/10 px-1.5 py-0.5 rounded">
                    AI Scored · Scroll for more
                  </span>
                </div>
                <p className="pd-fit-title">
                  Click any candidate to explain fit with AI
                </p>
              </div>

              {/* Candidates List - scrollable, displays 2 at a time */}
              <div className="pd-fit-list">
                {fits.map((person) => (
                  <div
                    key={person.key}
                    onClick={() => setSelectedBuyer(person)}
                    className="pd-fit-row group cursor-pointer"
                    title={`Click to analyze why ${person.name} is the best fit for ${p.name}`}
                  >
                    <span className="pd-fit-avatar group-hover:scale-105 transition-transform">
                      {person.initials}
                    </span>
                    <div className="pd-fit-copy">
                      <div className="flex items-center gap-1.5">
                        <b>{person.name}</b>
                        <span className="pd-fit-kind-tag">{person.kind}</span>
                      </div>
                      <small>{person.detail}</small>
                    </div>
                    <div className="pd-fit-score-col">
                      <span className="pd-fit-score">
                        {person.score}%
                      </span>
                      <span className="pd-fit-explain-hint group-hover:text-[#d7ef73] transition-colors">
                        Explain ➔
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pd-actions">
              <button
                className="pd-primary-btn"
                onClick={() => setShowViewingModal(true)}
              >
                Request Private Viewing <ArrowUpRight size={14} />
              </button>
              <button
                className="pd-secondary-btn"
                onClick={() => setShowFullListing(true)}
              >
                <Building2 size={13} /> Full Listing
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Private Viewing Appointment Modal */}
      <PrivateViewingModal
        isOpen={showViewingModal}
        onClose={() => setShowViewingModal(false)}
        property={{ id: p.id, name: p.name, developer: p.developer, location: p.location, price: p.price }}
        candidateLeads={fits.map((f) => ({ id: f.key, name: f.name, kind: f.kind }))}
      />

      {/* Full Developer Listing & Masterplan Modal */}
      <FullListingModal
        isOpen={showFullListing}
        onClose={() => setShowFullListing(false)}
        property={{ name: p.name, developer: p.developer, location: p.location, price: p.price, type: p.type, beds: p.beds, size: p.size }}
        onRequestViewing={() => setShowViewingModal(true)}
      />

      {/* AI Buyer Fit Overview Modal (Powered by Gemini) */}
      <AiBuyerFitModal
        isOpen={selectedBuyer !== null}
        onClose={() => setSelectedBuyer(null)}
        buyer={selectedBuyer}
        property={{
          name: p.name,
          developer: p.developer,
          location: p.location,
          price: p.price,
          type: p.type,
          beds: p.beds,
          size: p.size,
        }}
      />
    </div>
  );
}

