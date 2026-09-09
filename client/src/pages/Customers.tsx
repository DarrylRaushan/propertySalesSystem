/* Customers workspace — filterable table, KPI strip, add-customer dialog. Wired to trpc.customers.* */
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Crown, Mail, Phone, Plus, Search, Users, Wallet, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import CustomerProfileModal from "@/components/CustomerProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import AgentHeader from "@/components/AgentHeader";
import "@/components/CustomersWorkspace.css";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type CustomerRecord = RouterOutputs["customers"]["list"][number] & {
    assignedAgent?: { id: string; name: string; initials: string; role: string };
};

type CustomerSegment = "Investor" | "First-time Buyer" | "Upgrade" | "Luxury";

const SEGMENTS: CustomerSegment[] = ["Investor", "First-time Buyer", "Upgrade", "Luxury"];

const SEGMENT_STYLE: Record<CustomerSegment, string> = {
    Investor: "bg-[#f1edfa] text-[#6d55a6]",
    "First-time Buyer": "bg-[#e7f5ee] text-[#2f8f68]",
    Upgrade: "bg-[#e8f0f8] text-[#3d6a95]",
    Luxury: "bg-[#fbf3e3] text-[#a9752e]",
};

const ACCENT_ROTATION = [
    "bg-[#e4f2df] text-[#286454]",
    "bg-[#edf5d2] text-[#607740]",
    "bg-[#dff0e6] text-[#2e6a4b]",
    "bg-[#e8f4e6] text-[#42746a]",
    "bg-[#e6f1e4] text-[#456c60]",
];

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
    email: "",
    phone: "",
    segment: "First-time Buyer" as CustomerSegment,
    totalPurchased: "",
    unitsOwned: 1,
    isVip: false,
    notes: "",
};

const FRONTEND_PREVIEW_CUSTOMERS: CustomerRecord[] = [
    { id: -201, name: "Sarah Lim", email: "sarah@example.test", phone: "+60129876543", segment: "Investor", totalPurchased: 1980000, unitsOwned: 2, isVip: true, assignedAgent: { id: "hannah", name: "Hannah Cheong", initials: "HC", role: "Prime Specialist" } } as CustomerRecord,
    { id: -202, name: "Daniel Wong", email: "daniel@example.test", phone: "+60128765432", segment: "Upgrade", totalPurchased: 1250000, unitsOwned: 1, isVip: false, assignedAgent: { id: "amir", name: "Amir Rahman", initials: "AR", role: "Investment Consultant" } } as CustomerRecord,
    { id: -203, name: "Amelia Tan", email: "amelia@example.test", phone: "+60127654321", segment: "First-time Buyer", totalPurchased: 760000, unitsOwned: 1, isVip: false, assignedAgent: { id: "chloe", name: "Chloe Tan", initials: "CT", role: "Residential Lead" } } as CustomerRecord,
    { id: -204, name: "Siti Aisyah", email: "siti@example.test", phone: "+60126543210", segment: "Luxury", totalPurchased: 2680000, unitsOwned: 3, isVip: true, assignedAgent: { id: "hannah", name: "Hannah Cheong", initials: "HC", role: "Prime Specialist" } } as CustomerRecord,
    { id: -205, name: "Marcus Lee", email: "marcus@example.test", phone: "+60125566778", segment: "Investor", totalPurchased: 3100000, unitsOwned: 2, isVip: true, assignedAgent: { id: "amir", name: "Amir Rahman", initials: "AR", role: "Investment Consultant" } } as CustomerRecord,
    { id: -206, name: "Farhan Azmi", email: "farhan@example.test", phone: "+60124433221", segment: "First-time Buyer", totalPurchased: 650000, unitsOwned: 1, isVip: false, assignedAgent: { id: "chloe", name: "Chloe Tan", initials: "CT", role: "Residential Lead" } } as CustomerRecord,
];

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
        <article className="customer-kpi"><div className="customer-kpi-icon"><Icon className="size-[15px]" /></div><p className="customer-kpi-value">{value}</p><p className="customer-kpi-label">{label}</p><p className="customer-kpi-sub">{sub}</p></article>
    );
}

