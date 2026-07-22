import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  SkipForward,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { TIngestionDocument } from "@/core/ingestions";
import { cn } from "@/lib/utils";
import type { ReviewQueueBuckets } from "./use-review-queue";

export function ReviewQueueBar({
  buckets,
  total,
  position,
  activeId,
  skippedIds,
  streamError,
  onSkip,
  onJumpTo,
  onExit,
}: {
  buckets: ReviewQueueBuckets;
  total: number;
  /** 1-based index of the current document among those awaiting review. */
  position: number | null;
  activeId: string | null;
  skippedIds: Set<string>;
  streamError: string;
  onSkip: () => void;
  onJumpTo: (documentId: string) => void;
  onExit: () => void;
}) {
  const waiting = buckets.awaiting.length;
  const inFlight = buckets.processing.length + buckets.unknownIds.length;

  return (
    <div className="border-b border-violet-100 bg-violet-50/70">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <span className="text-sm font-semibold text-violet-900">
          Review queue
          {position !== null && waiting > 0 && (
            <span className="ml-2 font-normal text-violet-700">
              {position} of {waiting} waiting
            </span>
          )}
        </span>

        <span className="h-4 w-px bg-violet-200" aria-hidden />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Stat
            icon={Clock}
            className="text-violet-700"
            value={waiting}
            label="waiting"
          />
          {inFlight > 0 && (
            <Stat
              icon={Loader2}
              className="text-indigo-600"
              value={inFlight}
              label="processing"
              spin
            />
          )}
          <Stat
            icon={CheckCircle2}
            className="text-emerald-700"
            value={buckets.completed.length}
            label="done"
          />
          {buckets.failed.length > 0 && (
            <Stat
              icon={AlertCircle}
              className="text-red-600"
              value={buckets.failed.length}
              label="failed"
            />
          )}
          <span className="text-gray-400">· {total} in batch</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <RosterPopover
            buckets={buckets}
            activeId={activeId}
            skippedIds={skippedIds}
            onJumpTo={onJumpTo}
          />
          {waiting > 1 && (
            <Button size="sm" variant="outline" onClick={onSkip}>
              <SkipForward className="mr-1.5 size-3.5" />
              Skip
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onExit}>
            <X className="mr-1.5 size-3.5" />
            Exit
          </Button>
        </div>
      </div>

      {streamError && (
        <p className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 sm:px-6 lg:px-8">
          {streamError}
        </p>
      )}
    </div>
  );
}

function Stat({
  icon: Icon,
  className,
  value,
  label,
  spin = false,
}: {
  icon: typeof Clock;
  className: string;
  value: number;
  label: string;
  spin?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-1 font-medium", className)}>
      <Icon className={cn("size-3.5", spin && "animate-spin")} />
      {value} {label}
    </span>
  );
}

function RosterPopover({
  buckets,
  activeId,
  skippedIds,
  onJumpTo,
}: {
  buckets: ReviewQueueBuckets;
  activeId: string | null;
  skippedIds: Set<string>;
  onJumpTo: (documentId: string) => void;
}) {
  const groups: Array<{
    label: string;
    documents: TIngestionDocument[];
    selectable: boolean;
  }> = [
    { label: "Waiting for review", documents: buckets.awaiting, selectable: true },
    { label: "Processing", documents: buckets.processing, selectable: false },
    { label: "Failed", documents: buckets.failed, selectable: false },
    { label: "Done", documents: buckets.completed, selectable: false },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          All documents
          <ChevronDown className="ml-1.5 size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-96 w-80 overflow-y-auto p-0">
        <p className="border-b border-gray-100 px-3 py-2 text-[11px] leading-relaxed text-gray-400">
          Only documents waiting for a decision can be opened. The rest are
          listed for context.
        </p>
        {groups
          .filter((group) => group.documents.length > 0)
          .map((group) => (
            <div key={group.label} className="border-b border-gray-100 last:border-b-0">
              <p className="bg-gray-50 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                {group.label} · {group.documents.length}
              </p>
              {group.documents.map((document) => {
                const isActive = document.id === activeId;
                const content = (
                  <>
                    <span className="truncate">{document.filename}</span>
                    {skippedIds.has(document.id) && (
                      <span className="ml-auto flex-shrink-0 text-[10px] font-medium text-gray-400">
                        skipped
                      </span>
                    )}
                  </>
                );

                return group.selectable ? (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => onJumpTo(document.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      isActive
                        ? "bg-violet-50 font-semibold text-violet-900"
                        : "text-gray-700 hover:bg-gray-50",
                    )}
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    key={document.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400"
                  >
                    {content}
                  </div>
                );
              })}
            </div>
          ))}
      </PopoverContent>
    </Popover>
  );
}
