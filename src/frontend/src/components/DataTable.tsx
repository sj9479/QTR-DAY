import { ChevronDown, ChevronUp, ChevronsUpDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import type { ColumnMeta, ParsedRow } from "../types";

interface DataTableProps {
  rows: ParsedRow[];
  columns: ColumnMeta[];
  /** If true, show a "Range" column indicating primary vs comparison range */
  showRangeLabel?: boolean;
  primaryLabel?: string;
  compareLabel?: string;
  /** Called when user clicks Export CSV */
  onExportCsv?: () => void;
}

type SortDir = "asc" | "desc" | null;

function displayValue(val: unknown, type: ColumnMeta["type"]): string {
  if (val === null || val === undefined || val === "") return "—";
  if (type === "date" && val instanceof Date) {
    return val.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  }
  if (type === "numeric" && typeof val === "number") {
    return val.toLocaleString();
  }
  return String(val);
}

export function DataTable({
  rows,
  columns,
  showRangeLabel = false,
  primaryLabel = "Range 1",
  compareLabel = "Range 2",
  onExportCsv,
}: DataTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av instanceof Date && bv instanceof Date) {
        return sortDir === "asc"
          ? av.getTime() - bv.getTime()
          : bv.getTime() - av.getTime();
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageRows = sorted.slice(page * pageSize, (page + 1) * pageSize);

  if (rows.length === 0) {
    return (
      <div
        className="card-elevated p-10 text-center text-muted-foreground text-sm font-mono"
        data-ocid="table.empty_state"
      >
        No records match the selected filters.
      </div>
    );
  }

  return (
    <div className="card-elevated overflow-hidden" data-ocid="table.panel">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="text-sm font-display font-semibold text-foreground">
          Data Table
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">
            {rows.length} records · page {page + 1}/{Math.max(totalPages, 1)}
          </span>
          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-border text-muted-foreground hover:text-foreground hover:border-primary hover:bg-primary/5 transition-smooth"
              aria-label="Export data as CSV"
              data-ocid="table.export_csv_button"
            >
              <Download className="w-3 h-3" />
              Export CSV
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {showRangeLabel && (
                <th
                  scope="col"
                  className="px-4 py-2.5 text-center text-muted-foreground font-medium whitespace-nowrap"
                  data-ocid="table.header_range"
                >
                  Range
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-4 py-2.5 text-center text-muted-foreground font-medium whitespace-nowrap cursor-pointer hover:text-foreground transition-colors select-none"
                  data-ocid={`table.header_${col.key.toLowerCase().replace(/\s+/g, "_")}`}
                >
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1 w-full"
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3 text-primary" />
                      ) : (
                        <ChevronDown className="w-3 h-3 text-primary" />
                      )
                    ) : (
                      <ChevronsUpDown className="w-3 h-3 opacity-30" />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, ri) => {
              const rowKey = `${String(row.rawDate)}-${String(row.time)}-${ri}`;
              const rangeTag =
                row.__rangeLabel === "Range 2" ? compareLabel : primaryLabel;
              return (
                <tr
                  key={rowKey}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  data-ocid={`table.row.${ri + 1}`}
                >
                  {showRangeLabel && (
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                          row.__rangeLabel === "Range 2"
                            ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                            : "border-primary/40 text-primary bg-primary/10"
                        }`}
                      >
                        {rangeTag}
                      </span>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2 whitespace-nowrap ${
                        col.type === "numeric"
                          ? "text-center tabular-nums text-foreground"
                          : "text-center text-muted-foreground"
                      }`}
                    >
                      {displayValue(row[col.key], col.type)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-xs font-mono rounded border border-border disabled:opacity-30 hover:border-primary transition-smooth"
            data-ocid="table.pagination_prev"
          >
            ← Prev
          </button>
          <span className="text-xs font-mono text-muted-foreground">
            {page * pageSize + 1}–
            {Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs font-mono rounded border border-border disabled:opacity-30 hover:border-primary transition-smooth"
            data-ocid="table.pagination_next"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
