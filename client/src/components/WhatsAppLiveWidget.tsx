import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  CheckCheck,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Smartphone,
  LogOut,
  CheckCircle2,
  Info,
  Smile,
  Paperclip,
  Mic,
  Calendar,
  Clock,
  Phone,
  Sparkles,
  Download,
  CalendarPlus,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { buildGoogleCalendarUrl } from "@/lib/calendarUtils";

export default function WhatsAppLiveWidget() {
  const { activeCustomer, bookedViewings } = useAuth();
  const utils = trpc.useUtils();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "link_device">("chat");
  const [inputText, setInputText] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("🏛️ Test message from Properly Real Estate VIP Concierge!");

  // Reschedule drawer state
  const [rescheduleDrawerOpen, setRescheduleDrawerOpen] = useState(false);
  const [targetRescheduleViewing, setTargetRescheduleViewing] = useState<{ id: number; title: string } | null>(null);
  const [customRescheduleDate, setCustomRescheduleDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [customRescheduleSlot, setCustomRescheduleSlot] = useState("11:00 AM - 12:00 PM");

  const customerPhone = activeCustomer?.phone || "+60 12-882 1099";
  const customerName = activeCustomer?.name || "Sarah Tan";

  // Live Baileys WhatsApp Connection State
  const { data: liveStatus, refetch: refetchLiveStatus } = trpc.whatsapp.getLiveStatus.useQuery(
    undefined,
    {
      refetchInterval: isOpen ? 2500 : 6000,
    }
  );

  const isLiveConnected = liveStatus?.status === "connected";
  const effectivePhone =
    isLiveConnected && liveStatus?.connectedPhone
      ? liveStatus.connectedPhone
      : customerPhone;

  // tRPC Queries & Mutations
  const { data: dbMessages, refetch: refetchMessages } = trpc.whatsapp.getMessages.useQuery(
    { phone: effectivePhone, customerAccountId: Number(activeCustomer?.id) || 1, limit: 50 },
    {
      refetchInterval: isOpen ? 2000 : 6000,
    }
  );

  const startConnectionMutation = trpc.whatsapp.startLiveConnection.useMutation();
  const disconnectMutation = trpc.whatsapp.disconnectLiveSession.useMutation();
  const sendLiveMsgMutation = trpc.whatsapp.sendLiveMessage.useMutation();
  const simulateMutation = trpc.whatsapp.simulateIncoming.useMutation();
  const syncHistoryMutation = trpc.whatsapp.syncChatHistoryToPhone.useMutation();

  const handleSyncToPhone = async () => {
    try {
      toast.loading("Forwarding web chat history to your WhatsApp...", { id: "sync-chat" });
      const res = await syncHistoryMutation.mutateAsync({
        customerAccountId: Number(activeCustomer?.id) || 1,
        limit: 10,
      });
      if (res.success) {
        toast.success(`Synced ${res.syncedCount} messages to your phone!`, { id: "sync-chat" });
      } else {
        toast.error(res.error || "Failed to sync messages", { id: "sync-chat" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Sync failed", { id: "sync-chat" });
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      scrollToBottom();
      setUnreadCount(0);
    }
  }, [isOpen, dbMessages, activeTab]);

  // When live device becomes connected, automatically switch to the normal chat log
  const prevLiveStatusRef = useRef(liveStatus?.status);
  useEffect(() => {
    if (liveStatus?.status === "connected" && prevLiveStatusRef.current !== "connected") {
      setActiveTab("chat");
      toast.success("WhatsApp Linked!", {
        description: `Connected to ${liveStatus.connectedPhone}. Live chat is now active and synced with your phone.`,
      });
      utils.whatsapp.getMessages.invalidate();
      refetchMessages();
    }
    prevLiveStatusRef.current = liveStatus?.status;
  }, [liveStatus?.status, liveStatus?.connectedPhone]);

  // Invalidate viewings when messages change so booking changes reflect on portal
  useEffect(() => {
    if (isOpen) {
      utils.customerPortal.getViewings.invalidate();
    }
  }, [dbMessages?.length, isOpen]);

  // Track unread messages when widget is closed
  const prevCountRef = useRef(0);
  useEffect(() => {
    const currentCount = dbMessages?.length || 0;
    if (!isOpen && currentCount > prevCountRef.current && prevCountRef.current > 0) {
      const diff = currentCount - prevCountRef.current;
      setUnreadCount((prev) => prev + diff);
      toast.info("💬 New WhatsApp Update Received", {
        description: "Open WhatsApp Concierge to view your update.",
      });
    }
    prevCountRef.current = currentCount;
  }, [dbMessages, isOpen]);

  // Handle start QR pairing — pass active customer account ID so backend links to the right buyer
  const handleStartPairing = async () => {
    try {
      toast.loading("Generating WhatsApp QR code...", { id: "qr-toast" });
      await startConnectionMutation.mutateAsync(
        activeCustomer?.dbId ? { customerAccountId: activeCustomer.dbId } : undefined
      );
      await refetchLiveStatus();
      toast.success("Scan the QR code with WhatsApp!", { id: "qr-toast" });
    } catch (err: any) {
      toast.error(err?.message || "Failed to start WhatsApp pairing", { id: "qr-toast" });
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      await refetchLiveStatus();
      toast.info("WhatsApp device unlinked.");
    } catch (err: any) {
      toast.error("Failed to disconnect session");
    }
  };

  // Handle Send Live Test Message
  const handleSendLiveTest = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      toast.error("Please provide both phone number and message.");
      return;
    }
    try {
      toast.loading("Sending live WhatsApp message...", { id: "test-send" });
      const res = await sendLiveMsgMutation.mutateAsync({
        phone: testPhone,
        text: testMessage,
      });
      if (res.success) {
        toast.success(`Message sent! Check your WhatsApp.`, { id: "test-send" });
        await utils.whatsapp.getMessages.invalidate();
        await refetchMessages();
      } else {
        toast.error(res.error || "Failed to send message", { id: "test-send" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to dispatch message", { id: "test-send" });
    }
  };

  // Fallback initial conversation if DB has no messages yet
  const displayMessages =
    dbMessages && dbMessages.length > 0
      ? [...dbMessages].reverse().map((m) => ({
          id: String(m.id),
          sender: m.direction === "incoming" ? ("customer" as const) : ("bot" as const),
          senderName: m.senderName || (m.direction === "incoming" ? customerName : "Properly Concierge"),
          text: m.message,
          time: (() => {
            if (!m.createdAt) return "Just now";
            const d = new Date(m.createdAt);
            return isNaN(d.getTime()) ? "Just now" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          })(),
          status: (m.status as any) || "read",
          parsedAction: m.parsedAction || undefined,
        }))
      : [
          {
            id: "init_1",
            sender: "bot" as const,
            senderName: "Properly WhatsApp Concierge",
            text: `🏛️ *PROPERLY LUXURY REAL ESTATE*\n━━━━━━━━━━━━━━━━━━━━━━━━━━\nWelcome to your 24/7 WhatsApp Concierge.\n\nWhenever you schedule a VIP private viewing, your live confirmation will appear here. If your plans change, you can reply *CANCEL* or *CANCEL #[ID]* right here to release your slot instantly.`,
            time: "Just now",
            status: "read" as const,
            parsedAction: undefined as string | undefined,
          },
        ];

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || isSending) return;

    setInputText("");
    setIsSending(true);

    try {
      const response = await simulateMutation.mutateAsync({
        from: effectivePhone,
        body: message,
        senderName: customerName,
        customerAccountId: Number(activeCustomer?.dbId || activeCustomer?.id) || 1,
      });

      // Invalidate queries so site updates immediately!
      await utils.customerPortal.getViewings.invalidate();
      await utils.whatsapp.getMessages.invalidate();
      await utils.whatsapp.getStats.invalidate();
      await refetchMessages();

      // Mirror to real phone if live device is connected
      if (isLiveConnected && liveStatus?.connectedPhone) {
        try {
          await sendLiveMsgMutation.mutateAsync({
            phone: liveStatus.connectedPhone,
            text: `👤 *You (Web):*\n${message}`,
          });
        } catch (e) {
          console.error("Failed to mirror user message to phone", e);
        }

        if (response.replyMessage) {
          try {
            await sendLiveMsgMutation.mutateAsync({
              phone: liveStatus.connectedPhone,
              text: response.replyMessage,
            });
          } catch (e) {
            console.error("Failed to mirror bot reply to phone", e);
          }
        }
      }

      if (response.action === "viewing_cancelled") {
        toast.success("⚡ Auto-Updated via WhatsApp!", {
          description: "Your viewing has been cancelled and the site calendar was updated.",
        });
      }

      if (response.action === "viewing_rescheduled") {
        toast.success("📅 Viewing Rescheduled via WhatsApp!", {
          description: "Your booking has been updated. The new date and time are live on the portal.",
        });
      }

      setIsSending(false);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      setIsSending(false);
      toast.error(err?.message || "Failed to process WhatsApp message.");
    }
  };

  // Find active confirmed viewing for quick action prompt
  const activeViewing = bookedViewings.find((v) => v.status === "Confirmed");

  // Helper to extract viewing info from message body
  const parseViewingInfoFromText = (text: string) => {
    const idMatch = text.match(/#(\d+)/);
    const id = idMatch ? parseInt(idMatch[1], 10) : null;

    const resMatch = text.match(/(?:\*Residence:\*|\*Property:\*|Residence:|Property:)\s*([^\n\r]+)/i);
    const title = resMatch ? resMatch[1].trim() : null;

    const locMatch = text.match(/(?:\*Location:\*|Location:)\s*([^\n\r]+)/i);
    const location = locMatch ? locMatch[1].trim() : "Kuala Lumpur";

    const dateMatch = text.match(/(?:\*Date:\*|\*New Date:\*|Date:|New Date:)\s*([^\n\r]+)/i);
    const date = dateMatch ? dateMatch[1].trim() : null;

    const timeMatch = text.match(/(?:\*Time Window:\*|\*New Time:\*|\*Time:\*|Time Window:|New Time:|Time:)\s*([^\n\r]+)/i);
    const timeSlot = timeMatch ? timeMatch[1].trim() : "11:00 AM - 12:00 PM";

    const specMatch = text.match(/(?:\*Specialist:\*|\*Assigned Specialist:\*|Specialist:|Assigned Specialist:)\s*([^\n\r]+)/i);
    const specialist = specMatch ? specMatch[1].trim() : "Hannah Cheong";

    const isTour = Boolean(
      text.includes("VIP Private Tour") ||
      text.includes("VIP Private Tour Confirmed") ||
      text.includes("TOUR RESCHEDULED") ||
      text.includes("Your Scheduled VIP Private Tour") ||
      text.includes("CALENDAR INVITE (.ICS)") ||
      (id && (text.includes("Confirmed") || text.includes("Residence:")))
    );

    const isCancelled = text.includes("TOUR CANCELLED") || text.includes("successfully cancelled");

    const matchedViewing = id ? bookedViewings.find((v) => Number(v.id) === id) : null;
    const googleCalendarHtmlLink = matchedViewing?.googleCalendarHtmlLink;
    const googleCalendarEventId = matchedViewing?.googleCalendarEventId;

    return { id, title, location, date, timeSlot, specialist, isTour, isCancelled, googleCalendarHtmlLink, googleCalendarEventId };
  };

  // Helper to download .ics calendar file
  const handleDownloadIcs = (viewingInfo?: {
    id?: number | null;
    title?: string | null;
    location?: string | null;
    date?: string | null;
    timeSlot?: string | null;
    specialist?: string | null;
  }) => {
    const resolvedViewing = activeViewing || bookedViewings.find((v) => v.id === String(viewingInfo?.id));
    const id = viewingInfo?.id || (resolvedViewing ? Number(resolvedViewing.id) : 1);
    const title = viewingInfo?.title || resolvedViewing?.propertyTitle || "Luxury Residence";
    const location = viewingInfo?.location || resolvedViewing?.propertyLocation || "Kuala Lumpur";
    const date = viewingInfo?.date || resolvedViewing?.date || new Date().toISOString().split("T")[0];
    const timeSlot = viewingInfo?.timeSlot || resolvedViewing?.timeSlot || "11:00 AM - 12:00 PM";
    const agentName = viewingInfo?.specialist?.split("(")[0].trim() || resolvedViewing?.agentName || "Hannah Cheong";
    const agentPhone = resolvedViewing?.agentPhone || "+60 12-384 9201";

    const cleanTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 28);
    const cleanDate = date.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `VIP_Tour_${cleanTitle}_${cleanDate}.ics`;

    const nowStamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    let day = new Date().getDate();

    const monthNames: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    };
    const isoMatch = date.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    const wordsMatch = date.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10);
      day = parseInt(isoMatch[3], 10);
    } else if (wordsMatch) {
      day = parseInt(wordsMatch[1], 10);
      const mStr = wordsMatch[2].slice(0, 3).toLowerCase();
      month = monthNames[mStr] || month;
      if (wordsMatch[3]) year = parseInt(wordsMatch[3], 10);
    }

    let startHour = 11, startMinute = 0, endHour = 12, endMinute = 0;
    const timeMatches = timeSlot.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi);
    if (timeMatches && timeMatches.length > 0) {
      const parseTime = (str: string) => {
        const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (!m) return { hour: 11, minute: 0 };
        let h = parseInt(m[1], 10);
        const min = m[2] ? parseInt(m[2], 10) : 0;
        const meridiem = m[3] ? m[3].toLowerCase() : (h >= 8 && h <= 11 ? "am" : "pm");
        if (meridiem === "pm" && h < 12) h += 12;
        if (meridiem === "am" && h === 12) h = 0;
        return { hour: h, minute: min };
      };
      const s = parseTime(timeMatches[0]);
      startHour = s.hour; startMinute = s.minute;
      if (timeMatches.length > 1) {
        const e = parseTime(timeMatches[1]);
        endHour = e.hour; endMinute = e.minute;
      } else {
        endHour = (startHour + 1) % 24;
        endMinute = startMinute;
      }
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startHour)}${pad(startMinute)}00`;
    const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endHour)}${pad(endMinute)}00`;

    const descriptionLines = [
      `🏛️ PROPERLY LUXURY REAL ESTATE — VIP PRIVATE TOUR`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Residence: ${title}`,
      `Location: ${location}`,
      `Dedicated Specialist: ${agentName} (${agentPhone})`,
      `Booking Reference: #${id}`,
      ``,
      `Need to reschedule or cancel?`,
      `Reply directly in WhatsApp Concierge:`,
      `• CANCEL #${id}`,
      `• RESCHEDULE #${id}`,
    ].join("\\n");

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Properly Luxury Real Estate//Property Tour Concierge//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:REQUEST",
      "BEGIN:VTIMEZONE",
      "TZID:Asia/Kuala_Lumpur",
      "X-LIC-LOCATION:Asia/Kuala_Lumpur",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:+0800",
      "TZOFFSETTO:+0800",
      "TZNAME:MYT",
      "DTSTART:19700101T000000",
      "END:STANDARD",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      `UID:properly-viewing-${id}@properly.my`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;TZID=Asia/Kuala_Lumpur:${dtStart}`,
      `DTEND;TZID=Asia/Kuala_Lumpur:${dtEnd}`,
      `SUMMARY:🏛️ VIP Private Tour: ${title}`,
      `DESCRIPTION:${descriptionLines}`,
      `LOCATION:${location}`,
      `ORGANIZER;CN=Properly Luxury Real Estate:mailto:concierge@properly.my`,
      `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${customerName}:mailto:${activeCustomer?.email || 'client@properly.my'}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "BEGIN:VALARM",
      "TRIGGER:-PT1H",
      "ACTION:DISPLAY",
      `DESCRIPTION:Reminder: VIP Private Tour of ${title} in 1 hour`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ];

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Calendar Invite Saved: ${fileName}`, {
      description: "Import this file to add the VIP Tour directly to your phone / desktop calendar.",
    });
  };

  // Helper to trigger 1-tap reschedule from smart slots
  const handleSelectSmartSlot = async (slot: { date: string; timeSlot: string }) => {
    const vId = targetRescheduleViewing?.id || (activeViewing ? Number(activeViewing.id) : 1);
    setRescheduleDrawerOpen(false);
    toast.loading("Rescheduling your tour...", { id: "resched-toast" });
    await handleSendMessage(`RESCHEDULE #${vId}`);
    setTimeout(() => {
      handleSendMessage(`${slot.date} at ${slot.timeSlot}`);
      toast.dismiss("resched-toast");
    }, 450);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* AUTHENTIC WHATSAPP FLOATING ACTION BUTTON (FAB)                           */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              onClick={() => setIsOpen(true)}
              className="group relative w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-[0_6px_24px_rgba(37,211,102,0.48)] hover:shadow-[0_8px_28px_rgba(37,211,102,0.58)] transition-all cursor-pointer"
              aria-label="Chat on WhatsApp"
              title="Chat on WhatsApp"
            >
              {/* Official WhatsApp Vector Logo */}
              <svg
                viewBox="0 0 24 24"
                width="32"
                height="32"
                fill="currentColor"
                className="drop-shadow-xs"
              >
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.04 14.69 2 12.04 2ZM12.05 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.05 20.15ZM16.56 14.39C16.31 14.26 15.09 13.66 14.86 13.58C14.64 13.5 14.47 13.46 14.31 13.71C14.14 13.96 13.66 14.52 13.51 14.69C13.36 14.86 13.22 14.88 12.97 14.76C12.72 14.63 11.92 14.37 10.97 13.52C10.23 12.86 9.73 12.05 9.58 11.8C9.43 11.55 9.57 11.41 9.69 11.29C9.8 11.18 9.94 11 10.06 10.86C10.18 10.72 10.22 10.62 10.3 10.45C10.38 10.29 10.34 10.14 10.28 10.02C10.22 9.89 9.73 8.69 9.53 8.19C9.33 7.71 9.13 7.78 8.97 7.77C8.83 7.76 8.66 7.76 8.49 7.76C8.32 7.76 8.05 7.82 7.82 8.07C7.59 8.32 6.95 8.92 6.95 10.14C6.95 11.36 7.84 12.54 7.96 12.7C8.08 12.87 9.7 15.37 12.18 16.44C12.77 16.69 13.23 16.85 13.59 16.96C14.18 17.15 14.72 17.12 15.15 17.06C15.63 16.99 16.63 16.45 16.84 15.87C17.04 15.28 17.04 14.78 16.98 14.68C16.92 14.58 16.81 14.52 16.56 14.39Z" />
              </svg>

              {/* Online connection dot */}
              {isLiveConnected && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#25D366] ring-2 ring-white rounded-full" />
              )}

              {/* Unread badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#ea0038] text-white text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                  {unreadCount}
                </span>
              )}

              {/* Hover Tooltip */}
              <div className="absolute right-full mr-3.5 px-3 py-1.5 bg-[#111b21] text-white text-xs font-semibold rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                {isLiveConnected ? "WhatsApp • Phone Connected" : "Chat on WhatsApp"}
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ========================================================================= */}
      {/* AUTHENTIC WHATSAPP WEB CHAT WINDOW                                        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-end p-0 sm:p-6 pointer-events-none">
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs sm:hidden pointer-events-auto"
            />

            {/* Chat Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 30 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative pointer-events-auto w-full sm:w-[410px] h-[86vh] sm:h-[620px] max-h-[94vh] bg-[#efeae2] rounded-t-2xl sm:rounded-2xl shadow-[0_12px_44px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col font-sans border border-[#d1d7db]/60"
            >
              {/* ----------------------------------------------------------------- */}
              {/* 1. WHATSAPP HEADER (CLASSIC TEAL)                                 */}
              {/* ----------------------------------------------------------------- */}
              <div className="px-4 py-3 bg-[#008069] text-white flex items-center justify-between shadow-xs select-none shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Profile Picture */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[#128c7e] border border-white/25 flex items-center justify-center text-white font-bold text-base shadow-xs">
                      🏛️
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-[#008069] ${
                        isLiveConnected ? "bg-[#25D366]" : "bg-emerald-300"
                      }`}
                    />
                  </div>

                  {/* Profile Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-[15px] text-white leading-tight truncate">
                        Properly Concierge
                      </h3>
                      <ShieldCheck size={14} className="text-[#25D366] fill-[#25D366]/20 shrink-0" />
                    </div>
                    <p className="text-[12px] text-white/80 font-normal leading-tight mt-0.5 truncate flex items-center gap-1.5">
                      {isLiveConnected ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                          <span>online</span>
                          <span className="text-white/50">•</span>
                          <span className="text-white/90 font-mono text-[11px]">
                            {liveStatus?.connectedPhone || effectivePhone}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                          <span>online • Official Business Account</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Header Action Icons */}
                <div className="flex items-center gap-0.5 text-white/90">
                  {/* Tab Switch: Link Device vs Chat */}
                  <button
                    onClick={() => setActiveTab(activeTab === "chat" ? "link_device" : "chat")}
                    className={`p-2 rounded-full hover:bg-white/10 transition ${
                      activeTab === "link_device" ? "bg-white/20 text-white" : "text-white/85"
                    }`}
                    title={activeTab === "link_device" ? "Back to Chat" : "Link WhatsApp Phone (QR)"}
                  >
                    <QrCode size={19} />
                  </button>

                  <button
                    onClick={() => {
                      utils.whatsapp.getMessages.invalidate();
                      refetchMessages();
                      refetchLiveStatus();
                      toast.success("Synced with WhatsApp");
                    }}
                    className="p-2 rounded-full hover:bg-white/10 text-white/85 hover:text-white transition"
                    title="Refresh Messages"
                  >
                    <RefreshCw size={17} />
                  </button>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-full hover:bg-white/10 text-white/85 hover:text-white transition"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* 2. CHAT VIEW VS LINK DEVICE VIEW                                  */}
              {/* ----------------------------------------------------------------- */}
              {activeTab === "link_device" ? (
                /* LINK DEVICE SCREEN (AUTHENTIC WHATSAPP WEB PAIRING) */
                <div className="flex-1 overflow-y-auto p-5 bg-[#f0f2f5] flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="text-center pt-2">
                      <div className="w-12 h-12 rounded-full bg-[#008069]/10 text-[#008069] flex items-center justify-center mx-auto mb-2">
                        <Smartphone size={24} />
                      </div>
                      <h4 className="font-bold text-slate-800 text-base">
                        Link with your WhatsApp
                      </h4>
                      <p className="text-xs text-[#54656f] mt-1 max-w-xs mx-auto">
                        Connect your mobile phone to receive real-time property updates in your private WhatsApp chat.
                      </p>
                    </div>

                    {isLiveConnected ? (
                      /* Connected State */
                      <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e9edef] text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                          <CheckCircle2 size={26} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">WhatsApp Linked Successfully</p>
                          <p className="text-xs text-[#008069] font-semibold mt-0.5">
                            {liveStatus?.connectedPhone}
                          </p>
                          <p className="text-[11px] text-[#54656f] mt-1">
                            Your self-chat ("Message yourself") is synced. Text commands or viewings update both here and on your phone.
                          </p>
                        </div>

                        <button
                          onClick={() => setActiveTab("chat")}
                          className="w-full py-2.5 bg-[#008069] hover:bg-[#00705a] text-white font-semibold text-xs rounded-lg shadow-xs transition"
                        >
                          Return to Chat
                        </button>

                        <button
                          onClick={handleSyncToPhone}
                          disabled={syncHistoryMutation.isPending}
                          className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-[#008069] border border-emerald-300/80 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={14} className={syncHistoryMutation.isPending ? "animate-spin" : ""} />
                          <span>Push Web Chat History to Phone</span>
                        </button>

                        <div className="pt-3 border-t border-slate-100">
                          <button
                            onClick={handleDisconnect}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition inline-flex items-center gap-1.5"
                          >
                            <LogOut size={13} /> Unlink Device
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* QR Code State */
                      <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e9edef] space-y-4">
                        <div className="flex flex-col items-center justify-center min-h-[210px]">
                          {liveStatus?.qrCodeDataUrl ? (
                            <div className="space-y-2 flex flex-col items-center">
                              <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200">
                                <img
                                  src={liveStatus.qrCodeDataUrl}
                                  alt="WhatsApp QR Code"
                                  className="w-48 h-48 object-contain"
                                />
                              </div>
                              <p className="text-[11px] text-[#008069] font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping" />
                                Point your phone camera to scan
                              </p>
                            </div>
                          ) : (
                            <div className="text-center space-y-3 py-4">
                              <QrCode size={44} className="text-slate-300 mx-auto" />
                              <p className="text-xs text-[#54656f]">
                                Generate your QR code to link your personal WhatsApp.
                              </p>
                              <button
                                onClick={handleStartPairing}
                                disabled={startConnectionMutation.isPending}
                                className="px-4 py-2 bg-[#008069] hover:bg-[#00705a] text-white font-semibold text-xs rounded-lg shadow-xs transition inline-flex items-center gap-2 disabled:opacity-50"
                              >
                                {startConnectionMutation.isPending ? (
                                  <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    Starting...
                                  </>
                                ) : (
                                  <>
                                    <QrCode size={15} /> Generate QR Code
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Instructions */}
                        <div className="bg-[#f0f2f5] rounded-lg p-3 text-[11px] text-[#54656f] space-y-1">
                          <p className="font-bold text-slate-700 flex items-center gap-1">
                            <Info size={13} className="text-[#008069]" /> Steps to link:
                          </p>
                          <ol className="list-decimal list-inside space-y-0.5">
                            <li>Open WhatsApp on your phone</li>
                            <li>Tap <strong>Settings</strong> or <strong>Menu (⋮)</strong></li>
                            <li>Select <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
                            <li>Scan this QR code</li>
                          </ol>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveTab("chat")}
                    className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition text-center"
                  >
                    ← Back to Concierge Chat
                  </button>
                </div>
              ) : (
                /* --------------------------------------------------------------- */
                /* AUTHENTIC WHATSAPP CONVERSATION STREAM                          */
                /* --------------------------------------------------------------- */
                <>
                  {/* Chat Message Stream */}
                  <div
                    className="flex-1 overflow-y-auto p-3.5 space-y-2.5 [scrollbar-width:thin]"
                    style={{
                      backgroundColor: "#efeae2",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M9 20L15 20L15 26L9 26Z' fill='%23000000' fill-opacity='0.03'/%3E%3Cpath d='M60 40L64 40L64 44L60 44Z' fill='%23000000' fill-opacity='0.03'/%3E%3Cpath d='M95 85L101 85L101 91L95 91Z' fill='%23000000' fill-opacity='0.03'/%3E%3Ccircle cx='30' cy='80' r='3' fill='%23000000' fill-opacity='0.03'/%3E%3Ccircle cx='80' cy='20' r='2.5' fill='%23000000' fill-opacity='0.03'/%3E%3C/svg%3E")`,
                    }}
                  >
                    {/* End-to-End Encryption Banner */}
                    <div className="flex justify-center my-1.5">
                      <div className="bg-[#ffeecd]/95 border border-[#ffe09e]/80 rounded-lg px-3 py-1.5 max-w-[88%] text-center shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                        <p className="text-[11px] text-[#54656f] leading-relaxed flex items-center justify-center gap-1">
                          <ShieldCheck size={12} className="text-[#008069] shrink-0" />
                          <span>Messages are end-to-end synced with your Property Tour Tracker.</span>
                        </p>
                      </div>
                    </div>

                    {/* Today Date Pill */}
                    <div className="flex justify-center my-2">
                      <span className="bg-white/90 text-[#54656f] text-[11px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-md shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                        Today
                      </span>
                    </div>

                    {/* Live Sync Badge */}
                    {isLiveConnected && (
                      <div className="flex justify-center my-1">
                        <button
                          type="button"
                          onClick={handleSyncToPhone}
                          disabled={syncHistoryMutation.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 hover:bg-emerald-50 text-[#008069] rounded-full border border-emerald-300/80 text-[11px] font-semibold shadow-xs transition cursor-pointer"
                          title="Click to forward previous web chat messages to your phone"
                        >
                          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                          <span>Phone Linked ({liveStatus?.connectedPhone}) • Tap to push web history</span>
                        </button>
                      </div>
                    )}

                    {/* Messages */}
                    {displayMessages.map((msg) => {
                      const isUser = msg.sender === "customer";
                      const viewingInfo = parseViewingInfoFromText(msg.text);

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[86%] sm:max-w-[84%] px-3 py-2 text-[13.5px] leading-relaxed shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] relative ${
                              isUser
                                ? "bg-[#d9fdd3] text-[#111b21] rounded-lg rounded-tr-none"
                                : "bg-white text-[#111b21] rounded-lg rounded-tl-none"
                            }`}
                          >
                            {/* Message Text with WhatsApp markdown parsing */}
                            <div className="whitespace-pre-wrap font-normal">
                              {msg.text.split("\n").map((line, idx) => {
                                const parts = line.split(/(\*[^*]+\*)/g);
                                return (
                                  <p key={idx} className="min-h-[1.1em]">
                                    {parts.map((p, pIdx) => {
                                      if (p.startsWith("*") && p.endsWith("*")) {
                                        return (
                                          <strong key={pIdx} className="font-bold text-[#111b21]">
                                            {p.slice(1, -1)}
                                          </strong>
                                        );
                                      }
                                      return p;
                                    })}
                                  </p>
                                );
                              })}
                            </div>

                            {/* Interactive 1-Tap VIP Action Card on Bot Tour Messages */}
                            {!isUser && viewingInfo.isTour && !viewingInfo.isCancelled && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/90 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-bold text-[#008069]">
                                  <span className="flex items-center gap-1">
                                    <Sparkles size={12} className="text-[#25D366]" /> 1-Tap Actions
                                  </span>
                                  {viewingInfo.id && (
                                    <span className="text-[10.5px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                      #{viewingInfo.id}
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                  {/* 1. Google Calendar */}
                                  <a
                                    href={buildGoogleCalendarUrl({
                                      title: viewingInfo.title || "Tour",
                                      location: viewingInfo.location,
                                      date: viewingInfo.date || "",
                                      timeSlot: viewingInfo.timeSlot || "",
                                      specialistName: viewingInfo.specialist,
                                      bookingId: viewingInfo.id ?? undefined,
                                      googleCalendarHtmlLink: viewingInfo.googleCalendarHtmlLink,
                                      googleCalendarEventId: viewingInfo.googleCalendarEventId,
                                    })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                                    title="Open Event in Google Calendar"
                                  >
                                    <Calendar size={13} className="text-blue-600 shrink-0" />
                                    <span className="truncate">Google Cal</span>
                                  </a>

                                  {/* 2. Reschedule */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTargetRescheduleViewing({
                                        id: viewingInfo.id || (activeViewing ? Number(activeViewing.id) : 1),
                                        title: viewingInfo.title || activeViewing?.propertyTitle || "Tour",
                                      });
                                      setRescheduleDrawerOpen(true);
                                    }}
                                    className="px-2 py-1.5 bg-[#f0f2f5] hover:bg-blue-50 active:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                                    title="Change Date & Time"
                                  >
                                    <RefreshCw size={12} className="text-blue-600 shrink-0" />
                                    <span className="truncate">Reschedule</span>
                                  </button>

                                  {/* 3. Cancel */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSendMessage(viewingInfo.id ? `CANCEL #${viewingInfo.id}` : "CANCEL")
                                    }
                                    className="px-2 py-1.5 bg-[#f0f2f5] hover:bg-rose-50 active:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                                    title="Cancel this appointment"
                                  >
                                    <X size={13} className="text-rose-600 shrink-0" />
                                    <span className="truncate">Cancel Slot</span>
                                  </button>

                                  {/* 4. Contact Specialist */}
                                  <button
                                    type="button"
                                    onClick={() => handleSendMessage("AGENT")}
                                    className="px-2 py-1.5 bg-[#f0f2f5] hover:bg-slate-100 active:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition shadow-2xs cursor-pointer"
                                    title="Call or speak with assigned specialist"
                                  >
                                    <Phone size={12} className="text-slate-600 shrink-0" />
                                    <span className="truncate">Contact Agent</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Timestamp & Delivery Tick */}
                            <div className="flex items-center justify-end gap-1 mt-0.5 text-[11px] text-[#667781] select-none">
                              <span>{msg.time}</span>
                              {isUser && <CheckCheck size={15} className="text-[#53bdeb]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* --------------------------------------------------------------- */}
                  {/* RESCHEDULE DRAWER / QUICK SLOT MODAL                            */}
                  {/* --------------------------------------------------------------- */}
                  <AnimatePresence>
                    {rescheduleDrawerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 30 }}
                        className="bg-white border-t border-[#d1d7db] p-3 shadow-lg shrink-0 select-none z-10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <RefreshCw size={14} className="text-[#008069]" />
                            <h5 className="text-xs font-bold text-slate-800">
                              Reschedule VIP Tour {targetRescheduleViewing ? `#${targetRescheduleViewing.id}` : ""}
                            </h5>
                          </div>
                          <button
                            onClick={() => setRescheduleDrawerOpen(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <p className="text-[11px] text-[#54656f] mb-2 font-medium">
                          Choose a 1-tap smart slot or select custom time:
                        </p>

                        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                          {/* Slot 1: Tomorrow 11 AM */}
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 1);
                              handleSelectSmartSlot({
                                date: `${String(d.getDate()).padStart(2, "0")} Oct 2026`,
                                timeSlot: "11:00 AM - 12:00 PM",
                              });
                            }}
                            className="p-2 bg-[#f0f2f5] hover:bg-emerald-50 border border-slate-200 hover:border-[#008069] rounded-lg text-left transition text-[11px] cursor-pointer"
                          >
                            <span className="font-bold text-[#008069] block">⚡ Tomorrow 11:00 AM</span>
                            <span className="text-[10px] text-slate-500">Morning Walkthrough</span>
                          </button>

                          {/* Slot 2: Tomorrow 3 PM */}
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 1);
                              handleSelectSmartSlot({
                                date: `${String(d.getDate()).padStart(2, "0")} Oct 2026`,
                                timeSlot: "03:00 PM - 04:00 PM",
                              });
                            }}
                            className="p-2 bg-[#f0f2f5] hover:bg-emerald-50 border border-slate-200 hover:border-[#008069] rounded-lg text-left transition text-[11px] cursor-pointer"
                          >
                            <span className="font-bold text-[#008069] block">⚡ Tomorrow 03:00 PM</span>
                            <span className="text-[10px] text-slate-500">Afternoon Sunset Slot</span>
                          </button>

                          {/* Slot 3: Saturday 11 AM */}
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 3);
                              handleSelectSmartSlot({
                                date: `${String(d.getDate()).padStart(2, "0")} Oct 2026`,
                                timeSlot: "11:00 AM - 12:00 PM",
                              });
                            }}
                            className="p-2 bg-[#f0f2f5] hover:bg-emerald-50 border border-slate-200 hover:border-[#008069] rounded-lg text-left transition text-[11px] cursor-pointer"
                          >
                            <span className="font-bold text-[#008069] block">📅 This Saturday 11 AM</span>
                            <span className="text-[10px] text-slate-500">Weekend Prime Viewing</span>
                          </button>

                          {/* Slot 4: Sunday 2:30 PM */}
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 4);
                              handleSelectSmartSlot({
                                date: `${String(d.getDate()).padStart(2, "0")} Oct 2026`,
                                timeSlot: "02:30 PM - 03:30 PM",
                              });
                            }}
                            className="p-2 bg-[#f0f2f5] hover:bg-emerald-50 border border-slate-200 hover:border-[#008069] rounded-lg text-left transition text-[11px] cursor-pointer"
                          >
                            <span className="font-bold text-[#008069] block">📅 This Sunday 2:30 PM</span>
                            <span className="text-[10px] text-slate-500">Weekend VIP Tour</span>
                          </button>
                        </div>

                        {/* Custom Picker Fallback */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <input
                            type="date"
                            value={customRescheduleDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setCustomRescheduleDate(e.target.value)}
                            className="flex-1 py-1 px-2 bg-[#f0f2f5] text-[11px] rounded border border-slate-200 text-slate-700 focus:outline-none"
                          />
                          <select
                            value={customRescheduleSlot}
                            onChange={(e) => setCustomRescheduleSlot(e.target.value)}
                            className="flex-1 py-1 px-2 bg-[#f0f2f5] text-[11px] rounded border border-slate-200 text-slate-700 focus:outline-none"
                          >
                            <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                            <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                            <option value="02:30 PM - 03:30 PM">02:30 PM - 03:30 PM</option>
                            <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectSmartSlot({
                                date: customRescheduleDate,
                                timeSlot: customRescheduleSlot,
                              })
                            }
                            className="px-3 py-1 bg-[#008069] hover:bg-[#00705a] text-white text-[11px] font-bold rounded shadow-xs"
                          >
                            Confirm
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* --------------------------------------------------------------- */}
                  {/* 3. QUICK ACTION PILLS (WHATSAPP BUSINESS INTERACTIVE BUTTONS)    */}
                  {/* --------------------------------------------------------------- */}
                  <div
                    className="px-3 py-2 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-1.5 overflow-x-auto shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {activeViewing ? (
                      <>
                        <a
                          href={buildGoogleCalendarUrl({
                            title: activeViewing.propertyTitle,
                            location: activeViewing.propertyLocation,
                            date: activeViewing.date,
                            timeSlot: activeViewing.timeSlot,
                            specialistName: activeViewing.agentName,
                            bookingId: activeViewing.id,
                            googleCalendarHtmlLink: activeViewing.googleCalendarHtmlLink,
                            googleCalendarEventId: activeViewing.googleCalendarEventId,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="whitespace-nowrap px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-full text-[11.5px] font-semibold transition shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                          title="Open Event in Google Calendar"
                        >
                          <Calendar size={13} className="text-blue-600" />
                          <span>📅 Google Calendar</span>
                        </a>

                        <button
                          onClick={() => {
                            setTargetRescheduleViewing({
                              id: Number(activeViewing.id),
                              title: activeViewing.propertyTitle,
                            });
                            setRescheduleDrawerOpen(true);
                          }}
                          className="whitespace-nowrap px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-full text-[11.5px] font-semibold transition shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} className="text-blue-600" />
                          <span>🔄 Reschedule #{activeViewing.id}</span>
                        </button>

                        <button
                          onClick={() => handleSendMessage(`CANCEL #${activeViewing.id}`)}
                          className="whitespace-nowrap px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-full text-[11.5px] font-semibold transition shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <span>❌ Cancel #{activeViewing.id}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSendMessage("CALENDAR")}
                          className="whitespace-nowrap px-3 py-1 bg-white hover:bg-emerald-50 text-[#008069] border border-[#008069]/30 rounded-full text-[11.5px] font-semibold transition shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <CalendarPlus size={13} className="text-[#008069]" />
                          <span>📅 Calendar Invite</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage("CANCEL")}
                          className="whitespace-nowrap px-3 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-[11.5px] font-semibold transition shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <span>❌ Cancel Tour</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleSendMessage("STATUS")}
                      className="whitespace-nowrap px-3 py-1 bg-white hover:bg-emerald-50 text-[#008069] border border-[#008069]/30 rounded-full text-[11.5px] font-semibold transition shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span>📋 My Tour Status</span>
                    </button>

                    <button
                      onClick={() => handleSendMessage("AGENT")}
                      className="whitespace-nowrap px-3 py-1 bg-white hover:bg-emerald-50 text-[#008069] border border-[#008069]/30 rounded-full text-[11.5px] font-semibold transition shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span>👤 Talk to Specialist</span>
                    </button>
                  </div>

                  {/* --------------------------------------------------------------- */}
                  {/* 4. WHATSAPP WEB INPUT BAR                                       */}
                  {/* --------------------------------------------------------------- */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="p-2.5 bg-[#f0f2f5] border-t border-[#e9edef] flex items-center gap-2 shrink-0 select-none"
                  >
                    {/* Emoji Smiley Button */}
                    <button
                      type="button"
                      onClick={() => setInputText((prev) => prev + " 👋")}
                      className="p-1.5 text-[#54656f] hover:text-[#111b21] transition rounded-full hover:bg-black/5 shrink-0"
                      title="Emoji"
                    >
                      <Smile size={22} />
                    </button>

                    {/* Attachment Button */}
                    <button
                      type="button"
                      onClick={() => toast.info("Document sharing is available for verified buyers")}
                      className="p-1.5 text-[#54656f] hover:text-[#111b21] transition rounded-full hover:bg-black/5 shrink-0"
                      title="Attach"
                    >
                      <Paperclip size={20} />
                    </button>

                    {/* Input Field */}
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a message or command (e.g. 'STATUS', 'CANCEL')..."
                      className="flex-1 py-2 px-3.5 bg-white rounded-lg text-[14px] text-[#111b21] placeholder-[#8696a0] shadow-[0_1px_1px_rgba(11,20,26,0.06)] border border-transparent focus:border-transparent focus:outline-none"
                    />

                    {/* Send Button / Mic Button */}
                    {inputText.trim() ? (
                      <button
                        type="submit"
                        disabled={isSending}
                        className="p-2.5 bg-[#00a884] hover:bg-[#008069] disabled:opacity-50 text-white rounded-full transition shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
                        title="Send Message"
                      >
                        {isSending ? (
                          <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send size={16} className="translate-x-0.5" />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toast.info("Voice note recording available on WhatsApp Mobile")}
                        className="p-2 text-[#54656f] hover:text-[#111b21] transition rounded-full hover:bg-black/5 shrink-0"
                        title="Voice Message"
                      >
                        <Mic size={22} />
                      </button>
                    )}
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
