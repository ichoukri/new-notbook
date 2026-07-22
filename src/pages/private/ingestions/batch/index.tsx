import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Folder,
  FolderOpen,
  Loader2,
  OctagonX,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { IngestionShell } from "@/components/ingestion/ui";
import { backendApi } from "@/core/api";
import { getApiErrorStatus } from "@/core/api/error";
import { formatFileSize } from "@/core/datasets";
import { buildIngestionReviewUrl, loadIngestionBatch } from "@/core/batches";
import {
  type TBackendDocumentMutationResponse,
  type TIngestionDocument,
  isAwaitingApproval,
  isLiveInPipeline,
  isMetadataReview,
  mapBackendDocument,
} from "@/core/ingestions";
import { cn } from "@/lib/utils";
import {
  buildFileTree,
  collectFolderPaths,
  folderPathsMatching,
  type TreeFolderNode,
  type TreeNode,
} from "../new-ingestion/file-tree";
import { CancelIngestionDialog } from "../status/cancel-ingestion-dialog";
import { MissingState } from "../status/status-states";
import { useDocumentRoster } from "../use-document-roster";
import { splitRosterByState } from "../roster-buckets";
import {
  FUNNEL_TONES,
  STAGE_TONE_CLASSES,
  TONE_LABELS,
  describeStage,
  type StageTone,
} from "./stage-labels";

const MAX_INDENT_DEPTH = 4;
const INDENT_STEP_PX = 16;
const BASE_PADDING_PX = 16;

function indentFor(depth: number) {
  return BASE_PADDING_PX + Math.min(depth, MAX_INDENT_DEPTH) * INDENT_STEP_PX;
}

export default function IngestionBatchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get("batch")?.trim() ?? "";
  const datasetId = searchParams.get("dataset_id")?.trim() ?? "";

  const batch = useMemo(() => loadIngestionBatch(batchId), [batchId]);

  if (!batch) {
    return (
      <MissingState
        message={
          batchId
            ? "This batch is no longer available in this tab. Open the documents list to see how the ingestion is going."
            : "Missing batch identifier. Start an ingestion to build a batch view."
        }
        onNavigate={navigate}
      />
    );
  }

  return (
    <BatchView
      batchId={batch.id}
      documentIds={batch.documentIds}
      datasetId={datasetId || batch.datasetId}
    />
  );
}

type BatchRow = {
  document: TIngestionDocument | undefined;
  id: string;
  isDeleted: boolean;
};

