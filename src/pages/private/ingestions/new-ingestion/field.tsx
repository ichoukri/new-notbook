import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({
  step,
  label,
  hint,
  done,
  children,
}: {
  /** Position in the form, shown until the step is satisfied. */
  step: number;
  label: string;
  hint?: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
            done
              ? "bg-emerald-500 text-white"
              : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200",
          )}
          aria-hidden
        >
          {done ? <Check className="size-3.5" strokeWidth={3} /> : step}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900">
            {label}
            <span className="sr-only">{done ? " — complete" : ""}</span>
          </h2>
          {hint && <p className="text-xs text-gray-500">{hint}</p>}
        </div>
      </div>
      <div className="pl-9">{children}</div>
    </section>
  );
}
