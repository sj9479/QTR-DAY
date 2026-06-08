import type {
  ChartDataPoint,
  ColumnMeta,
  DateRange,
  MetricSummary,
  ParsedRow,
} from "../types";

export function filterByDateRange(
  rows: ParsedRow[],
  range: DateRange,
): ParsedRow[] {
  return rows.filter((row) => {
    if (!row.date) return false;
    const d = row.date as Date;
    return d >= range.start && d <= range.end;
  });
}

export function shiftDateRange(range: DateRange, weeksBack: number): DateRange {
  const ms = weeksBack * 7 * 24 * 60 * 60 * 1000;
  return {
    start: new Date(range.start.getTime() - ms),
    end: new Date(range.end.getTime() - ms),
  };
}

/**
 * Filter rows to only those whose day-of-week matches the reference date's day-of-week.
 * Used for "Previous Week Same Days" comparison mode.
 */
export function filterBySameDayOfWeek(
  rows: ParsedRow[],
  referenceDayOfWeek: number,
): ParsedRow[] {
  return rows.filter((row) => {
    if (!row.date) return false;
    const d = row.date as Date;
    return d.getDay() === referenceDayOfWeek;
  });
}

/**
 * Build chart data supporting multiple KPI lines simultaneously.
 * Returns one data point per unique date in `rows`.
 * For each kpiKey, the value is taken from the row matching `time` at that date.
 * compareRows is keyed as `${kpiKey}_compare`.
 * compareDateRows (for date-range mode) are appended with a `_range2` suffix.
 */
export function buildMultiKpiChartData(
  rows: ParsedRow[],
  kpiKeys: string[],
  compareRows?: ParsedRow[],
  compareRangeRows?: ParsedRow[],
): ChartDataPoint[] {
  if (kpiKeys.length === 0) return [];

  // Build primary map: date → { kpiKey → value }
  const map = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (!row.date) continue;
    const key = formatDateKey(row.date as Date);
    if (!map.has(key)) map.set(key, {});
    const entry = map.get(key)!;
    for (const k of kpiKeys) {
      const val = row[k];
      if (typeof val === "number") {
        entry[k] = val;
      }
    }
  }

  // Build comparison map (same-day / shifted-week): date aligned to primary
  const compareMap = new Map<string, Record<string, number>>();
  if (compareRows) {
    for (const row of compareRows) {
      if (!row.date) continue;
      // shift date forward 7 days so it aligns with the primary date key
      const shifted = new Date(
        (row.date as Date).getTime() + 7 * 24 * 60 * 60 * 1000,
      );
      const key = formatDateKey(shifted);
      if (!compareMap.has(key)) compareMap.set(key, {});
      const entry = compareMap.get(key)!;
      for (const k of kpiKeys) {
        const val = row[k];
        if (typeof val === "number") {
          entry[k] = val;
        }
      }
    }
  }

  // Build compare range map (date-range mode): use real date as key with prefix `r2_`
  const range2Map = new Map<string, Record<string, number>>();
  if (compareRangeRows) {
    for (const row of compareRangeRows) {
      if (!row.date) continue;
      const key = `r2_${formatDateKey(row.date as Date)}`;
      if (!range2Map.has(key)) range2Map.set(key, {});
      const entry = range2Map.get(key)!;
      for (const k of kpiKeys) {
        const val = row[k];
        if (typeof val === "number") {
          entry[k] = val;
        }
      }
    }
  }

  const result: ChartDataPoint[] = [];

  // Primary date points
  const sortedKeys = [...map.keys()].sort();
  for (const key of sortedKeys) {
    const entry = map.get(key)!;
    const point: ChartDataPoint = { date: key, dateObj: new Date(key) };
    for (const k of kpiKeys) {
      if (entry[k] !== undefined) point[k] = entry[k];
    }
    // Add same-day compare values keyed as `${k}_compare`
    if (compareRows) {
      const cEntry = compareMap.get(key);
      if (cEntry) {
        for (const k of kpiKeys) {
          if (cEntry[k] !== undefined) point[`${k}_compare`] = cEntry[k];
        }
      }
    }
    result.push(point);
  }

  // Date-range comparison points — add separately with rangeLabel="Range 2"
  if (compareRangeRows) {
    const range2Keys = [...range2Map.keys()].sort();
    for (const prefixedKey of range2Keys) {
      const realKey = prefixedKey.replace("r2_", "");
      const entry = range2Map.get(prefixedKey)!;
      const point: ChartDataPoint = {
        date: realKey,
        dateObj: new Date(realKey),
        rangeLabel: "Range 2",
      };
      for (const k of kpiKeys) {
        if (entry[k] !== undefined) point[`${k}_range2`] = entry[k];
      }
      result.push(point);
    }
    // Sort all merged points by date
    result.sort((a, b) => a.date.localeCompare(b.date));
  }

  return result;
}

/** Legacy single-metric chart builder kept for backward compat */
export function buildChartData(
  rows: ParsedRow[],
  _dateKey: string,
  metricKey: string,
  compareRows?: ParsedRow[],
): ChartDataPoint[] {
  return buildMultiKpiChartData(rows, [metricKey], compareRows);
}

export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeMetrics(
  rows: ParsedRow[],
  columns: ColumnMeta[],
): MetricSummary[] {
  const numericCols = columns.filter((c) => c.type === "numeric");
  const target = rows;

  return numericCols.slice(0, 6).map((col) => {
    const values = target
      .map((r) => r[col.key])
      .filter((v): v is number => typeof v === "number");
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? sum / values.length : 0;
    const last = values[values.length - 1] ?? null;
    return {
      column: col.key,
      label: col.label,
      sum,
      avg,
      count: values.length,
      last,
    };
  });
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function toInputDate(d: Date): string {
  return formatDateKey(d);
}

export function fromInputDate(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

/**
 * Returns the default date range: past 7 days (today - 6 days → today).
 */
export function getDefaultRange(): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Build a CSV string from the given rows/columns and trigger a browser download.
 * All rows are included (full dataset, not just the current page).
 */
export function exportRowsAsCsv(
  rows: ParsedRow[],
  columns: ColumnMeta[],
  filename = "export.csv",
): void {
  function escapeCsvCell(val: unknown, type: ColumnMeta["type"]): string {
    if (val === null || val === undefined || val === "") return "";
    let str: string;
    if (type === "date" && val instanceof Date) {
      str = formatDateKey(val);
    } else if (type === "numeric" && typeof val === "number") {
      str = String(val);
    } else {
      str = String(val);
    }
    // Wrap in quotes if contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const headerRow = columns.map((c) => c.label).join(",");
  const dataRows = rows.map((row) =>
    columns.map((col) => escapeCsvCell(row[col.key], col.type)).join(","),
  );

  const csv = [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
