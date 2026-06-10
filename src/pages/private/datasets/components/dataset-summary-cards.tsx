import { Archive, Database, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type DatasetSummaryCardsProps = {
  totalDatasets: number;
  totalDocuments: number;
  activeCount: number;
  archivedCount: number;
};

export function DatasetSummaryCards({
  totalDatasets,
  totalDocuments,
  activeCount,
  archivedCount,
}: DatasetSummaryCardsProps) {
  const cards = [
    {
      label: "Total Datasets",
      value: totalDatasets,
      icon: Database,
      color: "text-indigo-600 bg-indigo-50",
      border: "border-indigo-100",
    },
    {
      label: "Linked Documents",
      value: totalDocuments.toLocaleString(),
      icon: FileText,
      color: "text-blue-600 bg-blue-50",
      border: "border-blue-100",
    },
    {
      label: "Active",
      value: activeCount,
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      label: "Archived",
      value: archivedCount,
      icon: Archive,
      color: "text-slate-600 bg-slate-100",
      border: "border-slate-200",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, border }) => (
        <div
          key={label}
          className={cn(
            "flex items-center gap-3.5 rounded-2xl border bg-white p-4 shadow-sm",
            border,
          )}
        >
          <div
            className={cn(
              "flex size-10 flex-shrink-0 items-center justify-center rounded-xl",
              color,
            )}
          >
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none text-gray-900">
              {value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
