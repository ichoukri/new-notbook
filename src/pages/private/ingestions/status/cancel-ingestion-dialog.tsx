import { Loader2, OctagonX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Confirms stopping an in-flight ingestion.
 *
 * Cancelling discards every artifact the pipeline produced so far — chunks,
 * vectors, graph state, extracted images — so this is not a pause. The source
 * file and the document row survive, which is what makes re-ingestion possible
 * and worth saying explicitly.
 */
export function CancelIngestionDialog({
  open,
  filename,
  count = 1,
  isCancelling,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  /** Shown for a single document; omitted when stopping several. */
  filename?: string;
  count?: number;
  isCancelling: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const many = count > 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <OctagonX className="size-4 text-red-500" />
            {many ? `Stop ${count} ingestions?` : "Stop this ingestion?"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-gray-500">
              <p>
                {many
                  ? `Processing stops for ${count} documents.`
                  : filename
                    ? `Processing stops for “${filename}”.`
                    : "Processing stops for this document."}{" "}
                Everything produced so far — chunks, embeddings, and extracted
                graph data — is discarded.
              </p>
              <p>
                The uploaded file is kept, so{" "}
                {many ? "they" : "it"} can be ingested again later from the
                documents list.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
          >
            Keep processing
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <OctagonX className="mr-1.5 size-4" />
            )}
            {many ? `Stop ${count}` : "Stop ingestion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
