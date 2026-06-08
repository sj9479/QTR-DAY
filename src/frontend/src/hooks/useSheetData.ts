import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { parseCSV } from "../lib/csvParser";
import type { ColumnMeta, ParsedRow } from "../types";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ6Tagvf-iWDfJkpi8x9lMRFfhbcZ1kLz4oQFtXaGdsEwiEPv8gABnbhEAdTmVfMhkJHPj5DekJ2rsG/pub?gid=0&single=true&output=csv";

export function useSheetData() {
  const query = useQuery<{ rows: ParsedRow[]; columns: ColumnMeta[] }>({
    queryKey: ["sheetData"],
    queryFn: async () => {
      const response = await fetch(SHEET_CSV_URL);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch sheet data: ${response.status} ${response.statusText}`,
        );
      }
      const text = await response.text();
      if (!text || text.trim().length === 0) {
        throw new Error("No data returned from Google Sheet");
      }
      return parseCSV(text);
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  const [isDelayed, setIsDelayed] = useState(false);

  useEffect(() => {
    if (query.isLoading) {
      const t = setTimeout(() => setIsDelayed(true), 300);
      return () => clearTimeout(t);
    }
    setIsDelayed(false);
  }, [query.isLoading]);

  return {
    rows: query.data?.rows ?? [],
    columns: query.data?.columns ?? [],
    isLoading: isDelayed && query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    lastUpdated: query.dataUpdatedAt,
  };
}
