import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { backendApi } from "@/core/api";
import { env } from "@/config/env";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendDocumentMutationResponse,
  type TBackendFinalizeRequest,
  type TBackendPrepareUploadRequest,
  type TBackendPrepareUploadResponse,
  isLiveInPipeline,
} from "@/core/ingestions";
import axios from "axios";
import { AlertCircle, ArrowRight, ClipboardList, Zap } from "lucide-react";
import {
  buildIngestionBatchUrl,
  buildIngestionReviewUrl,
  createIngestionBatchId,
  dedupeDocumentIds,
  saveIngestionBatch,
} from "@/core/batches";
import { DatasetPicker } from "./new-ingestion/dataset-picker";
import { Field } from "./new-ingestion/field";
import { FilePicker } from "./new-ingestion/file-picker";
import {
  GUIDED_CONFIRM_THRESHOLD,
  GuidedBatchDialog,
} from "./new-ingestion/guided-batch-dialog";
import { ModeCard } from "./new-ingestion/mode-card";
import { ReadinessSteps } from "./new-ingestion/readiness-steps";
import { ResultSummary } from "./new-ingestion/result-summary";
import { StartIngestionButton } from "./new-ingestion/start-ingestion-button";
import type { IngestionMode, UploadItem } from "./new-ingestion/types";
import {
  UPLOAD_CONCURRENCY,
  buildUploadFileMetadata,
  collectAcceptedFiles,
  getFileRelativePath,
  makeItemId,
} from "./new-ingestion/upload-files";

