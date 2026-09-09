import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Building2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { useAuth, PROPERTY_AGENTS, PropertyAgent } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CustomerViewingModalProps {
  isOpen: boolean;
  onClose: () => void;
  property?: {
    id: number;
    title: string;
    location: string;
    price: number;
    imageUrl?: string;
    developer?: string;
  } | null;
}

export default function CustomerViewingModal({
  isOpen,
  onClose,
  property,
}: CustomerViewingModalProps) {
  const { bookViewing, activeAgent, availableAgents, activeCustomer } = useAuth();

  const [selectedAgentId, setSelectedAgentId] = useState<string>(activeAgent?.id || "hannah");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>("11:00 AM - 12:00 PM");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen || !property) return null;

  const assignedAgent: PropertyAgent =
    availableAgents.find((a) => a.id === selectedAgentId) || availableAgents[0];

  const timeSlots = [
    "09:30 AM - 10:30 AM (Morning Calm)",
    "11:00 AM - 12:00 PM (Optimal Sunlight)",
    "02:30 PM - 03:30 PM (Afternoon Executive)",
    "05:00 PM - 06:00 PM (Golden Hour / Skyline)",
  ];

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await bookViewing({
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: property.location,
        propertyPrice: property.price,
        propertyImage: property.imageUrl,
        agentId: assignedAgent.id,
        agentName: assignedAgent.name,
        agentPhone: assignedAgent.phone,
        date: selectedDate,
        timeSlot: selectedSlot,
        notes: notes.trim() || undefined,
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      toast.success("VIP Viewing Confirmed!", {
        description: `Your private tour for ${property.title} with ${assignedAgent.name} has been scheduled.`,
      });
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error(err?.message || "Could not book viewing. Please try again.");
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#153941]/80 backdrop-blur-md"
          onClick={handleClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-[#fbfff9] rounded-3xl shadow-2xl border-[1.5px] border-[#234d4d] overflow-hidden z-10 text-[#10484b]"
        >
          {/* Header */}
          <div className="relative px-6 py-5 bg-gradient-to-r from-[#153941] via-[#234d4d] to-[#153941] text-white">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#d7ef73] text-[#153941] text-[11px] font-extrabold tracking-wider uppercase border border-[#234d4d]">
                VIP Private Tour
              </span>
            </div>
            <h2 className="text-2xl font-normal tracking-tight text-white" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
              Schedule Private Viewing
            </h2>
            <p className="text-xs text-[#f6ffdf] mt-1 truncate">
              {property.title} • {property.location}
            </p>
          </div>

          {/* Body */}
          <div className="p-6 bg-[#fbfff9]">
            {isSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 bg-[#eaf6df] text-[#234d4d] rounded-full flex items-center justify-center mx-auto ring-8 ring-[#eaf6df]/50 border border-[#234d4d]">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-normal text-[#10484b]" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                    Private Viewing Confirmed!
                  </h3>
                  <p className="text-xs text-[#567177] mt-1 max-w-xs mx-auto font-medium">
                    Your appointment has been added to your Tour Tracker. Your personal agent {assignedAgent.name} will prepare the showroom and private briefing.
                  </p>
                </div>

                <div className="p-4 bg-[#f4faea] rounded-2xl text-left text-xs space-y-2 border border-[#dfe6df]">
                  <div className="flex justify-between">
                    <span className="text-[#567177]">Property:</span>
                    <span className="font-bold text-[#10484b] truncate max-w-[200px]">{property.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#567177]">Date & Slot:</span>
                    <span className="font-bold text-[#10484b]">{selectedDate} ({selectedSlot.split("(")[0]})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#567177]">Assigned Agent:</span>
                    <span className="font-extrabold text-[#234d4d]">{assignedAgent.name}</span>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-2.5 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl font-bold text-xs transition border border-[#234d4d]"
                >
                  Done & View in My Bookings
                </button>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="space-y-4">
                {/* Agent Selection */}
                <div>
                  <label className="block text-xs font-bold text-[#10484b] mb-1.5">
                    Select Your Property Specialist
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableAgents.map((ag) => (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => setSelectedAgentId(ag.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          selectedAgentId === ag.id
                            ? "border-[#234d4d] bg-[#eaf6df] ring-1 ring-[#234d4d]"
                            : "border-[#dfe6df] bg-[#fbfff9] hover:bg-[#f4faea]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-5 h-5 rounded-full bg-[#234d4d] text-[#d7ef73] text-[9px] font-bold flex items-center justify-center">
                            {ag.initials}
                          </span>
                          <span className="text-xs font-bold truncate text-[#10484b]">
                            {ag.name.split(" ")[0]}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#6e897e] truncate font-medium">
                          {ag.role}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Slot */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#10484b] mb-1">
                      Preferred Date
                    </label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#567177]" />
                      <input
                        type="date"
                        required
                        value={selectedDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 text-xs bg-[#f3f5ef] border border-[#dfe6df] rounded-xl font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#10484b] mb-1">
                      Time Window
                    </label>
                    <div className="relative">
                      <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#567177]" />
                      <select
                        value={selectedSlot}
                        onChange={(e) => setSelectedSlot(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 text-xs bg-[#f3f5ef] border border-[#dfe6df] rounded-xl font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                      >
                        {timeSlots.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Special Requests / Notes */}
                <div>
                  <label className="block text-xs font-bold text-[#10484b] mb-1">
                    Special Requests or Specific Unit Interest (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Interested in high floor units, private lift, or financing package overview."
                    className="w-full p-2.5 text-xs bg-[#f3f5ef] border border-[#dfe6df] rounded-xl font-medium text-[#10484b] resize-none focus:outline-none focus:ring-2 focus:ring-[#234d4d]"
                  />
                </div>

                {/* Buyer contact summary */}
                <div className="p-3 bg-[#f4faea] rounded-2xl border border-[#dfe6df] flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-[#10484b]">
                      Booking for: {activeCustomer?.name || "Private VIP Guest"}
                    </p>
                    <p className="text-[10px] text-[#6e897e] font-medium">
                      Confirmation SMS & Calendar Invite will be dispatched.
                    </p>
                  </div>
                  <ShieldCheck size={18} className="text-[#234d4d] shrink-0" />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 px-4 bg-[#f3f5ef] hover:bg-[#eaf6df] text-[#10484b] rounded-xl text-xs font-bold transition border border-[#dfe6df]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-2.5 px-4 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 border border-[#234d4d]"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={14} />
                        Confirm VIP Viewing
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
