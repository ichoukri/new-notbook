import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  getTransferDownload,
  getTransferStageLabel,
  pollTransferJob,
  startDatasetExport,
} from "@/core/dataset-transfer";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { DeleteDatasetDialog } from "./components/delete-dataset-dialog";
import { DatasetDetailHero } from "./detail-components/dataset-detail-hero";
import {
  DatasetDetailErrorState,
  DatasetDetailLoadingState,
} from "./detail-components/dataset-detail-states";
import {
  type DatasetDocumentFilter,
  type DatasetDocumentSort,
  DEFAULT_DOCUMENT_SORT,
  type UpdateDatasetPayload,
} from "./detail-components/dataset-detail-types";
import {
  getDatasetDocumentStats,
  hasProcessingDocuments,
} from "./detail-components/dataset-detail-utils";
import { DatasetDocumentsPanel } from "./detail-components/dataset-documents-panel";
import { DatasetMetadataPanel } from "./detail-components/dataset-metadata-panel";
import { DatasetPipelinePanel } from "./detail-components/dataset-pipeline-panel";
import { EditDatasetDialog } from "./detail-components/edit-dataset-dialog";

/** How often to re-poll while documents are still moving through ingestion. */
const LIVE_REFRESH_INTERVAL_MS = 6000;

export default function DatasetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dataset, setDataset] = useState<TDataset | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exportStage, setExportStage] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<DatasetDocumentFilter>("all");
  const [sort, setSort] = useState<DatasetDocumentSort>(DEFAULT_DOCUMENT_SORT);

  const isMountedRef = useRef(true);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadDataset = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!id) {
        setDataset(null);
        setError("Dataset ID is missing.");
        setIsLoading(false);
        return;
      }

      // A background poll must never fight with an in-flight request.
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (options?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
        setError("");
      }

      try {
        const response = await backendApi.get<TBackendDataset>(
          `/datasets/${id}`,
          { include_documents: "true" },
        );

        if (isMountedRef.current) {
          setDataset(mapBackendDataset(response));
          setError("");
        }
      } catch (loadError) {
        if (isMountedRef.current) {
          const message = getApiErrorMessage(
            loadError,
            "Could not load dataset.",
          );
          // A failed background poll shouldn't wipe the data already on screen.
          if (options?.silent) {
            toast.error(message);
          } else {
            setDataset(null);
            setError(message);
          }
        }
      } finally {
        isFetchingRef.current = false;
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [id],
  );

  useEffect(() => {
    void loadDataset();
  }, [loadDataset]);

  const stats = useMemo(
    () => getDatasetDocumentStats(dataset?.documents ?? []),
    [dataset],
  );

  const isLive = useMemo(
    () => (dataset ? hasProcessingDocuments(dataset.documents) : false),
    [dataset],
  );

  // Keep the pipeline honest while ingestion runs, without hammering the API
  // when the tab is in the background.
  useEffect(() => {
    if (!isLive) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void loadDataset({ silent: true });
    }, LIVE_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isLive, loadDataset]);

  const handleExport = async () => {
    if (!id || exportStage !== null) {
      return;
    }

    setExportStage("Starting export");
    try {
      const startedJob = await startDatasetExport(id);
      const job = await pollTransferJob(startedJob.id, (currentJob) => {
        setExportStage(getTransferStageLabel(currentJob));
      });
      if (job.status === "failed") {
        toast.error(job.error || "Export failed.");
        return;
      }
      const warnings = Array.isArray(job.result?.warnings)
        ? (job.result.warnings as string[])
        : [];
      if (warnings.length > 0) {
        toast.warning(
          `Archive is incomplete: ${warnings.length} file${
            warnings.length !== 1 ? "s" : ""
          } could not be exported.`,
          { description: warnings[0], duration: 10000 },
        );
      }
      const { download_url } = await getTransferDownload(job.id);
      const anchor = document.createElement("a");
      anchor.href = download_url;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      toast.success("Dataset archive ready — download started.");
    } catch (exportError) {
      toast.error(getApiErrorMessage(exportError, "Could not export dataset."));
    } finally {
      setExportStage(null);
    }
  };

  const handleSave = async (payload: UpdateDatasetPayload) => {
    if (!id) return;

    const updated = await backendApi.replace<
      TBackendDataset,
      UpdateDatasetPayload
    >("/datasets", id, payload);

    // The update endpoint returns the dataset without its documents, so keep
    // the documents already loaded rather than blanking the table.
    setDataset((current) => ({
      ...mapBackendDataset(updated),
      documents: current?.documents ?? [],
      documentCount: current?.documentCount ?? 0,
    }));
    toast.success("Dataset updated.");
  };

  const handleDelete = async () => {
    if (!id || isDeleting) return;

    setIsDeleting(true);
    try {
      await backendApi.delete("/datasets", id);
      toast.success(`"${dataset?.name ?? "Dataset"}" deleted.`);
      navigate("/datasets");
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, "Could not delete dataset."));
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f6fa]">
      <Topbar
        title={dataset?.name ?? "Dataset"}
        breadcrumbs={[{ label: "Datasets", path: "/datasets" }]}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 gap-2 text-gray-500 hover:text-gray-900"
              onClick={() => navigate("/datasets")}
            >
              <ArrowLeft className="size-4" />
              Back to datasets
            </Button>

            {isRefreshing && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <RefreshCw className="size-3 animate-spin" />
                Refreshing…
              </span>
            )}
          </div>

          {isLoading ? (
            <DatasetDetailLoadingState />
          ) : error || !dataset ? (
            <DatasetDetailErrorState
              message={error || "Could not load dataset."}
              onRetry={() => void loadDataset()}
              onBack={() => navigate("/datasets")}
            />
          ) : (
            <>
              <DatasetDetailHero
                dataset={dataset}
                stats={stats}
                exportStage={exportStage}
                isRefreshing={isRefreshing}
                onExport={() => void handleExport()}
                onUpload={() => navigate("/ingestions/new")}
                onEdit={() => setEditOpen(true)}
                onRefresh={() => void loadDataset({ silent: true })}
                onDelete={() => setDeleteOpen(true)}
              />

              <DatasetPipelinePanel
                stats={stats}
                filter={filter}
                isLive={isLive}
                onFilterChange={setFilter}
              />

              <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_340px] xl:grid-cols-[minmax(0,2fr)_360px]">
                <DatasetDocumentsPanel
                  documents={dataset.documents}
                  search={search}
                  filter={filter}
                  sort={sort}
                  onSearchChange={setSearch}
                  onFilterChange={setFilter}
                  onSortChange={setSort}
                  onOpenDocument={(documentId) =>
                    navigate(`/documents/${documentId}`)
                  }
                  onUpload={() => navigate("/ingestions/new")}
                />

                <DatasetMetadataPanel dataset={dataset} />
              </div>
            </>
          )}
        </div>
      </main>

      {dataset && (
        <EditDatasetDialog
          dataset={dataset}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={handleSave}
        />
      )}

      <DeleteDatasetDialog
        dataset={deleteOpen ? dataset : null}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteOpen(false);
          }
        }}
        onDelete={() => void handleDelete()}
      />
    </div>
  );
}
