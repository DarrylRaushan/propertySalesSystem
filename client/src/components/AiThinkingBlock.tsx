import React, { useState } from "react";
import { Brain, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";

interface AiThinkingBlockProps {
  content: string;
}

export function AiThinkingBlock({ content }: AiThinkingBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Clean thought string
  const cleanContent = content.trim();
  if (!cleanContent) return null;

  return (
    <div className="my-2 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-[#f8faff] to-sky-50/50 overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-indigo-50/50 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-indigo-600 text-white shadow-2xs">
            <Brain className="size-3" />
          </div>
          <span className="text-[12px] font-bold text-indigo-950 flex items-center gap-1.5">
            AI Analytical Thinking & DB Cross-Reference
            <span className="inline-block size-1.5 rounded-full bg-indigo-500 animate-pulse" />
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600">
          <span>{isOpen ? "Hide reasoning" : "View thinking process"}</span>
          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 pb-3 pt-1 border-t border-indigo-100/60 bg-white/60 text-[12px] text-[#334155] leading-relaxed font-sans">
          <Streamdown className="prose prose-xs max-w-none text-[#334155] prose-p:my-1 prose-headings:my-1 prose-headings:font-bold prose-headings:text-indigo-950 prose-ul:my-1 prose-li:my-0.5">
            {cleanContent}
          </Streamdown>
        </div>
      )}
    </div>
  );
}
