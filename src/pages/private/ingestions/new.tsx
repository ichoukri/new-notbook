import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { backendApi } from "@/core/api";
import { env } from "@/config/env";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  formatFileSize,
  mapBackendDataset,
} from "@/core/datasets";
import type {
  TBackendDocumentMutationResponse,
  TBackendFinalizeRequest,
  TBackendPrepareUploadRequest,
  TBackendPrepareUploadResponse,
} from "@/core/ingestions";
import axios from "axios";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Database,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Music,
  Search,
  Sparkles,
  Upload,
  Video,
  X,
  Zap,
} from "lucide-react";

type IconComponent = typeof FileText;
type IngestionMode = "auto" | "guided";
const MAX_FILE_SIZE_BYTES = env.VITE_MAX_UPLOAD_MB * 1024 * 1024;
const SUPPORTED_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".txt",
  ".csv",
  ".json",
  ".jsonl",
  ".md",
  ".html",
  ".htm",
  ".pptx",
  ".xlsx",
] as const;

const EXT_ICON: Record<string, { icon: IconComponent; color: string }> = {
  pdf: { icon: FileText, color: "text-red-500 bg-red-50" },
  docx: { icon: FileText, color: "text-blue-500 bg-blue-50" },
  doc: { icon: FileText, color: "text-blue-500 bg-blue-50" },
  xlsx: { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
  csv: { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" },
  pptx: { icon: FileImage, color: "text-orange-500 bg-orange-50" },
  json: { icon: FileCode, color: "text-purple-500 bg-purple-50" },
  jsonl: { icon: FileCode, color: "text-purple-500 bg-purple-50" },
  md: { icon: FileCode, color: "text-gray-600 bg-gray-100" },
  txt: { icon: FileText, color: "text-gray-600 bg-gray-100" },
  html: { icon: FileCode, color: "text-orange-600 bg-orange-50" },
  mp4: { icon: Video, color: "text-pink-600 bg-pink-50" },
  mp3: { icon: Music, color: "text-violet-600 bg-violet-50" },
};

const FILE_TYPES = ["PDF", "DOCX", "TXT", "CSV", "JSON", "JSONL", "MD", "HTML", "PPTX", "XLSX"];

function getFileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function validateSelectedFile(file: File): string | null {
  const extension = `.${getFileExt(file.name)}`;

  if (!SUPPORTED_FILE_EXTENSIONS.includes(extension as (typeof SUPPORTED_FILE_EXTENSIONS)[number])) {
    return "Unsupported file type for auto ingestion.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size exceeds the ${env.VITE_MAX_UPLOAD_MB} MB limit.`;
  }

  return null;
}

function getFileInfo(file: File) {
  return (
    EXT_ICON[getFileExt(file.name)] ?? {
      icon: FileText,
      color: "text-gray-500 bg-gray-100",
    }
  );
}

export default function NewIngestionPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<IngestionMode>("auto");
  const [dragOver, setDragOver] = useState(false);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(true);
  const [datasetsError, setDatasetsError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleFileChange = (nextFile: File | null) => {
    if (nextFile) {
      const validationError = validateSelectedFile(nextFile);
      if (validationError) {
        toast.error(validationError);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setFile(null);
        return;
      }
    }

    setFile(nextFile);
    if (!nextFile && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const nextFile = event.dataTransfer.files[0];
    if (nextFile) {
      handleFileChange(nextFile);
    }
  };

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (nextFile) {
      handleFileChange(nextFile);
    }
  };

  const handleStart = async () => {
    if (!selectedDataset || !file || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Get presigned upload URL
      const prepareResponse = await backendApi.create<
        TBackendPrepareUploadResponse,
        TBackendPrepareUploadRequest
      >(`/documents/${selectedDataset}/prepare-upload`, {
        filename: file.name,
        file_size: file.size,
        content_type: file.type || null,
      });

      // Step 2: Upload file directly to storage
      await axios.put(prepareResponse.upload_url, file, {
        headers: {
          ...prepareResponse.headers,
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      // Step 3: Compute SHA-256 hash
      const fileBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      // Step 4: Finalize upload and start processing. Pass ``mode`` so the
      // backend orchestrator decides whether to chain (auto) or pause after
      // each stage (guided).
      const finalizeResponse = await backendApi.create<
        TBackendDocumentMutationResponse,
        TBackendFinalizeRequest
      >(`/documents/${selectedDataset}/finalize`, {
        document_id: prepareResponse.document_id,
        object_key: prepareResponse.object_key,
        filename: file.name,
        file_size: file.size,
        sha256,
        content_type: file.type || null,
        mode,
      });

      toast.success(
        mode === "guided"
          ? "Guided ingestion started. You'll be asked to approve each stage."
          : "Auto ingestion started.",
      );
      // Both modes use the same status page for now — the page renders an
      // "Awaiting your review" panel when status hits a ``*_AWAITING_APPROVAL``
      // state, and the standard in-progress UI otherwise.
      navigate(
        `/ingestions/status?document_id=${finalizeResponse.data.id}&dataset_id=${selectedDataset}`,
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, "Could not upload and start ingestion."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canStart =
    Boolean(selectedDataset) && Boolean(file) && !isSubmitting;
  const filledCount = [Boolean(selectedDataset), Boolean(file), true].filter(Boolean).length;

  const hint =
    !selectedDataset
      ? "Create or select a dataset to continue"
      : !file
        ? "Upload a file to continue"
        : `${mode === "guided" ? "Guided" : "Auto"} mode is ready`;

  return (
    <div className="flex flex-col flex-1 overflow-auto bg-gray-50/60">
      <Topbar title="New Ingestion" breadcrumbs={[{ label: "Ingestions" }]} />

      <main className="flex-1 flex flex-col items-center px-6 pt-6 pb-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="size-3.5" />
            AI-powered ingestion
          </div>
          <h1 className="text-[28px] font-bold text-gray-900 tracking-tight">
            New Ingestion
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            Upload a document, choose a dataset, and start the ingestion pipeline.
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

          <Field label="File" done={Boolean(file)}>
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative border-2 border-dashed rounded-2xl cursor-pointer transition-all select-none overflow-hidden",
                  dragOver
                    ? "border-indigo-400 bg-indigo-50/60"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20 bg-white",
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={SUPPORTED_FILE_EXTENSIONS.join(",")}
                  onChange={handleSelect}
                />

                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all",
                      dragOver ? "bg-indigo-100 scale-110" : "bg-gray-100",
                    )}
                  >
                    <Upload
                      className={cn(
                        "size-6 transition-colors",
                        dragOver ? "text-indigo-500" : "text-gray-400",
                      )}
                    />
                  </div>

                  <p
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      dragOver ? "text-indigo-700" : "text-gray-700",
                    )}
                  >
                    {dragOver ? "Release to upload" : "Drop your file here"}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    or{" "}
                    <span className="text-indigo-600 font-medium underline underline-offset-2">
                      browse files
                    </span>
                  </p>

                  <div className="flex flex-wrap justify-center gap-1.5 mt-5">
                    {FILE_TYPES.map((type) => (
                      <span
                        key={type}
                        className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md tracking-wide"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Max {env.VITE_MAX_UPLOAD_MB} MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3.5 px-4 py-4 bg-white rounded-2xl border border-emerald-200 shadow-sm">
                {(() => {
                  const { icon: Icon, color } = getFileInfo(file);
                  const [textColor, bgColor] = color.split(" ");
                  return (
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                        bgColor,
                      )}
                    >
                      <Icon className={cn("size-5", textColor)} />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatFileSize(file.size)} · Ready to process
                  </p>
                </div>
                <CheckCircle2 className="size-5 text-emerald-500 flex-shrink-0" />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleFileChange(null);
                  }}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
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

          <div className="pt-1 space-y-3">
            <div className="flex items-center justify-center gap-2">
              {["Dataset", "File", "Mode"].map((label, index) => {
                const done = index < filledCount;
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        done ? "bg-emerald-500" : "bg-gray-300",
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors",
                        done ? "text-emerald-600" : "text-gray-400",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={!canStart}
              className={cn(
                "w-full h-12 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-200",
                canStart
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200 active:scale-[0.99]"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting Ingestion
                </>
              ) : canStart ? (
                <>
                  {mode === "guided" ? (
                    <ClipboardList className="size-4" />
                  ) : (
                    <Zap className="size-4" />
                  )}
                  {mode === "guided"
                    ? "Start Guided Ingestion"
                    : "Start Auto Ingestion"}
                  <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  {hint}
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  done,
  children,
}: {
  label: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
          {label}
        </span>
        {done && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
            <CheckCircle2 className="size-2.5" /> Done
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function ModeCard({
  selected,
  onSelect,
  accent,
  icon: Icon,
  badge,
  title,
  description,
  time,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  accent: "indigo" | "violet";
  icon: IconComponent;
  badge: string;
  title: string;
  description: string;
  time: string;
  disabled?: boolean;
}) {
  const colors = {
    indigo: {
      border: selected ? "border-indigo-300" : "border-gray-200 hover:border-indigo-200",
      bg: selected ? "bg-indigo-50/70" : "bg-white hover:bg-indigo-50/30",
      ring: selected ? "ring-1 ring-indigo-200" : "",
      iconBg: selected ? "bg-indigo-100" : "bg-gray-100",
      iconColor: selected ? "text-indigo-600" : "text-gray-400",
      badge: selected ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400",
      time: selected ? "text-indigo-500" : "text-gray-400",
    },
    violet: {
      border: selected ? "border-violet-300" : "border-gray-200 hover:border-violet-200",
      bg: selected ? "bg-violet-50/70" : "bg-white hover:bg-violet-50/30",
      ring: selected ? "ring-1 ring-violet-200" : "",
      iconBg: selected ? "bg-violet-100" : "bg-gray-100",
      iconColor: selected ? "text-violet-600" : "text-gray-400",
      badge: selected ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-400",
      time: selected ? "text-violet-500" : "text-gray-400",
    },
  }[accent];

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all w-full",
        colors.border,
        colors.bg,
        colors.ring,
        disabled && "opacity-70",
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
            colors.iconBg,
          )}
        >
          <Icon className={cn("size-4.5 transition-colors", colors.iconColor)} />
        </div>
        <span
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide transition-colors",
            colors.badge,
          )}
        >
          {badge}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center gap-1.5 mt-auto pt-1 w-full">
        <div
          className={cn(
            "w-1 h-1 rounded-full flex-shrink-0 transition-colors",
            selected
              ? accent === "indigo"
                ? "bg-indigo-400"
                : "bg-violet-400"
              : "bg-gray-300",
          )}
        />
        <span className={cn("text-[11px] font-medium transition-colors", colors.time)}>
          Avg. time: {time}
        </span>
      </div>
    </button>
  );
}

function DatasetPicker({
  datasets,
  value,
  onChange,
  isLoading,
  error,
  onOpenManage,
}: {
  datasets: TDataset[];
  value: string;
  onChange: (id: string) => void;
  isLoading: boolean;
  error: string;
  onOpenManage: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = datasets.find((dataset) => dataset.id === value) ?? null;
  const filtered = query.trim()
    ? datasets.filter((dataset) =>
        dataset.name.toLowerCase().includes(query.toLowerCase()),
      )
    : datasets;

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown);
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !isLoading && datasets.length > 0 && setOpen((current) => !current)}
        disabled={isLoading || datasets.length === 0}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 bg-white text-left transition-all",
          open
            ? "border-indigo-300 ring-2 ring-indigo-50 shadow-sm"
            : "border-gray-200 hover:border-indigo-200 hover:shadow-sm",
          (isLoading || datasets.length === 0) && "cursor-not-allowed opacity-80",
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <FolderOpen className="size-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <p className="text-sm text-gray-400">Loading datasets…</p>
          ) : selected ? (
            <>
              <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                {selected.name}
              </p>
              <p className="text-xs text-gray-400 leading-tight mt-0.5">
                {selected.documentCount} docs · {selected.status}
              </p>
            </>
          ) : datasets.length === 0 ? (
            <p className="text-sm text-gray-400">No datasets available</p>
          ) : (
            <p className="text-sm text-gray-400">Select a dataset…</p>
          )}
        </div>
        {isLoading ? (
          <Loader2 className="size-4 text-gray-400 animate-spin flex-shrink-0" />
        ) : (
          <ChevronDown
            className={cn(
              "size-4 text-gray-400 transition-transform flex-shrink-0",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
            <Search className="size-4 text-gray-400 flex-shrink-0" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search datasets…"
              className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1.5">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Database className="size-6 text-gray-300" />
                <p className="text-xs text-gray-400">
                  {datasets.length === 0 && !error
                    ? "Create a dataset before starting ingestion."
                    : `No datasets match "${query}"`}
                </p>
              </div>
            ) : (
              filtered.map((dataset) => {
                const selectedItem = dataset.id === value;
                return (
                  <button
                    key={dataset.id}
                    type="button"
                    onClick={() => {
                      onChange(dataset.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 transition-all text-left",
                      selectedItem ? "bg-indigo-50" : "hover:bg-gray-50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                        selectedItem ? "bg-indigo-100" : "bg-gray-100",
                      )}
                    >
                      <FolderOpen
                        className={cn(
                          "size-3.5",
                          selectedItem ? "text-indigo-600" : "text-gray-400",
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          selectedItem ? "text-indigo-900" : "text-gray-800",
                        )}
                      >
                        {dataset.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {dataset.documentCount} docs · {dataset.tags.join(", ") || "No tags"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          dataset.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500",
                        )}
                      >
                        {dataset.status}
                      </span>
                      {selectedItem && (
                        <CheckCircle2 className="size-4 text-indigo-500" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between bg-gray-50/50">
            <p className="text-xs text-gray-400">{datasets.length} datasets</p>
            <button
              type="button"
              onClick={onOpenManage}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              Manage datasets →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
