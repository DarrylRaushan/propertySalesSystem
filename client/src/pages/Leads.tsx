/* Leads workspace — filterable table, KPI strip, create-lead dialog. Wired to trpc.leads.* */
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
    ArrowLeft,
    Calendar,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
    ExternalLink,
    Mail,
    MapPin,
    Phone,
    Plus,
    Search,
    SlidersHorizontal,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    Wallet,
    X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { getLeadWorkspaceSummary } from "@/components/leadWorkspace";
import LeadProfileModal from "@/components/LeadProfileModal";
import ModelViewer from "@/components/ModelViewer";
import ShowUnitModal from "@/components/ShowUnitModal";
import { useAuth } from "@/contexts/AuthContext";
import AgentHeader from "@/components/AgentHeader";
import { buildGoogleCalendarUrl } from "@/lib/calendarUtils";
import "@/components/LeadsWorkspace.css";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type LeadRecord = RouterOutputs["leads"]["list"][number] & { agentId?: string };

type Priority = "High" | "Medium" | "Low";
type Segment = "Ready Buyer" | "Investor" | "Researcher" | "Low Engagement";

const SEGMENTS: Segment[] = ["Ready Buyer", "Investor", "Researcher", "Low Engagement"];
const PRIORITIES: Priority[] = ["High", "Medium", "Low"];

const ACCENT_ROTATION = [
    "bg-[#e4f2df] text-[#286454]",
    "bg-[#edf5d2] text-[#607740]",
    "bg-[#dff0e6] text-[#2e6a4b]",
    "bg-[#e8f4e6] text-[#42746a]",
    "bg-[#e6f1e4] text-[#456c60]",
];

const PRIORITY_STYLE: Record<Priority, string> = {
    High: "bg-[#e5f2d3] text-[#537840]",
    Medium: "bg-[#edf5e5] text-[#4e7a62]",
    Low: "bg-[#eef5ef] text-[#668176]",
};

const SEGMENT_STYLE: Record<Segment, string> = {
    "Ready Buyer": "bg-[#e0f1df] text-[#2c745c]",
    Investor: "bg-[#eaf4e5] text-[#46725d]",
    Researcher: "bg-[#f1f7df] text-[#657b45]",
    "Low Engagement": "bg-[#eef5ef] text-[#668176]",
};

const formatRM = (value: number) =>
    new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 })
        .format(value)
        .replace("MYR", "RM");

const initialsFromName = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "??";

const emptyForm = {
    name: "",
    location: "",
    segment: "Ready Buyer" as Segment,
    priority: "Medium" as Priority,
    probability: 50,
    value: "",
    property: "",
    action: "",
    phone: "",
    email: "",
    notes: "",
};

const FRONTEND_PREVIEW_LEADS = [
    // ─── Hannah Cheong ────────────────────────────────────────────────────────
    { id: -101, name: "Aiman Faris", initials: "AF", accent: "bg-[#e4f2df] text-[#286454]", location: "Petaling Jaya, Selangor", segment: "Ready Buyer", priority: "High", probability: 92, value: 1250000, property: "Asteria Residences", action: "Confirm private viewing", phone: "+60123456789", email: "aiman@example.test", agentId: "hannah" },
    { id: -102, name: "Sarah Lim", initials: "SL", accent: "bg-[#edf5d2] text-[#607740]", location: "Mont Kiara, Kuala Lumpur", segment: "Investor", priority: "High", probability: 87, value: 980000, property: "The Mews KL", action: "Send yield comparison", phone: "+60129876543", email: "sarah@example.test", agentId: "hannah" },
    { id: -103, name: "Muhammad Zaki", initials: "MZ", accent: "bg-[#dff0e6] text-[#2e6a4b]", location: "Shah Alam, Selangor", segment: "Ready Buyer", priority: "High", probability: 78, value: 760000, property: "Elmina Green", action: "Prepare family viewing", phone: "+60128765432", email: "zaki@example.test", agentId: "hannah" },
    { id: -104, name: "Joanne Chong", initials: "JC", accent: "bg-[#e8f4e6] text-[#42746a]", location: "Bangsar South, Kuala Lumpur", segment: "Researcher", priority: "Medium", probability: 69, value: 1350000, property: "Southlink Suites", action: "Share unit availability", phone: "+60127654321", email: "joanne@example.test", agentId: "hannah" },

    // ─── Amir Rahman ──────────────────────────────────────────────────────────
    { id: -105, name: "Ravi Nair", initials: "RN", accent: "bg-[#e6f1e4] text-[#456c60]", location: "Cyberjaya, Selangor", segment: "Investor", priority: "Medium", probability: 58, value: 620000, property: "Mutiara Ville", action: "Schedule call-back", phone: "+60126543210", email: "ravi@example.test", agentId: "amir" },
    { id: -106, name: "Nadia Ismail", initials: "NI", accent: "bg-[#e8f0df] text-[#466742]", location: "Setapak, Kuala Lumpur", segment: "Ready Buyer", priority: "High", probability: 73, value: 840000, property: "Seri Wangi", action: "Confirm viewing slot", phone: "+60124455667", email: "nadia@example.test", agentId: "amir" },
    { id: -107, name: "Tan Wei Ming", initials: "TW", accent: "bg-[#e4edf7] text-[#436182]", location: "Damansara, Selangor", segment: "Investor", priority: "Medium", probability: 66, value: 1120000, property: "Verde Heights", action: "Send rental comparables", phone: "+60125566778", email: "weiming@example.test", agentId: "amir" },
    { id: -108, name: "Amelia Lee", initials: "AL", accent: "bg-[#f8eadc] text-[#8a5d3e]", location: "Cheras, Kuala Lumpur", segment: "Researcher", priority: "Medium", probability: 64, value: 710000, property: "Taman Vista", action: "Share floor plan options", phone: "+60126677889", email: "amelia@example.test", agentId: "amir" },

    // ─── Chloe Tan ────────────────────────────────────────────────────────────
    { id: -109, name: "Hafiz Karim", initials: "HK", accent: "bg-[#e4f1ed] text-[#3f7167]", location: "Puchong, Selangor", segment: "Ready Buyer", priority: "High", probability: 76, value: 930000, property: "Lakefront One", action: "Review offer range", phone: "+60127788990", email: "hafiz@example.test", agentId: "chloe" },
    { id: -110, name: "Siti Yusuf", initials: "SY", accent: "bg-[#f5e8e6] text-[#8a5d59]", location: "Kota Kemuning, Selangor", segment: "Low Engagement", priority: "Low", probability: 61, value: 680000, property: "Canopy Grove", action: "Re-open conversation", phone: "+60128899001", email: "siti@example.test", agentId: "chloe" },
    { id: -111, name: "Daniel Koh", initials: "DK", accent: "bg-[#ece9f5] text-[#66558b]", location: "Subang Jaya, Selangor", segment: "Investor", priority: "High", probability: 71, value: 1080000, property: "Skyline Residences", action: "Walk through yield case", phone: "+60129900112", email: "daniel@example.test", agentId: "chloe" },
    { id: -112, name: "Farah Mohd", initials: "FM", accent: "bg-[#edf1e4] text-[#60704d]", location: "Ampang, Kuala Lumpur", segment: "Researcher", priority: "Low", probability: 57, value: 590000, property: "Arden Place", action: "Schedule discovery call", phone: "+60121122334", email: "farah@example.test", agentId: "chloe" },
] as unknown as LeadRecord[];

