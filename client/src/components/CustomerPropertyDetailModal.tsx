import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Heart,
  Calendar,
  Share2,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Building,
  CheckCircle2,
  Sparkles,
  Phone,
  MessageSquare,
  Calculator,
  ShieldCheck,
  TrendingUp,
  Box,
  Image as ImageIcon,
  RotateCcw,
  Sparkle,
} from "lucide-react";
import { useAuth, PROPERTY_AGENTS } from "@/contexts/AuthContext";
import ModelViewer from "@/components/ModelViewer";
import { toast } from "sonner";

interface CustomerPropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: any;
  onBookViewing?: (property: any) => void;
  onCalculateMortgage?: (propertyPrice: number) => void;
  isAgentView?: boolean;
}

export default function CustomerPropertyDetailModal({
  isOpen,
  onClose,
  property,
  onBookViewing,
  onCalculateMortgage,
  isAgentView = false,
}: CustomerPropertyDetailModalProps) {
  const {
    role,
    isAgent,
    requireAuth,
    toggleSaveProperty,
    isPropertySaved,
    activeAgent,
  } = useAuth();

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [is3DMode, setIs3DMode] = useState(false);

  if (!isOpen || !property) return null;

  const isSaved = isPropertySaved(property.id);

  // Gallery fallback photos
  const gallery = [
    property.imageUrl || property.image || "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop",
    ...(property.images && property.images.length > 1
      ? property.images.slice(1)
      : [
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop",
        ]),
  ];

  // Amenities list
  const amenities = [
    "Private Sky Infinity Pool (50m)",
    "Direct Covered MRT / LRT Walkway",
    "24/7 Diplomatic Concierge & Valet",
    "Private Keycard Lift Lobby",
    "EV Fast-Charging Bays",
    "Bespoke Wine Cellar & Cigar Lounge",
    "Automated Smart Home IoT Hub",
    "Triple-Layer Biometric Security",
  ];

  const priceNum = Number(property.price) || 2500000;
  const sizeNum = parseInt(property.size) || 1200;
  const psf = Math.round(priceNum / (sizeNum || 1));
  const estimatedMonthly = Math.round((priceNum * 0.9 * 0.042) / 12 + (priceNum * 0.9) / 360);

  const handleToggleWishlist = () => {
    if (role === "guest") {
      requireAuth("Sign in to save this property to your private shortlist.");
      return;
    }
    toggleSaveProperty(property.id);
    toast.success(
      isSaved ? "Removed from Shortlist" : "Saved to your Shortlist!"
    );
  };

  const handleBookClick = () => {
    if (role === "guest") {
      requireAuth("Sign in to book a private VIP tour.", () => {
        onBookViewing?.(property);
      });
      return;
    }
    onBookViewing?.(property);
  };

  const propertyName = property.title || property.name || "Luxury Residence";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[105] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#153941]/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Dialog in Terrain Theme */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.22 }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#fbfff9] rounded-3xl shadow-2xl border-[1.5px] border-[#234d4d] overflow-hidden z-10 my-auto text-[#10484b]"
        >
          {/* Top Bar with Actions */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3.5 bg-[#f9fff7]/95 backdrop-blur border-b border-[#d2e5d4]">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#d7ef73] text-[#153941] border border-[#234d4d]">
                {property.type || "Luxury Residence"}
              </span>
              <span className="text-xs text-[#567177] font-semibold">
                {property.status || "Available for VIP Tour"}
              </span>
              {isAgentView && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#153941] text-[#d7ef73]">
                  Agent Dossier
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleWishlist}
                className={`p-2 rounded-xl border transition-all ${
                  isSaved
                    ? "bg-rose-50 border-rose-300 text-rose-600"
                    : "border-[#234d4d] bg-[#fbfff9] text-[#10484b] hover:bg-[#eaf6df]"
                }`}
                title={isSaved ? "Remove from Shortlist" : "Save to Shortlist"}
              >
                <Heart size={17} className={isSaved ? "fill-rose-600" : ""} />
              </button>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  toast.success("Link copied to clipboard!");
                }}
                className="p-2 rounded-xl border border-[#234d4d] bg-[#fbfff9] text-[#10484b] hover:bg-[#eaf6df] transition"
                title="Share Property"
              >
                <Share2 size={17} />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-[#567177] hover:text-[#10484b] hover:bg-[#eaf6df] transition"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Scrollable Modal Content */}
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* 3D Model / Photo Gallery Switcher */}
            <div className="space-y-3">
              {is3DMode ? (
                /* ─── Interactive 3D Architectural Model View ─── */
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#153941] border-[1.5px] border-[#234d4d] shadow-md">
                  <ModelViewer
                    propertyName={propertyName}
                    propertyType={property.type}
                    fill
                    hideChrome
                  />

                  {/* 3D Mode Label */}
                  <div className="absolute top-3 left-3 bg-[#153941]/90 backdrop-blur text-[#d7ef73] px-3 py-1 rounded-lg text-xs font-bold border border-[#d7ef73]/30 flex items-center gap-1.5 z-10 pointer-events-none">
                    <Box size={14} />
                    3D Architectural Model • Drag to Rotate & Zoom
                  </div>

                  {/* Switch Back to Photos Button */}
                  <button
                    type="button"
                    onClick={() => setIs3DMode(false)}
                    className="absolute bottom-3 right-3 bg-[#d7ef73] text-[#153941] hover:bg-[#c9e361] px-4 py-2 rounded-xl text-xs font-extrabold shadow-lg flex items-center gap-1.5 border border-[#234d4d] transition-all cursor-pointer z-20 active:scale-95"
                  >
                    <ImageIcon size={14} />
                    View Photo Gallery
                  </button>
                </div>
              ) : (
                /* ─── High-Res Photo Gallery View ─── */
                <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#edf2ea] border-[1.5px] border-[#234d4d] shadow-md">
                  <img
                    src={gallery[activePhotoIdx]}
                    alt={propertyName}
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-[#153941]/90 backdrop-blur text-[#d7ef73] px-3 py-1 rounded-lg text-xs font-bold border border-[#d7ef73]/30">
                    Photo {activePhotoIdx + 1} of {gallery.length}
                  </div>

                  {/* The Circled 3D Model Switch Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIs3DMode(true);
                      toast.success("3D Architectural Mode Activated! Drag to rotate.");
                    }}
                    className="absolute bottom-3 right-3 bg-[#234d4d]/95 hover:bg-[#10484b] text-[#d7ef73] px-4 py-2 rounded-xl text-xs font-extrabold shadow-lg flex items-center gap-2 border border-[#d7ef73]/50 transition-all cursor-pointer z-20 hover:scale-105 active:scale-95 ring-2 ring-[#d7ef73]/40"
                    title="Click to launch interactive 3D model"
                  >
                    <Sparkles size={15} className="text-[#d7ef73] animate-pulse" />
                    <span>3D Virtual Tour Available</span>
                  </button>
                </div>
              )}

              {/* Gallery Thumbnails & 3D Switch Pill */}
              <div className="grid grid-cols-5 gap-2">
                {/* 3D Model Tab Button */}
                <button
                  type="button"
                  onClick={() => setIs3DMode(true)}
                  className={`aspect-[16/10] rounded-xl overflow-hidden border-2 transition flex flex-col items-center justify-center gap-1 ${
                    is3DMode
                      ? "border-[#234d4d] bg-[#234d4d] text-[#d7ef73] ring-2 ring-[#d7ef73]"
                      : "border-[#234d4d] bg-[#f4faea] text-[#10484b] hover:bg-[#eaf6df]"
                  }`}
                >
                  <Box size={18} />
                  <span className="text-[10px] font-extrabold uppercase">3D Tour</span>
                </button>

                {/* Photo Thumbnails */}
                {gallery.slice(0, 4).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIs3DMode(false);
                      setActivePhotoIdx(idx);
                    }}
                    className={`aspect-[16/10] rounded-xl overflow-hidden border-2 transition ${
                      !is3DMode && activePhotoIdx === idx
                        ? "border-[#234d4d] scale-[1.02] ring-2 ring-[#d7ef73]"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Price Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#d2e5d4]">
              <div>
                <h1 className="text-2xl sm:text-3xl font-normal text-[#10484b] tracking-tight" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                  {propertyName}
                </h1>
                <div className="flex items-center gap-2 text-xs text-[#567177] mt-1 font-medium">
                  <MapPin size={14} className="text-[#234d4d]" />
                  <span>{property.location}</span>
                  <span>•</span>
                  <Building size={14} className="text-[#567177]" />
                  <span>Developer: {property.developer}</span>
                </div>
              </div>

              <div className="text-left md:text-right">
                <div className="text-2xl sm:text-3xl font-normal text-[#10484b] tracking-tight" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                  RM {priceNum.toLocaleString()}
                </div>
                <div className="text-xs text-[#567177] font-semibold">
                  Approx. RM {psf.toLocaleString()} / sq ft • Est. RM {estimatedMonthly.toLocaleString()}/mo
                </div>
              </div>
            </div>

            {/* Key Specifications Grid in Terrain Theme */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#f4faea] border-[1.5px] border-[#234d4d] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#234d4d] text-[#d7ef73] flex items-center justify-center shrink-0">
                  <BedDouble size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-[#6e897e] uppercase font-bold">Bedrooms</p>
                  <p className="text-sm font-bold text-[#10484b]">{property.beds || 3} Suites</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f4faea] border-[1.5px] border-[#234d4d] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#234d4d] text-[#d7ef73] flex items-center justify-center shrink-0">
                  <Bath size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-[#6e897e] uppercase font-bold">Bathrooms</p>
                  <p className="text-sm font-bold text-[#10484b]">{property.baths || 2} Baths</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f4faea] border-[1.5px] border-[#234d4d] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#234d4d] text-[#d7ef73] flex items-center justify-center shrink-0">
                  <Ruler size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-[#6e897e] uppercase font-bold">Built-Up</p>
                  <p className="text-sm font-bold text-[#10484b]">{property.size || "1,450 sq ft"}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f4faea] border-[1.5px] border-[#234d4d] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#234d4d] text-[#d7ef73] flex items-center justify-center shrink-0">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-[#6e897e] uppercase font-bold">Rental Yield</p>
                  <p className="text-sm font-bold text-[#10484b]">5.4% - 6.2%</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-extrabold text-[#234d4d] uppercase tracking-wider mb-2">
                Executive Property Overview
              </h3>
              <p className="text-xs text-[#285c59] leading-relaxed font-medium">
                {property.description ||
                  `A masterclass in contemporary architecture and urban luxury. Located in prestigious ${property.location}, this residence pairs generous layouts with panoramic skyline vistas. Featuring custom Italian cabinetry, floor-to-ceiling acoustic double-glazed windows, and bespoke private elevator access.`}
              </p>
            </div>

            {/* Curated Luxury Amenities */}
            <div>
              <h3 className="text-xs font-extrabold text-[#234d4d] uppercase tracking-wider mb-3">
                Signature Amenities & Facilities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {amenities.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-[#f4faea] border border-[#dfe6df] text-xs text-[#10484b] font-medium"
                  >
                    <CheckCircle2 size={15} className="text-[#234d4d] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Specialist Agent Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#153941] to-[#234d4d] text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#d7ef73]/30">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#d7ef73] text-[#153941] flex items-center justify-center font-bold text-sm">
                  {activeAgent.initials}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-white">{activeAgent.name}</p>
                    <span className="text-[10px] bg-[#d7ef73] text-[#153941] px-2 py-0.2 rounded font-extrabold">
                      Assigned Agent
                    </span>
                  </div>
                  <p className="text-xs text-[#e4ece2]">{activeAgent.role} • {activeAgent.specialization}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={`tel:${activeAgent.phone}`}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 border border-white/20"
                >
                  <Phone size={14} />
                  Call Agent
                </a>
                {onBookViewing && (
                  <button
                    onClick={handleBookClick}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#d7ef73] hover:bg-[#c9e361] text-[#153941] text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Calendar size={14} />
                    Book Private Tour
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="sticky bottom-0 z-20 px-6 py-3.5 bg-[#f9fff7]/95 backdrop-blur border-t border-[#d2e5d4] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-[#6e897e] uppercase font-bold">Fixed Price:</span>
              <p className="text-lg font-black text-[#10484b]" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                RM {priceNum.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIs3DMode(!is3DMode)}
                className="px-3.5 py-2 rounded-xl border border-[#234d4d] bg-[#fbfff9] text-xs font-bold text-[#10484b] hover:bg-[#eaf6df] transition flex items-center gap-1.5 shadow-sm"
              >
                <Box size={15} />
                {is3DMode ? "View Photos" : "Interactive 3D"}
              </button>

              {onCalculateMortgage && (
                <button
                  onClick={() => {
                    onCalculateMortgage(priceNum);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-[#234d4d] bg-[#fbfff9] text-xs font-bold text-[#10484b] hover:bg-[#eaf6df] transition flex items-center gap-1.5 shadow-sm"
                >
                  <Calculator size={15} />
                  Mortgage
                </button>
              )}

              <button
                onClick={handleToggleWishlist}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                  isSaved
                    ? "bg-rose-50 border-rose-300 text-rose-600"
                    : "border-[#234d4d] bg-[#fbfff9] text-[#10484b] hover:bg-[#eaf6df]"
                }`}
              >
                <Heart size={15} className={isSaved ? "fill-rose-600" : ""} />
                {isSaved ? "Shortlisted" : "Save"}
              </button>

              {onBookViewing && (
                <button
                  onClick={handleBookClick}
                  className="px-5 py-2 rounded-xl bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] text-xs font-bold shadow-md transition flex items-center gap-2 border border-[#234d4d]"
                >
                  <Calendar size={15} />
                  Book VIP Viewing
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
