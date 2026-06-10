import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";

export function Field({
  label,
  done,
  children,
}: {
  label: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {label}
        </span>
        {done && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
            <CheckCircle2 className="size-2.5" /> Done
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
