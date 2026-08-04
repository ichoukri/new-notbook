import {
  CalendarDays,
  Database,
  Download,
  FileText,
  HardDrive,
  Loader2,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { CopyButton } from "@/components/app/copy-button";
import { Button } from "@/components/ui/button";
import {
  type TDataset,
  formatDatasetDateTime,
  formatFileSize,
} from "@/core/datasets";
import { cn } from "@/lib/utils";
import { STATUS_CONFIG } from "../components/dataset-page-types";
import type { DatasetDocumentStats } from "./dataset-detail-utils";

export function DatasetDetailHero({
  dataset,
  stats,
  exportStage,
  isRefreshing,
  onExport,
  onUpload,
  onEdit,
  onRefresh,
  onDelete,
}: {
  dataset: TDataset;
  stats: DatasetDocumentStats;
  exportStage: string | null;
  isRefreshing: boolean;
  onExport: () => void;
  onUpload: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  onDelete: () => void;
}) {
  const statusConfig = STATUS_CONFIG[dataset.status];
  const StatusIcon = statusConfig.icon;

  return (
    <section className="relative isolate overflow-hidden rounded-[26px] bg-[#121827] text-white shadow-[0_18px_55px_-28px_rgba(44,40,120,0.6)] ring-1 ring-black/5">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_13%_5%,rgba(129,140,248,0.34),transparent_32%),radial-gradient(circle_at_88%_95%,rgba(168,85,247,0.22),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] [background-image:linear-gradient(rgba(255,255,255,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="px-5 pb-5 pt-6 sm:px-7 sm:pb-6 lg:px-8 lg:pt-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur sm:size-16">
              <Database
                className="size-7 text-indigo-200 sm:size-8"
                strokeWidth={1.7}
              />
            </div>

            <div className="min-w-0 pt-0.5">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    dataset.status === "active"
                      ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"
                      : "border-slate-400/30 bg-slate-400/15 text-slate-200",
                  )}
                >
                  <StatusIcon className="size-3" />
                  {statusConfig.label}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {stats.total.toLocaleString()} document
                  {stats.total !== 1 ? "s" : ""} ·{" "}
                  {formatFileSize(stats.totalSize)}
                </span>
              </div>

              <div className="group flex min-w-0 items-center gap-2">
                <h1 className="max-w-4xl truncate text-xl font-bold tracking-[-0.025em] text-white sm:text-2xl lg:text-[28px]">
                  {dataset.name}
                </h1>
                <CopyButton value={dataset.id} label="Dataset ID copied" />
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {dataset.description ||
                  "No description yet — add one so teammates know what this dataset covers."}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {dataset.tags.length > 0 ? (
                  dataset.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.07] px-2 py-0.5 text-[11px] font-medium text-slate-200"
                    >
                      <Tag className="size-2.5" />
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] text-slate-500">No tags</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pl-[84px] xl:pl-0">
            <Button
              size="sm"
              onClick={onUpload}
              className="h-9 gap-2 border-0 bg-white px-4 font-semibold text-slate-900 shadow-lg shadow-black/15 hover:bg-slate-100"
            >
              <Upload className="size-4" />
              Upload file
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onExport}
              disabled={exportStage !== null}
              className="h-9 gap-2 border-white/15 bg-white/[0.07] px-4 text-white hover:bg-white/[0.14] hover:text-white"
            >
              {exportStage !== null ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {exportStage}…
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Export
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="h-9 gap-2 border-white/15 bg-white/[0.07] px-4 text-white hover:bg-white/[0.14] hover:text-white"
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 border-white/15 bg-white/[0.07] text-slate-300 hover:bg-white/[0.14] hover:text-white"
              aria-label="Refresh dataset"
              title="Refresh dataset"
            >
              <RefreshCw
                className={cn("size-4", isRefreshing && "animate-spin")}
              />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onDelete}
              className="h-9 w-9 border-white/15 bg-white/[0.07] text-slate-300 hover:border-red-300/40 hover:bg-red-400/15 hover:text-red-200"
              aria-label="Delete dataset"
              title="Delete dataset"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-7 grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] backdrop-blur sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
          <HeroFact
            icon={FileText}
            label="Documents"
            value={`${stats.total.toLocaleString()} linked · ${stats.completed.toLocaleString()} indexed`}
          />
          <HeroFact
            icon={HardDrive}
            label="Storage"
            value={formatFileSize(stats.totalSize)}
          />
          <HeroFact
            icon={CalendarDays}
            label="Created"
            value={formatDatasetDateTime(dataset.createdAt)}
          />
          <HeroFact
            icon={RefreshCw}
            label="Last updated"
            value={formatDatasetDateTime(dataset.updatedAt)}
          />
        </div>
      </div>
    </section>
  );
}

function HeroFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Database;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-white/10 p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-indigo-200">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-[13px] font-semibold text-slate-100">
          {value}
        </p>
      </div>
    </div>
  );
}
