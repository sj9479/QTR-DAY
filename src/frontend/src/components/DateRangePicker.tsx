import { X } from "lucide-react";
import { useState } from "react";
import { formatDateKey, fromInputDate, toInputDate } from "../lib/dataUtils";
import type { ComparisonMode, DateRange } from "../types";
import { ExcludeDays } from "./ExcludeDays";

interface DateRangePickerProps {
  range: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ range, onChange }: DateRangePickerProps) {
  // Default to 7d preset active on first render
  const [selectedPreset, setSelectedPreset] = useState<number>(7);

  const handleStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = fromInputDate(e.target.value);
    if (d <= range.end) {
      setSelectedPreset(0); // clear preset highlight when manually editing
      onChange({ ...range, start: d });
    }
  };

  const handleEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = fromInputDate(e.target.value);
    if (d >= range.start) {
      setSelectedPreset(0);
      onChange({ ...range, end: d });
    }
  };

  const presets = [
    { label: "7d", days: 7 },
    { label: "14d", days: 14 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
  ];

  const applyPreset = (days: number) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    setSelectedPreset(days);
    onChange({ start, end });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
        <span>FROM</span>
        <input
          type="date"
          className="input-field text-xs font-mono py-1.5 px-2 focus:ring-1 focus:ring-primary focus:outline-none"
          value={toInputDate(range.start)}
          onChange={handleStart}
          max={toInputDate(range.end)}
          data-ocid="daterange.start_input"
        />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
        <span>TO</span>
        <input
          type="date"
          className="input-field text-xs font-mono py-1.5 px-2 focus:ring-1 focus:ring-primary focus:outline-none"
          value={toInputDate(range.end)}
          onChange={handleEnd}
          min={toInputDate(range.start)}
          data-ocid="daterange.end_input"
        />
      </div>
      <div className="flex items-center gap-1">
        {presets.map((p) => {
          const isActive = selectedPreset === p.days;
          return (
            <button
              key={p.days}
              onClick={() => applyPreset(p.days)}
              type="button"
              className={[
                "px-2 py-1 text-xs font-mono rounded border transition-smooth",
                isActive
                  ? "border-primary bg-primary/15 text-primary font-semibold"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary",
              ].join(" ")}
              data-ocid={`daterange.preset_${p.label}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface ComparisonToggleProps {
  mode: ComparisonMode;
  /** The selected reference date for same-day mode */
  sameDayDate: string; // YYYY-MM-DD
  /** Number of weeks to compare in same-day mode */
  numWeeks: number;
  /** Days excluded in date-range tab */
  excludedDaysDateRange: Set<number>;
  /** Days excluded in same-day tab */
  excludedDaysSameDay: Set<number>;
  /** Manually removed dates in date-range tab */
  manuallyRemovedDates: Set<string>;
  /** Manually removed dates in same-day tab (from the N-date list) */
  removedSameDayDates: Set<string>;
  /** All dates in the filtered date range (for the removable chips) */
  dateRangeDates: string[];
  /** The N same-day comparison dates */
  sameDayDates: string[];
  onChange: (mode: ComparisonMode) => void;
  onSameDayDateChange: (date: string) => void;
  onNumWeeksChange: (n: number) => void;
  onExcludedDaysDateRangeChange: (days: Set<number>) => void;
  onExcludedDaysSameDayChange: (days: Set<number>) => void;
  onManuallyRemovedDatesChange: (dates: Set<string>) => void;
  onRemovedSameDayDatesChange: (dates: Set<string>) => void;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ComparisonToggle({
  mode,
  sameDayDate,
  numWeeks,
  excludedDaysDateRange,
  excludedDaysSameDay,
  manuallyRemovedDates,
  removedSameDayDates,
  dateRangeDates,
  sameDayDates,
  onChange,
  onSameDayDateChange,
  onNumWeeksChange,
  onExcludedDaysDateRangeChange,
  onExcludedDaysSameDayChange,
  onManuallyRemovedDatesChange,
  onRemovedSameDayDatesChange,
}: ComparisonToggleProps) {
  function toggleManualRemove(date: string) {
    const next = new Set(manuallyRemovedDates);
    if (next.has(date)) {
      next.delete(date);
    } else {
      next.add(date);
    }
    onManuallyRemovedDatesChange(next);
  }

  function toggleSameDayRemove(date: string) {
    const next = new Set(removedSameDayDates);
    if (next.has(date)) {
      next.delete(date);
    } else {
      next.add(date);
    }
    onRemovedSameDayDatesChange(next);
  }

  // visible date-range dates: exclude days + manually removed
  const visibleDateRangeDates = dateRangeDates.filter((d) => {
    if (manuallyRemovedDates.has(d)) return false;
    const day = new Date(`${d}T00:00:00`).getDay();
    return !excludedDaysDateRange.has(day);
  });

  // visible same-day dates: exclude days + manually removed
  const visibleSameDayDates = sameDayDates.filter((d) => {
    if (removedSameDayDates.has(d)) return false;
    const day = new Date(`${d}T00:00:00`).getDay();
    return !excludedDaysSameDay.has(day);
  });

  return (
    <div className="flex flex-col gap-2 w-full" data-ocid="comparison.section">
      {/* Tab row */}
      <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted/30 self-end">
        <button
          type="button"
          onClick={() => onChange("none")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-smooth ${
            mode === "none"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="comparison.none_toggle"
        >
          Date range
        </button>
        <button
          type="button"
          onClick={() => onChange("same-day")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-smooth ${
            mode === "same-day"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-ocid="comparison.same-day_toggle"
        >
          Prev week same day
        </button>
      </div>

      {/* Date range tab controls */}
      {mode === "none" && (
        <div
          className="flex flex-col gap-2"
          data-ocid="comparison.daterange_controls"
        >
          <ExcludeDays
            excludedDays={excludedDaysDateRange}
            onChange={onExcludedDaysDateRangeChange}
          />
          {visibleDateRangeDates.length > 0 && (
            <div
              className="flex flex-wrap gap-1"
              data-ocid="comparison.daterange_chips"
            >
              {visibleDateRangeDates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded-full border border-border bg-muted/30 text-muted-foreground"
                >
                  {formatDateLabel(d)}
                  <button
                    type="button"
                    onClick={() => toggleManualRemove(d)}
                    className="text-muted-foreground/60 hover:text-destructive transition-smooth ml-0.5"
                    aria-label={`Remove ${d}`}
                    data-ocid={`comparison.remove_date.${d}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {manuallyRemovedDates.size > 0 && (
            <button
              type="button"
              onClick={() => onManuallyRemovedDatesChange(new Set())}
              className="self-start text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 transition-smooth"
              data-ocid="comparison.restore_dates_button"
            >
              Restore all removed dates
            </button>
          )}
        </div>
      )}

      {/* Same-day tab controls */}
      {mode === "same-day" && (
        <div
          className="flex flex-col gap-2"
          data-ocid="comparison.same_day_controls"
        >
          <div className="flex items-center gap-3 flex-wrap">
            {/* Reference date picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                Reference date:
              </span>
              <input
                type="date"
                className="input-field text-xs font-mono py-1.5 px-2 focus:ring-1 focus:ring-primary focus:outline-none"
                value={sameDayDate}
                onChange={(e) => {
                  onSameDayDateChange(e.target.value);
                  onRemovedSameDayDatesChange(new Set());
                }}
                max={formatDateKey(new Date())}
                data-ocid="comparison.same_day_date_input"
              />
            </div>

            {/* Weeks to compare dropdown */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="num-weeks-select"
                className="text-xs font-mono text-muted-foreground whitespace-nowrap"
              >
                Weeks to compare:
              </label>
              <select
                id="num-weeks-select"
                value={numWeeks}
                onChange={(e) => {
                  onNumWeeksChange(Number(e.target.value));
                  onRemovedSameDayDatesChange(new Set());
                }}
                className="input-field text-xs font-mono py-1.5 px-2 focus:ring-1 focus:ring-primary focus:outline-none"
                data-ocid="comparison.num_weeks_select"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "week" : "weeks"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ExcludeDays
            excludedDays={excludedDaysSameDay}
            onChange={onExcludedDaysSameDayChange}
          />

          {/* Selected dates chips */}
          {sameDayDates.length > 0 && (
            <div
              className="flex flex-wrap gap-1"
              data-ocid="comparison.same_day_chips"
            >
              {sameDayDates.map((d) => {
                const removed = removedSameDayDates.has(d);
                const dayExcluded = excludedDaysSameDay.has(
                  new Date(`${d}T00:00:00`).getDay(),
                );
                const hidden = removed || dayExcluded;
                return (
                  <span
                    key={d}
                    className={[
                      "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono rounded-full border transition-smooth",
                      hidden
                        ? "border-border/30 bg-muted/10 text-muted-foreground/40 line-through"
                        : "border-primary/40 bg-primary/10 text-primary",
                    ].join(" ")}
                  >
                    {formatDateLabel(d)}
                    {!dayExcluded && (
                      <button
                        type="button"
                        onClick={() => toggleSameDayRemove(d)}
                        className={[
                          "transition-smooth ml-0.5",
                          removed
                            ? "text-primary/60 hover:text-primary"
                            : "text-primary/60 hover:text-destructive",
                        ].join(" ")}
                        aria-label={removed ? `Restore ${d}` : `Remove ${d}`}
                        data-ocid={`comparison.same_day_chip.${d}`}
                      >
                        {removed ? (
                          <span className="text-[10px] font-semibold">+</span>
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
          {visibleSameDayDates.length === 0 && sameDayDates.length > 0 && (
            <p className="text-xs font-mono text-muted-foreground/60 italic">
              All comparison dates excluded — restore or adjust filters to see
              data.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
