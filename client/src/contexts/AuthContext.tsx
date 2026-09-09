import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export type UserRole = "guest" | "customer" | "agent";

export type PropertyAgent = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  phone: string;
  specialization: string;
  avatarBg: string;
  avatarColor: string;
};

export type CustomerUser = {
  id: string; // stringified DB id  e.g. "1"
  dbId: number; // numeric PK in customer_accounts
  name: string;
  email: string;
  phone: string;
  avatarInitials: string;
  segment: string;
  budget: string;
  preferredLocation: string;
  preferredTypes?: string;
  minBeds?: number;
  investmentGoal?: string;
  preferredFeatures?: string;
};

export type BookedViewing = {
  id: string;
  propertyId: number;
  propertyTitle: string;
  propertyLocation: string;
  propertyPrice: number;
  propertyImage?: string;
  agentId: string;
  agentName: string;
  agentPhone: string;
  date: string;
  timeSlot: string;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
  notes?: string;
  createdAt: string;
};

export const PROPERTY_AGENTS: PropertyAgent[] = [
  {
    id: "hannah",
    name: "Hannah Cheong",
    initials: "HC",
    role: "Sales Director",
    email: "hannah@properly.my",
    phone: "+60 12-384 9201",
    specialization: "Prime High-Rise & Luxury Developments",
    avatarBg: "bg-emerald-100",
    avatarColor: "text-emerald-800",
  },
  {
    id: "amir",
    name: "Amir Rahman",
    initials: "AR",
    role: "Senior Investment Consultant",
    email: "amir@properly.my",
    phone: "+60 17-291 8832",
    specialization: "High-Yield Portfolios & Landed Estates",
    avatarBg: "bg-indigo-100",
    avatarColor: "text-indigo-800",
  },
  {
    id: "chloe",
    name: "Chloe Tan",
    initials: "CT",
    role: "Luxury Residential Lead",
    email: "chloe@properly.my",
    phone: "+60 19-450 1198",
    specialization: "New Launch Campaigns & VIP Expats",
    avatarBg: "bg-amber-100",
    avatarColor: "text-amber-800",
  },
];

export const CUSTOMER_USERS: CustomerUser[] = [
  {
    id: "1",
    dbId: 1,
    name: "Sarah Tan",
    email: "sarah.tan@gmail.com",
    phone: "+60 12-882 1099",
    avatarInitials: "ST",
    segment: "High Net Worth Investor",
    budget: "RM 2,500,000 - RM 4,500,000",
    preferredLocation: "KLCC & Mont Kiara",
    preferredTypes: "Condominium,Penthouse,Serviced residence",
    minBeds: 2,
    investmentGoal: "High Rental Yield",
    preferredFeatures: "Sky Pool,Private Lift,Concierge,MRT Walkability",
  },
  {
    id: "2",
    dbId: 2,
    name: "Marcus Wong",
    email: "marcus.wong@outlook.com",
    phone: "+60 16-773 4021",
    avatarInitials: "MW",
    segment: "First-Time Luxury Homebuyer",
    budget: "RM 1,200,000 - RM 2,000,000",
    preferredLocation: "Damansara Heights & Bangsar",
    preferredTypes: "Condominium,Landed terrace",
    minBeds: 3,
    investmentGoal: "Luxury Family Living",
    preferredFeatures: "Smart Home,Private Lift,Green Building",
  },
  {
    id: "3",
    dbId: 3,
    name: "Elena Rostova",
    email: "elena.rostova@vip.com",
    phone: "+60 19-332 9988",
    avatarInitials: "ER",
    segment: "VIP Expat Investor",
    budget: "RM 3,000,000 - RM 6,000,000",
    preferredLocation: "Ampang Hilir & KL City Centre",
    preferredTypes: "Penthouse,Condominium",
    minBeds: 3,
    investmentGoal: "Capital Appreciation",
    preferredFeatures: "Private Lift,Sky Pool,Golf View,Concierge",
  },
];

// Agent emails for quick lookup
const AGENT_EMAILS = new Set(PROPERTY_AGENTS.map((a) => a.email.toLowerCase()));
const AGENT_PASSWORDS: Record<string, string> = {
  "hannah@properly.my": "hannah123",
  "amir@properly.my": "amir123",
  "chloe@properly.my": "chloe123",
};

interface AuthContextType {
  role: UserRole;
  isGuest: boolean;
  isCustomer: boolean;
  isAgent: boolean;
  activeAgent: PropertyAgent;
  activeCustomer: CustomerUser | null;
  availableAgents: PropertyAgent[];

