import { cn } from "@/lib/utils";
import type { IconComponent } from "./types";

export function ModeCard({
  selected,
  onSelect,
  accent,
  icon: Icon,
  badge,
  title,
  description,
  time,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  accent: "indigo" | "violet";
  icon: IconComponent;
  badge: string;
  title: string;
  description: string;
  time: string;
  disabled?: boolean;
}) {
  const colors = {
    indigo: {
      border: selected
        ? "border-indigo-300"
        : "border-gray-200 hover:border-indigo-200",
      bg: selected ? "bg-indigo-50/70" : "bg-white hover:bg-indigo-50/30",
      ring: selected ? "ring-1 ring-indigo-200" : "",
      iconBg: selected ? "bg-indigo-100" : "bg-gray-100",
      iconColor: selected ? "text-indigo-600" : "text-gray-400",
      badge: selected
        ? "bg-indigo-100 text-indigo-700"
        : "bg-gray-100 text-gray-400",
      time: selected ? "text-indigo-500" : "text-gray-400",
    },
    violet: {
      border: selected
        ? "border-violet-300"
        : "border-gray-200 hover:border-violet-200",
      bg: selected ? "bg-violet-50/70" : "bg-white hover:bg-violet-50/30",
      ring: selected ? "ring-1 ring-violet-200" : "",
      iconBg: selected ? "bg-violet-100" : "bg-gray-100",
      iconColor: selected ? "text-violet-600" : "text-gray-400",
      badge: selected
        ? "bg-violet-100 text-violet-700"
        : "bg-gray-100 text-gray-400",
      time: selected ? "text-violet-500" : "text-gray-400",
    },
  }[accent];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all w-full",
        colors.border,
        colors.bg,
        colors.ring,
        disabled && "opacity-70",
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
            colors.iconBg,
          )}
        >
          <Icon className={cn("size-4.5 transition-colors", colors.iconColor)} />
        </div>
        <span
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide transition-colors",
            colors.badge,
          )}
        >
          {badge}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center gap-1.5 mt-auto pt-1 w-full">
        <div
          className={cn(
            "w-1 h-1 rounded-full flex-shrink-0 transition-colors",
            selected
              ? accent === "indigo"
                ? "bg-indigo-400"
                : "bg-violet-400"
              : "bg-gray-300",
          )}
        />
        <span
          className={cn("text-[11px] font-medium transition-colors", colors.time)}
        >
          Avg. time: {time}
        </span>
      </div>
    </button>
  );
}
