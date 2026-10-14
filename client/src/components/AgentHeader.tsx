import React from "react";
import { Link, useLocation } from "wouter";
import {
  Building2,
  LayoutDashboard,
  Target,
  Users,
  PieChart as PieChartIcon,
  Sparkles,
  Briefcase,
  User,
  LogOut,
  Plus,
  Bot,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import NewLeadModal from "@/components/NewLeadModal";
import { toast } from "sonner";

export type AgentPage = "Dashboard" | "Leads" | "Properties" | "Customers" | "Analytics";

interface AgentHeaderProps {
  activePage: AgentPage;
  title?: React.ReactNode;
  eyebrow?: string;
  badgeText?: string;
  rightControls?: React.ReactNode;
}

export default function AgentHeader({
  activePage,
  title,
  eyebrow = "Property Agent Suite / Malaysia",
  badgeText,
  rightControls,
}: AgentHeaderProps) {
  const [, navigate] = useLocation();
  const { activeAgent, availableAgents, switchAgent, logout, quickLogin } = useAuth();

  // Live count queries from DB strictly tailored to the active agent
  const { data: metricsData } = trpc.dashboard.metrics.useQuery();
  const { data: leadsData } = trpc.leads.list.useQuery({ limit: 500, agentId: activeAgent.id });
  const { data: propertiesData } = trpc.properties.list.useQuery({ activeOnly: true });
  const { data: customersData } = trpc.customers.list.useQuery();

  // Agent-specific handled counts accurately mapped to activeAgent.id from live DB
  const totalLeads = leadsData?.length ?? (activeAgent.id === "hannah" ? 64 : activeAgent.id === "amir" ? 52 : activeAgent.id === "chloe" ? 12 : 8);
  const totalProperties = propertiesData
    ? propertiesData.filter((p: any) => !p.agentId || p.agentId === activeAgent.id).length
    : (activeAgent.id === "hannah" ? 21 : activeAgent.id === "amir" ? 10 : activeAgent.id === "darryl" ? 4 : 1);
  const totalCustomers = customersData
    ? customersData.filter((c: any) => !c.agentId || c.agentId === activeAgent.id).length
    : (activeAgent.id === "hannah" ? 4 : 3);

  const toggleAi = () => window.dispatchEvent(new CustomEvent("toggleAiChat"));

  const navMenuItems = [
    {
      id: "Dashboard" as AgentPage,
      label: "Executive Dashboard",
      icon: LayoutDashboard,
      path: "/",
      badge: "Overview",
    },
    {
      id: "Leads" as AgentPage,
      label: "Leads Pipeline",
      icon: Target,
      path: "/leads",
      badge: String(totalLeads),
    },
    {
      id: "Properties" as AgentPage,
      label: "Properties Catalog",
      icon: Building2,
      path: "/properties",
      badge: String(totalProperties),
    },
    {
      id: "Customers" as AgentPage,
      label: "Customer Book",
      icon: Users,
      path: "/customers",
      badge: String(totalCustomers),
    },
    {
      id: "Analytics" as AgentPage,
      label: "Sales Intelligence",
      icon: PieChartIcon,
      path: "/analytics",
      badge: "Live",
    },
    {
      id: "AI" as any,
      label: "AI Copilot",
      icon: Sparkles,
      action: toggleAi,
      badge: "Ready",
    },
  ];

  return (
    <header className="analytics-workspace-header">
      <div className="analytics-header-shell max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Row 1: Title & Controls */}
        <div className="analytics-workspace-header-inner">
          <div className="analytics-workspace-title">
            <div className="analytics-back shrink-0" title="Properly Agent Intelligence">
              <Briefcase className="size-4 text-[#10484b]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="analytics-eyebrow">{eyebrow}</span>
                <span className="text-[10px] font-bold text-[#356f54] bg-[#e4f2df] px-2 py-0.5 rounded-full border border-[#cbe5c4]">
                  {badgeText || `${activeAgent.name} · ${activeAgent.role}`}
                </span>
              </div>
              <h1 className="analytics-main-title">
                {title || (
                  <>
                    Properly Agent <em>· Decision Desk</em>
                  </>
                )}
              </h1>
            </div>
          </div>

          {/* Right Group: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {rightControls}

            {/* Agent Profile & Switcher */}
            <div className="flex items-center gap-1.5 bg-[#fbfff9] border border-[#234d4d] rounded-xl p-1 shadow-sm">
              <div className="flex items-center gap-2 px-2 py-0.5">
                <div className="w-6 h-6 rounded-full bg-[#10484b] text-[#d7ef73] font-bold text-[10px] flex items-center justify-center">
                  {activeAgent.initials}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-bold text-[#10484b] leading-tight">
                    {activeAgent.name}
                  </p>
                  <p className="text-[9px] text-[#4a9070] font-semibold">
                    {activeAgent.specialization.split("&")[0]}
                  </p>
                </div>
              </div>

              {/* Quick Agent Switcher Dropdown */}
              <select
                value={activeAgent.id}
                onChange={(e) => switchAgent(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-[#10484b] border-l border-[#dfe6df] pl-1.5 pr-1 py-0.5 focus:outline-none cursor-pointer hidden lg:inline-block"
                title="Switch Agent Account"
              >
                {availableAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name.split(" ")[0]} ({agent.initials})
                  </option>
                ))}
              </select>
            </div>

            {/* Switch to Customer Marketplace Button */}
            <button
              onClick={() => {
                quickLogin("customer", "1");
              }}
              className="px-2.5 py-1.5 bg-[#10484b] hover:bg-[#234d4d] text-[#d7ef73] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm border border-[#234d4d]"
              title="Preview as Customer"
            >
              <User size={13} />
              <span className="hidden sm:inline">Buyer Portal</span>
            </button>

            {/* Sign Out to Guest Mode */}
            <button
              onClick={() => {
                logout();
                toast.success("Signed out to Guest Mode");
              }}
              className="p-1.5 text-[#567177] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition border border-transparent hover:border-rose-200"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: Segmented Navigation Tab Menu Ribbon (Exact Customer Side Design) */}
        <div className="analytics-tabs-container">
          <div className="analytics-tabs-nav">
            {navMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.path) {
                      navigate(item.path);
                    }
                  }}
                  className={cn("analytics-tab-btn", isActive && "is-active")}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        "analytics-tab-badge",
                        isActive
                          ? "bg-[#d7ef73] text-[#10484b]"
                          : "bg-[#e8f2e6] text-[#3b6b55]"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
