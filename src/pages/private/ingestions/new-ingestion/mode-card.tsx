import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IconComponent, IngestionMode } from "./types";

export function ModeCard({
  mode,
  selected,
  onSelect,
  icon: Icon,
  tag,
  title,
  description,
  time,
  disabled = false,
}: {
  mode: IngestionMode;
  selected: boolean;
  onSelect: () => void;
  icon: IconComponent;
  /** Optional qualifier, e.g. "Recommended". Omitted rather than faked. */
  tag?: string;
  title: string;
  description: string;
  time: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      // Roving tabindex: the group takes one tab stop, arrows move within it.
      tabIndex={selected ? 0 : -1}
      data-mode={mode}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative flex w-full flex-col rounded-xl border p-4 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        selected
          ? "border-indigo-500 bg-indigo-50/50"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            selected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500",
          )}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-gray-900">
          {title}
        </span>
        {tag && !selected && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {tag}
          </span>
        )}
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full transition-colors",
            selected
              ? "bg-indigo-600 text-white"
              : "border border-gray-300 bg-white",
          )}
          aria-hidden
        >
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-600">{description}</p>

      <p
        className={cn(
          "mt-3 flex items-center gap-1.5 border-t pt-3 text-[11px] font-medium",
          selected
            ? "border-indigo-100 text-indigo-600"
            : "border-gray-100 text-gray-400",
        )}
      >
        <Clock className="size-3" />
        {time}
      </p>
    </button>
  );
}
