import React, { useState, useEffect } from "react";
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
  Lock,
  AlertCircle,
} from "lucide-react";
import { useAuth, PROPERTY_AGENTS, PropertyAgent, BookedViewing } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { buildGoogleCalendarUrl } from "@/lib/calendarUtils";


interface CustomerViewingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rescheduleViewingId?: string;
  initialAgentId?: string;
  initialDate?: string;
  initialSlot?: string;
  initialNotes?: string;
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
  rescheduleViewingId,
  initialAgentId,
  initialDate,
  initialSlot,
  initialNotes,
  property,
}: CustomerViewingModalProps) {
  const { bookViewing, rescheduleViewing, activeAgent, availableAgents, activeCustomer } = useAuth();

  const [selectedAgentId, setSelectedAgentId] = useState<string>(initialAgentId || activeAgent?.id || "hannah");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (initialDate) return initialDate;
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>(initialSlot || "11:00 AM - 12:00 PM");
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [lastConfirmedViewing, setLastConfirmedViewing] = useState<BookedViewing | null>(null);

  // Sync state whenever modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      if (initialAgentId) {
        setSelectedAgentId(initialAgentId);
      } else if (activeAgent?.id) {
        setSelectedAgentId(activeAgent.id);
      }
      if (initialDate) {
        setSelectedDate(initialDate);
      } else {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        setSelectedDate(d.toISOString().split("T")[0]);
      }
      setSelectedSlot(initialSlot || "11:00 AM - 12:00 PM");
      setNotes(initialNotes || "");
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [isOpen, initialAgentId, initialDate, initialSlot, initialNotes, activeAgent?.id]);

  const assignedAgent: PropertyAgent =
    availableAgents?.find((a) => a.id === selectedAgentId) || availableAgents?.[0] || PROPERTY_AGENTS[0];

  const timeSlots = [
    "09:30 AM - 10:30 AM (Morning Calm)",
    "11:00 AM - 12:00 PM (Optimal Sunlight)",
    "02:30 PM - 03:30 PM (Afternoon Executive)",
    "05:00 PM - 06:00 PM (Golden Hour / Skyline)",
  ];

  // Live 2-way Google Calendar & DB slot availability
  const { data: slotAvailability, isLoading: isLoadingSlots } =
    trpc.customerPortal.getSlotAvailability.useQuery(
      {
        agentId: assignedAgent?.id || "hannah",
        date: selectedDate || "",
        candidateSlots: timeSlots,
        excludeViewingId: rescheduleViewingId ? Number(rescheduleViewingId) : undefined,
      },
      {
        enabled: Boolean(isOpen && property && selectedDate && assignedAgent?.id),
      }
    );

  const { data: gcalStatus } = trpc.customerPortal.getGoogleCalendarStatus.useQuery(undefined, {
    enabled: Boolean(isOpen && property),
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    const isCurrentSlotUnavailable = slotAvailability?.find((s) => s.timeSlot === selectedSlot)?.available === false;
    if (isCurrentSlotUnavailable) {
      toast.error("Slot Unavailable", {
        description: "The selected time window conflicts with an existing calendar commitment. Please select an available slot.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let confirmedViewing: BookedViewing | null = null;
      if (rescheduleViewingId) {
        confirmedViewing = await rescheduleViewing(
          rescheduleViewingId,
          selectedDate,
          selectedSlot,
          notes.trim() || undefined
        );
        toast.success("VIP Viewing Rescheduled!", {
          description: `Saved & synced to Google Calendar for ${selectedDate} (${selectedSlot.split("(")[0]}).`,
        });
      } else {
        confirmedViewing = await bookViewing({
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
        toast.success("VIP Viewing Confirmed!", {
          description: `Saved & synced to Google Calendar for ${selectedDate} (${selectedSlot.split("(")[0]}).`,
        });
      }

      setLastConfirmedViewing(confirmedViewing);
      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error(err?.message || "Could not save viewing. Please try again.");
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setLastConfirmedViewing(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && property && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
            className="relative w-full max-w-lg bg-[#fbfff9] rounded-3xl shadow-2xl border-[1.5px] border-[#234d4d] overflow-hidden z-10 text-[#10484b] flex flex-col max-h-[92vh] my-auto"
          >
            {/* Header - Pinned at top */}
            <div className="shrink-0 relative px-6 py-4.5 bg-gradient-to-r from-[#153941] via-[#234d4d] to-[#153941] text-white">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-[#d7ef73] text-[#153941] text-[10px] font-extrabold tracking-wider uppercase border border-[#234d4d]">
                  VIP Private Tour
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-normal tracking-tight text-white leading-tight" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                {rescheduleViewingId ? "Reschedule Private Viewing" : "Schedule Private Viewing"}
              </h2>
              <p className="text-xs text-[#f6ffdf] mt-0.5 truncate">
                {property.title} • {property.location}
              </p>
            </div>

            {/* Content Area */}
            {isSuccess ? (
              <div className="overflow-y-auto flex-1 p-6 bg-[#fbfff9] text-center space-y-4">
                <div className="w-14 h-14 bg-[#eaf6df] text-[#234d4d] rounded-full flex items-center justify-center mx-auto ring-8 ring-[#eaf6df]/50 border border-[#234d4d]">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-normal text-[#10484b]" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
                    {rescheduleViewingId ? "Viewing Rescheduled!" : "Private Viewing Confirmed!"}
                  </h3>
                  <p className="text-xs text-[#567177] mt-1 max-w-xs mx-auto font-medium">
                    Your appointment has been updated in your Tour Tracker. Your personal agent {assignedAgent.name} will prepare the showroom and private briefing.
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
                    <span className="text-[#567177]">Assigned Specialist:</span>
                    <span className="font-extrabold text-[#234d4d]">{assignedAgent.name}</span>
                  </div>
                </div>

                {/* Auto-saved to Google Calendar notification banner */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-[#eaf6df] rounded-2xl border border-blue-200 text-left space-y-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#4285F4] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      ✓
                    </span>
                    <span className="text-xs font-extrabold text-[#10484b]">
                      Automatically Saved to Google Calendar
                    </span>
                  </div>
                  <p className="text-[11px] text-[#486581] leading-relaxed pl-8 font-medium">
                    Your viewing has been synchronized with the specialist's Google Calendar automatically — already created and confirmed.
                  </p>
                  <div className="pl-8 pt-0.5">
                    <a
                      href={buildGoogleCalendarUrl({
                        title: property.title,
                        location: property.location,
                        date: selectedDate,
                        timeSlot: selectedSlot,
                        specialistName: assignedAgent.name,
                        specialistPhone: assignedAgent.phone,
                        notes,
                        bookingId: lastConfirmedViewing?.id,
                        googleCalendarHtmlLink: lastConfirmedViewing?.googleCalendarHtmlLink,
                        googleCalendarEventId: lastConfirmedViewing?.googleCalendarEventId,
                      })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4285F4] hover:bg-[#3367d6] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Calendar size={13} />
                      <span>Open Event in Google Calendar</span>
                    </a>
                  </div>
                </div>

                {/* Email Dispatch Notice */}
                <div className="p-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-xl text-[11px] text-[#0369a1] text-center font-medium leading-relaxed">
                  ✉️ Email alerts & calendar invites dispatched to <strong>{activeCustomer?.email || "darrylraushansingh@gmail.com"}</strong> and specialist <strong>{assignedAgent.name}</strong>.
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-2.5 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl font-bold text-xs transition border border-[#234d4d] cursor-pointer"
                >
                  Done & View in Tour Tracker
                </button>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Scrollable Form Content */}
                <div className="overflow-y-auto flex-1 p-5 sm:p-6 bg-[#fbfff9] space-y-4 overscroll-contain">
                  {/* Agent Selection - Balanced 4-column layout */}
                  <div>
                    <label className="block text-xs font-bold text-[#10484b] mb-1.5">
                      Select Your Property Specialist
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {availableAgents.map((ag) => {
                        const isSelected = selectedAgentId === ag.id;
                        return (
                          <button
                            key={ag.id}
                            type="button"
                            onClick={() => setSelectedAgentId(ag.id)}
                            className={`p-2.5 rounded-2xl border text-left transition-all relative cursor-pointer ${
                              isSelected
                                ? "border-[#234d4d] bg-[#eaf6df] ring-2 ring-[#234d4d]/30 shadow-xs"
                                : "border-[#dfe6df] bg-[#fbfff9] hover:bg-[#f4faea]"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="w-5 h-5 rounded-full bg-[#234d4d] text-[#d7ef73] text-[9px] font-extrabold flex items-center justify-center shrink-0">
                                {ag.initials}
                              </span>
                              <span className="text-xs font-bold truncate text-[#10484b]">
                                {ag.name.split(" ")[0]}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#6e897e] truncate font-medium" title={ag.role}>
                              {ag.role}
                            </p>
                            {isSelected && (
                              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#234d4d]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#10484b]">
                        Preferred Date
                      </label>
                      <span className="text-[10px] text-[#6e897e] font-medium">
                        Timezone: Asia/Kuala_Lumpur
                      </span>
                    </div>
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

                  {/* Real-Time Time Slots Grid with Double-Booking Locking */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-[#10484b] flex items-center gap-1.5">
                        <Clock size={13} className="text-[#234d4d]" />
                        <span>Select Time Window</span>
                      </label>
                      {isLoadingSlots ? (
                        <span className="text-[10px] text-[#6e897e] animate-pulse">Checking calendar...</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Double-Booking Prevention Active
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((slot) => {
                        const status = slotAvailability?.find((s) => s.timeSlot === slot);
                        const isUnavailable = status ? !status.available : false;
                        const isSelected = selectedSlot === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isUnavailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2 rounded-xl text-left border text-xs transition-all relative cursor-pointer ${
                              isUnavailable
                                ? "bg-rose-50/60 border-rose-200 text-rose-400 opacity-75 cursor-not-allowed"
                                : isSelected
                                ? "bg-[#234d4d] border-[#234d4d] text-white shadow-sm ring-1 ring-[#234d4d]"
                                : "bg-[#fbfff9] border-[#dfe6df] text-[#10484b] hover:border-[#234d4d]/40 hover:bg-[#f4faea]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-semibold leading-tight line-clamp-1">{slot.split(" (")[0]}</span>
                              {isUnavailable ? (
                                <Lock size={12} className="text-rose-500 shrink-0 mt-0.5" />
                              ) : isSelected ? (
                                <CheckCircle2 size={12} className="text-[#d7ef73] shrink-0 mt-0.5" />
                              ) : null}
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[10px]">
                              <span className={isUnavailable ? "text-rose-400" : isSelected ? "text-emerald-200" : "text-[#6e897e]"}>
                                {slot.includes("(") ? slot.match(/\((.*?)\)/)?.[1] : "Viewing Window"}
                              </span>
                              {isUnavailable ? (
                                <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 py-0.5 rounded">
                                  Busy
                                </span>
                              ) : (
                                <span className={`text-[9px] font-medium ${isSelected ? "text-[#d7ef73]" : "text-emerald-700"}`}>
                                  Available
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Google Calendar 2-Way Sync Info Strip */}
                    <div className="mt-2.5 p-2 rounded-xl bg-[#eaf6df]/70 border border-[#234d4d]/15 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-[#10484b]">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                        <span className="font-semibold">Google Calendar 2-Way Sync:</span>
                        <span className="text-[#567177] font-medium truncate max-w-[200px]">
                          {assignedAgent.email}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-800 font-bold bg-white/70 px-1.5 py-0.5 rounded-md border border-emerald-200">
                        Auto-Blocks Conflicted Slots
                      </span>
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

                  {/* Buyer contact summary with WhatsApp integration notice */}
                  <div className="p-3.5 bg-gradient-to-r from-[#e7fedb] to-[#f4faea] rounded-2xl border border-[#25D366]/40 flex items-center justify-between text-xs shadow-sm">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-[#10484b]">
                          Booking for: {activeCustomer?.name || "Sarah Tan"}
                        </p>
                        <span className="px-2 py-0.2 bg-[#25D366]/20 text-[#075E54] text-[9px] font-black rounded-full">
                          WhatsApp Active
                        </span>
                      </div>
                      <p className="text-[11px] text-[#2c5344] font-medium mt-0.5">
                        Instant WhatsApp confirmation with 1-reply cancellation will be dispatched to <strong>{activeCustomer?.phone || "+60 12-882 1099"}</strong>.
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold shrink-0 ml-2 shadow-sm">
                      💬
                    </div>
                  </div>
                </div>

                {/* Sticky Pinned Footer - ALWAYS VISIBLE TO ACCEPT BOOKING */}
                <div className="shrink-0 p-4 sm:px-6 bg-[#fbfff9] border-t border-[#dfe6df] flex gap-3 items-center shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 px-4 bg-[#f3f5ef] hover:bg-[#eaf6df] text-[#10484b] rounded-xl text-xs font-bold transition border border-[#dfe6df] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-2.5 px-4 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 border border-[#234d4d] cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>{rescheduleViewingId ? "Accept & Save Reschedule" : "Confirm VIP Viewing"}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
