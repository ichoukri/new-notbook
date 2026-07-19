import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  GitBranch,
  Loader2,
  Network,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Panel } from "@/components/ingestion/ui";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import { cn } from "@/lib/utils";
import {
  type TGraphCandidate,
  type TGraphCandidateKind,
  type TGraphCandidatePage,
  type TGraphCandidateStatus,
  type TGraphRun,
  formatGraphType,
  parseGraphEntityPage,
  parseGraphRelationPage,
  parseGraphRun,
} from "./graph-review-data";

const PAGE_SIZE = 12;

type TKindCounts = {
  total: number | null;
  pending: number | null;
};

type TGraphCounts = Record<TGraphCandidateKind, TKindCounts>;

export type TGraphReviewState = {
  pendingCount: number | null;
  ready: boolean;
  isLoading: boolean;
  hasError: boolean;
};

const EMPTY_COUNTS: TGraphCounts = {
  entity: { total: null, pending: null },
  relation: { total: null, pending: null },
};

function endpointFor(documentId: string, kind: TGraphCandidateKind): string {
  return `/documents/${documentId}/graph/${kind === "entity" ? "entities" : "relations"}`;
}

function parsePage(
  kind: TGraphCandidateKind,
  value: unknown,
  offset: number,
  limit: number,
): TGraphCandidatePage<TGraphCandidate> {
  return kind === "entity"
    ? parseGraphEntityPage(value, offset, limit)
    : parseGraphRelationPage(value, offset, limit);
}

async function fetchPage(params: {
  documentId: string;
  runId: string;
  kind: TGraphCandidateKind;
  offset: number;
  limit: number;
  status?: TGraphCandidateStatus;
  type?: string;
  search?: string;
}): Promise<TGraphCandidatePage<TGraphCandidate>> {
  const query: Record<string, string> = {
    run_id: params.runId,
    offset: String(params.offset),
    limit: String(params.limit),
  };
  if (params.status) query.status = params.status;
  if (params.search) query.search = params.search;
  if (params.type) {
    query[params.kind === "entity" ? "entity_type" : "relation_type"] =
      params.type;
  }
  const response = await backendApi.get<unknown>(
    endpointFor(params.documentId, params.kind),
    query,
  );
  return parsePage(params.kind, response, params.offset, params.limit);
}