  // Auth actions
  login: (email: string, password?: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  quickLogin: (role: "customer" | "agent", accountId?: string) => void;
  logout: () => void;
  switchAgent: (agentId: string) => void;
  switchRole: (newRole: UserRole) => void;

  // Profile & Preferences
  updateCustomerProfile: (data: Partial<CustomerUser>) => Promise<CustomerUser | undefined>;
  isUpdatingProfile: boolean;

  // Gating & Auth Modal
  isAuthModalOpen: boolean;
  authModalPrompt: string;
  openAuthModal: (prompt?: string, onAuthenticated?: () => void) => void;
  closeAuthModal: () => void;
  requireAuth: (prompt?: string, onAuthenticated?: () => void) => boolean;

  // Customer features
  savedPropertyIds: number[];
  toggleSaveProperty: (propertyId: number) => void;
  isPropertySaved: (propertyId: number) => boolean;
  bookedViewings: BookedViewing[];
  bookViewing: (viewing: Omit<BookedViewing, "id" | "status" | "createdAt">) => Promise<BookedViewing>;
  cancelViewing: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_AGENT_KEY = "properly_active_agent_id";
const STORAGE_ROLE_KEY = "properly_user_role";
const STORAGE_CUSTOMER_KEY = "properly_active_customer_json";

// ── Helper to safely read/write localStorage ──────────────────────────────
function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string) {
  try { localStorage.setItem(key, val); } catch {}
}
function lsRemove(key: string) {
  try { localStorage.removeItem(key); } catch {}
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const utils = trpc.useUtils();

  // Role
  const [role, setRole] = useState<UserRole>(() => {
    const saved = lsGet(STORAGE_ROLE_KEY);
    if (saved === "customer" || saved === "agent" || saved === "guest") return saved;
    return "guest";
  });

  // Active agent
  const [activeAgentId, setActiveAgentId] = useState<string>(() => {
    const saved = lsGet(STORAGE_AGENT_KEY);
    if (saved && PROPERTY_AGENTS.some((a) => a.id === saved)) return saved;
    return PROPERTY_AGENTS[0].id;
  });

  // Active customer (full profile stored in localStorage to survive refresh)
  const [activeCustomer, setActiveCustomer] = useState<CustomerUser | null>(() => {
    const saved = lsGet(STORAGE_CUSTOMER_KEY);
    if (saved) { try { return JSON.parse(saved); } catch {} }
    return null;
  });

  // DB-backed shortlist (local copy, synced on login + mutations)
  const [savedPropertyIds, setSavedPropertyIds] = useState<number[]>([]);

  // DB-backed viewings (local copy, synced on login + mutations)
  const [bookedViewings, setBookedViewings] = useState<BookedViewing[]>([]);

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalPrompt, setAuthModalPrompt] = useState("");
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // tRPC mutations
  const loginCheckMutation = trpc.auth.loginCheck.useMutation();
  const updateProfileMutation = trpc.customerPortal.updateProfile.useMutation({
    onSuccess: () => utils.customerPortal.getProfile.invalidate(),
  });
  const toggleShortlistMutation = trpc.customerPortal.toggleShortlist.useMutation({
    onSuccess: (result, vars) => {
      setSavedPropertyIds((prev) =>
        result.saved ? [...prev, vars.propertyId] : prev.filter((id) => id !== vars.propertyId)
      );
    },
  });
  const bookViewingMutation = trpc.customerPortal.bookViewing.useMutation({
    onSuccess: () => utils.customerPortal.getViewings.invalidate(),
  });
  const cancelViewingMutation = trpc.customerPortal.cancelViewing.useMutation({
    onSuccess: () => utils.customerPortal.getViewings.invalidate(),
  });

  // Load shortlist from DB when customer is set
  useEffect(() => {
    if (role === "customer" && activeCustomer?.dbId) {
      utils.customerPortal.getShortlist.fetch({ customerAccountId: activeCustomer.dbId }).then((ids) => {
        setSavedPropertyIds(ids);
      }).catch(() => setSavedPropertyIds([]));
    } else if (role !== "customer") {
      setSavedPropertyIds([]);
    }
  }, [role, activeCustomer?.dbId]);

  // Load viewings from DB when customer is set
  useEffect(() => {
    if (role === "customer" && activeCustomer?.dbId) {
      utils.customerPortal.getViewings.fetch({ customerAccountId: activeCustomer.dbId }).then((rows) => {
        setBookedViewings(rows.map((r) => ({
          id: String(r.id),
          propertyId: r.propertyId,
          propertyTitle: r.propertyTitle,
          propertyLocation: r.propertyLocation,
          propertyPrice: r.propertyPrice,
          propertyImage: r.propertyImage ?? undefined,
          agentId: r.agentId,
          agentName: r.agentName,
          agentPhone: r.agentPhone,
          date: r.date,
          timeSlot: r.timeSlot,
          status: (r.status as BookedViewing["status"]) ?? "Confirmed",
          notes: r.notes ?? undefined,
          createdAt: r.createdAt,
        })));
      }).catch(() => setBookedViewings([]));
    } else if (role !== "customer") {
      setBookedViewings([]);
    }
  }, [role, activeCustomer?.dbId]);

