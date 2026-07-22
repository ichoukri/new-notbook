import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type {
  TGraphEdge,
  TGraphEntity,
  TGraphNeighborhood,
} from "@/core/knowledge-graph";

// Categorical slots from the validated data-viz reference palette. A node-link
// graph is an all-pairs form (any two nodes can sit side by side), and only the
// first four slots clear the all-pairs CVD + normal-vision floors on a white
// surface — every remaining entity type folds into the neutral "Other" color.
// The slot order follows GRAPH_ENTITY_TYPES; do not append a fifth hue.
export const GRAPH_TYPE_COLOR_SLOTS: Record<string, string> = {
  Equipment: "#2a78d6",
  Component: "#008300",
  Procedure: "#e87ba4",
  MaintenanceTask: "#eda100",
};

export const GRAPH_OTHER_COLOR = "#898781";
export const GRAPH_OTHER_LABEL = "Other";

export function getEntityTypeColor(entityType: string): string {
  return GRAPH_TYPE_COLOR_SLOTS[entityType] ?? GRAPH_OTHER_COLOR;
}

export type TGraphLegendEntry = {
  label: string;
  color: string;
};

export function getGraphLegendEntries(
  nodes: TGraphEntity[],
): TGraphLegendEntry[] {
  const present = new Set(nodes.map((node) => node.entityType));
  const entries: TGraphLegendEntry[] = Object.entries(GRAPH_TYPE_COLOR_SLOTS)
    .filter(([type]) => present.has(type))
    .map(([type, color]) => ({ label: type, color }));

  const hasOther = nodes.some(
    (node) => !(node.entityType in GRAPH_TYPE_COLOR_SLOTS),
  );
  if (hasOther) {
    entries.push({ label: GRAPH_OTHER_LABEL, color: GRAPH_OTHER_COLOR });
  }
  return entries;
}

export type TGraphLayoutNode = {
  entity: TGraphEntity;
  x: number;
  y: number;
  radius: number;
  color: string;
  isCenter: boolean;
};

export type TGraphLayoutEdge = {
  edge: TGraphEdge;
  source: TGraphLayoutNode;
  target: TGraphLayoutNode;
  /** Perpendicular offset so parallel edges between one pair stay readable. */
  curveOffset: number;
};

export type TGraphLayoutBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type TGraphLayout = {
  nodes: TGraphLayoutNode[];
  edges: TGraphLayoutEdge[];
  bounds: TGraphLayoutBounds;
};

type TSimNode = SimulationNodeDatum & {
  id: string;
  entity: TGraphEntity;
  radius: number;
};

const MIN_RADIUS = 7;
const MAX_RADIUS = 15;
const CENTER_RADIUS_BONUS = 3;
const LABEL_MARGIN = 26;
const PARALLEL_EDGE_GAP = 38;

function nodeRadius(entity: TGraphEntity, maxEvidence: number): number {
  if (maxEvidence <= 0) return MIN_RADIUS;
  const ratio = Math.sqrt(entity.evidenceCount / maxEvidence);
  return MIN_RADIUS + ratio * (MAX_RADIUS - MIN_RADIUS);
}

