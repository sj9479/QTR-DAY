import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { formatNumber } from "../lib/dataUtils";
import type { MetricSummary } from "../types";

interface MetricCardProps {
  metric: MetricSummary;
  compareValue?: number | null;
  index: number;
}

const ACCENT_CLASSES = [
  "text-primary border-primary/30",
  "text-[oklch(0.75_0.18_145)] border-[oklch(0.75_0.18_145)]/30",
  "text-[oklch(0.75_0.18_55)] border-[oklch(0.75_0.18_55)]/30",
  "text-[oklch(0.7_0.18_280)] border-[oklch(0.7_0.18_280)]/30",
];

export function MetricCard({ metric, compareValue, index }: MetricCardProps) {
  const accentClass = ACCENT_CLASSES[index % ACCENT_CLASSES.length];
  const mainValue = metric.last ?? metric.sum;
  const pct =
    compareValue != null && compareValue !== 0
      ? ((mainValue - compareValue) / Math.abs(compareValue)) * 100
      : null;

  return (
    <div
      className={`card-elevated p-5 flex flex-col gap-3 border-t-2 ${accentClass}`}
      data-ocid={`metric.card.${index + 1}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground truncate">
          {metric.label}
        </p>
        {pct !== null && (
          <span
            className={`flex items-center gap-0.5 text-xs font-mono font-semibold shrink-0 ${
              pct > 0
                ? "text-emerald-400"
                : pct < 0
                  ? "text-rose-400"
                  : "text-muted-foreground"
            }`}
          >
            {pct > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : pct < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(pct).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p
          className={`text-2xl font-display font-bold tabular-nums ${accentClass.split(" ")[0]}`}
        >
          {formatNumber(mainValue)}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Avg {formatNumber(metric.avg)} · {metric.count} entries
        </p>
      </div>
      {compareValue != null && (
        <p className="text-xs text-muted-foreground font-mono border-t border-border pt-2">
          Prior: {formatNumber(compareValue)}
        </p>
      )}
    </div>
  );
}
