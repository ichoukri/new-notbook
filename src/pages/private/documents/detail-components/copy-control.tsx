import { Copy } from "lucide-react";
import { copyText } from "./copy-text";

export function CopyButton({ value, label }: { value: string; label?: string }) {
  if (!value || value === "—") return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        copyText(value, label ?? "Copied");
      }}
      className="opacity-0 group-hover:opacity-100 hover:text-indigo-600 text-gray-400 transition-all"
      title="Copy"
    >
      <Copy className="size-3.5" />
    </button>
  );
}
