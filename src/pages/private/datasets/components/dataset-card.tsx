import { Database, Trash2 } from "lucide-react";
import type { TDataset } from "@/core/datasets";
import { formatDatasetDate } from "@/core/datasets";
import { STATUS_CONFIG } from "./dataset-page-types";

export function DatasetCard({
  dataset,
  onClick,
  onDelete,
}: {
  dataset: TDataset;
  onClick: () => void;
  onDelete: () => void;
}) {
  const statusConfig = STATUS_CONFIG[dataset.status];
  const StatusIcon = statusConfig.icon;
  const metadataCount = Object.keys(dataset.metadata ?? {}).length;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 cursor-pointer group hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/40 transition-all duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Database className="size-4" />
          </div>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-600">
            <StatusIcon className="size-3" />
            {statusConfig.label}
          </span>
        </div>
        <button
          className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        <h3 className="text-[13.5px] font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1 leading-snug">
          {dataset.name}
        </h3>
        <p className="text-[12px] text-gray-400 line-clamp-2 leading-relaxed">
          {dataset.description || "No description provided."}
        </p>
      </div>

      <div className="flex items-baseline gap-1 text-[12px] flex-wrap">
        <span className="font-bold text-gray-800">
          {dataset.documentCount.toLocaleString()}
        </span>
        <span className="text-gray-400 mr-2">docs</span>
        <span className="font-bold text-gray-800">{dataset.tags.length}</span>
        <span className="text-gray-400 mr-2">tags</span>
        <span className="font-bold text-gray-800">{metadataCount}</span>
        <span className="text-gray-400">metadata fields</span>
      </div>

      <div className="flex items-center justify-between mt-auto pt-3.5 border-t border-gray-100">
        <div className="flex gap-1.5 flex-wrap">
          {dataset.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"
            >
              {tag}
            </span>
          ))}
          {dataset.tags.length > 2 && (
            <span className="text-[11px] text-gray-400">
              +{dataset.tags.length - 2}
            </span>
          )}
          {dataset.tags.length === 0 && (
            <span className="text-[11px] text-gray-400">No tags</span>
          )}
        </div>
        <span className="text-[11px] text-gray-400">
          Updated {formatDatasetDate(dataset.updatedAt)}
        </span>
      </div>
    </div>
  );
}
