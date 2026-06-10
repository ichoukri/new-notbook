import { cn } from "@/lib/utils";

export function ReadinessSteps({ filledCount }: { filledCount: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {["Dataset", "File", "Mode"].map((label, index) => {
        const done = index < filledCount;
        return (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                done ? "bg-emerald-500" : "bg-gray-300",
              )}
            />
            <span
              className={cn(
                "text-xs font-medium transition-colors",
                done ? "text-emerald-600" : "text-gray-400",
              )}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
