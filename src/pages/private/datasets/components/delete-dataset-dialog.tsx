import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TDataset } from "@/core/datasets";

type DeleteDatasetDialogProps = {
  dataset: TDataset | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
};

export function DeleteDatasetDialog({
  dataset,
  isDeleting,
  onOpenChange,
  onDelete,
}: DeleteDatasetDialogProps) {
  return (
    <Dialog open={!!dataset} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-3">
            <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-100">
              <Trash2 className="size-4 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Delete dataset</DialogTitle>
              <p className="mt-0.5 text-xs text-gray-400">
                This action cannot be undone
              </p>
            </div>
          </div>
        </DialogHeader>
        <p className="py-1 text-sm text-gray-600">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900">"{dataset?.name}"</span>?
          Documents shared with other datasets will be unlinked. Documents linked
          only to this dataset will be permanently deleted (chunks and source
          files).
        </p>
        <DialogFooter className="mt-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="h-10 flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-60"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