  const activeAgent = PROPERTY_AGENTS.find((a) => a.id === activeAgentId) || PROPERTY_AGENTS[0];

  const saveRoleToStorage = (newRole: UserRole) => {
    setRole(newRole);
    lsSet(STORAGE_ROLE_KEY, newRole);
  };

  const persistCustomer = (cu: CustomerUser | null) => {
    setActiveCustomer(cu);
    if (cu) lsSet(STORAGE_CUSTOMER_KEY, JSON.stringify(cu));
    else lsRemove(STORAGE_CUSTOMER_KEY);
  };

  const switchAgent = (agentId: string) => {
    if (PROPERTY_AGENTS.some((a) => a.id === agentId)) {
      setActiveAgentId(agentId);
      lsSet(STORAGE_AGENT_KEY, agentId);
    }
  };

  const openAuthModal = (prompt = "Please sign in to continue", onAuthenticated?: () => void) => {
    setAuthModalPrompt(prompt);
    setPendingCallback(onAuthenticated ? () => onAuthenticated : null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPendingCallback(null);
  };

  const requireAuth = (prompt = "Sign in to access this luxury feature", onAuthenticated?: () => void): boolean => {
    if (role === "guest") {
      openAuthModal(prompt, onAuthenticated);
      return false;
    }
    onAuthenticated?.();
    return true;
  };

  /** Main login — checks DB for customers, static list for agents */
  const login = async (emailInput: string, password?: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    const cleanEmail = emailInput.trim().toLowerCase();

    // ── Agent login (static, DB-less) ─────────────────────────────────────
    const matchedAgent = PROPERTY_AGENTS.find((a) => a.email.toLowerCase() === cleanEmail);
    if (matchedAgent) {
      const agentPwd = AGENT_PASSWORDS[cleanEmail];
      if (agentPwd && password && password !== agentPwd) {
        return { success: false, error: "Incorrect password for agent account." };
      }
      switchAgent(matchedAgent.id);
      saveRoleToStorage("agent");
      persistCustomer(null);
      setIsAuthModalOpen(false);
      if (pendingCallback) { pendingCallback(); setPendingCallback(null); }
      return { success: true, role: "agent" };
    }

    // ── Customer login (DB-backed) ─────────────────────────────────────────
    try {
      const result = await loginCheckMutation.mutateAsync({
        email: cleanEmail,
        password: password || "",
      });

      if (!result.success) {
        return { success: false, error: (result as any).error || "Invalid credentials." };
      }

      const cu: CustomerUser = {
        id: String(result.customerId),
        dbId: result.customerId!,
        name: result.name!,
        email: result.email!,
        phone: result.phone ?? "",
        avatarInitials: result.avatarInitials!,
        segment: result.segment!,
        budget: result.budget ?? "",
        preferredLocation: result.preferredLocation ?? "",
        preferredTypes: (result as any).preferredTypes ?? undefined,
        minBeds: (result as any).minBeds ?? 0,
        investmentGoal: (result as any).investmentGoal ?? undefined,
        preferredFeatures: (result as any).preferredFeatures ?? undefined,
      };

      persistCustomer(cu);
      saveRoleToStorage("customer");
      setIsAuthModalOpen(false);
      if (pendingCallback) { pendingCallback(); setPendingCallback(null); }
      return { success: true, role: "customer" };
    } catch (err: any) {
      return { success: false, error: err?.message || "Login failed. Please try again." };
    }
  };

  /** Quick-login for dev switching (keeps existing patterns for agent switching) */
  const quickLogin = (targetRole: "customer" | "agent", accountId?: string) => {
    if (targetRole === "agent") {
      const agentId = accountId || PROPERTY_AGENTS[0].id;
      switchAgent(agentId);
      saveRoleToStorage("agent");
      persistCustomer(null);
    } else {
      const cust = CUSTOMER_USERS.find((c) => c.id === accountId) || CUSTOMER_USERS[0];
      persistCustomer(cust);
      saveRoleToStorage("customer");
    }
    setIsAuthModalOpen(false);
    if (pendingCallback) { pendingCallback(); setPendingCallback(null); }
  };

  const logout = () => {
    saveRoleToStorage("guest");
    persistCustomer(null);
    setSavedPropertyIds([]);
    setBookedViewings([]);
    lsRemove(STORAGE_ROLE_KEY);
  };

  // ── Shortlist ────────────────────────────────────────────────────────────
  const toggleSaveProperty = (propertyId: number) => {
    if (!activeCustomer?.dbId) return;
    // Optimistic update
    setSavedPropertyIds((prev) =>
      prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
    );
    toggleShortlistMutation.mutate({ customerAccountId: activeCustomer.dbId, propertyId });
  };

  const isPropertySaved = (propertyId: number) => savedPropertyIds.includes(propertyId);

  // ── Viewings ─────────────────────────────────────────────────────────────
  const bookViewing = async (viewingData: Omit<BookedViewing, "id" | "status" | "createdAt">): Promise<BookedViewing> => {
    if (!activeCustomer?.dbId) throw new Error("Not logged in as customer");
    const result = await bookViewingMutation.mutateAsync({
      customerAccountId: activeCustomer.dbId,
      propertyId: viewingData.propertyId,
      propertyTitle: viewingData.propertyTitle,
      propertyLocation: viewingData.propertyLocation,
      propertyPrice: viewingData.propertyPrice,
      propertyImage: viewingData.propertyImage,
      agentId: viewingData.agentId,
      agentName: viewingData.agentName,
      agentPhone: viewingData.agentPhone,
      date: viewingData.date,
      timeSlot: viewingData.timeSlot,
      notes: viewingData.notes,
    });
    const newBooking: BookedViewing = {
      id: String(result.id),
      propertyId: result.propertyId,
      propertyTitle: result.propertyTitle,
      propertyLocation: result.propertyLocation,
      propertyPrice: result.propertyPrice,
      propertyImage: result.propertyImage ?? undefined,
      agentId: result.agentId,
      agentName: result.agentName,
      agentPhone: result.agentPhone,
      date: result.date,
      timeSlot: result.timeSlot,
      status: (result.status as BookedViewing["status"]) ?? "Confirmed",
      notes: result.notes ?? undefined,
      createdAt: result.createdAt,
    };
    setBookedViewings((prev) => [newBooking, ...prev]);
    return newBooking;
  };

  const cancelViewing = async (id: string) => {
    if (!activeCustomer?.dbId) return;
    await cancelViewingMutation.mutateAsync({ id: Number(id), customerAccountId: activeCustomer.dbId });
    setBookedViewings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Cancelled" as const } : b))
    );
  };

