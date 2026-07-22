import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatGraphLabel,
  type TGraphNeighborhood,
} from "@/core/knowledge-graph";
import { cn } from "@/lib/utils";
import { formatConfidence } from "./graph-explorer-utils";
import {
  computeNeighborhoodLayout,
  getEdgeGeometry,
  getGraphLegendEntries,
  truncateNodeLabel,
  type TGraphLayoutEdge,
  type TGraphLayoutNode,
} from "./neighborhood-graph-utils";

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3;
const MAX_FIT_ZOOM = 1.3;
const EDGE_LABEL_LIMIT = 14;

// Chart chrome from the data-viz reference palette (white panel surface).
const EDGE_COLOR = "#c3c2b7";
const EDGE_ACTIVE_COLOR = "#52514e";
const INK_PRIMARY = "#0b0b0b";
const INK_SECONDARY = "#52514e";
const SURFACE = "#ffffff";

type TTransform = { k: number; x: number; y: number };
type THovered =
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string }
  | null;

type NeighborhoodGraphProps = {
  neighborhood: TGraphNeighborhood;
  onSelectEntity: (canonicalId: string) => void;
  className?: string;
};

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ width: 800, height: 480 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({ width: rect.width, height: rect.height });
      }
    };
    measure();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export function NeighborhoodGraph({
  neighborhood,
  onSelectEntity,
  className,
}: NeighborhoodGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const size = useContainerSize(containerRef);
  const layout = useMemo(
    () => computeNeighborhoodLayout(neighborhood),
    [neighborhood],
  );
  const legendEntries = useMemo(
    () => getGraphLegendEntries(neighborhood.nodes),
    [neighborhood.nodes],
  );

  const fitTransform = useMemo<TTransform>(() => {
    const { bounds } = layout;
    // The legend strip overlays the bottom of the canvas — fit above it.
    const fitHeight = Math.max(size.height - 48, 120);
    const k = Math.min(
      MAX_FIT_ZOOM,
      Math.max(
        MIN_ZOOM,
        Math.min(size.width / bounds.width, fitHeight / bounds.height),
      ),
    );
    return {
      k,
      x: size.width / 2 - k * (bounds.minX + bounds.width / 2),
      y: 8 + fitHeight / 2 - k * (bounds.minY + bounds.height / 2),
    };
  }, [layout, size.height, size.width]);

  const [userTransform, setUserTransform] = useState<TTransform | null>(null);
  const [hovered, setHovered] = useState<THovered>(null);
  const transform = userTransform ?? fitTransform;
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const current = transformRef.current;
      const nextK = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, current.k * Math.exp(-event.deltaY * 0.002)),
      );
      const ratio = nextK / current.k;
      setUserTransform({
        k: nextK,
        x: px - (px - current.x) * ratio,
        y: py - (py - current.y) * ratio,
      });
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const panState = useRef<{ pointerId: number; x: number; y: number } | null>(
    null,
  );
  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    panState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onBackgroundPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pan = panState.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    const dx = event.clientX - pan.x;
    const dy = event.clientY - pan.y;
    pan.x = event.clientX;
    pan.y = event.clientY;
    const current = transformRef.current;
    setUserTransform({ k: current.k, x: current.x + dx, y: current.y + dy });
  };
  const onBackgroundPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (panState.current?.pointerId === event.pointerId) {
      panState.current = null;
    }
  };

  const zoomBy = (factor: number) => {
    const current = transformRef.current;
    const nextK = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor));
    const ratio = nextK / current.k;
    const cx = size.width / 2;
    const cy = size.height / 2;
    setUserTransform({
      k: nextK,
      x: cx - (cx - current.x) * ratio,
      y: cy - (cy - current.y) * ratio,
    });
  };

  const hoveredNode =
    hovered?.kind === "node"
      ? layout.nodes.find((node) => node.entity.canonicalId === hovered.id) ??
        null
      : null;
  const hoveredEdge =
    hovered?.kind === "edge"
      ? layout.edges.find((edge) => edge.edge.id === hovered.id) ?? null
      : null;

  const activeNodeIds = useMemo(() => {
    if (hoveredNode) {
      const ids = new Set([hoveredNode.entity.canonicalId]);
      for (const edge of layout.edges) {
        if (edge.edge.sourceCanonicalId === hoveredNode.entity.canonicalId) {
          ids.add(edge.edge.targetCanonicalId);
        }
        if (edge.edge.targetCanonicalId === hoveredNode.entity.canonicalId) {
          ids.add(edge.edge.sourceCanonicalId);
        }
      }
      return ids;
    }
    if (hoveredEdge) {
      return new Set([
        hoveredEdge.edge.sourceCanonicalId,
        hoveredEdge.edge.targetCanonicalId,
      ]);
    }
    return null;
  }, [hoveredEdge, hoveredNode, layout.edges]);

  const isEdgeActive = (edge: TGraphLayoutEdge) => {
    if (hoveredEdge) return edge.edge.id === hoveredEdge.edge.id;
    if (hoveredNode) {
      return (
        edge.edge.sourceCanonicalId === hoveredNode.entity.canonicalId ||
        edge.edge.targetCanonicalId === hoveredNode.entity.canonicalId
      );
    }
    return false;
  };

  const toScreen = (x: number, y: number) => ({
    x: transform.x + transform.k * x,
    y: transform.y + transform.k * y,
  });

  const tooltip = hoveredNode
    ? {
        ...toScreen(hoveredNode.x, hoveredNode.y - hoveredNode.radius),
        node: hoveredNode,
        edge: null,
      }
    : hoveredEdge
      ? (() => {
          const geometry = getEdgeGeometry(hoveredEdge);
          return {
            ...toScreen(geometry.labelX, geometry.labelY),
            node: null,
            edge: hoveredEdge,
          };
        })()
      : null;

  const onNodeKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    node: TGraphLayoutNode,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectEntity(node.entity.canonicalId);
    }
  };

  const showEdgeLabels = layout.edges.length <= EDGE_LABEL_LIMIT;
  const centerName =
    layout.nodes.find((node) => node.isCenter)?.entity.name ?? "entity";

  return (
    <div
      ref={containerRef}
      className={cn("relative min-h-0 flex-1 overflow-hidden", className)}
    >
      <svg
        role="group"
        aria-label={`Neighborhood graph for ${centerName}: ${layout.nodes.length} entities and ${layout.edges.length} relations`}
        width={size.width}
        height={size.height}
        className="block cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={onBackgroundPointerUp}
        onPointerCancel={onBackgroundPointerUp}
      >
        <defs>
          <marker
            id="graph-arrow"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={EDGE_COLOR} />
          </marker>
          <marker
            id="graph-arrow-active"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={EDGE_ACTIVE_COLOR} />
          </marker>
        </defs>

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {layout.edges.map((edge) => {
            const geometry = getEdgeGeometry(edge);
            const active = isEdgeActive(edge);
            const dimmed = activeNodeIds !== null && !active;
            return (
              <g
                key={edge.edge.id}
                className="transition-opacity duration-150"
                opacity={dimmed ? 0.2 : 1}
              >
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={active ? EDGE_ACTIVE_COLOR : EDGE_COLOR}
                  strokeWidth={active ? 2 : 1.5}
                  markerEnd={
                    active ? "url(#graph-arrow-active)" : "url(#graph-arrow)"
                  }
                />
                <path
                  d={geometry.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  className="cursor-pointer"
                  onPointerEnter={() =>
                    setHovered({ kind: "edge", id: edge.edge.id })
                  }
                  onPointerLeave={() => setHovered(null)}
                />
                {showEdgeLabels && geometry.length >= 130 && (
                  <text
                    x={geometry.labelX}
                    y={geometry.labelY - 5}
                    textAnchor="middle"
                    fontSize={10}
                    fill={INK_SECONDARY}
                    stroke={SURFACE}
                    strokeWidth={3}
                    paintOrder="stroke"
                    className="pointer-events-none"
                  >
                    {formatGraphLabel(edge.edge.relationType)}
                  </text>
                )}
              </g>
            );
          })}

          {layout.nodes.map((node) => {
            const id = node.entity.canonicalId;
            const dimmed = activeNodeIds !== null && !activeNodeIds.has(id);
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-label={`${node.entity.name} — ${formatGraphLabel(node.entity.entityType)}${node.isCenter ? " (current center)" : ""}`}
                transform={`translate(${node.x} ${node.y})`}
                className="cursor-pointer outline-none transition-opacity duration-150"
                opacity={dimmed ? 0.25 : node.entity.excluded ? 0.45 : 1}
                onClick={() => onSelectEntity(id)}
                onKeyDown={(event) => onNodeKeyDown(event, node)}
                onPointerEnter={() => setHovered({ kind: "node", id })}
                onPointerLeave={() => setHovered(null)}
                onPointerDown={(event) => event.stopPropagation()}
                onFocus={() => setHovered({ kind: "node", id })}
                onBlur={() => setHovered(null)}
              >
                {/* Hit target stays larger than the painted mark. */}
                <circle r={Math.max(node.radius + 9, 16)} fill="transparent" />
                {node.isCenter && (
                  <circle
                    r={node.radius + 4.5}
                    fill="none"
                    stroke={INK_PRIMARY}
                    strokeWidth={1.5}
                  />
                )}
                <circle
                  r={node.radius}
                  fill={node.color}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
                <text
                  y={node.radius + 14}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={node.isCenter ? 600 : 500}
                  fill={node.isCenter ? INK_PRIMARY : INK_SECONDARY}
                  stroke={SURFACE}
                  strokeWidth={3}
                  paintOrder="stroke"
                  className="pointer-events-none"
                >
                  {truncateNodeLabel(node.entity.name)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom in"
          onClick={() => zoomBy(1.35)}
        >
          <Plus className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Zoom out"
          onClick={() => zoomBy(1 / 1.35)}
        >
          <Minus className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Fit graph to view"
          onClick={() => setUserTransform(null)}
        >
          <Maximize className="size-3.5" />
        </Button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[85%] flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/90 px-2.5 py-1.5">
        {legendEntries.map((entry) => (
          <span
            key={entry.label}
            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600"
          >
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {formatGraphLabel(entry.label)}
          </span>
        ))}
      </div>

      {layout.edges.length === 0 && (
        <p className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-gray-500">
          No relations inside this bounded neighborhood.
        </p>
      )}

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md"
          style={{
            left: Math.min(Math.max(tooltip.x, 96), size.width - 96),
            top: Math.max(tooltip.y - 8, 8),
          }}
        >
          {tooltip.node && (
            <>
              <p className="text-xs font-semibold text-gray-900">
                {tooltip.node.entity.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-600">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: tooltip.node.color }}
                />
                {formatGraphLabel(tooltip.node.entity.entityType)}
                {tooltip.node.entity.excluded && " · Excluded"}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                {formatConfidence(tooltip.node.entity.confidence)} confidence ·{" "}
                {tooltip.node.entity.supportingDocumentCount} docs ·{" "}
                {tooltip.node.entity.evidenceCount} evidence
              </p>
              {!tooltip.node.isCenter && (
                <p className="mt-1 text-[11px] text-indigo-600">
                  Click to explore this entity
                </p>
              )}
            </>
          )}
          {tooltip.edge && (
            <>
              <p className="text-xs font-semibold text-gray-900">
                {tooltip.edge.source.entity.name}{" "}
                <span className="text-gray-400">→</span>{" "}
                {tooltip.edge.target.entity.name}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-600">
                {formatGraphLabel(tooltip.edge.edge.relationType)} ·{" "}
                {formatConfidence(tooltip.edge.edge.confidence)} confidence ·{" "}
                {tooltip.edge.edge.citationIds.length} citation
                {tooltip.edge.edge.citationIds.length === 1 ? "" : "s"}
              </p>
              {tooltip.edge.edge.description && (
                <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-gray-500">
                  {tooltip.edge.edge.description}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
