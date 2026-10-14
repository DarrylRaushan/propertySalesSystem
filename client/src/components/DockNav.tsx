'use client';

import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useLocation } from "wouter";
import { Building2, LayoutDashboard, PieChart as PieChartIcon, Sparkles, Target, Users, UserCheck, LogOut, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import "./Dock.css";

export const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Leads", icon: Target, count: "128" },
  { label: "Properties", icon: Building2 },
  { label: "AI Assistant", icon: Sparkles },
  { label: "Customers", icon: Users },
  { label: "Analytics", icon: PieChartIcon },
];

type SpringOptions = { mass: number; stiffness: number; damping: number };

type DockItemProps = {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  spring: SpringOptions;
  distance: number;
  magnification: number;
  baseItemSize: number;
  label: string;
  active?: boolean;
};

function DockIcon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("dock-icon", className)}>{children}</div>;
}

function DockLabel({ children, isHovered }: { children: React.ReactNode; isHovered: ReturnType<typeof useMotionValue<number>> }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const unsubscribe = isHovered.on("change", (latest) => setVisible(latest === 1));
    return unsubscribe;
  }, [isHovered]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className="dock-label"
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockItem({ children, className = "", onClick, mouseX, spring, distance, magnification, baseItemSize, label, active = false }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);
  const mouseDistance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect() ?? { x: 0, width: baseItemSize };
    return value - rect.x - baseItemSize / 2;
  });
  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={cn("dock-item", active && "dock-item-active", className)}
      tabIndex={0}
      role="button"
      aria-current={active ? "page" : undefined}
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {children}
      <DockLabel isHovered={isHovered}>{label}</DockLabel>
    </motion.div>
  );
}

interface DockNavProps { activePage?: string; onNavigate?: (label: string) => void; }

export function DockNav({ activePage: activePageProp, onNavigate }: DockNavProps) {
  const [location, navigate] = useLocation();
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const spring: SpringOptions = { mass: 0.1, stiffness: 150, damping: 12 };
  const magnification = 70;
  const distance = 200;
  const panelHeight = 68;
  const dockHeight = 256;
  const baseItemSize = 50;
  const maxHeight = useMemo(() => Math.max(dockHeight, magnification + magnification / 2 + 4), [dockHeight, magnification]);
  const heightRow = useTransform(isHovered, [0, 1], [panelHeight, maxHeight]);
  const height = useSpring(heightRow, spring);
  const routeActive = location === "/leads"
    ? "Leads"
    : location === "/customers"
      ? "Customers"
      : location === "/properties"
        ? "Properties"
        : location === "/analytics"
          ? "Analytics"
          : location === "/ai"
            ? "AI Assistant"
            : "Dashboard";
  const activePage = activePageProp ?? routeActive;
  const { activeAgent, availableAgents, switchAgent, quickLogin, logout } = useAuth();

  const handleNav = (label: string) => {
    if (label === "AI Assistant") {
      window.dispatchEvent(new CustomEvent('toggleAiChat'));
      return;
    }

    // 1. Instantly trigger the shrink animation before blocking the main thread
    isHovered.set(0);
    mouseX.set(Infinity);

    // 2. Wait 150ms for the animation to mostly complete, then navigate
    setTimeout(() => {
      startTransition(() => {
        if (label === "Leads") navigate("/leads");
        else if (label === "Customers") navigate("/customers");
        else if (label === "Dashboard") navigate("/");
        else if (label === "Properties") navigate("/properties");
        else if (label === "Analytics") navigate("/analytics");
        else navigate(`/?page=${encodeURIComponent(label)}`);
      });
    }, 150);
  };

  return (
    <motion.div style={{ height, scrollbarWidth: "none" }} className="dock-outer">
      <motion.nav
        onMouseMove={({ pageX }) => { isHovered.set(1); mouseX.set(pageX); }}
        onMouseLeave={() => { isHovered.set(0); mouseX.set(Infinity); }}
        className="dock-panel"
        role="toolbar"
        aria-label="Application dock"
      >
        {navItems.map(({ label, icon: Icon, count }) => (
          <DockItem key={label} label={label} mouseX={mouseX} spring={spring} distance={distance} magnification={magnification} baseItemSize={baseItemSize} active={activePage === label} onClick={() => handleNav(label)}>
            <DockIcon><Icon size={18} strokeWidth={activePage === label ? 2.2 : 1.8} />{count && <span className="dock-count">{count}</span>}</DockIcon>
          </DockItem>
        ))}
        <span className="dock-divider" aria-hidden="true" />
        {/* Profile button with inline-anchored popup */}
        <div className="relative">
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className="dock-profile-menu w-64"
                role="dialog"
                aria-label="Profile switcher"
              >
                <p className="dock-profile-title">Agent Workspace Profiles</p>
                {availableAgents.map((profile) => {
                  const isCurrent = profile.id === activeAgent.id;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setProfileOpen(false);
                        switchAgent(profile.id);
                        toast.success(`Switched to ${profile.name}'s workspace.`);
                      }}
                      className="dock-profile-option"
                    >
                      <span className="dock-profile-avatar">{profile.initials}</span>
                      <span>
                        <span className="dock-profile-name">{profile.name}</span>
                        <span className="dock-profile-role">{profile.role}</span>
                      </span>
                      {isCurrent && <span className="dock-profile-current" />}
                    </button>
                  );
                })}

                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      quickLogin("customer", "sarah");
                    }}
                    className="w-full px-2 py-1.5 rounded-lg text-left text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center gap-2 font-medium"
                  >
                    <UserCheck size={14} />
                    <span>View Customer Portal</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      toast.success("Logged out. Returned to Guest Mode.");
                    }}
                    className="w-full px-2 py-1.5 rounded-lg text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium"
                  >
                    <LogOut size={14} />
                    <span>Sign Out (Guest Mode)</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <DockItem
            label={`Agent: ${activeAgent.name}`}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            active={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <DockIcon>
              <span className="text-[11px] font-black tracking-tight">{activeAgent.initials}</span>
            </DockIcon>
          </DockItem>
        </div>
      </motion.nav>
    </motion.div>
  );
}

export default DockNav;
