import { useEffect, useState } from "react";
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
import type {
  TBackendDocumentMutationResponse,
  TBackendFinalizeRequest,
  TBackendPrepareUploadRequest,
  TBackendPrepareUploadResponse,
} from "@/core/ingestions";
import axios from "axios";
import { AlertCircle, ArrowRight, ClipboardList, Zap } from "lucide-react";
import { DatasetPicker } from "./new-ingestion/dataset-picker";
import { Field } from "./new-ingestion/field";
import { FilePicker } from "./new-ingestion/file-picker";
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

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearItems = () => {
    setItems([]);
    setFinished(false);
  };

  // Upload one file end-to-end (presign → PUT → hash → finalize) and return the
  // resolved item with its outcome. Never throws — failures are captured on the
  // item so one bad file doesn't abort the batch.
  const uploadOne = async (item: UploadItem): Promise<UploadItem> => {
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
        headers: {
          ...prepareResponse.headers,
          "Content-Type": file.type || "application/octet-stream",
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
      };
    } catch (error) {
      return {
        ...item,
        status: "error",
        error: getApiErrorMessage(error, "Upload failed."),
      };
    }
  };

  // Run a bounded-concurrency upload pool over a set of items, updating each
  // row's status as it progresses. Returns the resolved items so the caller can
  // decide on navigation / toasts.
  const runUploads = async (targets: UploadItem[]): Promise<UploadItem[]> => {
    setIsSubmitting(true);
    setFinished(false);
    const targetIds = new Set(targets.map((item) => item.id));
    setItems((prev) =>
      prev.map((row) =>
        targetIds.has(row.id)
          ? { ...row, status: "pending", error: undefined }
          : row,
      ),
    );

    const queue = [...targets];
    const results: UploadItem[] = [];

    const worker = async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        setItems((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, status: "uploading" } : row,
          ),
        );
        const resolved = await uploadOne(item);
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

    setIsSubmitting(false);
    setFinished(true);
    return results;
  };

  const handleStart = async () => {
    if (!selectedDataset || items.length === 0 || isSubmitting) {
      return;
    }

    const results = await runUploads(items);
    const succeeded = results.filter(
      (item) => item.status === "done" || item.status === "duplicate",
    );
    const failed = results.filter((item) => item.status === "error");

    // Single-file upload preserves the original UX: jump straight to its status
    // page. Bulk stays here and shows the per-file outcome.
    if (results.length === 1 && succeeded.length === 1) {
      navigate(
        `/ingestions/status?document_id=${succeeded[0].documentId}&dataset_id=${selectedDataset}`,
      );
      return;
    }

    if (failed.length === 0) {
      toast.success(`Started ingestion for ${succeeded.length} file(s).`);
    } else if (succeeded.length === 0) {
      toast.error(`All ${failed.length} upload(s) failed.`);
    } else {
      toast.info(
        `${succeeded.length} started, ${failed.length} failed. Review the list below.`,
      );
    }
  };

  const retryFailed = async () => {
    if (isSubmitting) return;
    const failedItems = items.filter((item) => item.status === "error");
    if (failedItems.length === 0) return;
    const results = await runUploads(failedItems);
    const stillFailed = results.filter((item) => item.status === "error");
    if (stillFailed.length === 0) {
      toast.success(`Retried ${results.length} file(s) successfully.`);
    } else {
      toast.error(`${stillFailed.length} of ${results.length} still failed.`);
    }
  };

  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);
  const completedCount = items.filter(
    (item) =>
      item.status === "done" ||
      item.status === "duplicate" ||
      item.status === "error",
  ).length;
  const startedCount = items.filter((item) => item.status === "done").length;
  const duplicateCount = items.filter(
    (item) => item.status === "duplicate",
  ).length;
  const failedCount = items.filter((item) => item.status === "error").length;
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
              onRemove={removeItem}
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
                description="Review and approve each stage: extract, chunk, summarize, embed, index."
                time="~5–10 min"
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
              startedCount={startedCount}
              duplicateCount={duplicateCount}
              failedCount={failedCount}
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
              onStart={() => void handleStart()}
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
    </div>
  );
}
