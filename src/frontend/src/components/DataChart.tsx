import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNumber } from "../lib/dataUtils";
import type { ChartDataPoint, ColumnMeta } from "../types";

/** Palette for multiple KPI lines — distinct hues in OKLCH space */
const KPI_COLORS = [
  "oklch(0.75 0.15 190)", // teal
  "oklch(0.75 0.18 55)", // amber
  "oklch(0.72 0.18 310)", // violet
  "oklch(0.75 0.18 145)", // green
  "oklch(0.72 0.20 25)", // red-orange
  "oklch(0.78 0.15 240)", // sky blue
  "oklch(0.75 0.17 95)", // yellow-green
  "oklch(0.70 0.16 0)", // rose
];

interface DataChartProps {
  data: ChartDataPoint[];
  /** Selected KPI columns to render as lines */
  kpis: ColumnMeta[];
  hasComparison: boolean;
  comparisonLabel: string;
}

function formatXTick(val: string): string {
  const d = new Date(`${val}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  strokeDasharray?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated p-3 min-w-[160px] text-xs font-mono">
      <p className="text-muted-foreground mb-2">
        {label ? formatXTick(label) : ""}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4 mb-1">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="text-foreground font-semibold">
            {typeof entry.value === "number" ? formatNumber(entry.value) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DataChart({
  data,
  kpis,
  hasComparison,
  comparisonLabel,
}: DataChartProps) {
  if (data.length === 0 || kpis.length === 0) {
    return (
      <div
        className="card-elevated p-8 flex items-center justify-center text-muted-foreground text-sm font-mono"
        data-ocid="chart.empty_state"
      >
        No data in selected range
      </div>
    );
  }

  return (
    <div className="card-elevated p-5" data-ocid="chart.panel">
      {/* Legend row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-5">
        {kpis.map((kpi, i) => {
          const color = KPI_COLORS[i % KPI_COLORS.length];
          return (
            <span
              key={kpi.key}
              className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground"
            >
              <span
                className="w-5 h-0.5 inline-block rounded"
                style={{ background: color }}
              />
              {kpi.label}
              {hasComparison && comparisonLabel && (
                <>
                  <span
                    className="w-5 h-0.5 inline-block rounded ml-1 opacity-70"
                    style={{
                      background: color,
                      backgroundImage: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 4px, transparent 4px, transparent 7px)`,
                    }}
                  />
                  <span className="text-muted-foreground/60">
                    {kpi.label} ({comparisonLabel})
                  </span>
                </>
              )}
            </span>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 16, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.02 260)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatXTick}
            tick={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fill: "oklch(0.55 0.01 260)",
            }}
            axisLine={{ stroke: "oklch(0.28 0.02 260)" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v: number) => formatNumber(v)}
            tick={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              fill: "oklch(0.55 0.01 260)",
            }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ display: "none" }} />

          {kpis.map((kpi, i) => {
            const color = KPI_COLORS[i % KPI_COLORS.length];
            return (
              <Line
                key={`${kpi.key}_primary`}
                type="monotone"
                dataKey={kpi.key}
                name={kpi.label}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
