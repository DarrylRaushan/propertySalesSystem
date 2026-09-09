import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Lock,
  Mail,
  KeyRound,
  Sparkles,
  ShieldCheck,
  Building2,
  User,
  ArrowRight,
  CheckCircle2,
  Briefcase,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth, PROPERTY_AGENTS, CUSTOMER_USERS } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function AuthModal() {
  const {
    isAuthModalOpen,
    authModalPrompt,
    closeAuthModal,
    login,
    quickLogin,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"customer" | "agent">("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email) {
      setErrorMessage("Please enter an email address.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      setIsLoading(false);

      if (result.success) {
        toast.success(
          result.role === "agent"
            ? "Welcome back to Agent Workspace!"
            : "Welcome to Properly Luxury Customer Portal!"
        );
        closeAuthModal();
      } else {
        setErrorMessage(result.error || "Login failed. Please check credentials.");
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || "Login failed. Please check credentials.");
    }
  };

  const handleDemoClick = (role: "customer" | "agent", accountId: string, name: string) => {
    quickLogin(role, accountId);
    toast.success(`Signed in as ${name} (${role === "agent" ? "Property Agent" : "Customer"})`);
    closeAuthModal();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#153941]/80 backdrop-blur-md"
          onClick={closeAuthModal}
        />

        {/* Modal Window in Terrain Theme */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-md bg-[#fbfff9] rounded-3xl shadow-2xl border-[1.5px] border-[#234d4d] overflow-hidden text-[#10484b] z-10"
        >
          {/* Header Banner matching Terrain theme */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-[#153941] via-[#234d4d] to-[#3b6b5a] text-white">
            {/* Close Button */}
            <button
              onClick={closeAuthModal}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#d7ef73] text-[#153941] flex items-center justify-center font-bold">
                <Sparkles size={15} />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#d7ef73]">
                Properly Signature Access
              </span>
            </div>

            <h2 className="text-2xl font-normal tracking-tight font-serif text-white" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
              {authModalPrompt ? "Sign In Required" : "Sign In to Properly"}
            </h2>

            {authModalPrompt ? (
              <p className="mt-2 text-xs text-[#f6ffdf] bg-black/25 border border-white/10 rounded-xl px-3 py-2 leading-relaxed">
                {authModalPrompt}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#e4ece2]">
                Access curated property shortlists, book VIP viewings, or manage client pipelines.
              </p>
            )}

            {/* Role selector tabs */}
            <div className="mt-4 grid grid-cols-2 p-1 bg-black/30 backdrop-blur rounded-xl border border-white/15 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("customer");
                  setEmail(CUSTOMER_USERS[0].email);
                  setPassword("customer123");
                }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "customer"
                    ? "bg-[#fbfff9] text-[#10484b] shadow font-bold"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                <User size={14} />
                Customer / Buyer
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("agent");
                  setEmail(PROPERTY_AGENTS[0].email);
                  setPassword("agent123");
                }}
                className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "agent"
                    ? "bg-[#d7ef73] text-[#153941] shadow font-bold"
                    : "text-slate-200 hover:text-white"
                }`}
              >
                <Briefcase size={14} />
                Property Agent
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4 bg-[#fbfff9]">
            {errorMessage && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2 font-medium">
                <span className="font-bold">Error:</span> {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#10484b] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567177]"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      activeTab === "customer"
                        ? "sarah.tan@gmail.com"
                        : "hannah@properly.my"
                    }
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#f3f5ef] border border-[#dfe6df] rounded-xl font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10484b] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#567177]"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#f3f5ef] border border-[#dfe6df] rounded-xl font-semibold text-[#10484b] focus:outline-none focus:ring-2 focus:ring-[#234d4d] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#567177] hover:text-[#10484b]"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.99] border border-[#234d4d]"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In as {activeTab === "agent" ? "Property Agent" : "Customer"}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Quick One-Click Demo Logins */}
            <div className="pt-3 border-t border-[#dfe6df]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#234d4d]">
                  1-Click Demo Profiles
                </span>
                <span className="text-[10px] text-[#6e897e] font-semibold">Instant Switch</span>
              </div>

              <div className="space-y-1.5">
                {/* Customer Demo Account */}
                <div className="text-[10px] text-[#6e897e] font-bold px-1">Customer / Buyer Role:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CUSTOMER_USERS.slice(0, 2).map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => handleDemoClick("customer", cust.id, cust.name)}
                      className="p-2 text-left bg-[#f4faea] hover:bg-[#eaf6df] border border-[#234d4d] rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#234d4d] text-[#d7ef73] font-bold text-[9px] flex items-center justify-center shrink-0">
                          {cust.avatarInitials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#10484b] truncate group-hover:text-[#234d4d]">
                            {cust.name}
                          </p>
                          <p className="text-[10px] text-[#6e897e] truncate font-medium">Buyer / Investor</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Agent Demo Account */}
                <div className="text-[10px] text-[#6e897e] font-bold px-1 pt-1">Property Agent Role:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PROPERTY_AGENTS.slice(0, 2).map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => handleDemoClick("agent", agent.id, agent.name)}
                      className="p-2 text-left bg-[#f4faea] hover:bg-[#eaf6df] border border-[#234d4d] rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#234d4d] text-[#d7ef73] font-bold text-[9px] flex items-center justify-center shrink-0">
                          {agent.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#10484b] truncate group-hover:text-[#234d4d]">
                            {agent.name}
                          </p>
                          <p className="text-[10px] text-[#6e897e] truncate font-medium">{agent.role}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Guest note */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={closeAuthModal}
                className="text-xs text-[#567177] hover:text-[#10484b] font-semibold underline underline-offset-2 transition"
              >
                Continue browsing in Guest Mode
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
