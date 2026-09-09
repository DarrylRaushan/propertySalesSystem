import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { BarChart3, PieChart as PieIcon, TrendingUp, Download, Copy, Check } from "lucide-react";
import { Button } from "./ui/button";

export interface ChartSpec {
  type: "bar" | "line" | "pie" | "donut" | "area";
  title: string;
  description?: string;
  data: Array<{
    label?: string;
    name?: string;
    value: number;
    formatted?: string;
    percentage?: string | number;
    color?: string;
    [key: string]: any;
  }>;
  xKey?: string;
  yKey?: string;
  color?: string;
  yUnit?: string;
}

const DEFAULT_PALETTE = [
  "#284762", // Deep Navy
  "#a9752e", // Warm Gold
  "#059669", // Emerald
  "#6366f1", // Indigo
  "#ec4899", // Rose
  "#0891b2", // Cyan
  "#f59e0b", // Amber
];

export const AIChartRenderer: React.FC<{ chart: ChartSpec }> = ({ chart }) => {
  const [copied, setCopied] = React.useState(false);
  const xKey = chart.xKey || "label" || "name";
  const yKey = chart.yKey || "value";

  const handleCopyData = () => {
    const text = JSON.stringify(chart.data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTooltipValue = (value: any, name: any, item: any) => {
    if (item?.payload?.formatted) return item.payload.formatted;
    if (chart.yUnit === "M") return `RM ${value}M`;
    if (chart.yUnit === "%" || item?.payload?.percentage) return `${value}%`;
    if (typeof value === "number" && value >= 1000) return value.toLocaleString();
    return value;
  };

  return (
    <div className="ai-chart-widget my-3 overflow-hidden rounded-xl border border-[#e5e9f0] bg-white p-3.5 shadow-sm transition-all hover:border-[#cbd5e1] hover:shadow-md">
      {/* Header */}
      <div className="mb-2.5 flex items-start justify-between gap-2 border-b border-[#f1f4f8] pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-[#f0f4f8] text-[#284762]">
            {chart.type === "pie" || chart.type === "donut" ? (
              <PieIcon className="size-3.5" />
            ) : chart.type === "line" || chart.type === "area" ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <BarChart3 className="size-3.5" />
            )}
          </div>
          <div>
            <h4 className="text-[12px] font-bold text-[#1e293b]">{chart.title}</h4>
            {chart.description && (
              <p className="text-[10px] text-[#64748b]">{chart.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleCopyData}
          title="Copy data"
          className="h-6 w-6 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#334155]"
        >
          {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
        </Button>
      </div>

      {/* Chart Canvas */}
      <div className="h-[210px] w-full pt-1">
        {chart.type === "bar" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                tick={{ fontSize: 10, fill: "#64748b" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(val) => (chart.yUnit === "M" ? `${val}M` : `${val}`)}
              />
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderRadius: "8px",
                  border: "none",
                  color: "#fff",
                  fontSize: "11px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
                labelStyle={{ color: "#94a3b8", fontWeight: 600 }}
              />
              <Bar
                dataKey={yKey}
                fill={chart.color || "#284762"}
                radius={[4, 4, 0, 0]}
                animationDuration={600}
              >
                {chart.data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || chart.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {(chart.type === "line" || chart.type === "area") && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="aiChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chart.color || "#284762"} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={chart.color || "#284762"} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                tick={{ fontSize: 10, fill: "#64748b" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(val) => (chart.yUnit === "M" ? `${val}M` : `${val}`)}
              />
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderRadius: "8px",
                  border: "none",
                  color: "#fff",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke={chart.color || "#284762"}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#aiChartGradient)"
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {(chart.type === "pie" || chart.type === "donut") && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chart.data}
                cx="50%"
                cy="46%"
                innerRadius={chart.type === "donut" ? 38 : 0}
                outerRadius={65}
                paddingAngle={chart.type === "donut" ? 3 : 1}
                dataKey={yKey}
                nameKey={xKey}
                animationDuration={600}
              >
                {chart.data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderRadius: "8px",
                  border: "none",
                  color: "#fff",
                  fontSize: "11px",
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={28}
                iconSize={8}
                formatter={(val) => <span className="text-[10px] text-[#64748b]">{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AIChartRenderer;