export default function NewIngestionPage() {
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [mode, setMode] = useState<IngestionMode>("auto");
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [datasetsError, setDatasetsError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showGuidedConfirm, setShowGuidedConfirm] = useState(false);
  const uploadAbortRef = useRef<AbortController | null>(null);

  // Abandon in-flight transfers if the page goes away mid-batch.
  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  useEffect(() => {
    let cancelled = false;

    const loadDatasets = async () => {
      setIsLoadingDatasets(true);
      setDatasetsError("");

      try {
        const response = await backendApi.findMany<TBackendDataset>(
          "/datasets/",
          {
            include_documents: "true",
            limit: "100",
          },
        );

        if (cancelled) {
          return;
        }

        const nextDatasets = response.map(mapBackendDataset);
        setDatasets(nextDatasets);
        setSelectedDataset((currentValue) => {
          if (currentValue && nextDatasets.some((dataset) => dataset.id === currentValue)) {
            return currentValue;
          }

          return nextDatasets[0]?.id ?? "";
        });
      } catch (error) {
        if (!cancelled) {
          setDatasetsError(getApiErrorMessage(error, "Could not load datasets."));
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

  // Add a batch of files to the selection: keep supported/in-size ones, dedupe
  // against what's already chosen, and surface a one-line summary.
  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const {
      accepted,
      skippedMacOSSidecars,
      skippedHidden,
      skippedUnsupported,
      skippedOversize,
    } = collectAcceptedFiles(incoming);

    // Dedupe purely against the current selection — never inside the state
    // updater (React invokes updaters twice in StrictMode, which would
    // double-count). Compute the new rows and counts up front.
    const existingIds = new Set(items.map((item) => item.id));
    const fresh: UploadItem[] = [];
    let duplicates = 0;
    for (const file of accepted) {
      const id = makeItemId(file);
      if (existingIds.has(id)) {
        duplicates += 1;
        continue;
      }
      existingIds.add(id);
      fresh.push({
        id,
        file,
        relativePath: getFileRelativePath(file),
        status: "pending",
      });
    }

    if (fresh.length > 0) {
      // The updater re-dedupes against the latest state so a double-invoke (or
      // a rapid second call) can't add the same file twice — idempotent.
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...fresh.filter((item) => !seen.has(item.id))];
      });
      setFinished(false);
    }

    const skipped: string[] = [];
    if (skippedMacOSSidecars > 0)
      skipped.push(
        `${skippedMacOSSidecars} macOS sidecar${skippedMacOSSidecars === 1 ? "" : "s"}`,
      );
    if (skippedHidden > 0)
      skipped.push(`${skippedHidden} hidden/system file${skippedHidden === 1 ? "" : "s"}`);
    if (skippedUnsupported > 0)
      skipped.push(
        `${skippedUnsupported} unsupported file${skippedUnsupported === 1 ? "" : "s"}`,
      );
    if (skippedOversize > 0)
      skipped.push(`${skippedOversize} over ${env.VITE_MAX_UPLOAD_MB} MB`);
    if (duplicates > 0) skipped.push(`${duplicates} already added`);

    if (fresh.length > 0) {
      toast.success(
        skipped.length
          ? `Added ${fresh.length} file(s) · skipped ${skipped.join(", ")}.`
          : `Added ${fresh.length} file${fresh.length === 1 ? "" : "s"}.`,
      );
    } else if (skipped.length > 0) {
      toast.error(`No files added — skipped ${skipped.join(", ")}.`);
    }
  };

  // Takes a list so a folder row can drop its whole subtree in one action.
  const removeItems = (ids: string[]) => {
    const removed = new Set(ids);
    setItems((prev) => prev.filter((item) => !removed.has(item.id)));
  };

  const clearItems = () => {
    setItems([]);
    setFinished(false);
  };

  // Upload one file end-to-end (presign → PUT → hash → finalize) and return the
  // resolved item with its outcome. Never throws — failures are captured on the
  // item so one bad file doesn't abort the batch.
  const uploadOne = async (
    item: UploadItem,
    signal: AbortSignal,
  ): Promise<UploadItem> => {
    const { file } = item;
    const uploadMetadata = buildUploadFileMetadata(file, item.relativePath);
    try {
      const prepareResponse = await backendApi.create<
        TBackendPrepareUploadResponse,
        TBackendPrepareUploadRequest
      >(
        `/documents/${selectedDataset}/prepare-upload`,
        uploadMetadata,
      );

      await axios.put(prepareResponse.upload_url, file, {
        signal,
        headers: {
          ...prepareResponse.headers,
          "Content-Type": file.type || "application/octet-stream",
        },
        onUploadProgress: (event) => {
          // ``total`` is absent when the transfer is not measurable; leaving
          // progress undefined keeps the row on an indeterminate bar rather
          // than inventing a percentage.
          if (!event.total) return;
          const ratio = Math.min(event.loaded / event.total, 1);
          setItems((prev) =>
            prev.map((row) =>
              row.id === item.id ? { ...row, progress: ratio } : row,
            ),
          );
        },
      });

      const fileBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
      const sha256 = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const finalizeResponse = await backendApi.create<
        TBackendDocumentMutationResponse,
        TBackendFinalizeRequest
      >(`/documents/${selectedDataset}/finalize`, {
        document_id: prepareResponse.document_id,
        object_key: prepareResponse.object_key,
        ...uploadMetadata,
        sha256,
        mode,
      });

      const isDuplicate =
        Boolean(finalizeResponse.duplicate) && !finalizeResponse.reingested;
      return {
        ...item,
        status: isDuplicate ? "duplicate" : "done",
        documentId: finalizeResponse.data.id,
        datasetId: selectedDataset,
        detail: isDuplicate ? finalizeResponse.message : undefined,
        processingStatus: finalizeResponse.data.processing_status,
        progress: 1,
      };
    } catch (error) {
      // A cancelled transfer is a user decision, not a failure — surfacing it
      // as an error would invite a pointless retry.
      if (axios.isCancel(error) || signal.aborted) {
        return {
          ...item,
          status: "cancelled",
          progress: undefined,
        };
      }
      return {
        ...item,
        status: "error",
        error: getApiErrorMessage(error, "Upload failed."),
        progress: undefined,
      };
    }
  };

  // Run a bounded-concurrency upload pool over a set of items, updating each
  // row's status as it progresses. Returns the resolved items so the caller can
  // decide on navigation / toasts.
  const runUploads = async (targets: UploadItem[]): Promise<UploadItem[]> => {
    setIsSubmitting(true);
    setFinished(false);
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    const targetIds = new Set(targets.map((item) => item.id));
    setItems((prev) =>
      prev.map((row) =>
        targetIds.has(row.id)
          ? { ...row, status: "pending", error: undefined, progress: undefined }
          : row,
      ),
    );

    const queue = [...targets];
    const results: UploadItem[] = [];

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        // Items still queued when the user cancels are reported as cancelled
        // rather than left pending, so the result summary accounts for all of
        // them and the retry action can pick them up.
        if (controller.signal.aborted) {
          const skipped: UploadItem = { ...item, status: "cancelled" };
          results.push(skipped);
          setItems((prev) =>
            prev.map((row) => (row.id === skipped.id ? skipped : row)),
          );
          continue;
        }
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id
              ? { ...row, status: "uploading", progress: undefined }
              : row,
          ),
        );
        const resolved = await uploadOne(item, controller.signal);
        results.push(resolved);
        setItems((prev) =>
          prev.map((row) => (row.id === resolved.id ? resolved : row)),
        );
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, targets.length) }, () =>
        worker(),
      ),
    );

    uploadAbortRef.current = null;
    setIsSubmitting(false);
    setFinished(true);
    return results;
  };

  const cancelUploads = () => {
    uploadAbortRef.current?.abort();
    toast.info("Cancelling — uploads already finished will keep ingesting.");
  };

  const handleStart = async () => {
    if (!selectedDataset || items.length === 0 || isSubmitting) {
      return;
    }

    const results = await runUploads(items);
    const started = results.filter((item) => item.status === "done");
    const cancelled = results.filter((item) => item.status === "cancelled");
    const duplicates = results.filter((item) => item.status === "duplicate");
    const failed = results.filter((item) => item.status === "error");

    // A cancelled run stays put: navigating away would hide what did and did
    // not make it through, which is exactly what the user just asked about.
    if (cancelled.length > 0) {
      toast.info(
        `Cancelled — ${started.length + duplicates.length} of ${results.length} uploaded before stopping.`,
      );
      return;
    }

    // Single-file upload preserves the original UX: jump straight to its status
    // page (for a duplicate this attaches to the existing document's stages).
    // Bulk stays here and shows the per-file outcome with stage links.
    if (results.length === 1 && failed.length === 0) {
      navigate(
        `/ingestions/status?document_id=${results[0].documentId}&dataset_id=${selectedDataset}`,
      );
      return;
    }

    // Guided mode pauses every document for approval, so a bulk run would
    // otherwise strand documents with no way to find them. Membership is decided
    // by the document's own status, not by the upload outcome: a duplicate the
    // backend returned untouched is often already sitting at an approval gate,
    // and excluding it strands exactly the document the queue exists to surface.
    // Deduped because content-hash matching can finalize several uploaded files
    // onto one canonical document.
    const reviewableIds = dedupeDocumentIds(
      results
        .filter(
          (item) =>
            item.documentId &&
            item.processingStatus &&
            isLiveInPipeline(item.processingStatus),
        )
        .map((item) => item.documentId as string),
    );

    if (mode === "guided" && reviewableIds.length > 0) {
      const batch = {
        id: createIngestionBatchId(),
        datasetId: selectedDataset,
        mode: "guided" as const,
        documentIds: reviewableIds,
        startedAt: new Date().toISOString(),
      };

      // Only navigate if the roster actually survived. Without it the review
      // page can only render a dead end, so staying here with the result list
      // is strictly better.
      if (saveIngestionBatch(batch)) {
        if (failed.length > 0) {
          toast.warning(
            `${reviewableIds.length} queued for review · ${failed.length} failed to upload.`,
          );
        }
        navigate(buildIngestionReviewUrl(batch));
        return;
      }

      toast.error(
        "Could not open the review queue in this browser. Your documents are still ingesting — open them from the list below.",
      );
    }

    // Auto mode with several documents: the pipeline keeps running server-side
    // long after the uploads finish, so hand the batch to the live view instead
    // of leaving the user on this form with a frozen count.
    if (mode === "auto" && reviewableIds.length > 1) {
      const batch = {
        id: createIngestionBatchId(),
        datasetId: selectedDataset,
        mode: "auto" as const,
        documentIds: reviewableIds,
        startedAt: new Date().toISOString(),
      };

      if (saveIngestionBatch(batch)) {
        if (failed.length > 0) {
          toast.warning(
            `${reviewableIds.length} ingesting · ${failed.length} failed to upload.`,
          );
        }
        navigate(buildIngestionBatchUrl(batch));
        return;
      }

      toast.error(
        "Could not open the batch view in this browser. Your documents are still ingesting — open them from the list below.",
      );
    }

    if (failed.length > 0) {
      if (started.length === 0 && duplicates.length === 0) {
        toast.error(`All ${failed.length} upload(s) failed.`);
      } else {
        toast.info(
          `${started.length} started, ${duplicates.length} already in the dataset, ${failed.length} failed. Review the list below.`,
        );
      }
    } else if (started.length === 0) {
      toast.info(
        `No new ingestions started — all ${duplicates.length} file(s) already exist in this dataset. Open a file's stages to review it.`,
      );
    } else if (duplicates.length > 0) {
      toast.success(
        `Started ingestion for ${started.length} file(s) · ${duplicates.length} already in the dataset.`,
      );
    } else {
      toast.success(`Started ingestion for ${started.length} file(s).`);
    }
  };

  // Guided at scale is a real commitment, so confirm before spending it.
  const requestStart = () => {
    if (mode === "guided" && items.length > GUIDED_CONFIRM_THRESHOLD) {
      setShowGuidedConfirm(true);
      return;
    }
    void handleStart();
  };

  // Cancelled files are resumable, not discarded: stopping a 200-file batch
  // would otherwise strand everything that had not started, with no way back
  // except clearing the selection and re-dropping the folder.
  const retryFailed = async () => {
    if (isSubmitting) return;
    const resumable = items.filter(
      (item) => item.status === "error" || item.status === "cancelled",
    );
    if (resumable.length === 0) return;
    const results = await runUploads(resumable);
    const stillFailed = results.filter((item) => item.status === "error");
    const stillCancelled = results.filter(
      (item) => item.status === "cancelled",
    );
    if (stillFailed.length === 0 && stillCancelled.length === 0) {
      toast.success(`Uploaded ${results.length} remaining file(s).`);
    } else if (stillCancelled.length > 0) {
      toast.info(
        `Stopped again — ${results.length - stillCancelled.length} of ${results.length} uploaded.`,
      );
    } else {
      toast.error(`${stillFailed.length} of ${results.length} still failed.`);
    }
  };

  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);
  const completedCount = items.filter(
    (item) =>
      item.status === "done" ||
      item.status === "duplicate" ||
      item.status === "error" ||
      item.status === "cancelled",
  ).length;
  // Weighted by size so one large file cannot make the bar jump; a settled item
  // counts as fully transferred whatever its last reported progress was.
  const uploadedBytes = items.reduce((sum, item) => {
    if (item.status === "done" || item.status === "duplicate") {
      return sum + item.file.size;
    }
    return sum + item.file.size * (item.progress ?? 0);
  }, 0);
  const uploadedRatio = totalSize > 0 ? uploadedBytes / totalSize : 0;
  const startedCount = items.filter((item) => item.status === "done").length;
  const duplicateCount = items.filter(
    (item) => item.status === "duplicate",
  ).length;
  const failedCount = items.filter((item) => item.status === "error").length;
  const cancelledCount = items.filter(
    (item) => item.status === "cancelled",
  ).length;
  const canStart =
    Boolean(selectedDataset) && items.length > 0 && !isSubmitting;
  const filledCount = [
    Boolean(selectedDataset),
    items.length > 0,
    true,
  ].filter(Boolean).length;

  const hint =
    !selectedDataset
      ? "Create or select a dataset to continue"
      : items.length === 0
        ? "Add files or a folder to continue"
        : `${mode === "guided" ? "Guided" : "Auto"} mode is ready`;

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/60">
      <Topbar title="New Ingestion" breadcrumbs={[{ label: "Ingestions" }]} />

      <main className="flex-1 flex flex-col items-center px-6 pt-6 pb-10">
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">
            New Ingestion
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Upload one or many files (or a whole folder), choose a dataset, and
            start the ingestion pipeline.
          </p>
        </div>

        <div className="w-full max-w-[520px] space-y-6">
          <Field label="Dataset" done={Boolean(selectedDataset)}>
            <DatasetPicker
              datasets={datasets}
              value={selectedDataset}
              onChange={setSelectedDataset}
              isLoading={isLoadingDatasets}
              error={datasetsError}
              onOpenManage={() => navigate("/datasets")}
            />
          </Field>

          <Field label="Files" done={items.length > 0}>
            <FilePicker
              items={items}
              totalSize={totalSize}
              completedCount={completedCount}
              isSubmitting={isSubmitting}
              onAddFiles={addFiles}
              onClear={clearItems}
              onRemove={removeItems}
              onOpenItemStatus={(item) =>
                navigate(
                  `/ingestions/status?document_id=${item.documentId}&dataset_id=${item.datasetId ?? selectedDataset}`,
                )
              }
            />
          </Field>

          <Field label="Ingestion Mode" done>
            <div className="grid grid-cols-2 gap-3">
              <ModeCard
                selected={mode === "auto"}
                onSelect={() => setMode("auto")}
                accent="indigo"
                icon={Zap}
                badge="Backend Ready"
                title="Auto Mode"
                description="Uploads, extracts, chunks, summarizes, and indexes the document end to end."
                time="~2 min"
              />
              <ModeCard
                selected={mode === "guided"}
                onSelect={() => setMode("guided")}
                accent="violet"
                icon={ClipboardList}
                badge="Backend Ready"
                title="Guided Mode"
                description={
                  items.length > 1
                    ? `Review each stage of all ${items.length} documents: extract, chunk, summarize, approve the knowledge graph, embed, and publish.`
                    : "Review each stage: extract, chunk, summarize, approve the knowledge graph, embed, and publish."
                }
                time={
                  items.length > 1
                    ? `~5–10 min × ${items.length} documents`
                    : "~5–10 min"
                }
              />
            </div>
          </Field>

          {datasetsError && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
              <p>{datasetsError}</p>
            </div>
          )}

          {finished && !isSubmitting && items.length > 0 && (
            <ResultSummary
              items={items}
              startedCount={startedCount}
              duplicateCount={duplicateCount}
              failedCount={failedCount}
              cancelledCount={cancelledCount}
              onRetryFailed={() => void retryFailed()}
            />
          )}

          <div className="pt-1 space-y-3">
            <ReadinessSteps filledCount={filledCount} />

            <StartIngestionButton
              canStart={canStart}
              isSubmitting={isSubmitting}
              completedCount={completedCount}
              itemCount={items.length}
              mode={mode}
              hint={hint}
              uploadedRatio={uploadedRatio}
              onStart={requestStart}
              onCancel={cancelUploads}
            />

            {finished && items.length > 0 && !isSubmitting && (
              <button
                type="button"
                onClick={() => navigate("/documents")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
              >
                View documents
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      <GuidedBatchDialog
        open={showGuidedConfirm}
        fileCount={items.length}
        onOpenChange={setShowGuidedConfirm}
        onConfirm={() => {
          setShowGuidedConfirm(false);
          void handleStart();
        }}
        onSwitchToAuto={() => {
          setShowGuidedConfirm(false);
          setMode("auto");
        }}
      />
    </div>
  );
}
