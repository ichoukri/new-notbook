import { Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { REVERT_DESCRIPTIONS, REVERT_TARGET_LABELS } from "./stage-copy";

/**
 * Confirms stepping a guided ingestion back to its previous review.
 *
 * Unlike cancelling, stepping back deletes nothing: stage outputs are
 * versioned on the backend and reused when the user approves forward again
 * without changes. The dialog exists because going back re-opens decisions —
 * approving forward after an edit recomputes the affected stages.
 */
export function RevertStageDialog({
  open,
  stage,
  isReverting,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  /** The stage slug being reverted from (e.g. "chunking", "metadata"). */
  stage: string;
  isReverting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const targetLabel = REVERT_TARGET_LABELS[stage] ?? "the previous";
  const description =
    REVERT_DESCRIPTIONS[stage] ??
    "Everything produced so far is kept and reused where nothing changed.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="size-4 text-violet-500" />
            Return to {targetLabel} review?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-gray-500">
              <p>{description}</p>
              <p>Nothing is deleted — you can approve forward again anytime.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isReverting}
          >
            Stay here
          </Button>
          <Button onClick={onConfirm} disabled={isReverting}>
            {isReverting ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Undo2 className="mr-1.5 size-4" />
            )}
            Go back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