  // ── Profile Updates ──────────────────────────────────────────────────────
  const updateCustomerProfile = async (data: Partial<CustomerUser>): Promise<CustomerUser | undefined> => {
    if (!activeCustomer) return undefined;

    // Local fallback/optimistic merge
    const merged: CustomerUser = {
      ...activeCustomer,
      ...data,
      dbId: activeCustomer.dbId,
      id: activeCustomer.id,
    };

    if (activeCustomer.dbId) {
      try {
        const res = await updateProfileMutation.mutateAsync({
          customerAccountId: activeCustomer.dbId,
          name: data.name,
          phone: data.phone,
          segment: data.segment,
          budget: data.budget,
          preferredLocation: data.preferredLocation,
          preferredTypes: data.preferredTypes,
          minBeds: data.minBeds,
          investmentGoal: data.investmentGoal,
          preferredFeatures: data.preferredFeatures,
        });
        if (res) {
          merged.name = res.name;
          merged.email = res.email;
          merged.phone = res.phone ?? merged.phone;
          merged.avatarInitials = res.avatarInitials;
          merged.segment = res.segment;
          merged.budget = res.budget ?? merged.budget;
          merged.preferredLocation = res.preferredLocation ?? merged.preferredLocation;
          merged.preferredTypes = res.preferredTypes ?? merged.preferredTypes;
          merged.minBeds = res.minBeds ?? merged.minBeds;
          merged.investmentGoal = res.investmentGoal ?? merged.investmentGoal;
          merged.preferredFeatures = res.preferredFeatures ?? merged.preferredFeatures;
        }
      } catch (e) {
        console.warn("[AuthContext] Profile update server sync error (using local state):", e);
      }
    }

    persistCustomer(merged);
    return merged;
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        isGuest: role === "guest",
        isCustomer: role === "customer",
        isAgent: role === "agent",
        activeAgent,
        activeCustomer,
        availableAgents: PROPERTY_AGENTS,
        login,
        quickLogin,
        logout,
        switchAgent,
        switchRole: saveRoleToStorage,
        updateCustomerProfile,
        isUpdatingProfile: updateProfileMutation.isPending,
        isAuthModalOpen,
        authModalPrompt,
        openAuthModal,
        closeAuthModal,
        requireAuth,
        savedPropertyIds,
        toggleSaveProperty,
        isPropertySaved,
        bookedViewings,
        bookViewing,
        cancelViewing,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
