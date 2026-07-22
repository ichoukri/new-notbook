import { ClipboardList, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GUIDED_GATES_PER_DOCUMENT } from "@/core/ingestions";

/** Above this many files, guided mode is a commitment worth confirming. */
export const GUIDED_CONFIRM_THRESHOLD = 3;

export function GuidedBatchDialog({
  open,
  fileCount,
  onOpenChange,
  onConfirm,
  onSwitchToAuto,
}: {
  open: boolean;
  fileCount: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onSwitchToAuto: () => void;
}) {
  const maxApprovals = fileCount * GUIDED_GATES_PER_DOCUMENT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="size-4 text-violet-600" />
            {fileCount} documents, up to {maxApprovals} approvals
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-gray-500">
              <p>
                Guided mode pauses <span className="font-medium">each</span>{" "}
                document at <span className="font-medium">every</span> stage —
                extract, chunk, summarize, graph, embed, and a final metadata
                check. That is up to {GUIDED_GATES_PER_DOCUMENT} approvals per
                document, so up to{" "}
                <span className="font-medium">{maxApprovals}</span> for this
                batch.
              </p>
              <p>
                You&apos;ll be taken to a review queue that walks them one at a
                time. It lives in this browser tab — closing the tab loses the
                queue, though the documents keep waiting and stay reachable from
                the documents list.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={onSwitchToAuto}>
            <Zap className="mr-1.5 size-4" />
            Use Auto instead
          </Button>
          <Button onClick={onConfirm}>
            <ClipboardList className="mr-1.5 size-4" />
            Review {fileCount} documents
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
