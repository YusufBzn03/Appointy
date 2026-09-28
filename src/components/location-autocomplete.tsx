"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { suggestLocations, exactLocationMatch, type LocationEntry } from "@/lib/geo";

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  onSubmit?: () => void;
};

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  onSubmit,
}: LocationAutocompleteProps) {
  const [displayText, setDisplayText] = React.useState(() => exactLocationMatch(value)?.city ?? value);
  const [open, setOpen] = React.useState(false);

  // Reset the visible text when the shared value is cleared externally (e.g. "reset filters"),
  // without an effect — adjust state during render per React's guidance for derived state.
  const [lastExternalValue, setLastExternalValue] = React.useState(value);
  if (value !== lastExternalValue) {
    setLastExternalValue(value);
    if (value === "") setDisplayText("");
  }

  const suggestions = React.useMemo(() => suggestLocations(displayText), [displayText]);

  function selectLocation(entry: LocationEntry) {
    setDisplayText(entry.city);
    onChange(entry.postalCode);
    setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    const exact = exactLocationMatch(next);
    if (exact) {
      setDisplayText(exact.city);
      onChange(exact.postalCode);
      setOpen(false);
    } else {
      setDisplayText(next);
      onChange(next);
      setOpen(true);
    }
  }

  return (
    <div className="relative flex-1">
      <Input
        value={displayText}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setOpen(false);
            onSubmit?.();
          }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-2 max-h-60 w-max min-w-full overflow-y-auto rounded-xl border border-border bg-popover py-1 text-popover-foreground shadow-md">
          {suggestions.map((s) => (
            <button
              key={s.postalCode}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectLocation(s)}
              className="flex w-full min-w-0 items-center gap-2.5 whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="font-medium tabular-nums">{s.postalCode}</span>
              <span className="min-w-0 truncate text-muted-foreground">{s.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