export function GraphReview({
  documentId,
  disabled,
  onStateChange,
}: {
  documentId: string;
  disabled: boolean;
  onStateChange: (state: TGraphReviewState) => void;
}) {
  const [run, setRun] = useState<TGraphRun | null>(null);
  const [runError, setRunError] = useState("");
  const [isLoadingRun, setIsLoadingRun] = useState(true);
  const [runReloadKey, setRunReloadKey] = useState(0);
  const [counts, setCounts] = useState<TGraphCounts>(EMPTY_COUNTS);
  const [countsError, setCountsError] = useState("");
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);
  const [kind, setKind] = useState<TGraphCandidateKind>("entity");
  const [page, setPage] = useState<TGraphCandidatePage<TGraphCandidate>>({
    items: [],
    total: 0,
    offset: 0,
    limit: PAGE_SIZE,
  });
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [pageError, setPageError] = useState("");
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [typeOptions, setTypeOptions] = useState<
    Record<TGraphCandidateKind, string[]>
  >({ entity: [], relation: [] });
  const [refreshKey, setRefreshKey] = useState(0);
  const [mutationKey, setMutationKey] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingRun(true);
    setRunError("");
    setRun(null);

    backendApi
      .get<unknown>(`/documents/${documentId}/graph/runs/latest`)
      .then((response) => {
        if (cancelled) return;
        const parsed = parseGraphRun(response);
        if (!parsed) throw new Error("The graph extraction run was malformed.");
        setRun(parsed);
      })
      .catch((error) => {
        if (!cancelled) {
          setRunError(
            getApiErrorMessage(
              error,
              "Could not load the latest graph extraction run.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRun(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, runReloadKey]);

  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    setIsLoadingCounts(true);
    setCountsError("");

    const loadKindCounts = async (
      candidateKind: TGraphCandidateKind,
    ): Promise<[TGraphCandidateKind, TKindCounts]> => {
      const [all, pending] = await Promise.all([
        fetchPage({
          documentId,
          runId: run.id,
          kind: candidateKind,
          offset: 0,
          limit: 1,
        }),
        fetchPage({
          documentId,
          runId: run.id,
          kind: candidateKind,
          offset: 0,
          limit: 1,
          status: "pending",
        }),
      ]);
      return [candidateKind, { total: all.total, pending: pending.total }];
    };

    Promise.all([loadKindCounts("entity"), loadKindCounts("relation")])
      .then((entries) => {
        if (!cancelled) setCounts(Object.fromEntries(entries) as TGraphCounts);
      })
      .catch((error) => {
        if (!cancelled) {
          setCountsError(
            getApiErrorMessage(error, "Could not load graph review counts."),
          );
          setCounts(EMPTY_COUNTS);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCounts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [documentId, run, refreshKey]);

  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    setIsLoadingPage(true);
    setPageError("");

    fetchPage({
      documentId,
      runId: run.id,
      kind,
      offset,
      limit: PAGE_SIZE,
      status:
        statusFilter === "all"
          ? undefined
          : (statusFilter as TGraphCandidateStatus),
      type: typeFilter === "all" ? undefined : typeFilter,
      search: search || undefined,
    })
      .then((response) => {
        if (cancelled) return;
        setPage(response);
        const discovered = response.items
          .map((candidate) =>
            candidate.kind === "entity"
              ? candidate.entityType
              : candidate.relationType,
          )
          .filter(Boolean);
        setTypeOptions((current) => ({
          ...current,
          [kind]: Array.from(
            new Set([...current[kind], ...discovered]),
          ).sort((left, right) => left.localeCompare(right)),
        }));
        if (response.total > 0 && response.offset >= response.total) {
          setOffset(Math.max(0, response.total - (response.total % PAGE_SIZE || PAGE_SIZE)));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setPageError(
            getApiErrorMessage(error, "Could not load graph candidates."),
          );
          setPage({ items: [], total: 0, offset, limit: PAGE_SIZE });
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    documentId,
    kind,
    offset,
    refreshKey,
    run,
    search,
    statusFilter,
    typeFilter,
  ]);

  const pendingCount =
    counts.entity.pending !== null && counts.relation.pending !== null
      ? counts.entity.pending + counts.relation.pending
      : null;
  const hasError = Boolean(runError || countsError || pageError);
  const isLoading = isLoadingRun || isLoadingCounts;
  const ready =
    run?.status === "completed" &&
    pendingCount === 0 &&
    !isLoading &&
    !hasError &&
    !mutationKey;

  useEffect(() => {
    onStateChange({ pendingCount, ready, isLoading, hasError });
  }, [hasError, isLoading, onStateChange, pendingCount, ready]);

  const handleReview = async (params: {
    candidateKind: TGraphCandidateKind;
    decision: "approved" | "rejected";
    candidateIds?: string[];
    allPending?: boolean;
  }) => {
    if (!run || mutationKey || disabled) return;
    const actionKey = `${params.candidateKind}-${params.decision}-${params.candidateIds?.[0] ?? "all"}`;
    setMutationKey(actionKey);
    try {
      await backendApi.create<
        unknown,
        {
          run_id: string;
          candidate_kind: TGraphCandidateKind;
          candidate_ids?: string[];
          all_pending?: boolean;
          decision: "approved" | "rejected";
        }
      >(`/documents/${documentId}/graph/review`, {
        run_id: run.id,
        candidate_kind: params.candidateKind,
        candidate_ids: params.candidateIds,
        all_pending: params.allPending,
        decision: params.decision,
      });
      toast.success(
        params.allPending
          ? `${params.decision === "approved" ? "Approved" : "Rejected"} all pending ${params.candidateKind === "entity" ? "entities" : "relations"}.`
          : `${params.candidateKind === "entity" ? "Entity" : "Relation"} ${params.decision}.`,
      );
      setOffset(0);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, `Could not mark the candidate ${params.decision}.`),
      );
    } finally {
      setMutationKey("");
    }
  };

  if (isLoadingRun) {
    return (
      <Panel icon={Network} title="Knowledge graph review">
        <LoadingMessage label="Loading graph extraction…" />
      </Panel>
    );
  }

  if (runError || !run) {
    return (
      <Panel icon={Network} title="Knowledge graph review">
        <ErrorMessage
          message={runError || "No graph extraction run is available."}
          onRetry={() => setRunReloadKey((key) => key + 1)}
        />
      </Panel>
    );
  }

  const currentCounts = counts[kind];
  const entityApprovalBlocked =
    kind === "relation" && (counts.entity.pending ?? 0) > 0;
  const totalPages = Math.max(1, Math.ceil(page.total / PAGE_SIZE));
  const currentPage = Math.min(
    totalPages,
    Math.floor(page.offset / PAGE_SIZE) + 1,
  );
  const busy = disabled || Boolean(mutationKey);

  return (
    <Panel
      icon={Network}
      title="Knowledge graph review"
      subtitle={`Run ${run.id.slice(0, 8)} · chunk version ${run.chunkVersion ?? "—"}`}
      bodyClassName=""
    >
      <div className="grid gap-3 border-b border-gray-100 bg-gradient-to-r from-violet-50/70 to-indigo-50/40 p-4 sm:grid-cols-3">
        <CountCard
          label="Entities"
          total={counts.entity.total}
          pending={counts.entity.pending}
          icon={Boxes}
        />
        <CountCard
          label="Relations"
          total={counts.relation.total}
          pending={counts.relation.pending}
          icon={GitBranch}
        />
        <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Review status</p>
          <div className="mt-1 flex items-center gap-2">
            {isLoadingCounts ? (
              <Loader2 className="size-4 animate-spin text-violet-500" />
            ) : pendingCount === 0 ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : (
              <AlertCircle className="size-4 text-amber-500" />
            )}
            <span className="text-sm font-semibold text-gray-800">
              {pendingCount === null
                ? "Checking candidates"
                : pendingCount === 0
                  ? "Ready to publish"
                  : `${pendingCount} awaiting decision`}
            </span>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-100 px-4 pt-3">
        <div className="flex gap-1" role="tablist" aria-label="Graph candidates">
          {(["entity", "relation"] as const).map((candidateKind) => (
            <button
              key={candidateKind}
              type="button"
              role="tab"
              aria-selected={kind === candidateKind}
              onClick={() => {
                setKind(candidateKind);
                setOffset(0);
                setTypeFilter("all");
              }}
              className={cn(
                "relative flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                kind === candidateKind
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
              )}
            >
              {candidateKind === "entity" ? (
                <Boxes className="size-4" />
              ) : (
                <GitBranch className="size-4" />
              )}
              {candidateKind === "entity" ? "Entities" : "Relations"}
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] tabular-nums text-gray-500 ring-1 ring-gray-200">
                {counts[candidateKind].total ?? "—"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-4 py-3">
        <label className="relative min-w-[210px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder={`Search ${kind === "entity" ? "names and aliases" : "relations"}…`}
            className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm text-gray-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
        </label>
        <FilterSelect
          label="Review status"
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value);
            setOffset(0);
          }}
          options={[
            ["all", "All decisions"],
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
          ]}
        />
        {typeOptions[kind].length > 0 && (
          <FilterSelect
            label={`${kind} type`}
            value={typeFilter}
            onChange={(value) => {
              setTypeFilter(value);
              setOffset(0);
            }}
            options={[
              ["all", "All types"],
              ...typeOptions[kind].map(
                (value): [string, string] => [value, formatGraphType(value)],
              ),
            ]}
          />
        )}
        {(searchDraft || statusFilter !== "all" || typeFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchDraft("");
              setSearch("");
              setStatusFilter("all");
              setTypeFilter("all");
              setOffset(0);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
          >
            <X className="size-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-xs">
        <span className="mr-auto text-gray-500">
          {currentCounts.pending === null
            ? "Checking pending candidates…"
            : `${currentCounts.pending} pending ${kind === "entity" ? "entities" : "relations"}`}
        </span>
        {entityApprovalBlocked && (
          <span className="mr-auto text-amber-700">
            Finish entity decisions before approving relations.
          </span>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !currentCounts.pending}
          onClick={() =>
            void handleReview({
              candidateKind: kind,
              decision: "rejected",
              allPending: true,
            })
          }
        >
          {mutationKey === `${kind}-rejected-all` ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <X className="mr-1.5 size-3.5" />
          )}
          Reject all pending
        </Button>
        <Button
          size="sm"
          disabled={
            busy || !currentCounts.pending || entityApprovalBlocked
          }
          onClick={() =>
            void handleReview({
              candidateKind: kind,
              decision: "approved",
              allPending: true,
            })
          }
        >
          {mutationKey === `${kind}-approved-all` ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Check className="mr-1.5 size-3.5" />
          )}
          Approve all pending
        </Button>
      </div>

      {countsError && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3">
          <ErrorMessage
            message={countsError}
            onRetry={() => setRefreshKey((key) => key + 1)}
            compact
          />
        </div>
      )}

      {isLoadingPage ? (
        <div className="p-8">
          <LoadingMessage label={`Loading ${kind === "entity" ? "entities" : "relations"}…`} />
        </div>
      ) : pageError ? (
        <div className="p-5">
          <ErrorMessage
            message={pageError}
            onRetry={() => setRefreshKey((key) => key + 1)}
          />
        </div>
      ) : page.items.length === 0 ? (
        <EmptyGraphState filtered={Boolean(search || statusFilter !== "all" || typeFilter !== "all")} />
      ) : (
        <div className="divide-y divide-gray-100">
          {page.items.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              disabled={busy}
              approvalBlocked={
                candidate.kind === "relation" && entityApprovalBlocked
              }
              mutationKey={mutationKey}
              onReview={(decision) =>
                void handleReview({
                  candidateKind: candidate.kind,
                  decision,
                  candidateIds: [candidate.id],
                })
              }
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/40 px-4 py-3 text-xs text-gray-500">
        <span>
          {page.total === 0
            ? "No results"
            : `${page.offset + 1}–${Math.min(page.offset + page.items.length, page.total)} of ${page.total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isLoadingPage || page.offset === 0}
            onClick={() => setOffset(Math.max(0, page.offset - PAGE_SIZE))}
            aria-label="Previous graph candidate page"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <span className="min-w-20 text-center tabular-nums">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={
              isLoadingPage || page.offset + page.items.length >= page.total
            }
            onClick={() => setOffset(page.offset + PAGE_SIZE)}
            aria-label="Next graph candidate page"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function CountCard({
  label,
  total,
  pending,
  icon: Icon,
}: {
  label: string;
  total: number | null;
  pending: number | null;
  icon: typeof Boxes;
}) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Icon className="size-4 text-violet-500" />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-bold tabular-nums text-gray-900">
          {total ?? "—"}
        </span>
        <span className="text-xs text-amber-700">
          {pending === null ? "checking" : `${pending} pending`}
        </span>
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
  disabled,
  approvalBlocked,
  mutationKey,
  onReview,
}: {
  candidate: TGraphCandidate;
  disabled: boolean;
  approvalBlocked: boolean;
  mutationKey: string;
  onReview: (decision: "approved" | "rejected") => void;
}) {
  const type =
    candidate.kind === "entity"
      ? candidate.entityType
      : candidate.relationType;
  const approveKey = `${candidate.kind}-approved-${candidate.id}`;
  const rejectKey = `${candidate.kind}-rejected-${candidate.id}`;
  const immutable = candidate.status === "published";

  return (
    <article className="px-4 py-4 transition-colors hover:bg-gray-50/50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {candidate.kind === "entity" ? (
              <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
            ) : (
              <h4 className="flex min-w-0 flex-wrap items-center gap-2 font-semibold text-gray-900">
                <span className="max-w-56 truncate" title={candidate.sourceCanonicalId}>
                  {candidate.sourceName}
                </span>
                <ArrowRight className="size-4 shrink-0 text-violet-400" />
                <span className="max-w-56 truncate" title={candidate.targetCanonicalId}>
                  {candidate.targetName}
                </span>
              </h4>
            )}
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
              {formatGraphType(type)}
            </span>
            <CandidateStatus status={candidate.status} />
          </div>

          {candidate.kind === "entity" ? (
            <p className="mt-1 truncate font-mono text-[11px] text-gray-400" title={candidate.canonicalId}>
              {candidate.canonicalId}
            </p>
          ) : (
            <p className="mt-1 truncate font-mono text-[11px] text-gray-400">
              {candidate.sourceCanonicalId} → {candidate.targetCanonicalId}
            </p>
          )}

          {candidate.description && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {candidate.description}
            </p>
          )}
          {candidate.kind === "entity" && candidate.aliases.length > 0 && (
            <p className="mt-1.5 text-xs text-gray-500">
              <span className="font-medium">Aliases:</span>{" "}
              {candidate.aliases.join(", ")}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
            <Confidence value={candidate.confidence} />
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5 text-gray-400" />
              {candidate.pageNumber ? `Page ${candidate.pageNumber}` : "Page unknown"}
            </span>
            {candidate.evidence.length > 0 && (
              <span>{candidate.evidence.length} evidence snippet{candidate.evidence.length === 1 ? "" : "s"}</span>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {candidate.evidence.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400">
                No evidence snippet was returned for this candidate.
              </div>
            ) : (
              candidate.evidence.slice(0, 2).map((evidence, index) => (
                <blockquote
                  key={`${evidence.text}-${index}`}
                  className="rounded-lg border-l-2 border-violet-300 bg-violet-50/50 px-3 py-2 text-xs leading-relaxed text-gray-600"
                >
                  “{evidence.text}”
                  {evidence.pageNumber && (
                    <span className="ml-2 whitespace-nowrap text-violet-600">
                      Page {evidence.pageNumber}
                    </span>
                  )}
                </blockquote>
              ))
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2 sm:flex-col">
          <Button
            size="sm"
            variant="outline"
            disabled={
              disabled || immutable || candidate.status === "rejected"
            }
            onClick={() => onReview("rejected")}
          >
            {mutationKey === rejectKey ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <X className="mr-1.5 size-3.5" />
            )}
            Reject
          </Button>
          <Button
            size="sm"
            disabled={
              disabled ||
              immutable ||
              approvalBlocked ||
              candidate.status === "approved"
            }
            title={
              approvalBlocked
                ? "Review entity candidates before approving relations"
                : undefined
            }
            onClick={() => onReview("approved")}
          >
            {mutationKey === approveKey ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 size-3.5" />
            )}
            Approve
          </Button>
        </div>
      </div>
    </article>
  );
}

function CandidateStatus({ status }: { status: TGraphCandidateStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "pending" && "bg-amber-50 text-amber-700",
        status === "approved" && "bg-emerald-50 text-emerald-700",
        status === "rejected" && "bg-red-50 text-red-700",
        status === "published" && "bg-blue-50 text-blue-700",
      )}
    >
      {formatGraphType(status)}
    </span>
  );
}

function Confidence({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-2" title={`${percent}% confidence`}>
      <span>Confidence</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <span
          className={cn(
            "block h-full rounded-full",
            percent >= 80
              ? "bg-emerald-500"
              : percent >= 60
                ? "bg-amber-500"
                : "bg-red-400",
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="font-medium tabular-nums text-gray-700">{percent}%</span>
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function LoadingMessage({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
      <Loader2 className="size-4 animate-spin text-violet-500" /> {label}
    </div>
  );
}

function ErrorMessage({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-3 text-sm text-red-700",
        !compact && "rounded-xl border border-red-100 bg-red-50 p-4",
      )}
    >
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <RefreshCw className="mr-1.5 size-3.5" /> Retry
      </Button>
    </div>
  );
}

function EmptyGraphState({ filtered }: { filtered: boolean }) {
  return (
    <div className="px-5 py-12 text-center">
      <Network className="mx-auto size-9 text-gray-300" />
      <p className="mt-3 text-sm font-medium text-gray-700">
        {filtered ? "No candidates match these filters" : "No candidates found"}
      </p>
      <p className="mt-1 text-xs text-gray-400">
        {filtered
          ? "Clear a filter to see the rest of the graph review."
          : "This extraction run did not produce candidates in this section."}
      </p>
    </div>
  );
}
