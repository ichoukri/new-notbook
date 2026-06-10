import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DocumentDeleteDialog({
  open,
  filename,
  isDeleting,
  onOpenChange,
  onDelete,
}: {
  open: boolean;
  filename: string;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 className="size-4 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-base">Delete document</DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                This action cannot be undone
              </p>
            </div>
          </div>
        </DialogHeader>
        <p className="text-sm text-gray-600 py-1">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-gray-900">"{filename}"</span>?
          All chunks, vectors, and the source file will be removed.
        </p>
        <DialogFooter className="gap-2 mt-2">
          <button
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