/* ─── Appointment type derived from lead action text ──────────────────────── */
type ApptType = "viewing" | "call" | "follow-up" | "meeting";
type PortalViewing = {
    id: number;
    propertyTitle: string;
    propertyLocation: string;
    agentName: string;
    date: string;      // ISO "YYYY-MM-DD" or word date
    timeSlot: string;  // e.g. "3:00 PM"
    status: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    googleCalendarEventId?: string | null;
    googleCalendarHtmlLink?: string | null;
    notes?: string | null;
};
type Appointment = {
    id: number;
    realViewingId?: number;
    leadName: string;
    leadInitials: string;
    accent: string;
    property: string;
    action: string;
    type: ApptType;
    day: number;
    time: string;
    // Optional enrichment
    isPortalViewing?: boolean;
    phone?: string;
    email?: string;
    notes?: string;
    segment?: string;
    priority?: string;
    probability?: number;
    location?: string;
    status?: string;
    dateStr?: string;
    googleCalendarEventId?: string | null;
    googleCalendarHtmlLink?: string | null;
};

function deriveApptType(action: string): ApptType {
    const a = action.toLowerCase();
    if (/view|tour|show|unit/.test(a)) return "viewing";
    if (/call|phone|ring/.test(a)) return "call";
    if (/meet|walk|yield|brief/.test(a)) return "meeting";
    return "follow-up";
}

const APPT_TIMES = ["9:00 AM", "10:00 AM", "11:30 AM", "2:00 PM", "3:00 PM", "4:30 PM", "5:00 PM"];
const APPT_COLORS: Record<ApptType, string> = {
    viewing:   "bg-[#d7ef73] text-[#2d5a2e] border-[#b3cc50]",
    call:      "bg-[#dbeeff] text-[#1e4d7a] border-[#aed0f0]",
    "follow-up": "bg-[#ffecd4] text-[#7a4010] border-[#f0c88a]",
    meeting:   "bg-[#ecdeff] text-[#4a1d7a] border-[#c8a8f0]",
};
const APPT_DOT: Record<ApptType, string> = {
    viewing: "bg-[#8eb040]",
    call: "bg-[#3b82c4]",
    "follow-up": "bg-[#d97316]",
    meeting: "bg-[#8b4fc8]",
};

