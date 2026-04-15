"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function DatePicker({
  value,
  onChange,
  className,
}: {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full justify-start gap-2 border-border/50 font-normal"
        onClick={() => setOpen(!open)}
      >
        <CalendarDays className="size-4 text-muted-foreground" />
        {value ? format(value, "MMM d, yyyy") : <span className="text-muted-foreground">Pick a date</span>}
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-border/40 bg-background shadow-lg">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(day) => {
              onChange(day ?? undefined);
              setOpen(false);
            }}
            defaultMonth={value}
          />
        </div>
      )}
    </div>
  );
}