function BatchView({
  batchId,
  documentIds,
  datasetId,
}: {
  batchId: string;
  documentIds: string[];
  datasetId: string;
}) {
  const navigate = useNavigate();
  const roster = useDocumentRoster({ documentIds, datasetId });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  // Either one document ("stop this") or the whole in-flight set ("stop all").
  const [cancelTargets, setCancelTargets] = useState<TIngestionDocument[] | null>(
    null,
  );

  const buckets = useMemo(
    () =>
      splitRosterByState(
        roster.trackedIds,
        roster.documents,
        roster.deletedIds,
      ),
    [roster.trackedIds, roster.documents, roster.deletedIds],
  );

  // The same tree the upload form used, rebuilt from what the server reports so
  // folder structure survives past the upload.
  const tree = useMemo(
    () =>
      buildFileTree<BatchRow>(
        roster.trackedIds.map((id) => {
          const document = roster.documents.get(id);
          const isDeleted = roster.deletedIds.has(id);
          return {
            id,
            name: document?.filename ?? "Loading…",
            // The first entry is the canonical path; the rest are other places
            // the same content was uploaded from.
            relativePath: document?.sourceRelativePaths[0] ?? null,
            size: document?.fileSize ?? 0,
            status: describeStage(document, { isDeleted }).tone,
            data: { id, document, isDeleted },
          };
        }),
      ),
    [roster.trackedIds, roster.documents, roster.deletedIds],
  );

  const folderPaths = useMemo(() => collectFolderPaths(tree), [tree]);
  const hasFolders = folderPaths.length > 0;
  const allExpanded = hasFolders && expanded.size >= folderPaths.length;

  // Reveal the chain down to every failure, so a collapsed folder never hides
  // the one thing needing attention.
  const [revealedFailures, setRevealedFailures] = useState(0);
  if (buckets.failed.length !== revealedFailures) {
    setRevealedFailures(buckets.failed.length);
    if (buckets.failed.length > 0) {
      const failedPaths = folderPathsMatching(tree, (file) => file.status === "failed");
      if (failedPaths.length > 0) {
        setExpanded((prev) => new Set([...prev, ...failedPaths]));
      }
    }
  }

  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const retryFailed = async () => {
    if (isRetrying || buckets.failed.length === 0) return;
    setIsRetrying(true);
    const targets = buckets.failed;
    try {
      // Settle every retry rather than aborting the batch on the first
      // rejection — one document that refuses to restart should not stop the
      // others from trying.
      const outcomes = await Promise.allSettled(
        targets.map((document) =>
          backendApi.create<TBackendDocumentMutationResponse, undefined>(
            `/documents/${datasetId}/confirm?document_id=${document.id}`,
            undefined,
          ),
        ),
      );

      let restarted = 0;
      for (const outcome of outcomes) {
        if (outcome.status !== "fulfilled") continue;
        restarted += 1;
        roster.applyDocument(mapBackendDocument(outcome.value.data));
      }

      if (restarted === targets.length) {
        toast.success(`Restarted ${restarted} document(s).`);
      } else if (restarted === 0) {
        toast.error(`Could not restart any of the ${targets.length} document(s).`);
      } else {
        toast.warning(
          `Restarted ${restarted} of ${targets.length} — the rest could not be retried.`,
        );
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const cancelDocuments = async (targets: TIngestionDocument[]) => {
    if (isCancelling || targets.length === 0) return;
    setIsCancelling(true);
    try {
      // Settle all of them: a 409 on one document (a stage holding the lock)
      // must not stop the rest from being cancelled.
      const outcomes = await Promise.allSettled(
        targets.map((document) =>
          backendApi.create<TBackendDocumentMutationResponse, undefined>(
            `/documents/${document.id}/cancel`,
            undefined,
          ),
        ),
      );

      let stopped = 0;
      let busy = 0;
      for (const outcome of outcomes) {
        if (outcome.status === "fulfilled") {
          stopped += 1;
          roster.applyDocument(mapBackendDocument(outcome.value.data));
        } else if (getApiErrorStatus(outcome.reason) === 409) {
          busy += 1;
        }
      }

      if (stopped === targets.length) {
        toast.success(
          targets.length === 1
            ? "Ingestion stopped."
            : `Stopped ${stopped} ingestions.`,
        );
      } else if (busy > 0) {
        toast.info(
          `Stopped ${stopped} of ${targets.length}. ${busy} had a stage finishing — try again in a moment.`,
        );
      } else {
        toast.error(
          `Stopped ${stopped} of ${targets.length}; the rest could not be stopped.`,
        );
      }
      setCancelTargets(null);
    } finally {
      setIsCancelling(false);
    }
  };

  /** Documents still doing work — the only ones there is anything to stop. */
  const stoppable = [...buckets.processing, ...buckets.awaiting];

  // Deleted documents are settled too — they will never progress again, and
  // leaving them out would hold the progress bar short of 100% forever.
  const settled =
    buckets.completed.length + buckets.failed.length + buckets.deletedIds.length;
  const total = roster.trackedIds.length;
  const percent = total > 0 ? Math.round((settled / total) * 100) : 0;
  const rows = flattenVisible(tree, expanded);

  return (
    <IngestionShell title="Ingestion Batch">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Ingesting {total} document{total === 1 ? "" : "s"}
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {settled} of {total} finished
              {buckets.awaiting.length > 0 &&
                ` · ${buckets.awaiting.length} waiting on you`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stoppable.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCancelTargets(stoppable)}
                disabled={isCancelling}
                className="text-red-600 hover:border-red-300 hover:text-red-700"
              >
                <OctagonX className="mr-1.5 size-3.5" />
                Stop all
              </Button>
            )}
            {buckets.failed.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void retryFailed()}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1.5 size-3.5" />
                )}
                Retry {buckets.failed.length} failed
              </Button>
            )}
            {buckets.awaiting.length > 0 && (
              // Auto documents can still stop at a gate — a re-queued duplicate
              // carries the mode it was first ingested with. Hand those to the
              // same review queue rather than stranding them here.
              <Button
                size="sm"
                onClick={() =>
                  navigate(
                    buildIngestionReviewUrl({ id: batchId, datasetId }),
                  )
                }
              >
                <ClipboardList className="mr-1.5 size-3.5" />
                Review {buckets.awaiting.length}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/documents")}
            >
              Documents
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <StageFunnel buckets={buckets} />

        {roster.streamError && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {roster.streamError}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 text-xs">
          <span className="font-semibold text-gray-700">Documents</span>
          {hasFolders && (
            <button
              type="button"
              onClick={() =>
                setExpanded(allExpanded ? new Set() : new Set(folderPaths))
              }
              className="text-gray-400 transition-colors hover:text-indigo-600"
            >
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
        <div className="divide-y divide-gray-50">
          {rows.map(({ node, depth }) =>
            node.kind === "folder" ? (
              <BatchFolderRow
                key={`folder:${node.path}`}
                node={node}
                depth={depth}
                expanded={expanded.has(node.path)}
                onToggle={() => toggleFolder(node.path)}
              />
            ) : (
              <BatchFileRow
                key={`file:${node.id}`}
                name={node.name}
                size={node.size}
                document={node.data.document}
                isDeleted={node.data.isDeleted}
                onStop={(target) => setCancelTargets([target])}
                depth={depth}
                onOpen={() =>
                  navigate(
                    `/ingestions/status?document_id=${node.id}&dataset_id=${datasetId}`,
                  )
                }
              />
            ),
          )}
        </div>
      </div>

      <CancelIngestionDialog
        open={cancelTargets !== null}
        filename={
          cancelTargets?.length === 1 ? cancelTargets[0].filename : undefined
        }
        count={cancelTargets?.length ?? 0}
        isCancelling={isCancelling}
        onOpenChange={(open) => {
          if (!open && !isCancelling) setCancelTargets(null);
        }}
        onConfirm={() => void cancelDocuments(cancelTargets ?? [])}
      />
    </IngestionShell>
  );
}

type VisibleRow = { node: TreeNode<BatchRow>; depth: number };

function flattenVisible(
  nodes: TreeNode<BatchRow>[],
  expanded: Set<string>,
  depth = 0,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const node of nodes) {
    rows.push({ node, depth });
    if (node.kind === "folder" && expanded.has(node.path)) {
      rows.push(...flattenVisible(node.children, expanded, depth + 1));
    }
  }
  return rows;
}

function StageFunnel({
  buckets,
}: {
  buckets: ReturnType<typeof splitRosterByState>;
}) {
  const counts: Record<StageTone, number> = {
    running: buckets.processing.length,
    waiting: buckets.awaiting.length,
    done: buckets.completed.length,
    failed: buckets.failed.length,
    deleted: buckets.deletedIds.length,
    unknown: buckets.unknownIds.length,
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {FUNNEL_TONES.filter((tone) => counts[tone] > 0).map((tone) => (
        <span
          key={tone}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            STAGE_TONE_CLASSES[tone],
          )}
        >
          {counts[tone]} {TONE_LABELS[tone]}
        </span>
      ))}
    </div>
  );
}

function BatchFolderRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: TreeFolderNode<BatchRow>;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const FolderIcon = expanded ? FolderOpen : Folder;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="flex w-full items-center gap-2 py-2.5 pr-4 text-left transition-colors hover:bg-gray-50"
      style={{ paddingLeft: indentFor(depth) }}
    >
      <Chevron className="size-4 flex-shrink-0 text-gray-400" />
      <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50">
        <FolderIcon className="size-4 text-indigo-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">
          {node.name}
        </p>
        <p className="text-[11px] text-gray-400">
          {node.fileCount} document{node.fileCount === 1 ? "" : "s"}
          {node.totalSize > 0 && ` · ${formatFileSize(node.totalSize)}`}
        </p>
      </div>
      <span className="flex flex-shrink-0 items-center gap-1">
        {FUNNEL_TONES.filter((tone) => (node.statusCounts[tone] ?? 0) > 0).map(
          (tone) => (
            <span
              key={tone}
              title={`${node.statusCounts[tone]} ${TONE_LABELS[tone]}`}
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                STAGE_TONE_CLASSES[tone],
              )}
            >
              {node.statusCounts[tone]}
            </span>
          ),
        )}
      </span>
    </button>
  );
}

function BatchFileRow({
  name,
  size,
  document,
  isDeleted,
  depth,
  onOpen,
  onStop,
}: {
  name: string;
  size: number;
  document: TIngestionDocument | undefined;
  isDeleted: boolean;
  depth: number;
  onOpen: () => void;
  onStop: (document: TIngestionDocument) => void;
}) {
  const stage = describeStage(document, { isDeleted });
  const needsReview =
    !isDeleted &&
    document &&
    (isAwaitingApproval(document) || isMetadataReview(document));

  return (
    <div
      className="flex items-center gap-3 py-2.5 pr-4"
      style={{ paddingLeft: indentFor(depth) }}
    >
      <StageIcon tone={stage.tone} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            isDeleted ? "text-gray-400 line-through" : "text-gray-800",
          )}
        >
          {name}
        </p>
        <p className="text-[11px] text-gray-400">
          {size > 0 ? formatFileSize(size) : "—"}
        </p>
      </div>
      <span
        className={cn(
          "flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
          STAGE_TONE_CLASSES[stage.tone],
        )}
      >
        {stage.label}
      </span>
      {document && !isDeleted && isLiveInPipeline(document.processingStatus) && (
        <button
          type="button"
          onClick={() => onStop(document)}
          title="Stop processing this document"
          className="flex-shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <OctagonX className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onOpen}
        disabled={!document || isDeleted}
        className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-40"
      >
        {needsReview ? "Review" : "Stages"}
        <ArrowRight className="size-3" />
      </button>
    </div>
  );
}

function StageIcon({ tone }: { tone: StageTone }) {
  const icon =
    tone === "done" ? (
      <CheckCircle2 className="size-4 text-emerald-600" />
    ) : tone === "failed" ? (
      <AlertCircle className="size-4 text-red-500" />
    ) : tone === "waiting" ? (
      <ClipboardList className="size-4 text-violet-500" />
    ) : (
      <Loader2
        className={cn(
          "size-4 text-indigo-500",
          tone === "running" && "animate-spin",
        )}
      />
    );

  return (
    <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50">
      {icon}
    </div>
  );
}