function buildAppointments(leads: LeadRecord[], currentYear = new Date().getFullYear(), currentMonth = new Date().getMonth()): Appointment[] {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const appts: Appointment[] = [];
    leads.forEach((lead, i) => {
        const action = lead.action || "Follow up";
        const type = deriveApptType(action);
        const day = ((Math.abs(lead.id) * 7 + i * 3) % (daysInMonth - 1)) + 1;
        const time = APPT_TIMES[(Math.abs(lead.id) + i) % APPT_TIMES.length];
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        appts.push({
            id: lead.id,
            leadName: lead.name,
            leadInitials: lead.initials || lead.name.slice(0, 2).toUpperCase(),
            accent: lead.accent || "bg-[#e4f2df] text-[#286454]",
            property: lead.property || "",
            action,
            type,
            day,
            time,
            dateStr,
            phone: (lead as any).phone,
            email: (lead as any).email,
            notes: (lead as any).notes,
            segment: (lead as any).segment,
            priority: (lead as any).priority,
            probability: (lead as any).probability,
            location: (lead as any).location,
        });
    });
    return appts;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function AgentCalendar({ leads, viewings = [] }: { leads: LeadRecord[]; viewings?: PortalViewing[] }) {
    const { activeAgent } = useAuth();
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

    // Lead-derived appointments (dynamically anchored to currently viewed month)
    const leadAppointments = useMemo(() => buildAppointments(leads, viewYear, viewMonth), [leads, viewYear, viewMonth]);

    // Real portal viewings — placed on their actual date with Google Calendar sync links
    const viewingAppointments = useMemo((): Appointment[] => {
        return viewings
            .filter(v => v.status !== "Cancelled")
            .map(v => {
                let day = 1;
                let month = viewMonth;
                let year = viewYear;

                const isoMatch = v.date.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
                if (isoMatch) {
                    year = parseInt(isoMatch[1], 10);
                    month = parseInt(isoMatch[2], 10) - 1;
                    day = parseInt(isoMatch[3], 10);
                } else {
                    const parsed = new Date(v.date);
                    if (!isNaN(parsed.getTime())) {
                        year = parsed.getFullYear();
                        month = parsed.getMonth();
                        day = parsed.getDate();
                    }
                }

                const customer = v.customerName || "VIP Client";
                const initials = customer.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
                return {
                    id: v.id * -1 - 10000,
                    realViewingId: v.id,
                    leadName: customer,
                    leadInitials: initials,
                    accent: "bg-[#d7ef73] text-[#2d5a2e]",
                    property: v.propertyTitle,
                    action: `Confirmed viewing · ${v.propertyLocation}`,
                    type: "viewing" as ApptType,
                    day,
                    time: v.timeSlot,
                    isPortalViewing: true,
                    location: v.propertyLocation,
                    status: v.status,
                    phone: v.customerPhone,
                    email: v.customerEmail,
                    notes: v.notes ?? undefined,
                    dateStr: v.date,
                    googleCalendarEventId: v.googleCalendarEventId,
                    googleCalendarHtmlLink: v.googleCalendarHtmlLink,
                    _month: month,
                    _year: year,
                } as Appointment & { _month: number; _year: number };
            });
    }, [viewings, viewMonth, viewYear]);

    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) =>
        i < firstDow ? null : i - firstDow + 1
    );

    const apptsByDay = useMemo(() => {
        const map: Record<number, Appointment[]> = {};

        // 1. Lead-derived appointments
        leadAppointments.forEach(a => {
            if (!map[a.day]) map[a.day] = [];
            map[a.day].push(a);
        });

        // 2. Real portal viewings — only if they fall in the viewed month/year
        viewingAppointments.forEach(a => {
            const va = a as Appointment & { _month?: number; _year?: number };
            if (va._month !== viewMonth || va._year !== viewYear) return;
            if (!map[a.day]) map[a.day] = [];
            // Put portal viewings first so they're always visible
            map[a.day].unshift(a);
        });

        return map;
    }, [leadAppointments, viewingAppointments, viewMonth, viewYear]);

    const selectedAppts = selectedDay ? (apptsByDay[selectedDay] || []) : [];
    const isToday = (d: number) =>
        d === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

    return (
        <section className="lead-calendar-shell">
            {/* Header */}
            <div className="lead-calendar-header">
                <div className="lead-section-kicker">
                    <CalendarDays className="size-3.5" />
                    Appointment Calendar
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={selectedDay
                            ? `https://calendar.google.com/calendar/u/0/r/day/${viewYear}/${String(viewMonth + 1).padStart(2, "0")}/${String(selectedDay).padStart(2, "0")}`
                            : `https://calendar.google.com/calendar/u/0/r/month/${viewYear}/${String(viewMonth + 1).padStart(2, "0")}/1`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer"
                        title="Open your Google Calendar"
                    >
                        <Calendar className="size-3.5 text-blue-600" />
                        <span>Google Calendar</span>
                        <ExternalLink className="size-3 text-blue-500 opacity-70" />
                    </a>
                    <div className="lead-calendar-nav">
                        <button onClick={prevMonth} className="lead-cal-nav-btn" aria-label="Previous month">
                            <ChevronLeft className="size-4" />
                        </button>
                        <span className="lead-cal-month-label">
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </span>
                        <button onClick={nextMonth} className="lead-cal-nav-btn" aria-label="Next month">
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="lead-calendar-body">
                {/* Calendar grid */}
                <div className="lead-calendar-grid-wrap">
                    {/* Day-of-week labels */}
                    <div className="lead-cal-dow-row">
                        {DAY_LABELS.map(d => (
                            <div key={d} className="lead-cal-dow">{d}</div>
                        ))}
                    </div>
                    {/* Day cells */}
                    <div className="lead-cal-cells">
                        {cells.map((day, i) => {
                            const hasAppts = day ? (apptsByDay[day]?.length ?? 0) : 0;
                            const isSelected = day === selectedDay;
                            const todayCell = day ? isToday(day) : false;
                            return (
                                <div
                                    key={i}
                                    onClick={() => day && setSelectedDay(day)}
                                    className={cn(
                                        "lead-cal-cell",
                                        !day && "lead-cal-cell-empty",
                                        todayCell && "lead-cal-cell-today",
                                        isSelected && day && "lead-cal-cell-selected",
                                        day && hasAppts && !isSelected && "lead-cal-cell-has-appts",
                                    )}
                                >
                                    {day && (
                                        <>
                                            <span className="lead-cal-day-num">{day}</span>
                                            {hasAppts > 0 && (
                                                <div className="lead-cal-dots">
                                                    {apptsByDay[day].slice(0, 3).map(a => (
                                                        <span key={a.id} className={cn("lead-cal-dot", APPT_DOT[a.type])} />
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Day detail panel */}
                <div className="lead-cal-detail">
                    <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#d4e8d4]">
                        <p className="lead-cal-detail-title m-0">
                            {selectedDay
                                ? `${MONTH_NAMES[viewMonth]} ${selectedDay}`
                                : "Select a day"}
                        </p>
                        {selectedDay && (
                            <a
                                href={`https://calendar.google.com/calendar/u/0/r/day/${viewYear}/${String(viewMonth + 1).padStart(2, "0")}/${String(selectedDay).padStart(2, "0")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 transition"
                                title="Open this day in Google Calendar"
                            >
                                <Calendar className="size-3 text-blue-600" />
                                <span>Day View ↗</span>
                            </a>
                        )}
                    </div>
                    {selectedAppts.length === 0 ? (
                        <div className="lead-cal-detail-empty">
                            <CalendarDays className="size-8 opacity-25" />
                            <span>No appointments</span>
                        </div>
                    ) : (
                        <div className="lead-cal-appt-list">
                            {selectedAppts.map(a => {
                                const apptCalUrl = buildGoogleCalendarUrl({
                                    title: a.isPortalViewing
                                        ? `VIP Viewing: ${a.property} — ${a.leadName}`
                                        : `${a.type.toUpperCase()}: ${a.leadName} (${a.property || "Client Discussion"})`,
                                    location: a.location || "Kuala Lumpur, Malaysia",
                                    date: a.dateStr || `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(a.day).padStart(2, "0")}`,
                                    timeSlot: a.time,
                                    specialistName: "Darryl Raushan",
                                    notes: a.notes || a.action,
                                    bookingId: a.realViewingId || (a.id > 0 ? a.id : undefined),
                                    googleCalendarHtmlLink: a.googleCalendarHtmlLink,
                                    googleCalendarEventId: a.googleCalendarEventId,
                                });

                                return (
                                    <div
                                        key={a.id}
                                        className={cn(
                                            "lead-cal-appt-card",
                                            APPT_COLORS[a.type],
                                            "cursor-pointer hover:brightness-95 transition-all shadow-2xs"
                                        )}
                                        onClick={() => setSelectedAppt(a)}
                                        title="Click to see full appointment details"
                                    >
                                        {/* Top row: Avatar + Name/Property + Type Badge */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <span className={cn("lead-cal-appt-avatar shrink-0", a.accent)}>{a.leadInitials}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="lead-cal-appt-name truncate">{a.leadName}</p>
                                                    <p className="lead-cal-appt-prop truncate" title={a.property}>{a.property}</p>
                                                </div>
                                            </div>
                                            <span className="lead-cal-appt-badge shrink-0">{a.type}</span>
                                        </div>

                                        {/* Time Slot on its own row to avoid layout collisions */}
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-inherit opacity-90 mt-1">
                                            <Clock3 className="size-3.5 shrink-0 opacity-70" />
                                            <span className="truncate">{a.time}</span>
                                        </div>

                                        {/* Action info */}
                                        <p className="lead-cal-appt-action mt-0.5 line-clamp-1">{a.action}</p>

                                        {/* Google Calendar Action Strip */}
                                        <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-900">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                                <span className="truncate">{a.googleCalendarHtmlLink ? "Auto-synced to G-Cal" : "Google Calendar"}</span>
                                            </div>

                                            <a
                                                href={apptCalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition shadow-2xs cursor-pointer shrink-0"
                                                title="Open Event in Google Calendar"
                                            >
                                                <Calendar className="size-3" />
                                                <span>Google Calendar</span>
                                                <ExternalLink className="size-2.5 opacity-80" />
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Legend */}
                    <div className="lead-cal-legend">
                        {(Object.keys(APPT_COLORS) as ApptType[]).map(t => (
                            <span key={t} className="lead-cal-legend-item">
                                <span className={cn("lead-cal-dot", APPT_DOT[t])} />
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Appointment Detail Drawer ───────────────────────────────────── */}
            {selectedAppt && (
                <div
                    style={{
                        position: "fixed", inset: 0, zIndex: 50,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "rgba(18,30,44,0.45)", backdropFilter: "blur(4px)",
                    }}
                    onClick={() => setSelectedAppt(null)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: "#fff",
                            borderRadius: 18,
                            boxShadow: "0 24px 80px rgba(18,30,44,0.22)",
                            width: "min(92vw, 420px)",
                            overflow: "hidden",
                            fontFamily: "inherit",
                        }}
                    >
                        {/* Colour band header */}
                        <div style={{
                            background: selectedAppt.isPortalViewing ? "#d7ef73" :
                                selectedAppt.type === "call" ? "#dbeeff" :
                                selectedAppt.type === "meeting" ? "#ecdeff" : "#ffecd4",
                            padding: "20px 22px 16px",
                            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{
                                    width: 42, height: 42, borderRadius: 12,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: 800, fontSize: 15,
                                    background: "rgba(0,0,0,0.08)", color: "inherit",
                                    flexShrink: 0,
                                }}>
                                    {selectedAppt.leadInitials}
                                </span>
                                <div>
                                    <p style={{ fontWeight: 800, fontSize: 16, margin: 0, color: "#1a2e1c" }}>
                                        {selectedAppt.leadName}
                                    </p>
                                    <p style={{ fontSize: 12, margin: "2px 0 0", opacity: 0.7, color: "#1a2e1c" }}>
                                        {selectedAppt.time} · {MONTH_NAMES[viewMonth]} {selectedDay}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAppt(null)}
                                style={{
                                    background: "rgba(0,0,0,0.08)", border: "none", borderRadius: 8,
                                    width: 28, height: 28, cursor: "pointer", display: "flex",
                                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}
                                aria-label="Close"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

                            {/* Type badge */}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <span style={{
                                    fontSize: 11, fontWeight: 700, padding: "3px 10px",
                                    borderRadius: 8, textTransform: "capitalize",
                                    background: selectedAppt.type === "viewing" ? "#d7ef73" :
                                        selectedAppt.type === "call" ? "#dbeeff" :
                                        selectedAppt.type === "meeting" ? "#ecdeff" : "#ffecd4",
                                    color: selectedAppt.type === "viewing" ? "#2d5a2e" :
                                        selectedAppt.type === "call" ? "#1e4d7a" :
                                        selectedAppt.type === "meeting" ? "#4a1d7a" : "#7a4010",
                                }}>
                                    {selectedAppt.isPortalViewing ? "✓ Portal Booking" : selectedAppt.type}
                                </span>
                                {selectedAppt.priority && (
                                    <span style={{
                                        fontSize: 11, fontWeight: 700, padding: "3px 10px",
                                        borderRadius: 8, background: selectedAppt.priority === "High" ? "#fee2e2" : selectedAppt.priority === "Medium" ? "#fef3c7" : "#f1f5f9",
                                        color: selectedAppt.priority === "High" ? "#991b1b" : selectedAppt.priority === "Medium" ? "#92400e" : "#475569",
                                    }}>
                                        {selectedAppt.priority} priority
                                    </span>
                                )}
                                {selectedAppt.status && (
                                    <span style={{
                                        fontSize: 11, fontWeight: 700, padding: "3px 10px",
                                        borderRadius: 8, background: selectedAppt.status === "Confirmed" ? "#f0fdf4" : "#fef2f2",
                                        color: selectedAppt.status === "Confirmed" ? "#15803d" : "#b91c1c",
                                    }}>
                                        {selectedAppt.status}
                                    </span>
                                )}
                            </div>

                            {/* Property */}
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 600, color: "#8a9ba8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>Property</p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: "#1e3a4a", margin: 0 }}>{selectedAppt.property}</p>
                                {selectedAppt.location && (
                                    <p style={{ fontSize: 12, color: "#6b8090", margin: "2px 0 0" }}>📍 {selectedAppt.location}</p>
                                )}
                            </div>

                            {/* Next action / booking note */}
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 600, color: "#8a9ba8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>Next Action</p>
                                <p style={{ fontSize: 13, color: "#2c4a3e", margin: 0, lineHeight: 1.5 }}>{selectedAppt.action}</p>
                            </div>

                            {/* Segment + probability (lead-only) */}
                            {selectedAppt.segment && (
                                <div style={{ display: "flex", gap: 20 }}>
                                    <div>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: "#8a9ba8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>Segment</p>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1e3a4a", margin: 0 }}>{selectedAppt.segment}</p>
                                    </div>
                                    {selectedAppt.probability !== undefined && (
                                        <div>
                                            <p style={{ fontSize: 11, fontWeight: 600, color: "#8a9ba8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px" }}>Close fit</p>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: "#2d6a4f", margin: 0 }}>{selectedAppt.probability}%</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes (lead-only) */}
                            {selectedAppt.notes && (
                                <div>
                                    <p style={{ fontSize: 11, fontWeight: 600, color: "#8a9ba8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>Notes</p>
                                    <p style={{ fontSize: 12, color: "#4a6070", margin: 0, lineHeight: 1.6, background: "#f6f8fa", borderRadius: 8, padding: "8px 10px" }}>{selectedAppt.notes}</p>
                                </div>
                            )}

                            {/* Google Calendar status notification strip */}
                            {(() => {
                                const apptDate = selectedAppt.dateStr || `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedAppt.day).padStart(2, "0")}`;
                                const apptDateParsed = new Date(apptDate);
                                const dy = apptDateParsed.getFullYear();
                                const dm = apptDateParsed.getMonth() + 1;
                                const dd = apptDateParsed.getDate();
                                const dayViewUrl = `https://calendar.google.com/calendar/u/0/r/day/${dy}/${String(dm).padStart(2, "0")}/${String(dd).padStart(2, "0")}`;
                                const eventUrl = selectedAppt.googleCalendarEventId
                                    ? `https://www.google.com/calendar/event?eid=${btoa(`${selectedAppt.googleCalendarEventId} darrylraushansingh@gmail.com`).replace(/=+$/, "")}`
                                    : (selectedAppt.googleCalendarHtmlLink || null);
                                return (
                                    <div style={{
                                        background: "#eff6ff",
                                        border: "1px solid #bfdbfe",
                                        borderRadius: 12,
                                        padding: "10px 14px",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{
                                                width: 22, height: 22, borderRadius: "50%",
                                                background: eventUrl ? "#3b82f6" : "#6b7280", color: "#fff",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 12, fontWeight: 800, flexShrink: 0,
                                            }}>{eventUrl ? "✓" : "📅"}</span>
                                            <div>
                                                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>
                                                    {eventUrl ? "Auto-Saved to Google Calendar" : "Open Google Calendar"}
                                                </p>
                                                <p style={{ margin: 0, fontSize: 11, color: "#3b82f6" }}>
                                                    {eventUrl ? `Event synced · ${activeAgent.email || "darrylraushansingh@gmail.com"}` : "View your calendar for this date"}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            {eventUrl && (
                                                <a
                                                    href={eventUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                        gap: 5, padding: "6px 10px", background: "#2563eb", color: "#fff",
                                                        borderRadius: 8, fontSize: 11, fontWeight: 800, textDecoration: "none",
                                                    }}
                                                >
                                                    Open Event ↗
                                                </a>
                                            )}
                                            <a
                                                href={dayViewUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
                                                    gap: 5, padding: "6px 10px",
                                                    background: eventUrl ? "#e0e7ff" : "#2563eb",
                                                    color: eventUrl ? "#3730a3" : "#fff",
                                                    borderRadius: 8, fontSize: 11, fontWeight: 800, textDecoration: "none",
                                                    border: eventUrl ? "1px solid #c7d2fe" : "none",
                                                }}
                                            >
                                                {eventUrl ? "Day View" : "Open Calendar"} ↗
                                            </a>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Contact & Calendar Action buttons */}
                            <div style={{ display: "flex", gap: 8, paddingTop: 6 }}>
                                {selectedAppt.phone && (
                                    <a
                                        href={`tel:${selectedAppt.phone}`}
                                        style={{
                                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                                            gap: 6, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                                            background: "#e8f5e9", color: "#2e7d32", textDecoration: "none",
                                        }}
                                    >
                                        📞 Call
                                    </a>
                                )}
                                {selectedAppt.email && (
                                    <a
                                        href={`mailto:${selectedAppt.email}`}
                                        style={{
                                            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                                            gap: 6, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                                            background: "#e3f2fd", color: "#1565c0", textDecoration: "none",
                                        }}
                                    >
                                        ✉️ Email
                                    </a>
                                )}
                                {(() => {
                                    const apptDate2 = selectedAppt.dateStr || `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedAppt.day).padStart(2, "0")}`;
                                    const apptDate2Parsed = new Date(apptDate2);
                                    const dy2 = apptDate2Parsed.getFullYear();
                                    const dm2 = apptDate2Parsed.getMonth() + 1;
                                    const dd2 = apptDate2Parsed.getDate();
                                    const calUrl = selectedAppt.googleCalendarEventId
                                        ? `https://www.google.com/calendar/event?eid=${btoa(`${selectedAppt.googleCalendarEventId} darrylraushansingh@gmail.com`).replace(/=+$/, "")}`
                                        : (selectedAppt.googleCalendarHtmlLink || `https://calendar.google.com/calendar/u/0/r/day/${dy2}/${String(dm2).padStart(2, "0")}/${String(dd2).padStart(2, "0")}`);
                                    return (
                                        <a
                                            href={calUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                flex: 1.3,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                gap: 6,
                                                padding: "9px 0",
                                                borderRadius: 10,
                                                fontSize: 13,
                                                fontWeight: 800,
                                                background: "#2563eb",
                                                color: "#ffffff",
                                                textDecoration: "none",
                                                boxShadow: "0 2px 8px rgba(37,99,235,0.22)",
                                            }}
                                        >
                                            📅 Google Calendar
                                        </a>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

function KpiCard({
    icon: Icon,
    label,
    value,
    sub,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    sub: string;
}) {
    return (
        <article className="lead-kpi">
            <div className="lead-kpi-icon"><Icon className="size-[15px]" /></div>
            <p className="lead-kpi-value">{value}</p>
            <p className="lead-kpi-label">{label}</p>
            <p className="lead-kpi-sub">{sub}</p>
        </article>
    );
}

function LeadRow({ lead, index, onSelect }: { lead: LeadRecord; index: number; onSelect: (lead: LeadRecord) => void }) {
    const priority = (lead.priority as Priority) in PRIORITY_STYLE ? (lead.priority as Priority) : "Medium";
    const segment = (lead.segment as Segment) in SEGMENT_STYLE ? (lead.segment as Segment) : "Researcher";
    const accent: string = lead.accent || ACCENT_ROTATION[index % ACCENT_ROTATION.length];
    const rawValue = lead.value as number | string;
    const value = typeof rawValue === "number" ? rawValue : parseFloat(rawValue) || 0;

    return (
        <TableRow
            className="lead-table-row group cursor-pointer hover:bg-[#eef6ea]/60 transition-colors"
            onClick={() => onSelect(lead)}
        >
            <TableCell className="py-3.5">
                <div className="flex items-center gap-3">
                    <Avatar className="lead-avatar size-9 shrink-0">
                        <AvatarFallback className={cn("text-[12px] font-bold", accent)}>{lead.initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-[#214e4e] group-hover:text-[#10484b] transition-colors">{lead.name}</p>
                        <p className="truncate text-[12px] text-[#789187]">{lead.location}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge className={cn("border-none font-semibold text-[12px]", SEGMENT_STYLE[segment])}>{segment}</Badge>
            </TableCell>
            <TableCell>
                <Badge className={cn("border-none font-semibold text-[12px]", PRIORITY_STYLE[priority])}>{priority}</Badge>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <div className="lead-probability-track h-1.5 w-16 overflow-hidden rounded-full">
                        <div
                            className="lead-probability-fill h-full rounded-full"
                            style={{ width: `${Math.min(lead.probability, 100)}%` }}
                        />
                    </div>
                    <span className="font-mono text-[13px] font-bold text-[#416960]">{lead.probability}%</span>
                </div>
            </TableCell>
            <TableCell className="font-mono text-[14px] font-bold text-[#214f4d]">{formatRM(value)}</TableCell>
            <TableCell className="max-w-[160px] truncate text-[13px] text-[#426b62]">{lead.property}</TableCell>
            <TableCell className="max-w-[170px] truncate text-[13px] text-[#668078]">{lead.action}</TableCell>
            <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                <div className="flex items-center justify-center gap-1.5 transition-opacity">
                    {lead.phone && (
                        <a
                            href={`tel:${lead.phone}`}
                            className="flex size-7 items-center justify-center rounded-md text-[#7f8995] hover:bg-[#eef1f3]"
                            aria-label={`Call ${lead.name}`}
                        >
                            <Phone className="size-3.5" />
                        </a>
                    )}
                    {lead.email && (
                        <a
                            href={`mailto:${lead.email}`}
                            className="flex size-7 items-center justify-center rounded-md text-[#7f8995] hover:bg-[#eef1f3]"
                            aria-label={`Email ${lead.name}`}
                        >
                            <Mail className="size-3.5" />
                        </a>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

export default function Leads() {
    const [, navigate] = useLocation();
    const { activeAgent } = useAuth();
    const [viewingFocus, setViewingFocus] = useState(() => new URLSearchParams(window.location.search).get("focus") === "viewing");
    const [search, setSearch] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [segmentFilter, setSegmentFilter] = useState("all");
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);
    const [show3DLead, setShow3DLead] = useState<LeadRecord | null>(null);

    const utils = trpc.useUtils();

    const { data: apiLeads, isLoading } = trpc.leads.list.useQuery({
        search: search || undefined,
        agentId: activeAgent.id,
        limit: 500,
        priority: priorityFilter !== "all" ? priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1) : undefined,
        segment: segmentFilter !== "all" ? segmentFilter : undefined,
    });

    // Real confirmed/pending viewings booked via the customer portal
    const { data: agentViewings = [] } = trpc.viewings.listByAgent.useQuery(
        { agentId: activeAgent.id, limit: 20 },
        { refetchInterval: 30_000 }
    );

    const createLead = trpc.leads.create.useMutation({
        onSuccess: () => {
            toast.success(`Lead created in ${activeAgent.name}'s pipeline`);
            utils.leads.list.invalidate();
            setOpen(false);
            setForm(emptyForm);
        },
        onError: (err) => toast.error(err.message || "Could not create lead"),
    });

    const isFrontendPreview = !apiLeads?.length;
    const previewLeads = useMemo(() => {
        const filtered = FRONTEND_PREVIEW_LEADS.filter((lead) => {
            if (lead.agentId && lead.agentId !== activeAgent.id) return false;
            const searchTerm = search.trim().toLowerCase();
            const matchesSearch = !searchTerm || [lead.name, lead.location, lead.property, lead.action].some((value) => value.toLowerCase().includes(searchTerm));
            const matchesPriority = priorityFilter === "all" || lead.priority.toLowerCase() === priorityFilter;
            const matchesSegment = segmentFilter === "all" || lead.segment === segmentFilter;
            return matchesSearch && matchesPriority && matchesSegment;
        });
        return filtered;
    }, [search, priorityFilter, segmentFilter, activeAgent.id]);
    const unfilteredLeads = apiLeads?.length ? apiLeads : previewLeads;
    const leads = viewingFocus ? unfilteredLeads.filter((lead) => /view|tour|show/i.test(lead.action || "")) : unfilteredLeads;

    const kpis = useMemo(() => getLeadWorkspaceSummary(leads), [leads]);

    const resetFilters = () => {
        setSearch("");
        setPriorityFilter("all");
        setSegmentFilter("all");
        setViewingFocus(false);
        if (window.location.search) navigate("/leads");
    };

    const handleSubmit = () => {
        if (!form.name.trim() || !form.location.trim() || !form.property.trim() || !form.action.trim() || !form.value.trim()) {
            toast.error("Please fill in name, location, property, next action and value.");
            return;
        }
        createLead.mutate({
            name: form.name.trim(),
            initials: initialsFromName(form.name),
            accent: ACCENT_ROTATION[leads.length % ACCENT_ROTATION.length],
            location: form.location.trim(),
            segment: form.segment,
            priority: form.priority,
            probability: Number(form.probability),
            value: form.value.trim(),
            property: form.property.trim(),
            action: form.action.trim(),
            agentId: activeAgent.id,
            phone: form.phone.trim() || undefined,
            email: form.email.trim() || undefined,
            notes: form.notes.trim() || undefined,
        });
    };

    return (
        <div className="lead-workspace pb-24">
            <AgentHeader
                activePage="Leads"
                eyebrow={`${activeAgent.name}'s Pipeline / Active Book`}
                badgeText={`${activeAgent.role} · Active CRM`}
                title={<>Leads <em>· Made Actionable</em></>}
                rightControls={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <button className="px-3.5 py-1.5 bg-[#10484b] hover:bg-[#234d4d] text-[#d7ef73] rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 border border-[#234d4d]">
                                <Plus className="size-3.5" />
                                <span>Create Lead</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="lead-dialog sm:max-w-[520px]">
                            <DialogHeader>
                                <DialogTitle>Create a new lead</DialogTitle>
                                <DialogDescription>Add a prospective buyer to your pipeline.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3.5 py-2 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <Label htmlFor="name">Full name</Label>
                                    <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aiman Faris" />
                                </div>
                                <div>
                                    <Label htmlFor="location">Location</Label>
                                    <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Petaling Jaya, Selangor" />
                                </div>
                                <div>
                                    <Label htmlFor="property">Interested property</Label>
                                    <Input id="property" value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })} placeholder="Asteria Residences" />
                                </div>
                                <div>
                                    <Label>Segment</Label>
                                    <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as Segment })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                                {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Priority</Label>
                                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="probability">Probability ({form.probability}%)</Label>
                                    <Input id="probability" type="number" min={0} max={100} value={form.probability} onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <Label htmlFor="value">Deal value (RM)</Label>
                                    <Input id="value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="1,250,000" />
                                </div>
                                <div>
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+60 12-345 6789" />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="action">Next action</Label>
                                    <Input id="action" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} placeholder="Schedule viewing" />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="notes">Notes</Label>
                                    <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional context..." />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={createLead.isPending} className="lead-dialog-primary">
                                    {createLead.isPending ? "Creating..." : "Create lead"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            <main className="lead-workspace-main">
                <section className="lead-hero">
                    <div className="lead-hero-copy"><span>Sales pipeline / indicative</span><h2>Keep the next right conversation in view.</h2><p>Prioritize buyer intent, deal value, and close confidence from one compact lead desk.</p></div>
                    <aside className="lead-hero-signal"><span>Immediate attention</span><strong>{kpis.high}</strong><small>high-priority leads are in the active queue.</small></aside>
                </section>

                {viewingFocus && <section className="rounded-xl border border-[#b8d9ba] bg-[#edf8e2] px-4 py-3 sm:flex sm:items-center sm:justify-between"><div><p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#4d8060]">Viewing follow-up focus</p><p className="mt-1 text-[13px] text-[#426c5e]">Showing leads with a viewing, tour, or property-showing next action from the Analytics funnel diagnosis.</p></div><button onClick={resetFilters} className="mt-2 text-[13px] font-bold text-[#1f6958] sm:mt-0">Clear focus</button></section>}

                <section className="lead-kpi-grid">
                    <KpiCard icon={Users} label="Total leads" value={String(kpis.total)} sub="matching current filters" />
                    <KpiCard icon={Target} label="High priority" value={String(kpis.high)} sub="need attention" />
                    <KpiCard icon={Wallet} label="Pipeline value" value={formatRM(kpis.pipelineValue)} sub="probability-weighted" />
                    <KpiCard icon={TrendingUp} label="Avg. probability" value={`${kpis.avgProbability}%`} sub="chance to close" />
                </section>

                <section className="lead-focus-grid">
                    <article className="lead-focus-card"><div className="lead-section-kicker"><Sparkles className="size-3.5" /> Next best action</div><div className="lead-focus-content"><div><h3>{kpis.focusLead?.name || "Your queue is clear"}</h3><p>{kpis.focusLead ? `${kpis.focusLead.action || "Set a next action"} for ${kpis.focusLead.property || "the selected property"}.` : "Use the filters below to find the next lead to progress."}</p><div className="lead-focus-meta">{kpis.focusLead && <><span><MapPin className="mr-1 inline size-3" />{kpis.focusLead.location}</span><span>{kpis.focusLead.probability}% close confidence</span></>}</div></div>{kpis.focusLead && <button className="lead-focus-action" onClick={() => setSearch(kpis.focusLead?.name || "")}>Open lead <ChevronRight className="size-3.5" /></button>}</div></article>
                    <aside className="lead-coverage-card"><div className="lead-section-kicker"><Clock3 className="size-3.5" /> Conversion coverage</div><p>Average probability across the visible queue, balanced against the leads that need a next move.</p><div className="lead-coverage-track"><span style={{ width: `${kpis.avgProbability}%` }} /></div><div className="lead-coverage-readout"><strong>{kpis.avgProbability}%</strong><span>average close confidence</span></div></aside>
                </section>

                <section className="lead-table-shell">
                    <div className="lead-toolbar">
                        <div className="lead-toolbar-title"><div><h2>Active lead queue</h2><p>{isFrontendPreview ? "Frontend preview records — connect the backend to replace them with live enquiries." : "Filter the live desk, then progress the conversation with the strongest fit."}</p></div></div>
                        <div className="lead-search">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa4af]" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search leads by name..."
                                className="pl-9 text-[13px]"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                            <SelectTrigger size="sm" className="lead-filter h-8 w-[130px] text-[13px]">
                                    <SlidersHorizontal className="mr-1 size-3.5" />
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All priority</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                            <SelectTrigger size="sm" className="lead-filter h-8 w-[155px] text-[13px]">
                                    <SelectValue placeholder="Segment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All segments</SelectItem>
                                    {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={resetFilters} className="lead-filter-reset size-8" aria-label="Reset filters">
                                <X className="size-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="lead-table-scroll-wrapper">
                        <div className="lead-table-body-scroll overflow-x-auto">
                            <Table className="lead-table">
                                <TableHeader className="lead-table-sticky-head">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[220px]">Lead</TableHead>
                                        <TableHead className="w-[140px]">Segment</TableHead>
                                        <TableHead className="w-[110px]">Priority</TableHead>
                                        <TableHead className="w-[140px]">Probability</TableHead>
                                        <TableHead className="w-[150px]">Value</TableHead>
                                        <TableHead className="w-[200px]">Property</TableHead>
                                        <TableHead className="w-[200px]">Next action</TableHead>
                                        <TableHead className="w-[90px] text-center">Contact</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading &&
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <TableRow key={i} className="lead-table-row">
                                                <TableCell colSpan={8} className="py-4">
                                                    <div className="h-4 w-full animate-pulse rounded bg-[#e5f0e2]" />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    {!isLoading &&
                                        leads.map((lead, index) => (
                                            <LeadRow
                                                key={lead.id}
                                                lead={lead}
                                                index={index}
                                                onSelect={setSelectedLead}
                                            />
                                        ))}
                                </TableBody>
                            </Table>
                            {!isLoading && leads.length === 0 && (
                                <div className="flex h-32 items-center justify-center text-[14px] text-[#6e887d]">
                                    No leads match the selected filters.
                                </div>
                            )}
                            {!isLoading && leads.length > 0 && (
                                <div className="lead-table-scroll-hint">
                                    {leads.length} leads · scroll to view all
                                </div>
                            )}
                        </div>
                    </div>
                </section>
                <AgentCalendar leads={leads} viewings={agentViewings} />
            </main>

            {/* Lead Profile & Rating Breakdown Modal */}
            <LeadProfileModal
                lead={selectedLead as any}
                open={!!selectedLead}
                onOpenChange={(open) => !open && setSelectedLead(null)}
                onOpen3DViewer={(lead) => setShow3DLead(lead as unknown as LeadRecord)}
            />

            {/* 3D Show Unit Modal with Lush Green Theme and AI Match Intelligence */}
            <ShowUnitModal
                lead={show3DLead as any}
                open={!!show3DLead}
                onClose={() => setShow3DLead(null)}
                onBackToLead={(lead) => {
                    setShow3DLead(null);
                    setSelectedLead(lead as unknown as LeadRecord);
                }}
                onConfirmAction={(lead) => {
                    toast.success(`Action confirmed for ${lead.name}`, {
                        description: `${lead.nextAction || lead.action || "Follow-up"} scheduled.`,
                    });
                    setShow3DLead(null);
                }}
            />
        </div>
    );
}
