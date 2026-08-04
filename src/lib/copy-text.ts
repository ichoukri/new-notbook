import { toast } from "sonner";

export function copyText(value: string, label = "Copied") {
  if (!value) return;
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(label))
    .catch(() => toast.error("Could not copy to clipboard"));
}
