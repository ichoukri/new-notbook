import { Archive, CheckCircle2 } from "lucide-react";

export type DatasetStatusFilter = "all" | "active" | "archived";

export type CreateDatasetPayload = {
  name: string;
  description?: string;
  tags?: string[];
  dataset_metadata?: Record<string, string>;
};

export const STATUS_CONFIG = {
  active: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    label: "Active",
  },
  archived: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Archive,
    label: "Archived",
  },
} as const;