export function computeNeighborhoodLayout(
  neighborhood: TGraphNeighborhood,
): TGraphLayout {
  const maxEvidence = Math.max(
    0,
    ...neighborhood.nodes.map((node) => node.evidenceCount),
  );

  const simNodes: TSimNode[] = neighborhood.nodes.map((entity) => {
    const isCenter = entity.canonicalId === neighborhood.centerId;
    const radius =
      nodeRadius(entity, maxEvidence) + (isCenter ? CENTER_RADIUS_BONUS : 0);
    return {
      id: entity.canonicalId,
      entity,
      radius,
      ...(isCenter ? { fx: 0, fy: 0 } : {}),
    };
  });

  const nodeIds = new Set(simNodes.map((node) => node.id));
  const linkEdges = neighborhood.edges.filter(
    (edge) =>
      edge.sourceCanonicalId !== edge.targetCanonicalId &&
      nodeIds.has(edge.sourceCanonicalId) &&
      nodeIds.has(edge.targetCanonicalId),
  );
  const simLinks: (SimulationLinkDatum<TSimNode> & { id: string })[] =
    linkEdges.map((edge) => ({
      id: edge.id,
      source: edge.sourceCanonicalId,
      target: edge.targetCanonicalId,
    }));

  const simulation = forceSimulation(simNodes)
    .force(
      "link",
      forceLink<TSimNode, SimulationLinkDatum<TSimNode>>(simLinks)
        .id((node) => node.id)
        .distance(150)
        .strength(0.3),
    )
    .force("charge", forceManyBody<TSimNode>().strength(-620))
    .force("x", forceX<TSimNode>(0).strength(0.05))
    .force("y", forceY<TSimNode>(0).strength(0.05))
    .force(
      "collide",
      // Padded well past the circle so the label line below stays clear too.
      forceCollide<TSimNode>().radius((node) => node.radius + 30),
    )
    .stop();
  simulation.tick(300);

  const layoutNodes: TGraphLayoutNode[] = simNodes.map((node) => ({
    entity: node.entity,
    x: node.x ?? 0,
    y: node.y ?? 0,
    radius: node.radius,
    color: getEntityTypeColor(node.entity.entityType),
    isCenter: node.entity.canonicalId === neighborhood.centerId,
  }));
  const layoutNodesById = new Map(
    layoutNodes.map((node) => [node.entity.canonicalId, node]),
  );

  const pairCounts = new Map<string, number>();
  for (const edge of linkEdges) {
    const key = [edge.sourceCanonicalId, edge.targetCanonicalId]
      .sort()
      .join("::");
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }
  const pairSeen = new Map<string, number>();
  const layoutEdges: TGraphLayoutEdge[] = linkEdges.map((edge) => {
    const key = [edge.sourceCanonicalId, edge.targetCanonicalId]
      .sort()
      .join("::");
    const total = pairCounts.get(key) ?? 1;
    const index = pairSeen.get(key) ?? 0;
    pairSeen.set(key, index + 1);
    return {
      edge,
      source: layoutNodesById.get(edge.sourceCanonicalId) as TGraphLayoutNode,
      target: layoutNodesById.get(edge.targetCanonicalId) as TGraphLayoutNode,
      curveOffset: (index - (total - 1) / 2) * PARALLEL_EDGE_GAP,
    };
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of layoutNodes) {
    minX = Math.min(minX, node.x - node.radius - LABEL_MARGIN);
    maxX = Math.max(maxX, node.x + node.radius + LABEL_MARGIN);
    minY = Math.min(minY, node.y - node.radius - LABEL_MARGIN);
    maxY = Math.max(maxY, node.y + node.radius + LABEL_MARGIN);
  }
  if (!Number.isFinite(minX)) {
    minX = -60;
    minY = -60;
    maxX = 60;
    maxY = 60;
  }

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    bounds: {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

export type TEdgeGeometry = {
  path: string;
  length: number;
  labelX: number;
  labelY: number;
};

/**
 * Quadratic path from the source node boundary to the target node boundary,
 * trimmed so the arrowhead never sits underneath the target circle. Parallel
 * edges stagger their label along the curve so the labels never stack.
 */
export function getEdgeGeometry(edge: TGraphLayoutEdge): TEdgeGeometry {
  const { source, target, curveOffset } = edge;
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const ux = dx / distance;
  const uy = dy / distance;
  const nx = -uy;
  const ny = ux;

  const startX = source.x + ux * (source.radius + 3);
  const startY = source.y + uy * (source.radius + 3);
  const endX = target.x - ux * (target.radius + 9);
  const endY = target.y - uy * (target.radius + 9);
  const controlX = (startX + endX) / 2 + nx * curveOffset;
  const controlY = (startY + endY) / 2 + ny * curveOffset;

  const t = curveOffset === 0 ? 0.5 : curveOffset > 0 ? 0.63 : 0.37;
  const mt = 1 - t;

  return {
    path: `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`,
    length: Math.hypot(endX - startX, endY - startY),
    labelX: mt * mt * startX + 2 * mt * t * controlX + t * t * endX,
    labelY: mt * mt * startY + 2 * mt * t * controlY + t * t * endY,
  };
}

export function truncateNodeLabel(name: string, maxLength = 20): string {
  return name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;
}
