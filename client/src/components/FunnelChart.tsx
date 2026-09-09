import React, { useState } from "react";
import { motion } from "framer-motion";

export interface FunnelStage {
  label: string;
  value: number;
  displayValue?: string;
  color?: string;
}

interface FunnelChartProps {
  data: FunnelStage[];
  color?: string;
  layers?: number;
  gap?: number;
  minWidthPercent?: number;
  showPercentage?: boolean;
  showValues?: boolean;
  showLabels?: boolean;
  labelLayout?: "spread" | "grouped";
  hoveredIndex?: number | null;
  onHoverChange?: (index: number | null) => void;
  onStageSelect?: (index: number) => void;
  className?: string;
}

export function FunnelChart({ data, color = "var(--chart-1, #3b82f6)", layers = 3, gap = 6, minWidthPercent = 20, showPercentage = true, showValues = true, showLabels = true, labelLayout = "spread", hoveredIndex, onHoverChange, onStageSelect, className = "" }: FunnelChartProps) {
  const maxValue = data[0]?.value || 1;
  const [internalHoveredIndex, setInternalHoveredIndex] = useState<number | null>(null);
  const activeIndex = hoveredIndex ?? internalHoveredIndex;
  const setHoveredIndex = (index: number | null) => {
    if (hoveredIndex === undefined) setInternalHoveredIndex(index);
    onHoverChange?.(index);
  };

  return (
    <div className={`flex flex-col items-center w-full ${className}`} style={{ gap: `${gap}px` }}>
      {data.map((stage, i) => {
        const widthPercent = (stage.value / maxValue) * 100;
        const isHovered = activeIndex === i;
        const percentage = Math.round((stage.value / maxValue) * 100);
        
        return (
          <div 
            key={stage.label}
            className="relative flex flex-col items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#d7ef73] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbfff9]"
            style={{ width: `${Math.max(widthPercent, minWidthPercent)}%`, height: "48px" }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            onFocus={() => setHoveredIndex(i)}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onStageSelect?.(i); } }}
            onClick={() => onStageSelect?.(i)}
            role="button"
            tabIndex={0}
            aria-pressed={isHovered}
            aria-label={`${stage.label}: ${stage.displayValue || stage.value}, ${percentage}% of enquiries`}
          >
            {/* Layers (Halos) */}
            {Array.from({ length: layers }).map((_, layerIdx) => (
              <motion.div
                key={layerIdx}
                className="pointer-events-none absolute inset-0 rounded-xl"
                initial={{ opacity: 0, scaleX: 0.8, scaleY: 0.8 }}
                animate={{ 
                  opacity: isHovered ? 0.3 - (layerIdx * 0.1) : 0.15 - (layerIdx * 0.05),
                  scaleX: 1 + (layerIdx * 0.08),
                  scaleY: 1 + (layerIdx * 0.15)
                }}
                transition={{ duration: 0.3 }}
                style={{
                  backgroundColor: stage.color || color,
                  zIndex: -layerIdx,
                }}
              />
            ))}
            
            {/* Core Segment */}
            <motion.div
              className={`absolute inset-0 rounded-xl flex overflow-hidden ${labelLayout === "grouped" ? "flex-col items-center justify-center gap-0.5 px-2 text-center" : "items-center justify-between px-4"}`}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 100, damping: 15 }}
              style={{ backgroundColor: stage.color || color }}
            >
              {showLabels && <span className={`${labelLayout === "grouped" ? "max-w-full truncate text-[10px]" : "truncate pr-1 text-[12px]"} font-semibold tracking-wide text-white drop-shadow-sm`}>{stage.label}</span>}
              <span className={`${labelLayout === "grouped" ? "ml-0 gap-1 text-[10px]" : "ml-auto gap-1.5"} flex shrink-0 items-center text-white drop-shadow-sm`}>{showPercentage && <span className="rounded-full bg-white/18 px-1.5 py-0.5 text-[9px] font-extrabold">{percentage}%</span>}{showValues && <span className="text-[11px] font-bold">{stage.displayValue || stage.value}</span>}</span>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
