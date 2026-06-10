import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import { buildDocumentsCsv, getDocumentMode } from "@/core/documents";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendDocument,
  type TBackendDocumentMutationResponse,
  type TIngestionDocument,
  mapBackendDocument,
} from "@/core/ingestions";
import { useGlobalStore } from "@/core/global-store/index";
import { DeleteDocumentDialog } from "./components/delete-document-dialog";
import { DocumentsActionsBar } from "./components/documents-actions-bar";
import { DocumentsFiltersBar } from "./components/documents-filters-bar";
import { DocumentsTable } from "./components/documents-table";

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const currentUser = useGlobalStore((state) => state.user);

  const [documents, setDocuments] = useState<TIngestionDocument[]>([]);
  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [search, setSearch] = useState("");
  const [datasetFilter, setDatasetFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [pageError, setPageError] = useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<TIngestionDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reingestingIds, setReingestingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const loadDatasets = async () => {
      setIsLoadingDatasets(true);

      try {
        const response = await backendApi.findMany<TBackendDataset>(
          "/datasets/",
          {
            include_documents: "false",
            limit: "100",
            sort_by: "updated_at",
            sort_order: "desc",
          },
        );

        if (!cancelled) {
          setDatasets(response.map(mapBackendDataset));
        }
      } catch {
        if (!cancelled) {
          setDatasets([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDatasets(false);
        }
      }
    };

    void loadDatasets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      setIsLoadingDocuments(true);
      setPageError("");

      try {
        const params: Record<string, string> = {
          limit: "100",
          sort_by: "updated_at",
          sort_order: "desc",
        };

        if (search.trim()) {
          params.search = search.trim();
        }
        if (datasetFilter !== "all") {
          params.dataset_id = datasetFilter;
        }
        if (statusFilter !== "all") {
          params.processing_status = statusFilter;
        }

        const response = await backendApi.findMany<TBackendDocument>(
          "/documents/",
          params,
        );

        if (!cancelled) {
          setDocuments(response.map(mapBackendDocument));
        }
      } catch (error) {
        if (!cancelled) {
          setDocuments([]);
          setPageError(getApiErrorMessage(error, "Could not load documents."));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDocuments(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [datasetFilter, search, statusFilter]);

  const datasetNamesById = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset.name])),
    [datasets],
  );

  const filteredDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          modeFilter === "all" || getDocumentMode(document) === modeFilter,
      ),
    [documents, modeFilter],
  );

  const handleReingestDocument = async (document: TIngestionDocument) => {
    setReingestingIds((prev) => new Set(prev).add(document.id));

    try {
      const response = await backendApi.create<
        TBackendDocumentMutationResponse,
        undefined
      >(`/documents/${document.id}/reingest`, undefined);

      setDocuments((prev) =>
        prev.map((item) =>
          item.id === document.id ? mapBackendDocument(response.data) : item,
        ),
      );
      toast.success(`"${document.filename}" re-queued for ingestion.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not re-ingest document."));
    } finally {
      setReingestingIds((prev) => {
        const next = new Set(prev);
        next.delete(document.id);
        return next;
      });
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await backendApi.delete("/documents", deleteTarget.id);
      setDocuments((prev) =>
        prev.filter((document) => document.id !== deleteTarget.id),
      );
      toast.success(`"${deleteTarget.filename}" deleted.`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not delete document."));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "documents.csv",
      buildDocumentsCsv(filteredDocuments, {
        datasetNamesById,
        currentUser,
      }),
    );
  };

  const isLoading = isLoadingDocuments || isLoadingDatasets;

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-gray-50/40">
      <Topbar title="Documents" />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1400px] space-y-5 px-8 py-7">
          <DocumentsFiltersBar
            datasets={datasets}
            search={search}
            datasetFilter={datasetFilter}
            statusFilter={statusFilter}
            modeFilter={modeFilter}
            onSearchChange={setSearch}
            onDatasetFilterChange={setDatasetFilter}
            onStatusFilterChange={setStatusFilter}
            onModeFilterChange={setModeFilter}
            onUpload={() => navigate("/ingestions/new")}
          />

          <DocumentsActionsBar
            documentCount={filteredDocuments.length}
            onExport={handleExport}
          />

          {pageError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          )}

          <DocumentsTable
            documents={filteredDocuments}
            isLoading={isLoading}
            datasetNamesById={datasetNamesById}
            currentUser={currentUser}
            reingestingIds={reingestingIds}
            onOpenPath={navigate}
            onReingestDocument={(document) => void handleReingestDocument(document)}
            onDeleteDocument={setDeleteTarget}
          />
        </div>
      </main>

      <DeleteDocumentDialog
        document={deleteTarget}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteTarget(null);
          }
        }}
        onDelete={() => void handleDeleteDocument()}
      />
    </div>
  );
}
