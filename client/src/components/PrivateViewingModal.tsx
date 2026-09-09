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
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Building2,
  User,
  Phone,
  Send,
  Sparkles,
  CalendarCheck,
  Share2,
  Check,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { addLeadActionLog } from "./leadActionHistory";

interface PrivateViewingModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id?: number | string;
    name: string;
    developer: string;
    location: string;
    price: number;
  };
  candidateLeads?: Array<{
    id?: number | string;
    name: string;
    kind?: string;
  }>;
}

const PRESET_SLOTS = [
  "Tomorrow · 10:30 AM",
  "Tomorrow · 2:30 PM",
  "This Saturday · 11:00 AM",
  "This Saturday · 3:00 PM",
  "This Sunday · 2:00 PM",
];

const VIEWING_TYPES = [
  { id: "showroom", label: "In-Person Showroom Tour", desc: "Private VIP unit walkthrough with developer agent" },
  { id: "preview", label: "Developer Masterplan Preview", desc: "Exclusive pre-launch scale model & briefing" },
  { id: "virtual", label: "Virtual 3D Video Consultation", desc: "Interactive guided digital walkthrough via Zoom" },
];

export default function PrivateViewingModal({
  isOpen,
  onClose,
  property,
  candidateLeads = [],
}: PrivateViewingModalProps) {
  const [selectedClient, setSelectedClient] = useState(candidateLeads[0]?.name || "Hannah Cheong (Sales Lead)");
  const [customClientName, setCustomClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+60 12-345 6789");
  const [selectedSlot, setSelectedSlot] = useState(PRESET_SLOTS[0]);
  const [customDate, setCustomDate] = useState("");
  const [viewingType, setViewingType] = useState("showroom");
  const [specialNotes, setSpecialNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const clientNameToUse = customClientName.trim() || selectedClient;

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();

    const timeToUse = customDate.trim() || selectedSlot;
    const typeLabel = VIEWING_TYPES.find((t) => t.id === viewingType)?.label || "Private Viewing";

    // Persist to action log timeline
    addLeadActionLog(
      property.id || "viewing-1",
      `Private Viewing Scheduled: ${property.name}`,
      `Booked ${typeLabel} for ${clientNameToUse} (${timeToUse}). Location: ${property.name} Sales Gallery, ${property.location}. Notes: ${specialNotes || "Standard viewing briefing pack prepared."}`,
      "Hannah Cheong",
      "viewing"
    );

    setIsConfirmed(true);
    toast.success(`Private Viewing confirmed for ${clientNameToUse}!`, {
      description: `${property.name} · ${timeToUse}`,
    });
  };

  const handleReset = () => {
    setIsConfirmed(false);
    onClose();
  };

  const handleCopyInvite = () => {
    const timeToUse = customDate.trim() || selectedSlot;
    const inviteText = `*Exclusive Private Viewing Confirmation*\n\nDear ${clientNameToUse},\n\nYour private viewing for *${property.name}* (${property.developer}) has been confirmed.\n\n*Date & Time:* ${timeToUse}\n*Location:* ${property.name} Sales Gallery, ${property.location}\n*Host:* Hannah Cheong (Senior Property Consultant)\n\nWe look forward to welcoming you. Feel free to reply here if you need parking arrangements or directions!`;
    navigator.clipboard.writeText(inviteText);
    setCopiedInvite(true);
    toast.success("WhatsApp invite copied to clipboard!");
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReset()}>
      <DialogContent className="max-w-xl bg-white p-0 overflow-hidden rounded-2xl border border-[#cbd5e1] shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#10484b] via-[#1a3d3c] to-[#10484b] p-5 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#d7ef73] bg-white/10 px-2 py-0.5 rounded">
                VIP Concierge Booking
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white tracking-tight mt-1 font-serif">
              Request Private Viewing
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-100/80 mt-0.5 flex items-center gap-1.5">
              <Building2 className="size-3.5 text-[#d7ef73]" />
              <strong>{property.name}</strong> · {property.developer} ({property.location})
            </DialogDescription>
          </div>
        </div>

        {/* Content Body */}
        {!isConfirmed ? (
          <form onSubmit={handleBookAppointment} className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
            {/* Client Selector */}
            <div>
              <label className="block text-[11.5px] font-bold text-[#164a4b] uppercase tracking-wider mb-1.5">
                1. Select Attending Buyer / Client
              </label>
              {candidateLeads.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {candidateLeads.map((cand) => (
                    <button
                      type="button"
                      key={cand.name}
                      onClick={() => {
                        setSelectedClient(cand.name);
                        setCustomClientName("");
                      }}
                      className={`text-[11.5px] px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                        selectedClient === cand.name && !customClientName
                          ? "bg-[#10484b] text-[#d7ef73] border-[#10484b]"
                          : "bg-[#f8faf8] text-[#335548] border-[#d8e6db] hover:border-[#10484b]"
                      }`}
                    >
                      {cand.name} {cand.kind ? `(${cand.kind})` : ""}
                    </button>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={customClientName}
                onChange={(e) => setCustomClientName(e.target.value)}
                placeholder="Or type another client's full name..."
                className="w-full p-2.5 rounded-lg border border-[#c8ded0] text-[13px] bg-[#fbfff9] focus:outline-none focus:border-[#10484b]"
              />
            </div>

            {/* Viewing Type */}
            <div>
              <label className="block text-[11.5px] font-bold text-[#164a4b] uppercase tracking-wider mb-1.5">
                2. Viewing Experience Format
              </label>
              <div className="space-y-1.5">
                {VIEWING_TYPES.map((type) => (
                  <label
                    key={type.id}
                    onClick={() => setViewingType(type.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      viewingType === type.id
                        ? "bg-[#edf8e6] border-[#10484b] ring-1 ring-[#10484b]"
                        : "bg-white border-[#e0ecdf] hover:border-[#8baa60]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="viewingType"
                      checked={viewingType === type.id}
                      onChange={() => setViewingType(type.id)}
                      className="mt-0.5 accent-[#10484b]"
                    />
                    <div>
                      <b className="text-[12.5px] text-[#10484b] block">{type.label}</b>
                      <small className="text-[11px] text-[#5e7e72] block">{type.desc}</small>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date & Time Slot */}
            <div>
              <label className="block text-[11.5px] font-bold text-[#164a4b] uppercase tracking-wider mb-1.5">
                3. Preferred Time Slot
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {PRESET_SLOTS.map((slot) => (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setCustomDate("");
                    }}
                    className={`text-[11.5px] p-2 rounded-lg border text-left font-semibold transition-all cursor-pointer ${
                      selectedSlot === slot && !customDate
                        ? "bg-[#10484b] text-[#d7ef73] border-[#10484b]"
                        : "bg-[#f8faf8] text-[#335548] border-[#d8e6db] hover:border-[#10484b]"
                    }`}
                  >
                    <Clock className="size-3 inline-block mr-1 text-[#8baa60]" />
                    {slot}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                placeholder="Or specify custom date/time (e.g. 28 Aug at 4:00 PM)..."
                className="w-full p-2.5 rounded-lg border border-[#c8ded0] text-[13px] bg-[#fbfff9] focus:outline-none focus:border-[#10484b]"
              />
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-[11.5px] font-bold text-[#164a4b] uppercase tracking-wider mb-1.5">
                4. Special Notes & Preparation (Optional)
              </label>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="e.g. Prepare loan margin simulation, client interested in high-floor units..."
                className="w-full p-2.5 rounded-lg border border-[#c8ded0] text-[12.5px] bg-[#fbfff9] focus:outline-none focus:border-[#10484b] min-h-[55px]"
              />
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#e2e8f0]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs font-bold gap-1.5 bg-[#10484b] hover:bg-[#1a3d3c] text-[#d7ef73]"
              >
                <CalendarCheck className="size-3.5" /> Confirm Appointment
              </Button>
            </div>
          </form>
        ) : (
          /* Confirmation Card State */
          <div className="p-6 space-y-5 text-center">
            <div className="size-14 rounded-full bg-[#edf8e6] border border-[#cbe5c4] flex items-center justify-center mx-auto text-[#10484b]">
              <CheckCircle2 className="size-8 text-[#2e745c]" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-[#10484b] font-serif">
                Private Viewing Confirmed!
              </h3>
              <p className="text-xs text-[#5e7e72] mt-1 max-w-sm mx-auto">
                Appointment logged into CRM action history and reserved on the sales gallery calendar.
              </p>
            </div>

            <div className="bg-[#f8faf8] border border-[#d8e6db] rounded-xl p-4 text-left space-y-2 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Property:</span>
                <strong className="text-[#10484b]">{property.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Client / Guest:</span>
                <strong className="text-[#10484b]">{clientNameToUse}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Scheduled Time:</span>
                <strong className="text-[#2e745c]">{customDate.trim() || selectedSlot}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Format:</span>
                <span className="font-semibold text-[#10484b]">
                  {VIEWING_TYPES.find((t) => t.id === viewingType)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Meeting Gallery:</span>
                <span className="font-semibold text-[#10484b]">{property.location}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyInvite}
                className="text-xs font-bold gap-1.5 border-[#10484b] text-[#10484b]"
              >
                {copiedInvite ? (
                  <>
                    <Check className="size-3.5 text-emerald-600" /> Copied WhatsApp Pass!
                  </>
                ) : (
                  <>
                    <Share2 className="size-3.5" /> Copy WhatsApp Invite Pass
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleReset}
                className="text-xs font-bold bg-[#10484b] hover:bg-[#1a3d3c] text-[#d7ef73]"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
