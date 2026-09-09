import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Building2,
  Download,
  Copy,
  Check,
  MapPin,
  Sparkles,
  ShieldCheck,
  Layers,
  BedDouble,
  Ruler,
  Car,
  Wifi,
  Waves,
  Dumbbell,
  Shield,
  FileText,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

interface FullListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    name: string;
    developer: string;
    location: string;
    price: number;
    type: string;
    beds: number;
    size: string;
  };
  onRequestViewing?: () => void;
}

const formatRM = (value: number) =>
  new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("MYR", "RM");

export default function FullListingModal({
  isOpen,
  onClose,
  property,
  onRequestViewing,
}: FullListingModalProps) {
  const [copiedPriceSheet, setCopiedPriceSheet] = useState(false);

  const pricePerSqft = Math.round(property.price / 850);

  const unitTiers = [
    {
      type: "Type A (Signature Suite)",
      beds: "2 Bedrooms, 2 Baths",
      size: "850 sq ft",
      price: property.price,
      status: "Available",
      statusColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      featured: true,
    },
    {
      type: "Type B (Family Executive)",
      beds: "3 Bedrooms, 2 Baths",
      size: "1,120 sq ft",
      price: Math.round(property.price * 1.25),
      status: "Limited Release",
      statusColor: "bg-amber-50 text-amber-900 border-amber-200",
      featured: false,
    },
    {
      type: "Type C (Sky Duplex / Penthouse)",
      beds: "4 Bedrooms, 3 Baths",
      size: "1,680 sq ft",
      price: Math.round(property.price * 1.78),
      status: "3 Units Left",
      statusColor: "bg-purple-50 text-purple-900 border-purple-200",
      featured: false,
    },
  ];

  const facilities = [
    { icon: Waves, label: "50m Olympic Lap Pool" },
    { icon: Dumbbell, label: "Sky Gymnasium & Yoga Deck" },
    { icon: Car, label: "EV Fast-Charging Bays" },
    { icon: Shield, label: "4-Tier Biometric Access" },
    { icon: Wifi, label: "Co-Working Hub & Fiber Mesh" },
    { icon: Sparkles, label: "Rooftop Stargazing Lounge" },
  ];

  const handleCopyPricingSheet = () => {
    const text = `*${property.name} Official Unit & Pricing Sheet*\nDeveloper: ${property.developer}\nLocation: ${property.location}\n\n` +
      unitTiers
        .map(
          (u) =>
            `• ${u.type} (${u.size}, ${u.beds}): ${formatRM(u.price)} [${u.status}]`
        )
        .join("\n") +
      `\n\nTenure: Freehold Residential · Estimated Maintenance: RM 0.38/sqft\nBooking Deposit: RM 1,000 · Special Developer Rebates Available.`;
    navigator.clipboard.writeText(text);
    setCopiedPriceSheet(true);
    toast.success("Pricing sheet copied to clipboard!");
    setTimeout(() => setCopiedPriceSheet(false), 2000);
  };

  const handleDownloadBrochure = () => {
    toast.success(`Digital brochure download started for ${property.name}!`, {
      description: "PDF brochure & architectural masterplan.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden rounded-2xl border border-[#cbd5e1] shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#10484b] via-[#1a3d3c] to-[#10484b] p-5 text-white relative overflow-hidden">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d7ef73] bg-white/10 px-2 py-0.5 rounded">
                  Developer Masterplan & Brochure
                </span>
                <span className="text-[10px] font-bold text-emerald-200 bg-emerald-950/60 px-2 py-0.5 rounded flex items-center gap-1 border border-emerald-500/30">
                  <ShieldCheck className="size-3 text-emerald-400" /> Freehold Title
                </span>
              </div>
              <DialogTitle className="text-2xl font-bold text-white tracking-tight mt-1.5 font-serif">
                {property.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-100/80 mt-0.5 flex items-center gap-1.5">
                <Building2 className="size-3.5 text-[#d7ef73]" />
                {property.developer} · <MapPin className="size-3 text-[#d7ef73] ml-1" /> {property.location}
              </DialogDescription>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold text-emerald-200 block">Entry Point</span>
              <strong className="text-lg font-bold text-[#d7ef73] font-serif block">
                {formatRM(property.price)}
              </strong>
              <small className="text-[10px] text-white/70 block">~RM {pricePerSqft}/sq ft</small>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 max-h-[72vh] overflow-y-auto">
          {/* Masterplan Spec Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl border border-[#d8e6db] bg-[#f8faf8]">
              <span className="text-[10px] font-bold text-[#5e7e72] uppercase block">Land Tenure</span>
              <b className="text-[13px] font-bold text-[#10484b] block mt-0.5">Freehold</b>
            </div>
            <div className="p-2.5 rounded-xl border border-[#d8e6db] bg-[#f8faf8]">
              <span className="text-[10px] font-bold text-[#5e7e72] uppercase block">Target Handover</span>
              <b className="text-[13px] font-bold text-[#10484b] block mt-0.5">Q4 2026</b>
            </div>
            <div className="p-2.5 rounded-xl border border-[#d8e6db] bg-[#f8faf8]">
              <span className="text-[10px] font-bold text-[#5e7e72] uppercase block">Total Units</span>
              <b className="text-[13px] font-bold text-[#10484b] block mt-0.5">340 Low-Density</b>
            </div>
            <div className="p-2.5 rounded-xl border border-[#d8e6db] bg-[#f8faf8]">
              <span className="text-[10px] font-bold text-[#5e7e72] uppercase block">Maintenance</span>
              <b className="text-[13px] font-bold text-[#10484b] block mt-0.5">RM 0.38 / sq ft</b>
            </div>
          </div>

          {/* Unit Layout Matrix */}
          <div>
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#10484b] mb-2.5 flex items-center gap-1.5">
              <Layers className="size-3.5 text-[#3b7a5a]" /> Available Floor Plan Layouts & Unit Matrix
            </h4>
            <div className="space-y-2">
              {unitTiers.map((tier) => (
                <div
                  key={tier.type}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    tier.featured
                      ? "border-[#10484b] bg-[#edf8e6]/60 shadow-2xs"
                      : "border-[#e0ecdf] bg-white hover:border-[#8baa60]"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <b className="text-[13px] font-bold text-[#10484b]">{tier.type}</b>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.statusColor}`}>
                        {tier.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11.5px] text-[#5e7e72] mt-0.5">
                      <span className="flex items-center gap-1">
                        <BedDouble className="size-3 text-[#3b7a5a]" /> {tier.beds}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Ruler className="size-3 text-[#3b7a5a]" /> {tier.size}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] text-[#7a9885] uppercase font-bold block">Developer Price</span>
                    <strong className="text-[14px] font-bold text-[#10484b] font-serif">
                      {formatRM(tier.price)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Facilities & Lifestyle Amenities */}
          <div>
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#10484b] mb-2.5 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[#8baa60]" /> Premium Facilities & Amenities
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {facilities.map((fac) => {
                const Icon = fac.icon;
                return (
                  <div
                    key={fac.label}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-[#e2ece3] bg-[#fbfdfa] text-[12px] font-semibold text-[#285c59]"
                  >
                    <Icon className="size-4 text-[#3b7a5a] shrink-0" />
                    <span>{fac.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyPricingSheet}
              className="text-xs font-semibold border-[#cbd5e1] gap-1.5 text-[#334155]"
            >
              {copiedPriceSheet ? (
                <>
                  <Check className="size-3 text-emerald-600" /> Copied Pricing Sheet
                </>
              ) : (
                <>
                  <Copy className="size-3 text-[#64748b]" /> Copy Pricing Matrix
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadBrochure}
              className="text-xs font-semibold border-[#cbd5e1] gap-1.5 text-[#334155]"
            >
              <Download className="size-3 text-[#64748b]" /> Download Brochure PDF
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold"
            >
              Close
            </Button>
            {onRequestViewing && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onRequestViewing();
                }}
                className="text-xs font-bold gap-1 bg-[#10484b] hover:bg-[#1a3d3c] text-[#d7ef73]"
              >
                Book Private Viewing ➔
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
