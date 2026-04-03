import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { StatusBadge, ModeBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  buildDocumentsCsv,
  getDocumentChunkCount,
  getDocumentDatasetId,
  getDocumentMode,
  getDocumentStatusValue,
  getDocumentUploadedAtLabel,
  getDocumentUploaderLabel,
} from "@/core/documents";
import {
  type TBackendDataset,
  type TDataset,
  formatFileSize,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendDocument,
  type TIngestionDocument,
  mapBackendDocument,
} from "@/core/ingestions";
import { useGlobalStore } from "@/core/global-store/index";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  Download,
  FileText,
  Layers,
  Loader2,
  Search,
  Upload,
} from "lucide-react";

const FILE_TYPE_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  PDF: { bg: "bg-red-50", text: "text-red-600", icon: "PDF" },
  DOCX: { bg: "bg-blue-50", text: "text-blue-600", icon: "DOC" },
  XLSX: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "XLS" },
  CSV: { bg: "bg-teal-50", text: "text-teal-600", icon: "CSV" },
  MD: { bg: "bg-gray-100", text: "text-gray-600", icon: "MD" },
  TXT: { bg: "bg-gray-100", text: "text-gray-500", icon: "TXT" },
  JSON: { bg: "bg-violet-50", text: "text-violet-600", icon: "JSON" },
  JSONL: { bg: "bg-violet-50", text: "text-violet-600", icon: "JSONL" },
  HTML: { bg: "bg-orange-50", text: "text-orange-600", icon: "HTML" },
  PPTX: { bg: "bg-amber-50", text: "text-amber-600", icon: "PPT" },
};

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "queued", label: "Queued" },
  { value: "partitioning", label: "Extracting" },
  { value: "chunking", label: "Chunking" },
  { value: "summarising", label: "Summarising" },
  { value: "vectorization", label: "Embedding" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
] as const;

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

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      if (modeFilter === "all") {
        return true;
      }

      return getDocumentMode(document) === modeFilter;
    });
  }, [documents, modeFilter]);

  const isLoading = isLoadingDocuments || isLoadingDatasets;

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/40">
      <Topbar title="Documents" />

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <input
                placeholder="Search documents…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full h-9 pl-9 pr-4 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-gray-400"
              />
            </div>

            <Select value={datasetFilter} onValueChange={setDatasetFilter}>
              <SelectTrigger className="h-9 w-52 text-xs border-gray-200 rounded-xl">
                <SelectValue placeholder="All Datasets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Datasets</SelectItem>
                {datasets.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id}>
                    {dataset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-40 text-xs border-gray-200 rounded-xl">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((statusOption) => (
                  <SelectItem key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={modeFilter} onValueChange={setModeFilter}>
              <SelectTrigger className="h-9 w-32 text-xs border-gray-200 rounded-xl">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="gap-2 ml-auto h-9"
              onClick={() => navigate("/ingestions/new")}
            >
              <Upload className="size-4" />
              Upload File
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""}
            </p>
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  "documents.csv",
                  buildDocumentsCsv(filteredDocuments, {
                    datasetNamesById,
                    currentUser,
                  }),
                )
              }
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              disabled={filteredDocuments.length === 0}
            >
              <Download className="size-3.5" />
              Export CSV
            </button>
          </div>

          {pageError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pageError}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">File</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Dataset</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Mode</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Chunks</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Uploaded</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="size-4 animate-spin" />
                        Loading documents…
                      </div>
                    </td>
                  </tr>
                ) : filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <FileText className="size-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-500">No documents found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Try adjusting your filters or upload a new file.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((document) => {
                    const fileType = document.fileType.toUpperCase().replace(".", "");
                    const typeStyle =
                      FILE_TYPE_STYLES[fileType] ??
                      { bg: "bg-gray-100", text: "text-gray-500", icon: fileType };
                    const datasetId = getDocumentDatasetId(document);
                    const datasetName = datasetId
                      ? datasetNamesById.get(datasetId) ?? datasetId
                      : "Unknown Dataset";

                    return (
                      <tr
                        key={document.id}
                        className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                        onClick={() => navigate(`/documents/${document.id}`)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[9px] font-bold tracking-tight",
                                typeStyle.bg,
                                typeStyle.text,
                              )}
                            >
                              {typeStyle.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                {document.filename}
                              </p>
                              <p className="text-xs text-gray-400">
                                {document.fileType.toUpperCase()} · {formatFileSize(document.fileSize)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-xs font-medium text-gray-600 truncate max-w-40">
                            {datasetName}
                          </p>
                        </td>
                        <td className="px-5 py-3.5">
                          <ModeBadge mode={getDocumentMode(document)} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Layers className="size-3.5 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">
                              {getDocumentChunkCount(document).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={getDocumentStatusValue(document.processingStatus)} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-xs text-gray-400">
                            <div>{getDocumentUploadedAtLabel(document)}</div>
                            <div>{getDocumentUploaderLabel(document, currentUser)}</div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowUpRight className="size-3.5 text-indigo-500" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
