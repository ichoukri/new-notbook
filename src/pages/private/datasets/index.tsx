import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import { useDatasets } from "@/core/api/hooks";
import type { TBackendDataset, TDataset } from "@/core/datasets";
import { CreateDatasetModal } from "./components/create-dataset-modal";
import { ImportDatasetDialog } from "./components/import-dataset-dialog";
import { DatasetCard } from "./components/dataset-card";
import { DatasetListTable } from "./components/dataset-list-table";
import {
  type CreateDatasetPayload,
  type DatasetStatusFilter,
  type DatasetView,
} from "./components/dataset-page-types";
import {
  filterDatasets,
  getDatasetStatusCounts,
  getTotalDatasetDocuments,
} from "./components/dataset-page-utils";
import { DatasetSummaryCards } from "./components/dataset-summary-cards";
import { DatasetToolbar } from "./components/dataset-toolbar";
import { DeleteDatasetDialog } from "./components/delete-dataset-dialog";
import { EmptyState, LoadingState } from "./components/dataset-states";

const DATASET_LIST_PARAMS: Record<string, string> = {
  include_documents: "false",
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

export default function DatasetsPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<DatasetView>("grid");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TDataset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<DatasetStatusFilter>("all");
  const datasetResource = useDatasets(DATASET_LIST_PARAMS);
  const datasets = datasetResource.items;
  const error = datasetResource.error;
  const isLoading = datasetResource.isLoading;
  const reloadDatasets = () => void datasetResource.refresh();


  const filteredDatasets = useMemo(
    () => filterDatasets(datasets, { query: search, statusFilter }),
    [datasets, search, statusFilter],
  );
  const statusCounts = useMemo(
    () => getDatasetStatusCounts(datasets),
    [datasets],
  );
  const totalDocuments = useMemo(
    () => getTotalDatasetDocuments(datasets),
    [datasets],
  );

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const handleCreateDataset = async (payload: CreateDatasetPayload) => {
    const createdDataset = await backendApi.create<
      TBackendDataset,
      CreateDatasetPayload
    >("/datasets/", payload);

    await datasetResource.mutate(
      (current) =>
        current && {
          ...current,
          items: [
            createdDataset,
            ...current.items.filter((item) => item.id !== createdDataset.id),
          ],
          total: current.total + 1,
        },
      { revalidate: false },
    );
    toast.success("Dataset created.");
  };

  const handleDeleteDataset = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await backendApi.delete("/datasets", deleteTarget.id);
      await datasetResource.mutate(
        (current) =>
          current && {
            ...current,
            items: current.items.filter((item) => item.id !== deleteTarget.id),
            total: Math.max(0, current.total - 1),
          },
        { revalidate: false },
      );
      toast.success(`"${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (deleteError) {
      toast.error(
        getApiErrorMessage(deleteError, "Could not delete dataset."),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-gray-50/60">
      <Topbar title="Datasets" />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1400px] space-y-6 px-8 py-7">
          <DatasetSummaryCards
            totalDatasets={datasets.length}
            totalDocuments={totalDocuments}
            activeCount={statusCounts.active}
            archivedCount={statusCounts.archived}
          />

          <DatasetToolbar
            search={search}
            statusFilter={statusFilter}
            statusCounts={statusCounts}
            view={view}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onViewChange={setView}
            onCreate={() => setCreateOpen(true)}
            onImport={() => setImportOpen(true)}
          />

          {error && !isLoading && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={reloadDatasets}
                className="text-xs font-semibold text-red-700 hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          <p className="-mt-2 text-xs text-gray-400">
            {filteredDatasets.length} dataset
            {filteredDatasets.length !== 1 ? "s" : ""}
            {search.trim() && (
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
              {filteredDatasets.map((dataset) => (
                <DatasetCard
                  key={dataset.id}
                  dataset={dataset}
                  onClick={() => navigate(`/datasets/${dataset.id}`)}
                  onDelete={() => setDeleteTarget(dataset)}
                />
              ))}
              {filteredDatasets.length === 0 && (
                <EmptyState
                  search={search}
                  onClear={clearFilters}
                  onCreate={() => setCreateOpen(true)}
                />
              )}
            </div>
          ) : (
            <DatasetListTable
              datasets={filteredDatasets}
              search={search}
              onOpen={(dataset) => navigate(`/datasets/${dataset.id}`)}
              onDelete={setDeleteTarget}
              onClear={clearFilters}
              onCreate={() => setCreateOpen(true)}
            />
          )}
        </div>
      </main>

      <CreateDatasetModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateDataset}
      />

      <ImportDatasetDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(job) => {
          const importedName =
            typeof job.dataset_name === "string" && job.dataset_name
              ? `"${job.dataset_name}"`
              : "Dataset";
          toast.success(`${importedName} imported.`);
          const warnings = Array.isArray(job.result?.warnings)
            ? (job.result.warnings as string[])
            : [];
          if (warnings.length > 0) {
            toast.warning(
              `Import finished with ${warnings.length} warning${
                warnings.length !== 1 ? "s" : ""
              }.`,
              { description: warnings[0], duration: 10000 },
            );
          }
          reloadDatasets();
        }}
      />

      <DeleteDatasetDialog
        dataset={deleteTarget}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
          }
        }}
        onDelete={() => void handleDeleteDataset()}
      />
    </div>
  );
}
