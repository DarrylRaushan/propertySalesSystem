/* Leads workspace — filterable table, KPI strip, create-lead dialog. Wired to trpc.leads.* */
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
    ArrowLeft,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock3,
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
type Appointment = {
    id: number;
    leadName: string;
    leadInitials: string;
    accent: string;
    property: string;
    action: string;
    type: ApptType;
    day: number;
    time: string;
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

function buildAppointments(leads: LeadRecord[]): Appointment[] {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const appts: Appointment[] = [];
    leads.forEach((lead, i) => {
        const action = lead.action || "Follow up";
        const type = deriveApptType(action);
        // Deterministic day based on lead id so it's stable across renders
        const day = ((Math.abs(lead.id) * 7 + i * 3) % (daysInMonth - 1)) + 1;
        const time = APPT_TIMES[(Math.abs(lead.id) + i) % APPT_TIMES.length];
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
        });
    });
    return appts;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function AgentCalendar({ leads }: { leads: LeadRecord[] }) {
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());

    const appointments = useMemo(() => buildAppointments(leads), [leads]);

    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) =>
        i < firstDow ? null : i - firstDow + 1
    );

    const apptsByDay = useMemo(() => {
        const map: Record<number, Appointment[]> = {};
        appointments.forEach(a => {
            if (!map[a.day]) map[a.day] = [];
            map[a.day].push(a);
        });
        return map;
    }, [appointments]);

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

    return (
        <section className="lead-calendar-shell">
            {/* Header */}
            <div className="lead-calendar-header">
                <div className="lead-section-kicker">
                    <CalendarDays className="size-3.5" />
                    Appointment Calendar
                </div>
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
                    <p className="lead-cal-detail-title">
                        {selectedDay
                            ? `${MONTH_NAMES[viewMonth]} ${selectedDay}`
                            : "Select a day"}
                    </p>
                    {selectedAppts.length === 0 ? (
                        <div className="lead-cal-detail-empty">
                            <CalendarDays className="size-8 opacity-25" />
                            <span>No appointments</span>
                        </div>
                    ) : (
                        <div className="lead-cal-appt-list">
                            {selectedAppts.map(a => (
                                <div key={a.id} className={cn("lead-cal-appt-card", APPT_COLORS[a.type])}>
                                    <div className="lead-cal-appt-top">
                                        <span className={cn("lead-cal-appt-avatar", a.accent)}>{a.leadInitials}</span>
                                        <div className="lead-cal-appt-info">
                                            <p className="lead-cal-appt-name">{a.leadName}</p>
                                            <p className="lead-cal-appt-prop">{a.property}</p>
                                        </div>
                                        <span className="lead-cal-appt-time">{a.time}</span>
                                    </div>
                                    <p className="lead-cal-appt-action">{a.action}</p>
                                    <span className="lead-cal-appt-badge">{a.type}</span>
                                </div>
                            ))}
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
            <TableCell onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
        priority: priorityFilter !== "all" ? priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1) : undefined,
        segment: segmentFilter !== "all" ? segmentFilter : undefined,
    });

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
        return filtered.slice(0, 20); // Max 20 leads per agent
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
                        <div className="overflow-x-auto">
                            <Table className="lead-table">
                                <TableHeader className="lead-table-sticky-head">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead>Lead</TableHead><TableHead>Segment</TableHead><TableHead>Priority</TableHead><TableHead>Probability</TableHead><TableHead>Value</TableHead><TableHead>Property</TableHead><TableHead>Next action</TableHead><TableHead>Contact</TableHead>
                                    </TableRow>
                                </TableHeader>
                            </Table>
                        </div>
                        <div className="lead-table-body-scroll overflow-x-auto">
                            <Table className="lead-table">
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
                <AgentCalendar leads={leads} />
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
