import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  formatDatasetDate,
  mapBackendDataset,
} from "@/core/datasets";
import {
  Archive,
  CheckCircle2,
  Database,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type DatasetStatusFilter = "all" | "active" | "archived";

type CreateDatasetPayload = {
  name: string;
  description?: string;
  tags?: string[];
  dataset_metadata?: Record<string, string>;
};

const STATUS_CONFIG = {
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

export default function DatasetsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DatasetStatusFilter>("all");
  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadDatasets = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await backendApi.findMany<TBackendDataset>(
          "/datasets/",
          {
            include_documents: "true",
            limit: "100",
          },
        );

        if (!cancelled) {
          setDatasets(response.map(mapBackendDataset));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError, "Could not load datasets."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDatasets();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleCreateDataset = async (payload: CreateDatasetPayload) => {
    const createdDataset = await backendApi.create<
      TBackendDataset,
      CreateDatasetPayload
    >("/datasets/", payload);

    setDatasets((currentDatasets) => [
      mapBackendDataset(createdDataset),
      ...currentDatasets.filter((dataset) => dataset.id !== createdDataset.id),
    ]);
    toast.success("Dataset created.");
  };

  const query = search.trim().toLowerCase();
  const filtered = datasets.filter((dataset) => {
    const matchesStatus =
      statusFilter === "all" || dataset.status === statusFilter;

    if (!matchesStatus) {
      return false;
    }

    if (!query) {
      return true;
    }

    return (
      dataset.name.toLowerCase().includes(query) ||
      dataset.description.toLowerCase().includes(query) ||
      dataset.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const totalDocuments = datasets.reduce(
    (sum, dataset) => sum + dataset.documentCount,
    0,
  );
  const activeCount = datasets.filter((dataset) => dataset.status === "active").length;
  const archivedCount = datasets.filter(
    (dataset) => dataset.status === "archived",
  ).length;
  const statusCounts = {
    all: datasets.length,
    active: activeCount,
    archived: archivedCount,
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/60">
      <Topbar title="Datasets" />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Total Datasets",
                value: datasets.length,
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
            ].map(({ label, value, icon: Icon, color, border }) => (
              <div
                key={label}
                className={cn(
                  "bg-white rounded-2xl border p-4 flex items-center gap-3.5 shadow-sm",
                  border,
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    color,
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900 leading-none">
                    {value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-52 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                placeholder="Search datasets, tags…"
                className="w-full h-10 pl-9 pr-9 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-gray-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {(["all", "active", "archived"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg capitalize transition-all",
                    statusFilter === status
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {status === "all" ? "All" : status}
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none",
                      statusFilter === status
                        ? "bg-white/25 text-white"
                        : "bg-gray-100 text-gray-500",
                    )}
                  >
                    {statusCounts[status]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white">
              <button
                onClick={() => setView("grid")}
                className={cn(
                  "px-3 py-2 transition-colors",
                  view === "grid"
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-400 hover:bg-gray-50",
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "px-3 py-2 transition-colors",
                  view === "list"
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-400 hover:bg-gray-50",
                )}
              >
                <List className="size-4" />
              </button>
            </div>

            <button
              onClick={() => setCreateOpen(true)}
              className="ml-auto flex items-center gap-2 h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-200 hover:shadow-md hover:shadow-indigo-200 transition-all"
            >
              <Plus className="size-4" />
              New Dataset
            </button>
          </div>

          {error && !isLoading && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setReloadKey((current) => current + 1)}
                className="text-xs font-semibold text-red-700 hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 -mt-2">
            {filtered.length} dataset{filtered.length !== 1 ? "s" : ""}
            {query && (
              <span>
                {" "}
                matching{" "}
                <span className="font-medium text-gray-600">"{search}"</span>
              </span>
            )}
          </p>

          {isLoading ? (
            <LoadingState />
          ) : view === "grid" ? (
            <div className="grid grid-cols-3 gap-4">
              {filtered.map((dataset) => (
                <DatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  onClick={() => navigate(`/datasets/${dataset.id}`)}
                />
              ))}
              {filtered.length === 0 && (
                <EmptyState
                  search={search}
                  onClear={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  onCreate={() => setCreateOpen(true)}
                />
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <EmptyState
                  search={search}
                  onClear={() => {
                    setSearch("");
                    setStatusFilter("all");
                  }}
                  onCreate={() => setCreateOpen(true)}
                />
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3.5">
                        Dataset
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3.5">
                        Docs
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3.5">
                        Tags
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3.5">
                        Updated
                      </th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3.5">
                        Status
                      </th>
                      <th className="px-4 py-3.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((dataset) => {
                      const statusConfig = STATUS_CONFIG[dataset.status];
                      return (
                        <tr
                          key={dataset.id}
                          onClick={() => navigate(`/datasets/${dataset.id}`)}
                          className="hover:bg-indigo-50/20 cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="relative w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                <Database className="size-4 text-indigo-500" />
                                <span
                                  className={cn(
                                    "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                                    statusConfig.dot,
                                  )}
                                />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                  {dataset.name}
                                </p>
                                <p className="text-xs text-gray-400 truncate max-w-[260px]">
                                  {dataset.description || "No description provided."}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-semibold text-gray-800">
                              {dataset.documentCount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-1.5 flex-wrap">
                              {dataset.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
                                >
                                  <Tag className="size-2.5" />
                                  {tag}
                                </span>
                              ))}
                              {dataset.tags.length > 2 && (
                                <span className="text-[11px] text-gray-400">
                                  +{dataset.tags.length - 2}
                                </span>
                              )}
                              {dataset.tags.length === 0 && (
                                <span className="text-[11px] text-gray-400">
                                  No tags
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {formatDatasetDate(dataset.updatedAt)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border",
                                statusConfig.badge,
                              )}
                            >
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                            >
                              <MoreHorizontal className="size-4 text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </main>

      <CreateDatasetModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateDataset}
      />
    </div>
  );
}

function DatasetCard({
  dataset,
  onClick,
}: {
  dataset: TDataset;
  onClick: () => void;
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
          className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-3.5 text-gray-400" />
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

function LoadingState() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="h-4 w-24 rounded bg-gray-100 mb-4" />
          <div className="h-4 w-40 rounded bg-gray-100 mb-2" />
          <div className="h-3 w-full rounded bg-gray-100 mb-6" />
          <div className="h-3 w-28 rounded bg-gray-100 mb-2" />
          <div className="h-3 w-20 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  search,
  onClear,
  onCreate,
}: {
  search: string;
  onClear: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="col-span-3 flex flex-col items-center py-20 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-1">
        <Database className="size-7 text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-gray-600">No datasets found</p>
      <p className="text-xs text-gray-400 text-center max-w-xs">
        {search
          ? `Nothing matched "${search}". Try a different search or clear your filters.`
          : "Create your first dataset to get started."}
      </p>
      {search ? (
        <button
          onClick={onClear}
          className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Clear filters
        </button>
      ) : (
        <button
          onClick={onCreate}
          className="mt-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Create a dataset
        </button>
      )}
    </div>
  );
}

function CreateDatasetModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: CreateDatasetPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [metaFields, setMetaFields] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setTags("");
    setMetaFields([{ key: "", value: "" }]);
    setError("");
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  };

  const addField = () => {
    setMetaFields((fields) => [...fields, { key: "", value: "" }]);
  };

  const removeField = (index: number) => {
    setMetaFields((fields) =>
      fields.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const updateField = (
    index: number,
    column: "key" | "value",
    value: string,
  ) => {
    setMetaFields((fields) =>
      fields.map((field, currentIndex) =>
        currentIndex === index ? { ...field, [column]: value } : field,
      ),
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Dataset name is required.");
      return;
    }

    const parsedTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const metadataEntries = metaFields
      .map((field) => ({
        key: field.key.trim(),
        value: field.value.trim(),
      }))
      .filter((field) => field.key);

    const datasetMetadata =
      metadataEntries.length > 0
        ? Object.fromEntries(
            metadataEntries.map((field) => [field.key, field.value]),
          )
        : undefined;

    setIsSubmitting(true);
    setError("");

    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        dataset_metadata: datasetMetadata,
      });
      resetForm();
      onClose();
    } catch (createError) {
      setError(getApiErrorMessage(createError, "Could not create dataset."));
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Database className="size-4 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-base">
                Create New Dataset
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Set up a new dataset record in the backend
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Dataset Name
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Documentation v3"
              className="rounded-xl h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the contents and purpose of this dataset…"
              rows={3}
              className="rounded-xl resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tags
              </Label>
              <span className="text-[11px] text-gray-400">
                Comma separated
              </span>
            </div>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="docs, api, sdk"
                className="rounded-xl h-10 pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Metadata
              </Label>
              <span className="text-[11px] text-gray-400">
                Optional key-value pairs
              </span>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_20px] gap-2 px-0.5">
                <span className="text-[11px] font-medium text-gray-400 pl-1">
                  Key
                </span>
                <span className="text-[11px] font-medium text-gray-400 pl-1">
                  Value
                </span>
              </div>

              {metaFields.map((row, index) => (
                <div
                  key={`${row.key}-${index}`}
                  className="grid grid-cols-[1fr_1fr_28px] gap-2 items-center"
                >
                  <Input
                    value={row.key}
                    onChange={(e) => updateField(index, "key", e.target.value)}
                    placeholder="e.g. owner"
                    className="rounded-lg h-9 text-sm"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => updateField(index, "value", e.target.value)}
                    placeholder="e.g. research-team"
                    className="rounded-lg h-9 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    disabled={metaFields.length === 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addField}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors mt-1"
              >
                <Plus className="size-3.5" />
                Add field
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Create Dataset
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
