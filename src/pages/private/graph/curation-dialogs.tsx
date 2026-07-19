import { useState } from "react";
import { Ban, GitMerge, Loader2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TGraphEntity } from "@/core/knowledge-graph";
import { isCanonicalEntityId, parseAliases } from "./graph-explorer-utils";

export type TCurationAction = "edit" | "merge" | "exclude";

export type TEntityEditPayload = {
  name: string;
  description?: string;
  aliases: string[];
};

type CurationDialogsProps = {
  action: TCurationAction | null;
  entity: TGraphEntity;
  mergeCandidates: TGraphEntity[];
  isSaving: boolean;
  error: string;
  onClose: () => void;
  onEdit: (payload: TEntityEditPayload) => void | Promise<void>;
  onMerge: (targetCanonicalId: string) => void | Promise<void>;
  onExclude: () => void | Promise<void>;
};

export function CurationDialogs({
  action,
  entity,
  mergeCandidates,
  isSaving,
  error,
  onClose,
  onEdit,
  onMerge,
  onExclude,
}: CurationDialogsProps) {
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description);
  const [aliases, setAliases] = useState(entity.aliases.join(", "));
  const [targetCanonicalId, setTargetCanonicalId] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSaving) onClose();
  };
  const parsedAliases = parseAliases(aliases);
  const normalizedTargetId = targetCanonicalId.trim();

  return (
    <>
      <Dialog open={action === "edit"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const normalizedDescription = description.trim();
              void onEdit({
                name: name.trim(),
                ...(normalizedDescription
                  ? { description: normalizedDescription }
                  : {}),
                aliases: parsedAliases,
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit entity</DialogTitle>
              <DialogDescription>
                Curated values override the extracted display fields. Evidence and
                provenance remain attached.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="graph-entity-name">Name</Label>
                <Input
                  id="graph-entity-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="graph-entity-description">Description</Label>
                <Textarea
                  id="graph-entity-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="graph-entity-aliases">Aliases</Label>
                <Input
                  id="graph-entity-aliases"
                  value={aliases}
                  onChange={(event) => setAliases(event.target.value)}
                  placeholder="SAG Mill, Primary Mill"
                />
                <p className="text-[11px] text-gray-500">
                  Separate aliases with commas or new lines (maximum 20).
                </p>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !name.trim() || parsedAliases.length > 20}
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={action === "merge"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onMerge(normalizedTargetId);
            }}
          >
            <DialogHeader>
              <DialogTitle>Merge entity</DialogTitle>
              <DialogDescription>
                Merge <strong>{entity.name}</strong> into another canonical entity.
                Relationships and provenance will point to the target.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="graph-merge-target">Target canonical ID</Label>
                <Input
                  id="graph-merge-target"
                  list="graph-merge-candidates"
                  value={targetCanonicalId}
                  onChange={(event) => setTargetCanonicalId(event.target.value)}
                  placeholder="ent_0123456789abcdef01234567"
                  autoFocus
                />
                <datalist id="graph-merge-candidates">
                  {mergeCandidates
                    .filter(
                      (candidate) =>
                        candidate.canonicalId !== entity.canonicalId &&
                        !candidate.excluded &&
                        !candidate.mergedInto,
                    )
                    .map((candidate) => (
                      <option
                        key={candidate.canonicalId}
                        value={candidate.canonicalId}
                      >
                        {candidate.name}
                      </option>
                    ))}
                </datalist>
                {normalizedTargetId && !isCanonicalEntityId(normalizedTargetId) && (
                  <p className="text-[11px] text-red-600">
                    Use a canonical ID in the form ent_ followed by 24 lowercase
                    hexadecimal characters.
                  </p>
                )}
              </div>
              <Alert>
                <GitMerge />
                <AlertDescription>
                  Confirm the target carefully. This POC does not expose an undo
                  action in the platform.
                </AlertDescription>
              </Alert>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter className="mt-5">
              <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSaving ||
                  !isCanonicalEntityId(normalizedTargetId) ||
                  normalizedTargetId === entity.canonicalId
                }
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <GitMerge />}
                Confirm merge
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={action === "exclude"} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exclude entity from the graph?</DialogTitle>
            <DialogDescription>
              <strong>{entity.name}</strong> will be soft-excluded from ordinary
              graph exploration and retrieval. Its source evidence is retained for
              auditability.
            </DialogDescription>
          </DialogHeader>
          <Alert className="mt-2 border-amber-200 bg-amber-50 text-amber-900">
            <Ban />
            <AlertDescription className="text-amber-800">
              This changes retrieval behavior for every relationship that depends on
              this entity.
            </AlertDescription>
          </Alert>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSaving}
              onClick={() => void onExclude()}
            >
              {isSaving ? <Loader2 className="animate-spin" /> : <Ban />}
              Exclude entity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
