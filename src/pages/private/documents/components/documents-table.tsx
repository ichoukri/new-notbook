import {
  ArrowUpRight,
  FileText,
  Layers,
  Loader2,
  PlayCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ModeBadge, StatusBadge } from "@/components/app/status-badge";
import {
  getDocumentChunkCount,
  getDocumentDatasetName,
  getDocumentFileSummary,
  getDocumentMode,
  getDocumentPipelineStatusPath,
  getDocumentStatusValue,
  getDocumentUploadedAtLabel,
  getDocumentUploaderLabel,
  isDocumentAwaitingReview,
} from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";
import type { TUser } from "@/core/types";
import { cn } from "@/lib/utils";
import { FILE_TYPE_STYLES } from "./document-list-constants";

type DocumentsTableProps = {
  documents: TIngestionDocument[];
  isLoading: boolean;
  datasetNamesById: Map<string, string>;
  currentUser: TUser | null | undefined;
  reingestingIds: Set<string>;
  onOpenPath: (path: string) => void;
  onReingestDocument: (document: TIngestionDocument) => void;
  onDeleteDocument: (document: TIngestionDocument) => void;
};

export function DocumentsTable({
  documents,
  isLoading,
  datasetNamesById,
  currentUser,
  reingestingIds,
  onOpenPath,
  onReingestDocument,
  onDeleteDocument,
}: DocumentsTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
              File
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
              Dataset
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
              Mode
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
              Chunks
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
              Status
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500">
              Uploaded
            </th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading ? (
            <DocumentsLoadingRow />
          ) : documents.length === 0 ? (
            <DocumentsEmptyRow />
          ) : (
            documents.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                datasetNamesById={datasetNamesById}
                currentUser={currentUser}
                isReingesting={reingestingIds.has(document.id)}
                onOpenPath={onOpenPath}
                onReingestDocument={onReingestDocument}
                onDeleteDocument={onDeleteDocument}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsLoadingRow() {
  return (
    <tr>
      <td colSpan={7} className="px-5 py-16 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" />
          Loading documents...
        </div>
      </td>
    </tr>
  );
}

function DocumentsEmptyRow() {
  return (
    <tr>
      <td colSpan={7} className="px-5 py-16 text-center">
        <FileText className="mx-auto mb-2 size-8 text-gray-200" />
        <p className="text-sm font-medium text-gray-500">No documents found</p>
        <p className="mt-1 text-xs text-gray-400">
          Try adjusting your filters or upload a new file.
        </p>
      </td>
    </tr>
  );
}

type DocumentRowProps = {
  document: TIngestionDocument;
  datasetNamesById: Map<string, string>;
  currentUser: TUser | null | undefined;
  isReingesting: boolean;
  onOpenPath: (path: string) => void;
  onReingestDocument: (document: TIngestionDocument) => void;
  onDeleteDocument: (document: TIngestionDocument) => void;
};

function DocumentRow({
  document,
  datasetNamesById,
  currentUser,
  isReingesting,
  onOpenPath,
  onReingestDocument,
  onDeleteDocument,
}: DocumentRowProps) {
  const pipelinePath = getDocumentPipelineStatusPath(document);
  const documentPath = pipelinePath ?? `/documents/${document.id}`;
  const fileType = document.fileType.toUpperCase().replace(".", "");
  const typeStyle = FILE_TYPE_STYLES[fileType] ?? {
    bg: "bg-gray-100",
    text: "text-gray-500",
    icon: fileType,
  };
  const datasetName = getDocumentDatasetName(
    document,
    datasetNamesById,
    "Unknown Dataset",
  );

  return (
    <tr
      className="group cursor-pointer transition-colors hover:bg-indigo-50/30"
      onClick={() => onOpenPath(documentPath)}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-9 flex-shrink-0 items-center justify-center rounded-xl text-[9px] font-bold tracking-tight",
              typeStyle.bg,
              typeStyle.text,
            )}
          >
            {typeStyle.icon}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
              {document.filename}
            </p>
            <p className="text-xs text-gray-400">{getDocumentFileSummary(document)}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <p className="max-w-40 truncate text-xs font-medium text-gray-600">
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
        <DocumentRowActions
          document={document}
          pipelinePath={pipelinePath}
          isReingesting={isReingesting}
          onOpenPath={onOpenPath}
          onReingestDocument={onReingestDocument}
          onDeleteDocument={onDeleteDocument}
        />
      </td>
    </tr>
  );
}

type DocumentRowActionsProps = {
  document: TIngestionDocument;
  pipelinePath: string | null;
  isReingesting: boolean;
  onOpenPath: (path: string) => void;
  onReingestDocument: (document: TIngestionDocument) => void;
  onDeleteDocument: (document: TIngestionDocument) => void;
};

function DocumentRowActions({
  document,
  pipelinePath,
  isReingesting,
  onOpenPath,
  onReingestDocument,
  onDeleteDocument,
}: DocumentRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      {pipelinePath && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenPath(pipelinePath);
          }}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          title={
            isDocumentAwaitingReview(document)
              ? "Continue guided review"
              : "View live progress"
          }
        >
          <PlayCircle className="size-3.5" />
          {isDocumentAwaitingReview(document) ? "Continue" : "View"}
        </button>
      )}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onReingestDocument(document);
          }}
          disabled={isReingesting}
          className="rounded-md p-1 text-gray-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
          title="Re-ingest document"
        >
          {isReingesting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDeleteDocument(document);
          }}
          className="rounded-md p-1 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
          title="Delete document"
        >
          <Trash2 className="size-3.5" />
        </button>
        <ArrowUpRight className="size-3.5 text-indigo-500" />
      </div>
    </div>
  );
}
