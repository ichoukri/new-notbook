import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type ChunkImagePreviewDialogProps = {
  imageUrl: string | null;
  onClose: () => void;
};

export function ChunkImagePreviewDialog({
  imageUrl,
  onClose,
}: ChunkImagePreviewDialogProps) {
  return (
    <Dialog open={imageUrl !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] border-0 bg-transparent p-0 shadow-none sm:max-w-3xl">
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Chunk image preview"
            crossOrigin="use-credentials"
            className="max-h-[85vh] w-full rounded-lg object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
