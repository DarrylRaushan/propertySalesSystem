/* Corporate Trust Minimalism: deep navy navigation, warm-neutral canvas, white cards, restrained semantic colors. */
import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  BedDouble,
  ExternalLink,
  MapPin,
  Ruler,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Box,
  Building2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  FileText,
  Home as HomeIcon,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  PieChart as PieChartIcon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import ModelViewer from "@/components/ModelViewer";
import DepthText from "@/components/DepthText";
import MagicBento from "@/components/MagicBento";
import CompactDashboard from "@/components/CompactDashboard";
import PropertiesBrowser from "@/components/PropertiesBrowser";
import SalesIntelligenceDesk from "@/components/SalesIntelligenceDesk";
import { type PropertyListing } from "@/components/propertyBrowser";
import NewLeadModal from "@/components/NewLeadModal";
import { FunnelChart } from "@/components/FunnelChart";
import {
  sortPriorityLeads,
  deriveLeadPriorityTier,
  calculateLeadExpectedValue,
} from "@/components/priorityLeadQueue";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LineChart } from "@/components/charts/line-chart";
import { Line } from "@/components/charts/line";
import { Grid } from "@/components/charts/grid";
import "@/components/RemainingPagesTerrainTheme.css";
import { XAxis as BlXAxis } from "@/components/charts/x-axis";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { PieChart as BkPieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { PieCenter } from "@/components/charts/pie-center";
import { curveNatural } from "@visx/curve";

type Priority = "High" | "Medium" | "Low";
type Segment = "Ready Buyer" | "Investor" | "Researcher" | "Low Engagement";
type Lead = {
  id: number;
  initials: string;
  name: string;
  location: string;
  probability: number;
  value: number;
  segment: Segment;
  priority: Priority;
  action: string;
  property: string;
  accent: string;
  lastContacted: string;
  agentId: string;
};

const previewTimestamp = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
const leads: Lead[] = [
  // ─── Hannah Cheong's Leads ────────────────────────────────────────────────
  { id: 1, initials: "AF", name: "Aiman Faris", location: "Petaling Jaya, Selangor", probability: 92, value: 1250000, segment: "Ready Buyer", priority: "High", action: "Schedule viewing", property: "Asteria Residences", accent: "bg-[#dbe9f8] text-[#24486b]", lastContacted: previewTimestamp(1), agentId: "hannah" },
  { id: 2, initials: "SL", name: "Sarah Lim", location: "Mont Kiara, Kuala Lumpur", probability: 87, value: 980000, segment: "Investor", priority: "High", action: "Send yield analysis", property: "The Mews KL", accent: "bg-[#e8e2f5] text-[#60468e]", lastContacted: previewTimestamp(4), agentId: "hannah" },
  { id: 3, initials: "MZ", name: "Muhammad Zaki", location: "Shah Alam, Selangor", probability: 78, value: 760000, segment: "Ready Buyer", priority: "High", action: "Share loan estimate", property: "Elmina Green", accent: "bg-[#dff0e6] text-[#2e6a4b]", lastContacted: previewTimestamp(2), agentId: "hannah" },
  { id: 4, initials: "JC", name: "Joanne Chong", location: "Bangsar South, Kuala Lumpur", probability: 69, value: 1350000, segment: "Researcher", priority: "Medium", action: "Follow up in 2 days", property: "Southlink Suites", accent: "bg-[#faecd4] text-[#8b5a20]", lastContacted: previewTimestamp(5), agentId: "hannah" },

  // ─── Amir Rahman's Leads ──────────────────────────────────────────────────
  { id: 5, initials: "RN", name: "Ravi Nair", location: "Cyberjaya, Selangor", probability: 58, value: 620000, segment: "Investor", priority: "Medium", action: "Share new launch deck", property: "Mutiara Ville", accent: "bg-[#e6edf4] text-[#456176]", lastContacted: previewTimestamp(6), agentId: "amir" },
  { id: 6, initials: "NI", name: "Nadia Ismail", location: "Setapak, Kuala Lumpur", probability: 73, value: 840000, segment: "Ready Buyer", priority: "High", action: "Confirm viewing slot", property: "Seri Wangi", accent: "bg-[#e8f0df] text-[#466742]", lastContacted: previewTimestamp(1), agentId: "amir" },
  { id: 7, initials: "TW", name: "Tan Wei Ming", location: "Damansara, Selangor", probability: 66, value: 1120000, segment: "Investor", priority: "Medium", action: "Send rental comparables", property: "Verde Heights", accent: "bg-[#e4edf7] text-[#436182]", lastContacted: previewTimestamp(3), agentId: "amir" },
  { id: 8, initials: "AL", name: "Amelia Lee", location: "Cheras, Kuala Lumpur", probability: 64, value: 710000, segment: "Researcher", priority: "Medium", action: "Share floor plan options", property: "Taman Vista", accent: "bg-[#f8eadc] text-[#8a5d3e]", lastContacted: previewTimestamp(2), agentId: "amir" },

  // ─── Chloe Tan's Leads ────────────────────────────────────────────────────
  { id: 9, initials: "HK", name: "Hafiz Karim", location: "Puchong, Selangor", probability: 76, value: 930000, segment: "Ready Buyer", priority: "High", action: "Review offer range", property: "Lakefront One", accent: "bg-[#e4f1ed] text-[#3f7167]", lastContacted: previewTimestamp(4), agentId: "chloe" },
  { id: 10, initials: "SY", name: "Siti Yusuf", location: "Kota Kemuning, Selangor", probability: 61, value: 680000, segment: "Low Engagement", priority: "Low", action: "Re-open conversation", property: "Canopy Grove", accent: "bg-[#f5e8e6] text-[#8a5d59]", lastContacted: previewTimestamp(7), agentId: "chloe" },
  { id: 11, initials: "DK", name: "Daniel Koh", location: "Subang Jaya, Selangor", probability: 71, value: 1080000, segment: "Investor", priority: "High", action: "Walk through yield case", property: "Skyline Residences", accent: "bg-[#ece9f5] text-[#66558b]", lastContacted: previewTimestamp(3), agentId: "chloe" },
  { id: 12, initials: "FM", name: "Farah Mohd", location: "Ampang, Kuala Lumpur", probability: 57, value: 590000, segment: "Researcher", priority: "Low", action: "Schedule discovery call", property: "Arden Place", accent: "bg-[#edf1e4] text-[#60704d]", lastContacted: previewTimestamp(1), agentId: "chloe" },
];

const marketProperties = [
  { id: 1, name: "Asteria Residences", developer: "Mah Sing Group", location: "Petaling Jaya, Selangor", price: 1250000, type: "Condominium", beds: 3, size: "1,185 sq ft", status: "Open for viewing", featured: true, badge: "open-for-viewing" as const, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop"], modelUrl: "" },
  { id: 2, name: "The Mews KL", developer: "UEM Sunrise", location: "Mont Kiara, Kuala Lumpur", price: 980000, type: "Serviced residence", beds: 2, size: "920 sq ft", status: "New launch", featured: false, badge: "new-launch" as const, image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop"], modelUrl: "" },
  { id: 3, name: "Elmina Green", developer: "Sime Darby Property", location: "Shah Alam, Selangor", price: 760000, type: "Landed terrace", beds: 4, size: "2,050 sq ft", status: "Limited units", featured: false, badge: "limited-units" as const, image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop&sat=-24", "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop&bri=8"], modelUrl: "" },
  { id: 4, name: "Southlink Suites", developer: "United Malayan Land", location: "Bangsar South, Kuala Lumpur", price: 1350000, type: "Serviced apartment", beds: 3, size: "1,240 sq ft", status: "Ready to move in", featured: false, badge: "ready-to-move" as const, image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop&sat=-18", "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop&bri=7"], modelUrl: "" },
  { id: 5, name: "Mutiara Ville", developer: "MCT Berhad", location: "Cyberjaya, Selangor", price: 620000, type: "Condominium", beds: 2, size: "850 sq ft", status: "Investor pick", featured: true, badge: "investor-pick" as const, image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop&sat=-20", images: ["https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop&sat=-20", "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop&sat=-42", "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop&bri=6"], modelUrl: "" },
  { id: 6, name: "Residensi UTM", developer: "EcoWorld", location: "Iskandar Puteri, Johor", price: 540000, type: "Landed terrace", beds: 3, size: "1,650 sq ft", status: "Early bird offer", featured: false, badge: "early-bird" as const, image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop", images: ["https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop", "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop&sat=-20", "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop&bri=8"], modelUrl: "" },
];


const segmentData = [
  { label: "Ready Buyers", count: 42, percentage: 33, note: "Highest conversion potential", color: "#2f8f68", icon: HomeIcon },
  { label: "Investors", count: 31, percentage: 24, note: "Focus on rental yield", color: "#6d55a6", icon: WalletCards },
  { label: "Researchers", count: 38, percentage: 30, note: "Nurture with insights", color: "#c18538", icon: FileText },
  { label: "Low Engagement", count: 22, percentage: 17, note: "Dropped off after initial contact", color: "#8b9aa8" }
];

const customerFunnelData = [
  { label: "Visitors", value: 12400, displayValue: "12.4k", color: "#3d6a95" },
  { label: "Leads", value: 6800, displayValue: "6.8k", color: "#4279b0" },
  { label: "Qualified", value: 3200, displayValue: "3.2k", color: "#4a83b2" },
  { label: "Proposals", value: 1500, displayValue: "1.5k", color: "#5492c2" },
  { label: "Closed", value: 620, displayValue: "620", color: "#5ea3d6" },
];

const ringData = [
  { label: "Organic enquiries", value: 168, maxValue: 428, color: "#287462", note: "Website and search" },
  { label: "Portal campaigns", value: 124, maxValue: 428, color: "#4b8a70", note: "Property portal campaigns" },
  { label: "Referrals", value: 82, maxValue: 428, color: "#83a866", note: "Past customers and partners" },
  { label: "WhatsApp follow-up", value: 54, maxValue: 428, color: "#b6cf70", note: "Reactivated conversations" },
];

const formatRM = (value: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(value).replace("MYR", "RM");

/* ---------- Chart data (mock, ready for CRM replacement) ---------- */

const sparkline = {
  salesValue: [12.2, 12.8, 13.4, 13.1, 14.0, 14.6, 15.2, 15.8, 16.1, 16.9, 17.3, 18.4],
  totalLeads: [96, 100, 98, 104, 107, 102, 109, 112, 115, 118, 122, 128],
  highPriority: [18, 17, 19, 20, 19, 21, 22, 20, 23, 22, 25, 24],
  activeProperties: [40, 39, 38, 39, 41, 40, 38, 37, 38, 37, 37, 36],
};

const trendData = sparkline.salesValue.map((value, index) => ({
  month: ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][index],
  value,
}));
const trendDataDate = sparkline.salesValue.map((value, index) => ({
  date: new Date(2023, 10 + index),
  value,
}));

const funnelData = [
  { stage: "Enquiries", value: 428, color: "#287462" },
  { stage: "Qualified", value: 164, color: "#4b8a70" },
  { stage: "Bookings", value: 18, color: "#b6cf70" },
];

const priorityData = [
  { label: "High", value: 24, color: "#bd6161" },
  { label: "Medium", value: 61, color: "#a9752e" },
  { label: "Low", value: 43, color: "#8b9aa8" },
];

/* ---------- Small chart components ---------- */

function Sparkline({ data, color, accent = "rgba(255,255,255,0)", height = 34 }: { data: number[]; color: string; accent?: string; height?: number }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#spark-${color.replace("#", "")})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function RadialGauge({ value, size = 118, label, sub }: { value: number; size?: number; label: string; sub?: string }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center px-2 text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#edf0f2" strokeWidth={10} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2f6f78" strokeWidth={10} strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} className="transition-all duration-500" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-mono text-xl font-bold text-[#253548]">{value}%</p>
        </div>
      </div>
      <p className="mt-2 text-[14px] font-bold text-[#3e5e78]">{label}</p>
      {sub && <p className="mt-0.5 text-[12px] text-[#7690a6]">{sub}</p>}
    </div>
  );
}

function MetricCard({ label, value, helper, icon: Icon, trend, tone, featured = false, chart }: { label: string; value: string; helper: string; icon: typeof Users; trend: string; tone: "blue" | "rose" | "green" | "amber"; featured?: boolean; chart?: React.ReactNode }) {
  const toneMap = { blue: "bg-[#e6eff8] text-[#3d6a95]", rose: "bg-[#f7e5e5] text-[#aa5858]", green: "bg-[#e1f1e8] text-[#2f8562]", amber: "bg-[#faedd8] text-[#a7702e]" };
  return <Card className={cn("metric-card border-[#e6e9ee] bg-white py-0 shadow-[0_3px_14px_rgba(26,42,66,0.035)]", featured && "border-[#2f6f78]/30 bg-[linear-gradient(135deg,#ffffff_0%,#f0f7f6_100%)] shadow-[0_10px_28px_rgba(43,103,112,0.11)]")}><CardContent className={cn("p-5", featured && "sm:p-6")}><div className="flex items-start justify-between gap-4"><div><p className={cn("text-[14px] font-semibold", featured ? "text-[#2f6f78]" : "text-[#667085]")}>{label}</p>{featured && <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.14em] text-[#7a9a9d]">Pipeline signal</p>}</div><span className={cn("flex size-9 items-center justify-center rounded-lg", toneMap[tone], featured && "size-10 rounded-xl bg-[#d9ece8] text-[#2f6f78]")}><Icon className="size-[17px]" strokeWidth={1.8} /></span></div><div className="mt-4 flex items-baseline gap-2"><p className={cn("font-display font-bold tracking-[-0.04em] text-[#182536]", featured ? "text-[34px] sm:text-[38px]" : "text-[27px]")}>{value}</p><span className={cn("inline-flex items-center gap-0.5 text-[13px] font-bold", tone === "rose" ? "text-[#bd6161]" : "text-[#2d8a64]")}>{trend.includes("↓") ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}{trend.replace("↑", "").replace("↓", "")}</span></div><p className="mt-1 text-[13px] text-[#98a1ad]">{helper}</p>{chart && <div className="mt-3">{chart}</div>}</CardContent></Card>;
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles = { High: "border-[#f2d3d3] bg-[#fff4f4] text-[#b85b5b]", Medium: "border-[#f2e2c8] bg-[#fff9ef] text-[#a9752e]", Low: "border-[#dce5eb] bg-[#f5f8fa] text-[#688092]" };
  return <Badge variant="outline" className={cn("gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-bold", styles[priority])}><span className="size-1.5 rounded-full bg-current" />{priority}</Badge>;
}

function PropertySummary({ property, onRequest }: { property: typeof marketProperties[number]; onRequest: () => void }) { return <div className="p-6 sm:p-8"><Badge variant="outline" className="border-[#d7e6ef] bg-[#f4f8fb] text-[#527b9d]">{property.status}</Badge><p className="mt-5 text-[12px] font-bold uppercase tracking-[0.14em] text-[#96a0aa]">{property.developer}</p><p className="mt-2 flex items-center gap-1.5 text-[14px] text-[#7f8995]"><MapPin className="size-3.5 text-[#7897af]" />{property.location}</p><p className="mt-7 font-mono text-2xl font-bold text-[#253548]">{formatRM(property.price)}</p><div className="mt-6 grid grid-cols-3 gap-3 border-y border-[#eef0f3] py-5"><div><p className="text-[12px] uppercase tracking-[0.08em] text-[#9aa4ad]">Type</p><p className="mt-1 text-[14px] font-semibold text-[#526172]">{property.type}</p></div><div><p className="text-[12px] uppercase tracking-[0.08em] text-[#9aa4ad]">Bedrooms</p><p className="mt-1 flex items-center gap-1 text-[14px] font-semibold text-[#526172]"><BedDouble className="size-3.5" />{property.beds}</p></div><div><p className="text-[12px] uppercase tracking-[0.08em] text-[#9aa4ad]">Built-up</p><p className="mt-1 flex items-center gap-1 text-[14px] font-semibold text-[#526172]"><Ruler className="size-3.5" />{property.size}</p></div></div><div className="mt-6 flex flex-wrap gap-2"><Button onClick={onRequest} className="bg-[#284762] hover:bg-[#1f3c55]">Request viewing</Button><Button variant="outline" onClick={() => toast("Listing link placeholder ready for a future property portal URL.")} className="gap-2 border-[#e1e5e9] shadow-none"><ExternalLink className="size-3.5" />Open listing</Button></div></div>; }
function PropertyWorkspace({ onBack, properties = marketProperties }: { onBack: () => void; properties?: typeof marketProperties }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<typeof marketProperties[number] | null>(null);
  const [show3D, setShow3D] = useState(false);
  const results = properties.filter((property) =>
    (type === "all" || property.type === type) &&
    `${property.name} ${property.location} ${property.developer}`.toLowerCase().includes(query.toLowerCase())
  );
  if (selected) return <section className="space-y-5">
    <button onClick={() => { setSelected(null); setShow3D(false); }} className="flex items-center gap-2 text-[13px] font-bold text-[#42698b] hover:underline"><ArrowLeft className="size-4" />Back to market listings</button>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#96a0aa]">Property preview / Mock 3D tour</p><h2 className="mt-1 font-display text-[24px] font-bold tracking-[-0.04em] text-[#253548]">{selected.name}</h2></div><div className="flex gap-2"><Button variant={show3D ? "default" : "outline"} size="sm" onClick={() => setShow3D(true)} className={cn("h-9 gap-2 text-[13px] font-semibold", show3D ? "bg-[#2f6f78] hover:bg-[#275e65]" : "border-[#d7e6ef] bg-white text-[#42698b] shadow-none")}><Box className="size-3.5" />View in 3D</Button><Button variant="outline" size="sm" onClick={() => setShow3D(false)} className="h-9 gap-2 border-[#e1e5e9] bg-white text-[13px] font-semibold text-[#5d6976] shadow-none"><ImageIcon className="size-3.5" />Listing photos</Button></div></div>
    <Card className="overflow-hidden border-[#dce8e5] bg-white py-0 shadow-[0_8px_24px_rgba(43,103,112,0.07)]">
      {show3D ? <div className="grid lg:grid-cols-[1.4fr_0.6fr]"><ModelViewer propertyName={selected.name} propertyType={selected.type} modelUrl={selected.modelUrl} /><PropertySummary property={selected} onRequest={() => toast(`Viewing request noted for ${selected.name}.`)} /></div> : <div className="grid lg:grid-cols-[1.15fr_0.85fr]"><img src={selected.image} alt={selected.name} className="h-[320px] w-full object-cover lg:h-full" /><PropertySummary property={selected} onRequest={() => toast(`Viewing request noted for ${selected.name}.`)} /></div>}
    </Card>
  </section>;
  return <section className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[14px] text-[#8b96a2]">Market inventory / Mock listings</p><h2 className="mt-1 font-display text-[24px] font-bold tracking-[-0.04em] text-[#253548]">Properties on market</h2><p className="mt-1 text-[14px] text-[#7f8995]">Browse current Malaysian developments and open a listing detail view.</p></div><Button variant="outline" size="sm" onClick={onBack} className="h-9 gap-2 border-[#e1e5e9] bg-white text-[13px] font-semibold text-[#5d6976] shadow-none"><ArrowLeft className="size-3.5" />Dashboard</Button></div><div className="flex flex-col gap-3 rounded-xl border border-[#e6e9ee] bg-white p-4 shadow-[0_3px_14px_rgba(26,42,66,0.035)] sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa4af]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 border-[#e4e8ec] pl-9 text-[13px] shadow-none" placeholder="Search developments, locations, developers..." /></div><Select value={type} onValueChange={setType}><SelectTrigger className="h-9 w-full border-[#e2e7eb] text-[13px] sm:w-[190px]"><SelectValue placeholder="Property type" /></SelectTrigger><SelectContent><SelectItem value="all">All property types</SelectItem><SelectItem value="Condominium">Condominium</SelectItem><SelectItem value="Serviced residence">Serviced residence</SelectItem><SelectItem value="Serviced apartment">Serviced apartment</SelectItem><SelectItem value="Landed terrace">Landed terrace</SelectItem></SelectContent></Select></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map((property) => <Card key={property.id} className="group overflow-hidden border-[#e6e9ee] bg-white py-0 shadow-[0_3px_14px_rgba(26,42,66,0.035)] transition-transform duration-200 hover:-translate-y-0.5"><div className="relative"><img src={property.image} alt={property.name} className="h-44 w-full object-cover" /><span className="absolute left-3 top-3 rounded-md bg-[#17283b]/90 px-2 py-1 text-[11px] font-bold text-white">{property.status}</span></div><CardContent className="p-5"><p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#96a0aa]">{property.developer}</p><h3 className="mt-2 font-display text-[17px] font-bold text-[#253548]">{property.name}</h3><p className="mt-1 flex items-center gap-1.5 text-[13px] text-[#8b96a2]"><MapPin className="size-3.5" />{property.location}</p><div className="mt-4 flex items-end justify-between gap-3"><div><p className="font-mono text-[17px] font-bold text-[#253548]">{formatRM(property.price)}</p><p className="mt-1 text-[12px] text-[#9da6af]">{property.beds} bed · {property.size}</p></div><Button size="sm" onClick={() => setSelected(property)} className="h-8 bg-[#284762] text-[12px] hover:bg-[#1f3c55]">View listing</Button></div></CardContent></Card>)}</div>{results.length === 0 && <Card className="border-[#e6e9ee] bg-white text-center"><CardContent className="p-12 text-[14px] text-[#8b96a1]">No mock listings match those filters.</CardContent></Card>}</section>;
}



function RingChart({ data, hoveredIndex, onHoverChange }: { data: typeof ringData; hoveredIndex: number | null; onHoverChange: (index: number | null) => void }) {
  const size = 360;
  const center = size / 2;
  const baseRadius = 70;
  const ringGap = 15;
  const strokeWidth = 16;
  const totalVal = data.length > 0 ? data[0].maxValue : 0;
  return <div className="relative mx-auto size-[360px] max-w-full">
    <svg viewBox={`0 0 ${size} ${size}`} className="size-full overflow-visible" role="img" aria-label="Lead source ring chart">
      {data.map((item, index) => { const radius = baseRadius + index * (strokeWidth + ringGap); const circumference = 2 * Math.PI * radius; const progress = item.value / item.maxValue; const dimmed = hoveredIndex !== null && hoveredIndex !== index; return <g key={item.label} onMouseEnter={() => onHoverChange(index)} onMouseLeave={() => onHoverChange(null)} className="cursor-pointer"><circle cx={center} cy={center} r={radius} fill="none" stroke="#edf0f2" strokeWidth={strokeWidth} /><circle cx={center} cy={center} r={radius} fill="none" stroke={item.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={`${circumference * progress} ${circumference}`} transform={`rotate(-90 ${center} ${center})`} className="transition-all duration-300 motion-reduce:transition-none" style={{ opacity: dimmed ? 0.25 : 1, filter: hoveredIndex === index ? "drop-shadow(0 0 4px rgba(65,107,137,0.28))" : "none" }} /></g>; })}
    </svg>
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><p className="font-mono text-3xl font-bold text-[#253548]">{hoveredIndex === null ? totalVal : data[hoveredIndex].value}</p><p className="mt-1 text-[12px] font-bold uppercase tracking-[0.12em] text-[#929ca7]">{hoveredIndex === null ? "Total enquiries" : data[hoveredIndex].label}</p></div>
  </div>;
}

function SalesAnalytics({ onBack, dynamicRingData }: { onBack: () => void; dynamicRingData: typeof ringData }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = dynamicRingData.reduce((sum, item) => sum + item.value, 0);
  return <div className="analytics-page space-y-6">
    <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><button onClick={onBack} className="mb-4 text-[13px] font-bold text-[#42698b] hover:underline">← Back to dashboard</button><p className="mb-2 text-[14px] text-[#8b96a2]">Sales intelligence / Sources</p><h2 className="font-display text-[24px] font-bold tracking-[-0.035em] text-[#253548]">Sales Analytics</h2><p className="mt-1 text-[14px] text-[#7f8995]">Understand where your property enquiries are coming from.</p></div><div className="rounded-lg border border-[#e2e7eb] bg-white px-4 py-3"><p className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#9aa4ad]">Total enquiries</p><p className="mt-1 font-mono text-xl font-bold text-[#253548]">{total}</p></div></section>
    <section className="grid gap-4 sm:grid-cols-3"><div className="rounded-xl border border-[#e6e9ee] bg-white p-4 shadow-[0_3px_14px_rgba(26,42,66,0.035)]"><p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#929ca7]">Top source</p><p className="mt-2 text-lg font-bold text-[#253548]">Organic enquiries</p><p className="mt-1 text-[13px] text-[#7f8995]">39% of total enquiries</p></div><div className="rounded-xl border border-[#e6e9ee] bg-white p-4 shadow-[0_3px_14px_rgba(26,42,66,0.035)]"><p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#929ca7]">Qualified leads</p><p className="mt-2 font-mono text-2xl font-bold text-[#253548]">164</p><p className="mt-1 text-[13px] text-[#7f8995]">38.3% of enquiries</p></div><div className="rounded-xl border border-[#e6e9ee] bg-white p-4 shadow-[0_3px_14px_rgba(26,42,66,0.035)]"><p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#929ca7]">Bookings</p><p className="mt-2 font-mono text-2xl font-bold text-[#253548]">18</p><p className="mt-1 text-[13px] text-[#7f8995]">RM 12.6M estimated value</p></div></section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(330px,0.9fr)]"><Card className="border-[#e6e9ee] bg-white py-0 shadow-[0_3px_14px_rgba(26,42,66,0.035)]"><CardHeader className="border-b border-[#eef0f3] px-5 py-5 sm:px-6"><CardTitle className="font-display text-[17px] font-bold text-[#253548]">Enquiry sources</CardTitle><p className="mt-1 text-[13px] text-[#8c96a1]">Quarter-to-date source mix</p></CardHeader><CardContent className="p-5 sm:p-7"><RingChart data={dynamicRingData} hoveredIndex={hovered} onHoverChange={setHovered} /><p className="mt-5 text-center text-[12px] leading-5 text-[#929ca7]">Hover a ring to inspect the source volume and share.</p></CardContent></Card><Card className="border-[#e6e9ee] bg-white py-0 shadow-[0_3px_14px_rgba(26,42,66,0.035)]"><CardHeader className="px-5 pb-2 pt-5"><CardTitle className="font-display text-[17px] font-bold text-[#253548]">Source performance</CardTitle><p className="mt-1 text-[13px] text-[#8c96a1]">How each channel contributes to pipeline</p></CardHeader><CardContent className="space-y-4 px-5 pb-5 pt-3">{dynamicRingData.map((item, index) => <div key={item.label} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)} className="rounded-lg border border-transparent p-2 transition-colors duration-200 hover:border-[#e6e9ee] hover:bg-[#fbfcfd] motion-reduce:transition-none"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-[13px] font-semibold text-[#536172]">{item.label}</span></div><span className="font-mono text-[12px] font-bold text-[#586777]">{item.value} <span className="font-sans font-normal text-[#a0a8b0]">({Math.round(item.value / (total || 1) * 100)}%)</span></span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0f2]"><div className="h-full rounded-full transition-all duration-300 motion-reduce:transition-none" style={{ width: `${item.value / (total || 1) * 100}%`, backgroundColor: item.color }} /></div><p className="mt-1 text-[12px] text-[#a0a8b0]">{item.note}</p></div>)}</CardContent></Card></section>
  </div>;
}


// Immersive priority lead card: circular probability ring, animated value,
// urgency pulse, and hover lift. Staggered entrance.
function PriorityLeadCard({ lead, rank, total }: { lead: Lead; rank: number; total: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const heat = lead.probability > 80 ? "#3f8f6b" : "#c99a4f";
  const dashOffset = circumference - (circumference * Math.min(lead.probability, 100)) / 100;
  const topValue = Math.max(...leads.map((l) => l.value));
  const sharePct = Math.round((lead.value / topValue) * 100);
  return (
    <div
      className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-[#e8ebef] bg-gradient-to-r from-white to-[#fafcfd] p-4 shadow-[0_2px_10px_rgba(26,42,66,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(26,42,66,0.12)] hover:border-[#c8d4de] sm:gap-5 sm:p-5 animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
      style={{ animationDelay: `${(rank - 1) * 70}ms`, animationDuration: "450ms", animationFillMode: "backwards" }}
    >
      {/* Rank + urgency */}
      <div className="flex w-8 shrink-0 flex-col items-center">
        <span className="font-mono text-[13px] font-bold text-[#b9c3cc]">{String(rank).padStart(2, "0")}</span>
        {lead.priority === "High" && (
          <span className="mt-1 size-1.5 rounded-full bg-[#bd6161] animate-ping-slow" aria-hidden="true" />
        )}
      </div>
      {/* Probability ring */}
      <div className="relative flex size-[68px] shrink-0 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={radius} fill="none" stroke="#edf0f2" strokeWidth={4} />
          <circle
            cx="24" cy="24" r={radius} fill="none" stroke={heat} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.23,1,0.32,1)", transitionDelay: `${rank * 80}ms` }}
          />
        </svg>
        <div className="text-center">
          <p className="font-mono text-[14px] font-bold text-[#344457]">{lead.probability}%</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a0a8b0]">close</p>
        </div>
      </div>
      {/* Identity */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-transform duration-200 group-hover:scale-110", lead.accent)}>{lead.initials}</div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-[#2c3c4f]">{lead.name}</p>
            <p className="mt-0.5 text-[12px] text-[#9ba4ae]">{lead.location} <span className="mx-0.5 text-[#c6cdd4]">·</span> {lead.property}</p>
          </div>
          <span className="hidden rounded-full border border-[#e2e7eb] bg-[#f4f7f9] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6d7884] sm:inline-block">{lead.segment}</span>
        </div>
        {/* Value share bar */}
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#edf0f2]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#416b89] to-[#4f8a83] transition-all duration-500" style={{ width: `${sharePct}%` }} />
          </div>
          <p className="shrink-0 text-right">
            <span className="block font-mono text-[15px] font-bold text-[#2c3c4f]">{formatRM(lead.value)}</span>
            <span className="block text-[11px] font-medium text-[#a0a8b0]">{sharePct}% of top lead</span>
          </p>
        </div>
      </div>
      {/* Next action */}
      <button
        onClick={() => toast(`${lead.action} for ${lead.name}.`)}
        className="group/btn flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#3f5770]/20 bg-[#eef3f8] px-4 py-2.5 text-[13px] font-bold text-[#2f4d6b] transition-all duration-200 hover:bg-[#344f6b] hover:text-white hover:shadow-[0_6px_16px_rgba(52,79,107,0.25)] hover:scale-105 active:scale-[0.97]"
      >
        {lead.action}
        <span className="transition-transform duration-200 group-hover/btn:translate-x-1" aria-hidden="true">→</span>
      </button>
    </div>
  );
}

export default function Home() {
  const [location, navigate] = useLocation();
  
  const { activeAgent } = useAuth();
  // Derive activePage directly from the route since DockNav is now global
  let activePage = "Dashboard";
  if (location === "/properties") activePage = "Properties";
  if (location === "/analytics") activePage = "Analytics";

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");
  // Period is lifted here so all DB queries react to it
  const [period, setPeriod] = useState("Quarter");

  // ─── Live DB queries ────────────────────────────────────────────────────────
  const { data: metricsData } = trpc.dashboard.metrics.useQuery({ period });
  const { data: leadsData } = trpc.leads.list.useQuery({ limit: 200, agentId: activeAgent.id });
  const { data: dbProperties } = trpc.properties.list.useQuery({ activeOnly: true });
  const { data: pipelineData } = trpc.pipeline.list.useQuery({ period });
  const { data: trendRaw } = trpc.salesTrend.byPeriod.useQuery({ period });
  const { data: sourcesRaw } = trpc.enquirySources.list.useQuery({ period });
  const { data: healthRaw } = trpc.followUpHealth.list.useQuery({ period });

  // ─── Derived / mapped data ──────────────────────────────────────────────────
  // Leads: map DB rows or static leads filtered by activeAgent.id
  const dynamicLeads: Lead[] = useMemo(() => {
    if (leadsData && leadsData.length > 0) {
      return leadsData.map((l) => ({
        id: l.id,
        initials: l.initials,
        name: l.name,
        location: l.location,
        probability: l.probability,
        value: l.value,
        segment: l.segment as Segment,
        priority: l.priority as Priority,
        action: l.action,
        property: l.property,
        accent: l.accent,
        lastContacted: l.lastContacted ?? "",
        agentId: l.agentId || activeAgent.id,
      }));
    }
    // Filter fallback static leads by activeAgent.id
    return leads.filter((l) => l.agentId === activeAgent.id);
  }, [leadsData, activeAgent.id]);

  const agentHighPriority = useMemo(() => {
    return dynamicLeads.filter((l) => (l.priority || deriveLeadPriorityTier(l)) === "High").length;
  }, [dynamicLeads]);

  const agentExpectedRevenue = useMemo(() => {
    return dynamicLeads.reduce((acc, l) => acc + (l.value * l.probability) / 100, 0);
  }, [dynamicLeads]);

  // Properties — map all live DB properties (36 total) and distribute across agents
  const dynamicProperties: PropertyListing[] = useMemo(() => {
    if (dbProperties && dbProperties.length > 0) {
      const fallbackImages = [
        "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1200&auto=format&fit=crop",
      ];
      const agentList = ["hannah", "amir", "chloe"];

      return dbProperties.map((p, idx) => {
        const img = p.imageUrl || fallbackImages[idx % fallbackImages.length];
        // Assign to agents based on location / specialization
        let assignedAgent = agentList[idx % agentList.length];
        if (/mont kiara|klcc|damansara/i.test(p.location)) {
          assignedAgent = idx % 2 === 0 ? "hannah" : "chloe";
        } else if (/shah alam|selangor|petaling jaya|cyberjaya/i.test(p.location)) {
          assignedAgent = idx % 2 === 0 ? "amir" : "hannah";
        } else if (/johor|iskandar/i.test(p.location)) {
          assignedAgent = "chloe";
        }

        return {
          id: p.id,
          name: p.title,
          developer: p.developer,
          location: p.location,
          price: p.price,
          type: p.type,
          beds: p.beds,
          size: p.size,
          status: p.status,
          badge: (p.badge as any) || undefined,
          agentId: assignedAgent,
          image: img,
          images: [img, fallbackImages[(idx + 1) % fallbackImages.length], fallbackImages[(idx + 2) % fallbackImages.length]],
          modelUrl: "",
          featured: idx < 6,
        };
      });
    }
    return marketProperties;
  }, [dbProperties]);

  const metrics = useMemo(() => ({
    totalLeads: dynamicLeads.length,
    highPriority: agentHighPriority,
    activeProperties: dynamicProperties.filter((p) => !p.agentId || p.agentId === activeAgent.id).length,
    expectedSalesValue: agentExpectedRevenue || 4_200_000,
    priorityDistribution: [
      { priority: "High", count: dynamicLeads.filter((l) => (l.priority || deriveLeadPriorityTier(l)) === "High").length },
      { priority: "Medium", count: dynamicLeads.filter((l) => (l.priority || deriveLeadPriorityTier(l)) === "Medium").length },
      { priority: "Low", count: dynamicLeads.filter((l) => (l.priority || deriveLeadPriorityTier(l)) === "Low").length },
    ],
  }), [dynamicLeads, agentHighPriority, dynamicProperties, activeAgent.id, agentExpectedRevenue]);

  // Funnel: Agent-specific pipeline progression
  const dynamicFunnelData = useMemo(() => {
    const total = dynamicLeads.length || 4;
    const qualified = dynamicLeads.filter((l) => l.probability >= 65).length || 3;
    const bookings = dynamicLeads.filter((l) => l.probability >= 80).length || 2;
    return [
      { stage: "Enquiries", value: total, color: "#287462" },
      { stage: "Qualified", value: qualified, color: "#4b8a70" },
      { stage: "Bookings", value: bookings, color: "#b6cf70" },
    ];
  }, [dynamicLeads]);

  // Sales trend: map DB rows to { month, value (in millions), date }
  const dynamicTrendData = useMemo(() => {
    if (!trendRaw || trendRaw.length === 0) {
      return trendData.map((point, index) => ({ ...point, date: new Date(2024, index, 1) }));
    }
    return trendRaw.map((row, index) => ({
      month: row.month,
      value: row.value / 1_000_000, // convert to millions for chart
      date: new Date(2024, index, 1),
    }));
  }, [trendRaw]);

  // Enquiry sources: map DB rows to { label, value, color, note }
  const SOURCE_COLORS: Record<string, string> = {
    "Organic enquiries": "#287462",
    "Portal campaigns": "#4b8a70",
    "Referrals": "#83a866",
    "WhatsApp follow-up": "#b6cf70",
  };
  const SOURCE_NOTES: Record<string, string> = {
    "Organic enquiries": "Website and search",
    "Portal campaigns": "Property portal campaigns",
    "Referrals": "Past customers and partners",
    "WhatsApp follow-up": "Reactivated conversations",
  };
  const dynamicRingData = useMemo(() => {
    if (!sourcesRaw || sourcesRaw.length === 0) return ringData;
    const total = sourcesRaw.reduce((s, r) => s + r.count, 0);
    return sourcesRaw.map((r) => ({
      label: r.source,
      value: r.count,
      maxValue: total,
      color: SOURCE_COLORS[r.source] ?? "#4b8a70",
      note: SOURCE_NOTES[r.source],
    }));
  }, [sourcesRaw]);

  // Follow-up health
  const scheduledHealth = useMemo(() => {
    const row = healthRaw?.find((r) => r.metric === "scheduled");
    return row ? row.value : 82;
  }, [healthRaw]);
  const contactedHealth = useMemo(() => {
    const row = healthRaw?.find((r) => r.metric === "contacted");
    return row ? row.value : 64;
  }, [healthRaw]);

  // Priority distribution for pie chart from metrics
  const dynamicPriorityData = useMemo(() => {
    const dist = metrics.priorityDistribution;
    return [
      { label: "High",   value: dist.find((d) => d.priority === "High")?.count   ?? 2, color: "#bd6161" },
      { label: "Medium", value: dist.find((d) => d.priority === "Medium")?.count ?? 2, color: "#a9752e" },
      { label: "Low",    value: dist.find((d) => d.priority === "Low")?.count    ?? 0, color: "#8b9aa8" },
    ];
  }, [metrics.priorityDistribution]);

  const filteredLeads = useMemo(() => {
    const matched = dynamicLeads.filter((lead) => {
      const query = search.trim().toLowerCase();
      const matchSearch =
        !query ||
        `${lead.name} ${lead.location} ${lead.property} ${lead.action} ${lead.segment}`
          .toLowerCase()
          .includes(query);
      const effectivePriority = (lead.priority || deriveLeadPriorityTier(lead)).toLowerCase();
      const matchPriority = priorityFilter === "all" || effectivePriority === priorityFilter.toLowerCase();
      const matchSegment = segmentFilter === "all" || lead.segment === segmentFilter;
      return matchSearch && matchPriority && matchSegment;
    });
    return sortPriorityLeads(matched, "priority").slice(0, 20); // Max 20 leads per agent
  }, [dynamicLeads, priorityFilter, search, segmentFilter]);

  // Sparkline data derived from live metrics
  const sparklineData = {
    salesValue: [12.4, 13.1, 12.8, 13.5, 14.2, 13.9, 14.8, 15.3, 15.1, 16.2, 17.1, metrics.expectedSalesValue / 1_000_000],
    totalLeads: [96, 100, 98, 104, 107, 102, 109, 112, 115, 118, 122, metrics.totalLeads],
    highPriority: [18, 17, 19, 20, 19, 21, 22, 20, 23, 22, 25, metrics.highPriority],
    activeProperties: [40, 39, 38, 39, 41, 40, 38, 37, 38, 37, 37, metrics.activeProperties],
  };
  const handleNav = (label: string) => {
    if (label === "AI Assistant") {
      window.dispatchEvent(new CustomEvent("toggleAiChat"));
      return;
    }
    if (label === "Leads") navigate("/leads");
    else if (label === "Customers") navigate("/customers");
    else if (label === "Properties") navigate("/properties");
    else if (label === "Analytics") navigate("/analytics");
    else navigate("/");
  };

  return (
    <div className={cn("app-shell min-h-screen bg-[#f7f8fa] text-[#182536]", activePage === "Dashboard" && "compact-dashboard-shell", activePage === "Analytics" && "analytics-page-shell")}>
      {activePage === "Dashboard" ? (
        <CompactDashboard
          leads={filteredLeads}
          trendData={dynamicTrendData}
          funnelData={dynamicFunnelData}
          sourceData={dynamicRingData}
          priorityData={dynamicPriorityData}
          totalLeads={metrics.totalLeads}
          highPriority={metrics.highPriority}
          activeProperties={metrics.activeProperties}
          expectedSalesValue={metrics.expectedSalesValue}
          scheduledHealth={scheduledHealth}
          contactedHealth={contactedHealth}
          search={search}
          setSearch={setSearch}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          segmentFilter={segmentFilter}
          setSegmentFilter={setSegmentFilter}
          onOpenAnalytics={() => navigate("/analytics")}
          period={period}
          onPeriodChange={setPeriod}
        />
      ) : (
        <main className="min-h-screen pb-12">
          {activePage === "Properties" ? (
            <PropertiesBrowser onBack={() => navigate("/")} properties={dynamicProperties} />
          ) : activePage === "Analytics" ? (
            <SalesIntelligenceDesk onBack={() => navigate("/")} onOpenLeads={() => navigate("/leads")} onOpenViewingFollowUps={() => navigate("/leads?focus=viewing")} leads={dynamicLeads} sources={dynamicRingData} expectedSalesValue={metrics.expectedSalesValue} />
          ) : (
            <section className="flex min-h-[58vh] items-center justify-center">
              <Card className="max-w-lg border-[#e6e9ee] bg-white text-center shadow-[0_3px_14px_rgba(26,42,66,0.035)]">
                <CardContent className="p-10">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#e7f0f7] text-[#527b9d]">
                    <Settings className="size-6" />
                  </div>
                  <h2 className="mt-5 font-display text-xl font-bold text-[#253548]">{activePage} workspace</h2>
                  <p className="mt-2 text-sm leading-6 text-[#7f8995]">This navigation view is scaffolded for the next phase. Connect your backend and AI services here when the data model is ready.</p>
                  <Button onClick={() => navigate("/")} className="mt-6 bg-[#284762] hover:bg-[#1f3c55]">Return to dashboard</Button>
                </CardContent>
              </Card>
            </section>
          )}
        </main>
      )}
    </div>
  );
}

// Replace these collections with typed API responses when the backend is connected.
