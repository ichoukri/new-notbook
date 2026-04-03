import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  formatDatasetDate,
  formatDatasetDateTime,
  formatFileSize,
  formatLabel,
  mapBackendDataset,
} from "@/core/datasets";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Database,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Tag,
  Upload,
} from "lucide-react";

const DATASET_STATUS_STYLES = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-100 text-slate-700 border-slate-200",
} as const;

const DOCUMENT_STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600 border-gray-200",
  uploading: "bg-sky-50 text-sky-700 border-sky-200",
  queued: "bg-gray-100 text-gray-600 border-gray-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  partitioning: "bg-amber-50 text-amber-700 border-amber-200",
  chunking: "bg-violet-50 text-violet-700 border-violet-200",
  summarising: "bg-indigo-50 text-indigo-700 border-indigo-200",
  vectorization: "bg-cyan-50 text-cyan-700 border-cyan-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export default function DatasetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<TDataset | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadDataset = async () => {
      if (!id) {
        setDataset(null);
        setError("Dataset ID is missing.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await backendApi.get<TBackendDataset>(
          `/datasets/${id}`,
          {
            include_documents: "true",
          },
        );

        if (!cancelled) {
          setDataset(mapBackendDataset(response));
        }
      } catch (loadError) {
        if (!cancelled) {
          setDataset(null);
          setError(getApiErrorMessage(loadError, "Could not load dataset."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadDataset();

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/60">
      <Topbar
        title={dataset?.name ?? "Dataset"}
        breadcrumbs={[{ label: "Datasets", path: "/datasets" }]}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/datasets")}
            >
              <ArrowLeft className="size-4" />
              Back to datasets
            </Button>

            <Button className="gap-2" onClick={() => navigate("/ingestions/new")}>
              <Upload className="size-4" />
              Upload File
            </Button>
          </div>

          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <p className="text-sm text-red-700 mb-4">{error}</p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setReloadKey((current) => current + 1)}
              >
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </div>
          ) : dataset ? (
            <>
              <DatasetHeader dataset={dataset} />

              <div className="grid grid-cols-[minmax(0,2fr)_360px] gap-5 items-start">
                <DocumentsSection dataset={dataset} />
                <MetadataSection dataset={dataset} />
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function DatasetHeader({ dataset }: { dataset: TDataset }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-4 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{dataset.name}</h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                DATASET_STATUS_STYLES[dataset.status],
              )}
            >
              {formatLabel(dataset.status)}
            </span>
          </div>

          <p className="text-sm text-gray-500 max-w-3xl">
            {dataset.description || "No description provided for this dataset yet."}
          </p>

          <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-gray-400" />
              <span>
                <strong className="text-gray-800">{dataset.documentCount}</strong>{" "}
                documents
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-gray-400" />
              <span>
                Created <strong className="text-gray-800">{formatDatasetDate(dataset.createdAt)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-gray-400" />
              <span>
                Updated <strong className="text-gray-800">{formatDatasetDate(dataset.updatedAt)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end max-w-sm">
          {dataset.tags.length > 0 ? (
            dataset.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
              >
                <Tag className="size-3" />
                {tag}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-400">No tags</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentsSection({ dataset }: { dataset: TDataset }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Documents currently linked to this dataset
          </p>
        </div>
        <span className="text-xs font-medium text-gray-500">
          {dataset.documentCount} total
        </span>
      </div>

      {dataset.documents.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/60">
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">
                Document
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                Type
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                Size
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                Status
              </th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">
                Added
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {dataset.documents.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-gray-900">
                    {document.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {document.sourceUrl || "Uploaded file"}
                  </p>
                </td>
                <td className="px-4 py-4 text-sm text-gray-600 uppercase">
                  {document.fileType}
                </td>
                <td className="px-4 py-4 text-sm text-gray-600">
                  {formatFileSize(document.fileSize)}
                </td>
                <td className="px-4 py-4">
                  <DocumentStatusBadge status={document.processingStatus} />
                </td>
                <td className="px-4 py-4 text-sm text-gray-500">
                  {formatDatasetDateTime(document.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
            <FileText className="size-6 text-gray-400" />
          </div>
          <p className="text-sm font-semibold text-gray-700">No documents yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Upload a file to start linking documents to this dataset.
          </p>
        </div>
      )}
    </section>
  );
}

function MetadataSection({ dataset }: { dataset: TDataset }) {
  const metadataEntries = Object.entries(dataset.metadata ?? {});

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="size-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Overview</h2>
        </div>
        <div className="space-y-3 text-sm">
          <MetadataRow label="Dataset ID" value={dataset.id} />
          <MetadataRow label="Created by" value={dataset.createdBy} />
          <MetadataRow label="Tenant ID" value={dataset.tenantId} />
          <MetadataRow
            label="Created at"
            value={formatDatasetDateTime(dataset.createdAt)}
          />
          <MetadataRow
            label="Updated at"
            value={formatDatasetDateTime(dataset.updatedAt)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="size-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Custom Metadata</h2>
        </div>

        {metadataEntries.length > 0 ? (
          <div className="space-y-3 text-sm">
            {metadataEntries.map(([key, value]) => (
              <MetadataRow
                key={key}
                label={key}
                value={
                  typeof value === "string" ? value : JSON.stringify(value, null, 2)
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No custom metadata has been set for this dataset.
          </p>
        )}
      </div>
    </section>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm text-gray-700">{value}</p>
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        DOCUMENT_STATUS_STYLES[status] ??
          "bg-gray-100 text-gray-600 border-gray-200",
      )}
    >
      {formatLabel(status)}
    </span>
  );
}

function LoadingState() {
  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 rounded bg-gray-100 mb-3" />
        <div className="h-4 w-full max-w-2xl rounded bg-gray-100 mb-6" />
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 w-32 rounded bg-gray-100" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm flex items-center justify-center gap-3 text-gray-500">
        <Loader2 className="size-5 animate-spin" />
        Loading dataset…
      </div>
    </>
  );
}
