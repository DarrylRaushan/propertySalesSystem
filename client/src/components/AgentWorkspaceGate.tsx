import React from "react";
import { useLocation } from "wouter";
import { Lock, Briefcase, ArrowRight, Home, Sparkles, ShieldCheck } from "lucide-react";
import { useAuth, PROPERTY_AGENTS } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";

export default function AgentWorkspaceGate({
  featureName = "Agent Workspace",
}: {
  featureName?: string;
}) {
  const [, setLocation] = useLocation();
  const { openAuthModal, quickLogin } = useAuth();

  return (
    <div className="min-h-screen bg-[#153941] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#fbfff9] rounded-3xl p-8 shadow-2xl text-center space-y-6 border-[1.5px] border-[#234d4d] text-[#10484b]">
        <div className="w-16 h-16 rounded-2xl bg-[#234d4d] text-[#d7ef73] flex items-center justify-center mx-auto shadow-md border border-[#234d4d]">
          <Lock size={28} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d7ef73] text-[#153941] text-xs font-extrabold border border-[#234d4d] uppercase tracking-widest">
            <Briefcase size={12} />
            Agent Workspace Gated
          </div>
          <h1 className="text-2xl font-normal tracking-tight text-[#10484b]" style={{ fontFamily: '"Fraunces", Georgia, serif' }}>
            {featureName} Requires Agent Access
          </h1>
          <p className="text-xs text-[#567177] leading-relaxed max-w-sm mx-auto font-medium">
            This module (Leads CRM, Deal Pipeline & Sales Intelligence) is reserved for authenticated Property Agents.
          </p>
        </div>

        <div className="p-4 bg-[#f4faea] rounded-2xl border border-[#dfe6df] text-left space-y-2.5">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#234d4d]">
            Quick 1-Click Agent Demo Access:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_AGENTS.slice(0, 2).map((ag) => (
              <button
                key={ag.id}
                onClick={() => quickLogin("agent", ag.id)}
                className="p-2.5 bg-[#fbfff9] hover:bg-[#eaf6df] border border-[#234d4d] rounded-xl text-left transition group shadow-sm"
              >
                <p className="text-xs font-bold text-[#10484b] group-hover:text-[#234d4d]">
                  {ag.name}
                </p>
                <p className="text-[10px] text-[#6e897e] truncate font-medium">{ag.role}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => openAuthModal("Sign in with your Property Agent credentials to continue.")}
            className="w-full py-3 bg-[#234d4d] hover:bg-[#10484b] text-[#d7ef73] rounded-xl text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 border border-[#234d4d]"
          >
            <span>Sign In with Agent Email & Password</span>
            <ArrowRight size={14} />
          </button>

          <button
            onClick={() => setLocation("/")}
            className="w-full py-2.5 bg-[#f3f5ef] hover:bg-[#eaf6df] text-[#10484b] rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-[#dfe6df]"
          >
            <Home size={14} />
            <span>Return to Customer Marketplace</span>
          </button>
        </div>
      </div>
      <AuthModal />
    </div>
  );
}
