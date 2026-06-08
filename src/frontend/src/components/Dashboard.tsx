import {
  AlertCircle,
  BarChart2,
  Clock,
  Database,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSheetData } from "../hooks/useSheetData";
import {
  buildMultiKpiChartData,
  exportRowsAsCsv,
  filterByDateRange,
  formatDateKey,
  getDefaultRange,
  toInputDate,
} from "../lib/dataUtils";
import type { ComparisonMode, DateRange, ParsedRow } from "../types";
import { ComparisonToggle } from "./ComparisonToggle";
import { DataChart } from "./DataChart";
import { DataTable } from "./DataTable";
import { DateRangePicker } from "./DateRangePicker";

function getTodayStr(): string {
  return formatDateKey(new Date());
}

// KPI columns to exclude (matched case-insensitively, both space and underscore variants)
const EXCLUDED_KPI_KEYS_LOWER = new Set([
  "eto",
  "ht-we",
  "ht-web",
  "ht-mail",
  "tender txn",
  "tender tranx",
  "credits",
  "wtd",
  "mtd",
  "lwtd",
  "lmtd",
  "bl notif dau",
  "insta ast",
  "regular ast",
  "regular ast_foreign",
  "regular ast foreign", // space variant as it may appear in CSV header
]);

function isExcludedKpi(key: string): boolean {
  // Normalise: lowercase, trim, then check both the raw form and an underscore→space variant
  const normalised = key.toLowerCase().trim();
  if (EXCLUDED_KPI_KEYS_LOWER.has(normalised)) return true;
  // Also match when the CSV header uses underscores where the set uses spaces (or vice-versa)
  const spaceVariant = normalised.replace(/_/g, " ");
  const underscoreVariant = normalised.replace(/ /g, "_");
  return (
    EXCLUDED_KPI_KEYS_LOWER.has(spaceVariant) ||
    EXCLUDED_KPI_KEYS_LOWER.has(underscoreVariant)
  );
}

// Color palette — cycles through these for each visible KPI
const KPI_COLORS_PALETTE = [
  "oklch(0.75 0.15 190)",
  "oklch(0.65 0.22 40)",
  "oklch(0.6 0.12 185)",
  "oklch(0.7 0.18 130)",
  "oklch(0.72 0.2 310)",
  "oklch(0.68 0.17 60)",
  "oklch(0.62 0.22 270)",
  "oklch(0.74 0.16 20)",
];

