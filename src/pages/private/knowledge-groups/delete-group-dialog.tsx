import { ArrowUpFromLine, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TKnowledgeGroupTreeNode } from "@/core/knowledge-groups";
import { countDescendantGroups } from "./group-tree-utils";

export type DeleteGroupChoice = "only" | "promote-children" | "subtree";

/**
 * Confirms deleting a knowledge group.
 *
 * The API refuses to delete a group that still has children. The tree already
 * knows the child count, so rather than letting the user confirm a request that
 * is certain to fail, this offers the two ways out directly: lift the children
 * up a level, or remove the whole subtree.
 */
export function DeleteGroupDialog({
  group,
  parentName,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  group: TKnowledgeGroupTreeNode | null;
  /** Where children land when promoted; null means the top level. */
  parentName: string | null;
  isDeleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (choice: DeleteGroupChoice) => void;
}) {
  if (!group) return null;

  const childCount = group.children.length;
  const descendantCount = countDescendantGroups(group);
  const destination = parentName ? `“${parentName}”` : "the top level";

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-4 text-red-500" />
            Delete “{group.name}”?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-gray-500">
              {childCount === 0 ? (
                <p>
                  This group has no child groups. Its{" "}
                  {group.datasetIds.length} linked dataset
                  {group.datasetIds.length === 1 ? "" : "s"} stay in place — only
                  the grouping is removed.
                </p>
              ) : (
                <>
                  <p>
                    This group holds{" "}
                    <span className="font-medium">
                      {childCount} child group{childCount === 1 ? "" : "s"}
                    </span>
                    {descendantCount > childCount &&
                      ` (${descendantCount} in total, counting deeper levels)`}
                    . Choose what happens to them.
                  </p>
                  <p>
                    Datasets are never deleted — only the groups that organise
                    them.
                  </p>
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:flex-col sm:items-stretch">
          {childCount === 0 ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => onConfirm("only")}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 size-4" />
                )}
                Delete group
              </Button>
            </div>
          ) : (
            <>
              <Button
                onClick={() => onConfirm("promote-children")}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <ArrowUpFromLine className="mr-1.5 size-4" />
                )}
                Move {childCount} child group{childCount === 1 ? "" : "s"} to{" "}
                {destination}, then delete
              </Button>
              <Button
                variant="destructive"
                onClick={() => onConfirm("subtree")}
                disabled={isDeleting}
              >
                <Trash2 className="mr-1.5 size-4" />
                Delete this group and all {descendantCount} below it
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
