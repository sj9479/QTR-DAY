import type { ColumnMeta, ParsedRow } from "../types";

const DATE_PATTERNS = [
  /^\d{2}-[A-Za-z]{3}-\d{2,4}$/,
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
];

const TIME_PATTERNS = [/^\d{1,2}\s*(AM|PM)$/i, /^\d{2}:\d{2}(:\d{2})?$/];

function tryParseDate(val: string): Date | null {
  const match = val.match(/^(\d{2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (match) {
    const day = match[1];
    const month = match[2];
    const yr = match[3].length === 2 ? `20${match[3]}` : match[3];
    const d = new Date(`${day} ${month} ${yr}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isDateCol(values: string[]): boolean {
  const sample = values.filter(Boolean).slice(0, 20);
  const matches = sample.filter((v) =>
    DATE_PATTERNS.some((p) => p.test(v.trim())),
  );
  return matches.length >= sample.length * 0.7;
}

function isTimeCol(values: string[]): boolean {
  const sample = values.filter(Boolean).slice(0, 20);
  const matches = sample.filter((v) =>
    TIME_PATTERNS.some((p) => p.test(v.trim())),
  );
  return matches.length >= sample.length * 0.7;
}

function isNumericCol(values: string[]): boolean {
  const sample = values.filter(Boolean).slice(0, 20);
  if (sample.length === 0) return false;
  const matches = sample.filter((v) => {
    const n = Number.parseFloat(v.replace(/,/g, "").trim());
    return !Number.isNaN(n);
  });
  return matches.length >= sample.length * 0.8;
}

export function parseCSV(raw: string): {
  rows: ParsedRow[];
  columns: ColumnMeta[];
} {
  const lines = raw.trim().split("\n");
  if (lines.length < 2) return { rows: [], columns: [] };

  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const dataLines = lines.slice(1);

  const colValues: string[][] = header.map(() => []);
  for (const line of dataLines) {
    const cells = parseCSVLine(line);
    for (let i = 0; i < header.length; i++) {
      colValues[i].push(cells[i] ?? "");
    }
  }

  const columns: ColumnMeta[] = header.map((key, i) => {
    let type: ColumnMeta["type"] = "string";
    if (isDateCol(colValues[i])) type = "date";
    else if (isTimeCol(colValues[i])) type = "time";
    else if (isNumericCol(colValues[i])) type = "numeric";
    const label = (() => {
      const k = key.toLowerCase().trim();
      if (k === "unique user") return "BL DAU";
      if (k === "email") return "Email Txn";
      if (k === "mob") return "Msite Txn";
      if (k === "my") return "Desktop Txn";
      if (k === "app") return "App Txn";
      if (k === "bl notification") return "Notif Txn";
      return key;
    })();
    return { key, label, type };
  });

  const dateCol = columns.find((c) => c.type === "date");

  const rows: ParsedRow[] = dataLines.map((line) => {
    const cells = parseCSVLine(line);
    const row: ParsedRow = { rawDate: "", date: null, time: "" };
    for (let i = 0; i < header.length; i++) {
      const key = header[i];
      const val = cells[i]?.trim() ?? "";
      const col = columns[i];
      if (col.type === "date") {
        row.rawDate = val;
        row.date = tryParseDate(val);
        row[key] = row.date;
      } else if (col.type === "time") {
        row.time = val;
        row[key] = val;
      } else if (col.type === "numeric") {
        const n = Number.parseFloat(val.replace(/,/g, ""));
        row[key] = Number.isNaN(n) ? null : n;
      } else {
        row[key] = val;
      }
    }
    if (dateCol && !row.date) {
      row.date = tryParseDate(String(row[dateCol.key] ?? ""));
    }
    return row;
  });

  return { rows, columns };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
