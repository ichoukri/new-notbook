import { useRef, useState, type FormEvent } from "react";
import { ArchiveRestore, FileArchive, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendTransferJob,
  getTransferStageLabel,
  pollTransferJob,
  prepareImportUpload,
  startDatasetImport,
  uploadImportArchive,
} from "@/core/dataset-transfer";

type ImportPhase = "idle" | "uploading" | "importing";

export function ImportDatasetDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (job: TBackendTransferJob) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [stageLabel, setStageLabel] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = phase !== "idle";

  const resetForm = () => {
    setFile(null);
    setName("");
    setPhase("idle");
    setStageLabel("");
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    if (isBusy) {
      return;
    }
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError("Choose a dataset archive (.zip) to import.");
      return;
    }

    setError("");
    try {
      setPhase("uploading");
      setStageLabel("Uploading archive");
      const target = await prepareImportUpload();
      await uploadImportArchive(target, file);

      setPhase("importing");
      const startedJob = await startDatasetImport({
        archive_key: target.archive_key,
        name: name.trim() || undefined,
      });
      const job = await pollTransferJob(startedJob.id, (currentJob) => {
        setStageLabel(getTransferStageLabel(currentJob));
      });

      if (job.status === "failed") {
        setError(job.error || "Import failed.");
        setPhase("idle");
        return;
      }

      resetForm();
      onImported(job);
      onClose();
    } catch (importError) {
      setError(getApiErrorMessage(importError, "Could not import dataset."));
      setPhase("idle");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleCancel();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <ArchiveRestore className="size-4 text-indigo-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Import Dataset</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Restore a dataset from an exported archive as a new copy
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Archive File
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              disabled={isBusy}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }}
              className="hidden"
              id="dataset-archive-input"
            />
            <label
              htmlFor="dataset-archive-input"
              className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 text-sm text-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <FileArchive className="size-5 text-gray-400" />
              {file ? (
                <span className="flex items-center gap-2 font-medium text-gray-700">
                  {file.name}
                  {!isBusy && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </span>
              ) : (
                <span>Click to choose a dataset archive (.zip)</span>
              )}
            </label>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                New Dataset Name
              </Label>
              <span className="text-[11px] text-gray-400">Optional</span>
            </div>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Defaults to the archived dataset's name"
              className="rounded-xl h-10"
              disabled={isBusy}
            />
          </div>

          {isBusy && (
            <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm text-indigo-700">
              <Loader2 className="size-4 animate-spin" />
              {stageLabel || "Working"}…
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 mt-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isBusy}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || !file}
              className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              {isBusy && <Loader2 className="size-4 animate-spin" />}
              Import Dataset
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
