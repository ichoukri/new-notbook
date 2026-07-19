import {
  AlertTriangle,
  BookOpenCheck,
  ExternalLink,
  FileText,
} from "lucide-react";
import { SourceLocationSummary } from "@/components/app/source-location-summary";
import type {
  TGroundedAnswerResponse,
} from "@/core/retrieval";
import { cn } from "@/lib/utils";
import { getGroundedAnswerStatusMessage } from "./grounded-answer-utils";

export function GroundedAnswerCard({
  answer,
  onSelectEvidence,
  onOpenDocument,
}: {
  answer: TGroundedAnswerResponse;
  onSelectEvidence: (chunkId: string) => void;
  onOpenDocument: (documentId: string) => void;
}) {
  return (
    <section
      aria-label="Grounded answer"
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        answer.abstained
          ? "border-amber-200 bg-amber-50/60"
          : "border-emerald-200 bg-emerald-50/40",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-xl",
            answer.abstained
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700",
          )}
        >
          {answer.abstained ? (
            <AlertTriangle className="size-4" />
          ) : (
            <BookOpenCheck className="size-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              answer.abstained ? "text-amber-800" : "text-emerald-800",
            )}
          >
            {answer.abstained ? "Verified abstention" : "Grounded answer"}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {answer.answer}
          </p>

          {answer.abstained ? (
            <p className="mt-3 text-xs text-amber-800">
              {getGroundedAnswerStatusMessage(answer.abstentionReason)}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-gray-600">
                Verified evidence
              </p>
              <div className="grid gap-2 lg:grid-cols-2">
                {answer.citations.map((citation) => (
                  <div
                    key={`${citation.number}-${citation.chunkId}`}
                    className="rounded-xl border border-emerald-100 bg-white/80 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectEvidence(citation.chunkId)}
                      className="flex w-full items-start gap-2 text-left"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-xs font-bold text-emerald-800">
                        {citation.number}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-gray-700">
                          {citation.documentFilename}
                        </span>
                        <span className="mt-0.5 block text-xs text-gray-500">
                          Page {citation.pageNumber ?? "—"} · View matching chunk
                        </span>
                      </span>
                    </button>
                    <SourceLocationSummary
                      paths={citation.sourceRelativePaths}
                      className="mt-2"
                    />
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                      {citation.excerpt}
                    </p>
                    <button
                      type="button"
                      onClick={() => onOpenDocument(citation.documentId)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      <FileText className="size-3" />
                      Open document
                      <ExternalLink className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
