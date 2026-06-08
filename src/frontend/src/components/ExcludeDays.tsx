const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface ExcludeDaysProps {
  excludedDays: Set<number>;
  onChange: (excluded: Set<number>) => void;
}

/**
 * 7 toggle buttons (Sun–Sat). Selected/highlighted = EXCLUDED days.
 * Default: none selected = no days excluded.
 */
export function ExcludeDays({ excludedDays, onChange }: ExcludeDaysProps) {
  function toggleDay(dayIndex: number) {
    const next = new Set(excludedDays);
    if (next.has(dayIndex)) {
      next.delete(dayIndex);
    } else {
      next.add(dayIndex);
    }
    onChange(next);
  }

  return (
    <div
      className="flex items-center gap-1.5 flex-wrap"
      data-ocid="exclude_days.section"
    >
      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
        Exclude days:
      </span>
      <div className="flex items-center gap-1" data-ocid="exclude_days.toggles">
        {DAY_LABELS.map((label, i) => {
          const isExcluded = excludedDays.has(i);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggleDay(i)}
              aria-pressed={isExcluded}
              className={[
                "px-2 py-1 text-xs font-mono rounded border transition-smooth select-none",
                isExcluded
                  ? "border-destructive/60 bg-destructive/15 text-destructive font-semibold"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
              ].join(" ")}
              data-ocid={`exclude_days.toggle.${label.toLowerCase()}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {excludedDays.size > 0 && (
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className="text-xs font-mono text-muted-foreground hover:text-foreground underline underline-offset-2 transition-smooth"
          data-ocid="exclude_days.clear_button"
        >
          Clear
        </button>
      )}
    </div>
  );
}