function CustomerRow({ customer, index, onClick }: { customer: CustomerRecord; index: number; onClick: () => void }) {
    const segment = (customer.segment as CustomerSegment) in SEGMENT_STYLE ? (customer.segment as CustomerSegment) : "Upgrade";
    const accent = ACCENT_ROTATION[index % ACCENT_ROTATION.length];
    const rawTotal = customer.totalPurchased as number | string;
    const totalPurchased = typeof rawTotal === "number" ? rawTotal : parseFloat(rawTotal) || 0;
    const agent = customer.assignedAgent;

    return (
        <TableRow
            className="customer-table-row group"
            style={{ cursor: "pointer" }}
            onClick={onClick}
        >
            <TableCell className="py-3.5">
                <div className="flex items-center gap-3">
                    <Avatar className="customer-avatar size-9 shrink-0">
                        <AvatarFallback className={cn("text-[12px] font-bold", accent)}>{initialsFromName(customer.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-[14px] font-bold text-[#27384a]">{customer.name}</p>
                            {customer.isVip && <Crown className="size-3.5 shrink-0 text-[#c18538]" />}
                        </div>
                        <p className="truncate text-[12px] text-[#929ca7]">{customer.email || "No email on file"}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <Badge className={cn("border-none font-semibold text-[12px]", SEGMENT_STYLE[segment])}>{segment}</Badge>
            </TableCell>
            <TableCell>
                {agent ? (
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#10484b]/10 text-[10px] font-bold text-[#10484b]">
                            {agent.initials}
                        </span>
                        <span className="text-[13px] font-medium text-[#2b4c47]">{agent.name}</span>
                    </div>
                ) : (
                    <span className="text-[12px] text-[#8ea39c]">Unassigned</span>
                )}
            </TableCell>
            <TableCell className="font-mono text-[14px] font-bold text-[#253548]">{formatRM(totalPurchased)}</TableCell>
            <TableCell className="text-[14px] font-semibold text-[#536172]">{customer.unitsOwned}</TableCell>
            <TableCell>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {customer.phone && (
                        <a
                            href={`tel:${customer.phone}`}
                            className="flex size-7 items-center justify-center rounded-md text-[#7f8995] hover:bg-[#eef1f3]"
                            aria-label={`Call ${customer.name}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Phone className="size-3.5" />
                        </a>
                    )}
                    {customer.email && (
                        <a
                            href={`mailto:${customer.email}`}
                            className="flex size-7 items-center justify-center rounded-md text-[#7f8995] hover:bg-[#eef1f3]"
                            aria-label={`Email ${customer.name}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Mail className="size-3.5" />
                        </a>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

export default function Customers() {
    const [, navigate] = useLocation();
    const { activeAgent } = useAuth();
    const [search, setSearch] = useState("");
    const [segmentFilter, setSegmentFilter] = useState("all");
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

    const [scope, setScope] = useState<"mine" | "all">("mine");

    const utils = trpc.useUtils();

    const { data: apiCustomers, isLoading } = trpc.customers.list.useQuery({
        segment: segmentFilter !== "all" ? segmentFilter : undefined,
    });

    const createCustomer = trpc.customers.create.useMutation({
        onSuccess: () => {
            toast.success(`Customer added to ${activeAgent.name}'s book`);
            utils.customers.list.invalidate();
            setOpen(false);
            setForm(emptyForm);
        },
        onError: (err) => toast.error(err.message || "Could not add customer"),
    });

    const isFrontendPreview = !apiCustomers?.length;
    const allCustomersList = useMemo(() => {
        const rawList = apiCustomers?.length ? apiCustomers : FRONTEND_PREVIEW_CUSTOMERS;
        return rawList.map((c, idx) => {
            const assigned = (c as any).assignedAgent || {
                id: idx % 3 === 0 ? "hannah" : idx % 3 === 1 ? "amir" : "chloe",
                name: idx % 3 === 0 ? "Hannah Cheong" : idx % 3 === 1 ? "Amir Rahman" : "Chloe Tan",
                initials: idx % 3 === 0 ? "HC" : idx % 3 === 1 ? "AR" : "CT",
                role: idx % 3 === 0 ? "Prime Specialist" : idx % 3 === 1 ? "Investment Consultant" : "Residential Lead",
            };
            return {
                ...c,
                assignedAgent: assigned,
            };
        });
    }, [apiCustomers]);

    const customers = useMemo(() => {
        let list = allCustomersList;
        if (scope === "mine") {
            list = list.filter((c) => c.assignedAgent?.id === activeAgent.id);
        }
        if (!search.trim()) return list;
        return list.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));
    }, [allCustomersList, scope, activeAgent.id, search]);

    const myCustomersCount = allCustomersList.filter((c) => c.assignedAgent?.id === activeAgent.id).length;
    const allCustomersCount = allCustomersList.length;

    const kpis = useMemo(() => {
        const total = customers.length;
        const revenue = customers.reduce((sum, c) => {
            const v = typeof c.totalPurchased === "number" ? c.totalPurchased : parseFloat(c.totalPurchased as string) || 0;
            return sum + v;
        }, 0);
        const vip = customers.filter((c) => c.isVip).length;
        const avgUnits = total ? (customers.reduce((s, c) => s + c.unitsOwned, 0) / total).toFixed(1) : "0.0";
        return { total, revenue, vip, avgUnits };
    }, [customers]);

    const resetFilters = () => {
        setSearch("");
        setSegmentFilter("all");
    };

    const handleSubmit = () => {
        if (!form.name.trim() || !form.totalPurchased.trim()) {
            toast.error("Please fill in name and total purchased value.");
            return;
        }
        createCustomer.mutate({
            name: form.name.trim(),
            email: form.email.trim() || undefined,
            phone: form.phone.trim() || undefined,
            segment: form.segment,
            totalPurchased: form.totalPurchased.trim(),
            unitsOwned: Number(form.unitsOwned),
            isVip: form.isVip,
            notes: form.notes.trim() || undefined,
        });
    };

    return (
        <div className="customer-workspace pb-24">
            <AgentHeader
                activePage="Customers"
                eyebrow={`${activeAgent.name}'s Portfolio / Relationship Desk`}
                badgeText={`${activeAgent.role} · Active Book`}
                title={<>Customers <em>· Kept Close</em></>}
                rightControls={
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <button className="px-3.5 py-1.5 bg-[#10484b] hover:bg-[#234d4d] text-[#d7ef73] rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 border border-[#234d4d]">
                                <Plus className="size-3.5" />
                                <span>Add Customer</span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="customer-dialog sm:max-w-[480px]">
                            <DialogHeader>
                                <DialogTitle>Add a customer</DialogTitle>
                                <DialogDescription>Record a confirmed buyer in your book.</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-3.5 py-2 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <Label htmlFor="c-name">Full name</Label>
                                    <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sarah Lim" />
                                </div>
                                <div>
                                    <Label htmlFor="c-email">Email</Label>
                                    <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" />
                                </div>
                                <div>
                                    <Label htmlFor="c-phone">Phone</Label>
                                    <Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+60 12-345 6789" />
                                </div>
                                <div>
                                    <Label>Segment</Label>
                                    <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as CustomerSegment })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="c-units">Units owned</Label>
                                    <Input id="c-units" type="number" min={0} value={form.unitsOwned} onChange={(e) => setForm({ ...form, unitsOwned: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <Label htmlFor="c-total">Total purchased (RM)</Label>
                                    <Input id="c-total" value={form.totalPurchased} onChange={(e) => setForm({ ...form, totalPurchased: e.target.value })} placeholder="1980000" />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-[#e4e8ec] px-3 py-2.5 sm:col-span-2">
                                    <div>
                                        <Label htmlFor="c-vip">VIP customer</Label>
                                        <p className="text-[12px] text-[#929ca7]">Flag for priority relationship management</p>
                                    </div>
                                    <Switch id="c-vip" checked={form.isVip} onCheckedChange={(v) => setForm({ ...form, isVip: v })} />
                                </div>
                                <div className="sm:col-span-2">
                                    <Label htmlFor="c-notes">Notes</Label>
                                    <Textarea id="c-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional context..." />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={createCustomer.isPending} className="customer-dialog-primary">
                                    {createCustomer.isPending ? "Adding..." : "Add customer"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            {/* Agent Scope Toggle — My Customers vs Full Brokerage */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-1">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#234d4d]">Showing:</span>
                    <div className="flex items-center gap-1 p-1 bg-[#f3f5ef] rounded-xl border border-[#dfe6df]">
                        <button
                            onClick={() => { setScope("mine"); setSegmentFilter("all"); }}
                            className={cn(
                                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
                                scope === "mine"
                                    ? "bg-[#10484b] text-[#d7ef73] shadow-sm"
                                    : "text-[#567177] hover:bg-[#eaf6df]"
                            )}
                        >
                            <Users className="size-3.5" />
                            My Clients ({myCustomersCount})
                        </button>
                        <button
                            onClick={() => { setScope("all"); setSegmentFilter("all"); }}
                            className={cn(
                                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
                                scope === "all"
                                    ? "bg-[#10484b] text-[#d7ef73] shadow-sm"
                                    : "text-[#567177] hover:bg-[#eaf6df]"
                            )}
                        >
                            <span>Brokerage Total ({allCustomersCount})</span>
                        </button>
                    </div>
                    {scope === "mine" && (
                        <span className="text-[11px] text-[#567177] font-medium">
                            Filtered strictly to <strong className="text-[#10484b]">{activeAgent.name}</strong>'s assigned buyers
                        </span>
                    )}
                </div>
            </div>

            <main className="customer-workspace-main">
                <section className="customer-hero"><div><small>{scope === "mine" ? `${activeAgent.name}'s Client Book` : "Brokerage Customer Book"}</small><h2>Turn completed sales into lasting relationships.</h2><p>Keep buyer portfolio value, ownership, and priority context available from one focused relationship desk.</p></div><aside className="customer-hero-aside"><small>VIP relationships</small><b>{kpis.vip}</b><span>priority customers in the active book.</span></aside></section>
                <section className="customer-kpis">
                    <KpiCard icon={Users} label="Total customers" value={String(kpis.total)} sub={scope === "mine" ? "in your active book" : "across brokerage"} />
                    <KpiCard icon={Wallet} label="Total revenue" value={formatRM(kpis.revenue)} sub="lifetime purchases" />
                    <KpiCard icon={Crown} label="VIP customers" value={String(kpis.vip)} sub="priority relationships" />
                    <KpiCard icon={Users} label="Avg. units owned" value={kpis.avgUnits} sub="per customer" />
                </section>

                <section className="customer-table-shell">
                    <div className="customer-toolbar">
                        <div><h2>Customer portfolio</h2><p>{isFrontendPreview ? "Frontend preview records — connect the backend to replace them with live customer records." : "Search the active relationship book and keep ownership context visible."}</p></div>
                        <div className="customer-search">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#9aa4af]" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search customers by name..."
                                className="pl-9 text-[13px]"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                                <SelectTrigger size="sm" className="customer-filter h-8 w-[155px] text-[13px]">
                                    <SelectValue placeholder="Segment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All segments</SelectItem>
                                    {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" onClick={resetFilters} className="customer-reset size-8" aria-label="Reset filters">
                                <X className="size-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table className="customer-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Customer</TableHead><TableHead>Segment</TableHead><TableHead>Assigned Agent</TableHead><TableHead>Total purchased</TableHead><TableHead>Units owned</TableHead><TableHead>Contact</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading &&
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={i} className="customer-table-row">
                                            <TableCell colSpan={6} className="py-4">
                                                <div className="h-4 w-full animate-pulse rounded bg-[#eef1f3]" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                {!isLoading && customers.map((customer, index) => (
                                    <CustomerRow
                                        key={customer.id}
                                        customer={customer}
                                        index={index}
                                        onClick={() => setSelectedCustomer(customer)}
                                    />
                                ))}
                            </TableBody>
                        </Table>
                        {!isLoading && customers.length === 0 && (
                            <div className="flex h-32 items-center justify-center text-[14px] text-[#8b96a1]">
                                No customers match the selected filters.
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* Customer profile slide-in modal */}
            {selectedCustomer && (
                <CustomerProfileModal
                    customer={selectedCustomer as any}
                    onClose={() => setSelectedCustomer(null)}
                />
            )}
        </div>
    );
}
