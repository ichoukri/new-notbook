import { getApiErrorMessage, getApiErrorStatus } from "@/core/api/error";
import type { TGraphEntity } from "@/core/knowledge-graph";

export type TGraphErrorState = {
  kind: "disabled" | "unavailable" | "forbidden" | "generic";
  title: string;
  message: string;
  retryable: boolean;
};

export function getGraphErrorState(error: unknown): TGraphErrorState {
  const message = getApiErrorMessage(
    error,
    "The knowledge graph could not be loaded.",
  );
  const normalized = message.toLowerCase();
  const status = getApiErrorStatus(error);

  if (normalized.includes("disabled") || normalized.includes("not enabled")) {
    return {
      kind: "disabled",
      title: "Knowledge graph is disabled",
      message:
        "Enable Neo4j knowledge-graph features on the service, then ingest or publish a guided document.",
      retryable: false,
    };
  }

  if (
    status === 503 ||
    status === null &&
      (normalized.includes("network") || normalized.includes("connect"))
  ) {
    return {
      kind: "unavailable",
      title: "Knowledge graph is unavailable",
      message:
        "Neo4j or the graph service is not reachable right now. Existing vector retrieval is unaffected.",
      retryable: true,
    };
  }

  if (status === 403) {
    return {
      kind: "forbidden",
      title: "This graph scope is not accessible",
      message:
        "Choose a dataset or document you can access, or ask an administrator to update its access policy.",
      retryable: false,
    };
  }

  return {
    kind: "generic",
    title: "Could not load the knowledge graph",
    message,
    retryable: true,
  };
}

export function formatConfidence(confidence: number | null): string {
  return confidence === null ? "Not scored" : `${Math.round(confidence * 100)}%`;
}

export function parseAliases(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((alias) => alias.trim())
        .filter(Boolean),
    ),
  );
}

export function isCanonicalEntityId(value: string): boolean {
  return /^ent_[0-9a-f]{24}$/.test(value);
}

export function getEntityName(
  canonicalId: string,
  nodes: TGraphEntity[],
): string {
  return nodes.find((node) => node.canonicalId === canonicalId)?.name ?? canonicalId;
}
