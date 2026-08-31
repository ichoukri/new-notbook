import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Database,
  Edit3,
  FolderPlus,
  FolderTree,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Topbar from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import { useDatasets } from "@/core/api/hooks";
import type { TDataset } from "@/core/datasets";
import {
  type TBackendKnowledgeGroup,
  type TBackendKnowledgeGroupTreeNode,
  type TKnowledgeGroupCreatePayload,
  type TKnowledgeGroupTreeNode,
  type TKnowledgeGroupUpdatePayload,
  mapBackendKnowledgeGroupTree,
} from "@/core/knowledge-groups";
import { cn } from "@/lib/utils";
import {
  collectDeletionOrder,
  collectGroupSubtreeIds,
  flattenGroupTree,
} from "./group-tree-utils";
import {
  DeleteGroupDialog,
  type DeleteGroupChoice,
} from "./delete-group-dialog";

const ROOT_GROUP = "__root__";

function sourcePath(group: TKnowledgeGroupTreeNode): string {
  const value = group.metadata?.source_path;
  return typeof value === "string" ? value : "";
}

function GroupEditor({
  open,
  target,
  initialParentId,
  tree,
  datasets,
  onClose,
  onSave,
}: {
  open: boolean;
  target: TKnowledgeGroupTreeNode | null;
  initialParentId: string | null;
  tree: TKnowledgeGroupTreeNode[];
  datasets: TDataset[];
  onClose: () => void;
  onSave: (
    payload: TKnowledgeGroupCreatePayload | TKnowledgeGroupUpdatePayload,
  ) => Promise<void>;
}) {
  const [name, setName] = useState(target?.name ?? "");
  const [description, setDescription] = useState(target?.description ?? "");
  const [parentId, setParentId] = useState(
    target?.parentId ?? initialParentId ?? ROOT_GROUP,
  );
  const [datasetIds, setDatasetIds] = useState<string[]>(
    target?.datasetIds ?? [],
  );
  const [path, setPath] = useState(target ? sourcePath(target) : "");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const excludedParentIds = useMemo(
    () => (target ? collectGroupSubtreeIds(tree, target.id) : new Set<string>()),
    [target, tree],
  );
  const parentOptions = useMemo(
    () =>
      flattenGroupTree(tree).filter(
        ({ group }) => !excludedParentIds.has(group.id),
      ),
    [excludedParentIds, tree],
  );
  const filteredDatasets = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized
      ? datasets.filter((dataset) =>
          dataset.name.toLocaleLowerCase().includes(normalized),
        )
      : datasets;
  }, [datasets, query]);

  const toggleDataset = (datasetId: string, checked: boolean) => {
    setDatasetIds((current) =>
      checked
        ? [...new Set([...current, datasetId])]
        : current.filter((id) => id !== datasetId),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }
    const existingMetadata = target?.metadata ?? {};
    const groupMetadata = { ...existingMetadata };
    if (path.trim()) groupMetadata.source_path = path.trim();
    else delete groupMetadata.source_path;

    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        parent_id: parentId === ROOT_GROUP ? null : parentId,
        dataset_ids: datasetIds,
        group_metadata:
          target || Object.keys(groupMetadata).length > 0 ? groupMetadata : undefined,
      });
      onClose();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError, "Could not save knowledge group."));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="size-5 text-indigo-600" />
            {target ? "Edit knowledge group" : "Create knowledge group"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Plans"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Parent group</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT_GROUP}>Root knowledge</SelectItem>
                  {parentOptions.map(({ group, depth }) => (
                    <SelectItem key={group.id} value={group.id}>
                      <span style={{ paddingLeft: `${depth * 12}px` }}>
                        {group.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              placeholder="Describe the knowledge covered by this parent."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="source-path">Source folder path</Label>
            <Input
              id="source-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="1-Grinding 1/1-SAG Mill_6210-ML-2175/1-Plans"
            />
          </div>

          <section className="space-y-3 rounded-2xl border border-gray-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Direct datasets
                </h3>
                <p className="text-xs text-gray-500">
                  Child-group datasets are included automatically.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {datasetIds.length} selected
              </span>
            </div>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter datasets..."
            />
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {filteredDatasets.map((dataset) => {
                const checked = datasetIds.includes(dataset.id);
                return (
                  <label
                    key={dataset.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5",
                      checked
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-transparent hover:bg-gray-50",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleDataset(dataset.id, value === true)
                      }
                    />
                    <Database className="size-4 text-gray-400" />
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                      {dataset.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {dataset.documentCount} documents
                    </span>
                  </label>
                );
              })}
              {filteredDatasets.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  No datasets match this filter.
                </p>
              )}
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <LoaderCircle className="size-4 animate-spin" />}
              {target ? "Save changes" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GroupCard({
  group,
  depth,
  datasetsById,
  onEdit,
  onAddChild,
  onDelete,
}: {
  group: TKnowledgeGroupTreeNode;
  depth: number;
  datasetsById: Map<string, TDataset>;
  onEdit: (group: TKnowledgeGroupTreeNode) => void;
  onAddChild: (group: TKnowledgeGroupTreeNode) => void;
  onDelete: (group: TKnowledgeGroupTreeNode) => void;
}) {
  return (
    <div className={cn(depth > 0 && "ml-6 border-l border-indigo-100 pl-4")}>
      <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <FolderTree className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900">{group.name}</h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {group.description || "No description"}
              </p>
              {sourcePath(group) && (
                <p className="mt-1 truncate font-mono text-[11px] text-gray-400">
                  {sourcePath(group)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onAddChild(group)}>
              <FolderPlus className="size-4" />
              Child
            </Button>
            <Button size="icon" variant="ghost" onClick={() => onEdit(group)}>
              <Edit3 className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={() => onDelete(group)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
            {group.datasetIds.length} direct
          </span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
            {group.descendantDatasetIds.length} total datasets
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            {group.children.length} child groups
          </span>
        </div>

        {group.datasetIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {group.datasetIds.map((datasetId) => (
              <span
                key={datasetId}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600"
              >
                <Database className="size-3 text-gray-400" />
                {datasetsById.get(datasetId)?.name ?? datasetId}
              </span>
            ))}
          </div>
        )}
      </article>

      {group.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {group.children.map((child) => (
            <GroupCard
              key={child.id}
              group={child}
              depth={depth + 1}
              datasetsById={datasetsById}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const DATASET_PICKER_PARAMS: Record<string, string> = {
  include_documents: "false",
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

export default function KnowledgeGroupsPage() {
  const [tree, setTree] = useState<TKnowledgeGroupTreeNode[]>([]);
  // Shared SWR cache: the dataset list is identical on every page that shows a
  // picker, so it is fetched once rather than per navigation.
  const datasetResource = useDatasets(DATASET_PICKER_PARAMS);
  const datasets = datasetResource.items;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TKnowledgeGroupTreeNode | null>(null);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<TKnowledgeGroupTreeNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const groupsResponse =
          await backendApi.findMany<TBackendKnowledgeGroupTreeNode>(
            "/knowledge-groups/tree",
          );
        if (cancelled) return;
        setTree(groupsResponse.map(mapBackendKnowledgeGroupTree));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(loadError, "Could not load knowledge groups."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const datasetsById = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset])),
    [datasets],
  );
  const groupCount = useMemo(() => flattenGroupTree(tree).length, [tree]);
  const groupsById = useMemo(
    () =>
      new Map(
        flattenGroupTree(tree).map(({ group }) => [group.id, group] as const),
      ),
    [tree],
  );

  const reload = () => setReloadKey((current) => current + 1);
  const openCreate = (parentId: string | null = null) => {
    setEditTarget(null);
    setInitialParentId(parentId);
    setEditorOpen(true);
  };

  const saveGroup = async (
    payload: TKnowledgeGroupCreatePayload | TKnowledgeGroupUpdatePayload,
  ) => {
    if (editTarget) {
      await backendApi.replace<
        TBackendKnowledgeGroup,
        TKnowledgeGroupUpdatePayload
      >("/knowledge-groups", editTarget.id, payload);
      toast.success("Knowledge group updated.");
    } else {
      await backendApi.create<
        TBackendKnowledgeGroup,
        TKnowledgeGroupCreatePayload
      >("/knowledge-groups/", payload as TKnowledgeGroupCreatePayload);
      toast.success("Knowledge group created.");
    }
    reload();
  };

  const runDeletion = async (
    group: TKnowledgeGroupTreeNode,
    choice: DeleteGroupChoice,
  ) => {
    setIsDeleting(true);
    try {
      if (choice === "promote-children") {
        // Lift each child to this group's own parent first, so the group is a
        // leaf by the time it is deleted. _validate_parent rejects cycles, and
        // moving up the tree can never create one.
        for (const child of group.children) {
          await backendApi.replace<
            TBackendKnowledgeGroup,
            TKnowledgeGroupUpdatePayload
          >("/knowledge-groups", child.id, { parent_id: group.parentId });
        }
        await backendApi.delete("/knowledge-groups", group.id);
        toast.success(
          `Deleted “${group.name}” and moved ${group.children.length} child group(s) up a level.`,
        );
      } else if (choice === "subtree") {
        // Leaves first — the API refuses to delete a group that still has
        // children, so the order is what makes this work at all.
        const ordered = collectDeletionOrder(group);
        for (const node of ordered) {
          await backendApi.delete("/knowledge-groups", node.id);
        }
        toast.success(
          ordered.length === 1
            ? "Knowledge group deleted."
            : `Deleted “${group.name}” and ${ordered.length - 1} nested group(s).`,
        );
      } else {
        await backendApi.delete("/knowledge-groups", group.id);
        toast.success("Knowledge group deleted.");
      }

      setDeleteTarget(null);
      reload();
    } catch (deleteError) {
      // A partial subtree deletion leaves the tree in a valid but changed
      // state, so reload rather than assuming nothing happened.
      toast.error(
        getApiErrorMessage(
          deleteError,
          "Could not delete this knowledge group.",
        ),
      );
      reload();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-gray-50/60">
      <Topbar title="Knowledge Groups" />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl space-y-6 px-8 py-7">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Knowledge hierarchy
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Group leaf datasets into searchable parent knowledge bases without
                copying documents or graph evidence.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reload} disabled={loading}>
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button onClick={() => openCreate()}>
                <Plus className="size-4" />
                New group
              </Button>
            </div>
          </header>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Knowledge groups</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{groupCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Available datasets</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {datasets.length}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">Root knowledge bases</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {tree.length}
              </p>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-gray-500">
              <LoaderCircle className="size-5 animate-spin text-indigo-600" />
              Loading hierarchy...
            </div>
          ) : tree.length === 0 ? (
            <section className="rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center">
              <FolderTree className="mx-auto size-10 text-indigo-300" />
              <h2 className="mt-4 font-semibold text-gray-900">
                Create the first parent knowledge base
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
                Start with Plans, attach the tested 1-Ensemble dataset, then add
                nested groups as the POC expands.
              </p>
              <Button className="mt-5" onClick={() => openCreate()}>
                <Plus className="size-4" />
                Create first group
              </Button>
            </section>
          ) : (
            <section className="space-y-4">
              {tree.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  depth={0}
                  datasetsById={datasetsById}
                  onEdit={(target) => {
                    setEditTarget(target);
                    setInitialParentId(null);
                    setEditorOpen(true);
                  }}
                  onAddChild={(parent) => openCreate(parent.id)}
                  onDelete={(target) => setDeleteTarget(target)}
                />
              ))}
            </section>
          )}
        </div>
      </main>

      {editorOpen && (
        <GroupEditor
          open
          target={editTarget}
          initialParentId={initialParentId}
          tree={tree}
          datasets={datasets}
          onClose={() => setEditorOpen(false)}
          onSave={saveGroup}
        />
      )}

      <DeleteGroupDialog
        group={deleteTarget}
        parentName={
          deleteTarget?.parentId
            ? (groupsById.get(deleteTarget.parentId)?.name ?? null)
            : null
        }
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
        onConfirm={(choice) => {
          if (deleteTarget) void runDeletion(deleteTarget, choice);
        }}
      />
    </div>
  );
}
