export interface SheetRow {
  [key: string]: string | number | Date | null;
}

export interface ParsedRow {
  rawDate: string;
  date: Date | null;
  time: string;
  [key: string]: string | number | Date | null;
}

export interface ColumnMeta {
  key: string;
  label: string;
  type: "date" | "time" | "numeric" | "string";
}

/** none = date range view (no week-over-week comparison)
 *  same-day = previous 4 weeks same day-of-week comparison
 */
export type ComparisonMode = "none" | "same-day";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ChartDataPoint {
  date: string;
  dateObj: Date;
  /** range label for comparison rows */
  rangeLabel?: string;
  [key: string]: string | number | Date | undefined;
}

export interface MetricSummary {
  column: string;
  label: string;
  sum: number;
  avg: number;
  count: number;
  last: number | null;
}