/** Get N comparison dates: selected date + (numWeeks-1) previous same weekdays */
function getSameDayDates(dateStr: string, numWeeks: number): string[] {
  if (!dateStr) return [];
  const base = new Date(`${dateStr}T00:00:00`);
  const dates: string[] = [];
  for (let i = 0; i < numWeeks; i++) {
    const d = new Date(base.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    dates.push(formatDateKey(d));
  }
  return dates;
}

export function Dashboard() {
  const {
    rows,
    columns,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    lastUpdated,
  } = useSheetData();

  const [range, setRange] = useState<DateRange>(getDefaultRange);
  const [comparison, setComparison] = useState<ComparisonMode>("none");

  // Same-day: single reference date
  const [sameDayDate, setSameDayDate] = useState<string>(getTodayStr);

  // Number of weeks to compare in same-day mode (1–8, default 4)
  const [numWeeks, setNumWeeks] = useState<number>(4);

  // Excluded days (0=Sun … 6=Sat) per tab
  const [excludedDaysDateRange, setExcludedDaysDateRange] = useState<
    Set<number>
  >(() => new Set());
  const [excludedDaysSameDay, setExcludedDaysSameDay] = useState<Set<number>>(
    () => new Set(),
  );

  // Manually removed dates per tab
  const [manuallyRemovedDates, setManuallyRemovedDates] = useState<Set<string>>(
    () => new Set(),
  );
  const [removedSameDayDates, setRemovedSameDayDates] = useState<Set<string>>(
    () => new Set(),
  );

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  // selectedKpis starts as empty Set — no pre-selection
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(
    () => new Set(),
  );

  // Filter to allowed numeric columns, sorted so BL DAU first, BL Approved second
  const numericCols = useMemo(() => {
    const cols = columns.filter(
      (c) => c.type === "numeric" && !isExcludedKpi(c.key),
    );
    const PRIORITY: Record<string, number> = { "BL DAU": 0, "BL Approved": 1 };
    return cols.slice().sort((a, b) => {
      const pa = PRIORITY[a.label] ?? 999;
      const pb = PRIORITY[b.label] ?? 999;
      return pa !== pb ? pa - pb : 0;
    });
  }, [columns]);

  // Unique sorted time values — exclude "00:00" and empty
  const timeOptions = useMemo(() => {
    const times = new Set<string>();
    for (const row of rows) {
      const t = typeof row.time === "string" ? row.time.trim() : "";
      if (t && t !== "00:00") times.add(t);
    }
    return Array.from(times).sort();
  }, [rows]);

  const effectiveTime = useMemo(() => {
    if (selectedTime !== null) return selectedTime;
    return timeOptions[0] ?? null;
  }, [selectedTime, timeOptions]);

  // Columns shown in table: non-numeric always + selected KPI columns only.
  // STRICT: when selectedKpis is empty, NO numeric columns are included.
  const tableColumns = useMemo(() => {
    if (selectedKpis.size === 0) {
      // Only non-numeric, non-excluded columns (date, time, string metadata)
      return columns.filter(
        (c) => c.type !== "numeric" && !isExcludedKpi(c.key),
      );
    }
    return columns.filter(
      (c) =>
        (c.type !== "numeric" && !isExcludedKpi(c.key)) ||
        (c.type === "numeric" &&
          !isExcludedKpi(c.key) &&
          selectedKpis.has(c.key)),
    );
  }, [columns, selectedKpis]);

  // Primary date range filtered rows (before day/date exclusion)
  const filteredByDate = useMemo(
    () => filterByDateRange(rows, range),
    [rows, range],
  );

  const filteredByTime = useMemo(() => {
    if (!effectiveTime) return filteredByDate;
    return filteredByDate.filter(
      (r) => typeof r.time === "string" && r.time.trim() === effectiveTime,
    );
  }, [filteredByDate, effectiveTime]);

  // ── Date range tab: all dates in range ───────────────────────────────────
  const allDateRangeDates = useMemo(() => {
    const datesSet = new Set<string>();
    for (const row of filteredByTime) {
      if (row.date) datesSet.add(formatDateKey(row.date as Date));
    }
    return Array.from(datesSet).sort();
  }, [filteredByTime]);

  // Apply excluded weekdays + manually removed dates to date-range tab rows
  const filteredRows = useMemo((): ParsedRow[] => {
    return filteredByTime.filter((r) => {
      if (!r.date) return true;
      const dateStr = formatDateKey(r.date as Date);
      if (manuallyRemovedDates.has(dateStr)) return false;
      if (excludedDaysDateRange.size > 0) {
        const dayOfWeek = (r.date as Date).getDay();
        if (excludedDaysDateRange.has(dayOfWeek)) return false;
      }
      return true;
    });
  }, [filteredByTime, excludedDaysDateRange, manuallyRemovedDates]);

  // ── Same-day comparison ───────────────────────────────────────────────────
  // Target dates based on numWeeks
  const sameDayTargetDates = useMemo(
    () => getSameDayDates(sameDayDate, numWeeks),
    [sameDayDate, numWeeks],
  );

  // Rows for same-day mode
  const sameDayRows = useMemo((): ParsedRow[] => {
    const targetSet = new Set(
      sameDayTargetDates.filter((d) => {
        if (removedSameDayDates.has(d)) return false;
        const day = new Date(`${d}T00:00:00`).getDay();
        if (excludedDaysSameDay.has(day)) return false;
        return true;
      }),
    );
    if (targetSet.size === 0) return [];
    return rows.filter((r) => {
      if (!r.date) return false;
      const dateStr = formatDateKey(r.date as Date);
      if (!targetSet.has(dateStr)) return false;
      if (
        effectiveTime &&
        (typeof r.time !== "string" || r.time.trim() !== effectiveTime)
      )
        return false;
      return true;
    });
  }, [
    rows,
    sameDayTargetDates,
    removedSameDayDates,
    excludedDaysSameDay,
    effectiveTime,
  ]);

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartKpis = useMemo(
    () => numericCols.filter((c) => selectedKpis.has(c.key)),
    [numericCols, selectedKpis],
  );

  const chartData = useMemo(() => {
    if (chartKpis.length === 0) return [];
    const kpiKeys = chartKpis.map((c) => c.key);
    if (comparison === "same-day") {
      return buildMultiKpiChartData(sameDayRows, kpiKeys, undefined, undefined);
    }
    return buildMultiKpiChartData(filteredRows, kpiKeys, undefined, undefined);
  }, [filteredRows, sameDayRows, chartKpis, comparison]);

  // ── Table rows ────────────────────────────────────────────────────────────
  const tableRows = useMemo((): ParsedRow[] => {
    if (comparison === "same-day") {
      return sameDayRows;
    }
    return filteredRows;
  }, [comparison, filteredRows, sameDayRows]);

  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  function toggleKpi(key: string) {
    setSelectedKpis((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleExportCsv() {
    exportRowsAsCsv(rows, columns, "sheet-dashboard-raw-export.csv");
  }

  if (isError) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        data-ocid="dashboard.error_state"
      >
        <div className="card-elevated p-8 max-w-md w-full text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h2 className="text-lg font-display font-semibold mb-2">
            Failed to load data
          </h2>
          <p className="text-sm text-muted-foreground mb-4 font-mono">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="btn-primary text-sm"
            data-ocid="dashboard.retry_button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-ocid="dashboard.page">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/15 border border-primary/30">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-foreground leading-none">
                Analytics Dashboard
              </h1>
              {lastUpdatedStr && (
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  Last updated {lastUpdatedStr}
                  {isFetching && (
                    <span className="ml-2 text-primary animate-pulse">
                      ● refreshing
                    </span>
                  )}
                </p>
              )}
              {isLoading && (
                <p className="text-xs text-primary font-mono mt-0.5 animate-pulse">
                  Loading data...
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Date range controls — greyed out when same-day tab is active */}
            <div
              className={
                comparison === "same-day"
                  ? "opacity-40 pointer-events-none cursor-not-allowed"
                  : ""
              }
              aria-hidden={comparison === "same-day"}
            >
              <DateRangePicker range={range} onChange={setRange} />
            </div>

            {/* Time dropdown — always interactive, never greyed */}
            {timeOptions.length > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-primary bg-primary/10 shadow-sm"
                title="Select the time slot to filter data"
              >
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <label
                  htmlFor="time-select"
                  className="text-xs font-display font-bold text-primary whitespace-nowrap uppercase tracking-wide"
                >
                  Time
                </label>
                <select
                  id="time-select"
                  value={effectiveTime ?? ""}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="h-7 px-2 text-xs font-mono font-semibold rounded border-0 bg-transparent text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  data-ocid="dashboard.time_select"
                >
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                void refetch();
              }}
              className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-smooth"
              aria-label="Refresh data"
              data-ocid="dashboard.refresh_button"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Comparison controls row */}
        <div className="max-w-screen-xl mx-auto px-4 pb-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span>{tableRows.length} records in view</span>
          </div>
          <ComparisonToggle
            mode={comparison}
            sameDayDate={sameDayDate}
            numWeeks={numWeeks}
            excludedDaysDateRange={excludedDaysDateRange}
            excludedDaysSameDay={excludedDaysSameDay}
            manuallyRemovedDates={manuallyRemovedDates}
            removedSameDayDates={removedSameDayDates}
            dateRangeDates={allDateRangeDates}
            sameDayDates={sameDayTargetDates}
            onChange={setComparison}
            onSameDayDateChange={(d) => {
              setSameDayDate(d);
              setRemovedSameDayDates(new Set());
            }}
            onNumWeeksChange={setNumWeeks}
            onExcludedDaysDateRangeChange={setExcludedDaysDateRange}
            onExcludedDaysSameDayChange={setExcludedDaysSameDay}
            onManuallyRemovedDatesChange={setManuallyRemovedDates}
            onRemovedSameDayDatesChange={setRemovedSameDayDates}
          />
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">
        {/* Loading skeleton */}
        {isLoading && (
          <div data-ocid="dashboard.loading_state" className="space-y-4">
            <div className="card-elevated p-4">
              <div className="h-4 w-32 bg-muted/40 rounded animate-pulse mb-3" />
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-7 w-28 bg-muted/40 rounded-full animate-pulse"
                  />
                ))}
              </div>
            </div>
            <div className="card-elevated h-64 animate-pulse bg-muted/30" />
            <div className="card-elevated h-80 animate-pulse bg-muted/30" />
          </div>
        )}

        {!isLoading && (
          <>
            {/* ── KPI Selector ─────────────────────────────────────────────── */}
            <section
              className="card-elevated overflow-hidden"
              data-ocid="kpi_selector.section"
              aria-label="Select KPIs to display"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-display font-semibold text-foreground">
                    Select KPIs to Display
                  </span>
                  {numericCols.length > 0 && (
                    <span className="text-xs font-mono text-muted-foreground">
                      ({selectedKpis.size}/{numericCols.length} selected)
                    </span>
                  )}
                </div>
              </div>

              <div className="px-4 py-3" data-ocid="kpi_selector.list">
                {numericCols.length === 0 ? (
                  <p
                    className="text-sm text-muted-foreground font-mono"
                    data-ocid="kpi_selector.empty_state"
                  >
                    No KPI columns detected in the data.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {numericCols.map((col, i) => {
                      const checked = selectedKpis.has(col.key);
                      const color =
                        KPI_COLORS_PALETTE[i % KPI_COLORS_PALETTE.length];
                      return (
                        <label
                          key={col.key}
                          className={[
                            "flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono cursor-pointer transition-smooth select-none",
                            checked
                              ? "border-primary/60 bg-primary/10 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/30",
                          ].join(" ")}
                          data-ocid={`kpi_selector.item.${i + 1}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleKpi(col.key)}
                            className="sr-only"
                            data-ocid={`kpi_selector.checkbox.${i + 1}`}
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                          />
                          <span
                            className={[
                              "w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-smooth",
                              checked
                                ? "border-primary bg-primary"
                                : "border-border bg-background",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            {checked && (
                              <svg
                                viewBox="0 0 8 8"
                                className="w-2.5 h-2.5"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M1.5 4L3 5.5 6.5 2"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  style={{ color: "oklch(0.145 0.014 260)" }}
                                />
                              </svg>
                            )}
                          </span>
                          <span className={checked ? "text-foreground" : ""}>
                            {col.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* ── Data Table ───────────────────────────────────────────────── */}
            <section data-ocid="table.section">
              <DataTable
                rows={tableRows}
                columns={tableColumns}
                showRangeLabel={false}
                primaryLabel={`${toInputDate(range.start)} – ${toInputDate(range.end)}`}
                compareLabel=""
                onExportCsv={handleExportCsv}
              />
            </section>

            {/* ── Chart ────────────────────────────────────────────────────── */}
            {chartKpis.length > 0 && (
              <section data-ocid="chart.section">
                <DataChart
                  data={chartData}
                  kpis={chartKpis}
                  hasComparison={false}
                  comparisonLabel=""
                />
              </section>
            )}

            {chartKpis.length === 0 && (
              <div
                className="card-elevated p-10 flex flex-col items-center justify-center gap-3 text-center"
                data-ocid="chart.empty_state"
              >
                <BarChart2 className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-mono">
                  Select at least one KPI above to display the chart
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-border bg-card mt-8">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs font-mono text-muted-foreground">
            Google Sheets · Auto-refreshes every 5 min
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
