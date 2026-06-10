import { useEffect, useState } from "react";
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
  Database,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Tag,
  Trash2,
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
import { cn } from "@/lib/utils";
import { CreateDatasetModal } from "./components/create-dataset-modal";
import { DatasetCard } from "./components/dataset-card";
import {
  STATUS_CONFIG,
  type CreateDatasetPayload,
  type DatasetStatusFilter,
} from "./components/dataset-page-types";
import { EmptyState, LoadingState } from "./components/dataset-states";

export default function DatasetsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TDataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteDataset = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await backendApi.delete("/datasets", deleteTarget.id);
      setDatasets((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete dataset."));
    } finally {
      setIsDeleting(false);
    }
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
                  onDelete={() => setDeleteTarget(dataset)}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(dataset);
                              }}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all"
                            >
                              <Trash2 className="size-4" />
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

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !isDeleting) setDeleteTarget(null); }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="size-4 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-base">Delete dataset</DialogTitle>
                <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-1">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-gray-900">"{deleteTarget?.name}"</span>?
            Documents shared with other datasets will be unlinked. Documents
            linked only to this dataset will be permanently deleted (chunks
            and source files).
          </p>
          <DialogFooter className="gap-2 mt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDataset}
              disabled={isDeleting}
              className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

