import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Music,
  Upload,
  Video,
  X,
} from "lucide-react";
import { env } from "@/config/env";
import { formatFileSize } from "@/core/datasets";
import { cn } from "@/lib/utils";
import type { IconComponent, UploadItem } from "./types";
import { getFileExt, readDataTransferFiles, SUPPORTED_FILE_EXTENSIONS } from "./upload-files";

const FILE_TYPES = [
  "PDF",
  "DOCX",
  "TXT",
  "CSV",
  "JSON",
  "JSONL",
  "MD",
  "HTML",
  "PPTX",
  "XLSX",
  "Images",
];

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
  png: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  jpg: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  jpeg: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  tif: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  tiff: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  bmp: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  webp: { icon: FileImage, color: "text-teal-600 bg-teal-50" },
  mp4: { icon: Video, color: "text-pink-600 bg-pink-50" },
  mp3: { icon: Music, color: "text-violet-600 bg-violet-50" },
};

function getFileInfo(file: File) {
  return (
    EXT_ICON[getFileExt(file.name)] ?? {
      icon: FileText,
      color: "text-gray-500 bg-gray-100",
    }
  );
}

export function FilePicker({
  items,
  totalSize,
  completedCount,
  isSubmitting,
  onAddFiles,
  onClear,
  onRemove,
}: {
  items: UploadItem[];
  totalSize: number;
  completedCount: number;
  isSubmitting: boolean;
  onAddFiles: (files: File[]) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
  }, []);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    void readDataTransferFiles(event.dataTransfer).then(onAddFiles);
  };

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    onAddFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={SUPPORTED_FILE_EXTENSIONS.join(",")}
        onChange={handleSelect}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleSelect}
      />

      <div
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative cursor-pointer select-none overflow-hidden rounded-2xl border-2 border-dashed transition-all",
          dragOver
            ? "border-indigo-400 bg-indigo-50/60"
            : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20",
        )}
      >
        {items.length === 0 ? (
          <EmptyFilePicker
            dragOver={dragOver}
            onBrowseFiles={() => fileInputRef.current?.click()}
            onBrowseFolder={() => folderInputRef.current?.click()}
          />
        ) : (
          <CompactFilePicker
            onBrowseFiles={() => fileInputRef.current?.click()}
            onBrowseFolder={() => folderInputRef.current?.click()}
          />
        )}
      </div>

      {items.length > 0 && (
        <SelectedFilesPanel
          items={items}
          totalSize={totalSize}
          completedCount={completedCount}
          isSubmitting={isSubmitting}
          onClear={onClear}
          onRemove={onRemove}
        />
      )}
    </>
  );
}

function EmptyFilePicker({
  dragOver,
  onBrowseFiles,
  onBrowseFolder,
}: {
  dragOver: boolean;
  onBrowseFiles: () => void;
  onBrowseFolder: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div
        className={cn(
          "mb-4 flex size-14 items-center justify-center rounded-2xl transition-all",
          dragOver ? "scale-110 bg-indigo-100" : "bg-gray-100",
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
        {dragOver ? "Release to add" : "Drop files or a folder here"}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBrowseFiles();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
        >
          <FileText className="size-3.5" /> Browse files
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBrowseFolder();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
        >
          <FolderOpen className="size-3.5" /> Browse folder
        </button>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {FILE_TYPES.map((type) => (
          <span
            key={type}
            className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500"
          >
            {type}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Max {env.VITE_MAX_UPLOAD_MB} MB per file · folders are scanned
        recursively
      </p>
    </div>
  );
}

function CompactFilePicker({
  onBrowseFiles,
  onBrowseFolder,
}: {
  onBrowseFiles: () => void;
  onBrowseFolder: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 text-xs font-medium text-gray-500">
      <Upload className="size-4 text-gray-400" />
      Drop more, or
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBrowseFiles();
        }}
        className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
      >
        add files
      </button>
      /
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onBrowseFolder();
        }}
        className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
      >
        add a folder
      </button>
    </div>
  );
}

function SelectedFilesPanel({
  items,
  totalSize,
  completedCount,
  isSubmitting,
  onClear,
  onRemove,
}: {
  items: UploadItem[];
  totalSize: number;
  completedCount: number;
  isSubmitting: boolean;
  onClear: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 text-xs">
        <span className="font-semibold text-gray-700">
          {items.length} file{items.length === 1 ? "" : "s"}
          <span className="font-normal text-gray-400">
            {" "}
            · {formatFileSize(totalSize)}
            {isSubmitting && ` · ${completedCount}/${items.length} done`}
          </span>
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={isSubmitting}
          className="text-gray-400 transition-colors hover:text-red-600 disabled:opacity-40"
        >
          Clear all
        </button>
      </div>
      <div className="max-h-64 divide-y divide-gray-50 overflow-y-auto">
        {items.map((item) => {
          const { icon: Icon, color } = getFileInfo(item.file);
          const [textColor, bgColor] = color.split(" ");
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <div
                className={cn(
                  "flex size-8 flex-shrink-0 items-center justify-center rounded-lg",
                  bgColor,
                )}
              >
                <Icon className={cn("size-4", textColor)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">
                  {item.relativePath || item.file.name}
                </p>
                <p className="text-[11px] text-gray-400">
                  {formatFileSize(item.file.size)}
                </p>
              </div>
              <ItemStatusBadge item={item} />
              {!isSubmitting && item.status === "pending" && (
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="rounded-lg p-1.5 text-gray-300 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  title="Remove"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemStatusBadge({ item }: { item: UploadItem }) {
  switch (item.status) {
    case "uploading":
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-600">
          <Loader2 className="size-3.5 animate-spin" /> Uploading
        </span>
      );
    case "done":
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <CheckCircle2 className="size-3.5" /> Started
        </span>
      );
    case "duplicate":
      return (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          Duplicate
        </span>
      );
    case "error":
      return (
        <span
          className="flex items-center gap-1 text-[11px] font-medium text-red-600"
          title={item.error}
        >
          <AlertCircle className="size-3.5" /> Failed
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
          Queued
        </span>
      );
  }
}
