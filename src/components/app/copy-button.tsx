import { Copy } from "lucide-react";
import { copyText } from "@/lib/copy-text";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  if (!value || value === "—") return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        copyText(value, label ?? "Copied");
      }}
      className={cn(
        "text-gray-400 opacity-0 transition-all group-hover:opacity-100 hover:text-indigo-600",
        className,
      )}
      title="Copy"
    >
      <Copy className="size-3.5" />
    </button>
  );
}
