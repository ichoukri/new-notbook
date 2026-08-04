import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TGraphEntity } from "@/core/knowledge-graph";
import { EntityList } from "./entity-list";

function makeEntity(id: string, name: string): TGraphEntity {
  return {
    canonicalId: id,
    name,
    normalizedName: name.toLowerCase(),
    entityType: "Equipment",
    description: "",
    aliases: [],
    confidence: 0.9,
    excluded: false,
    mergedInto: null,
    curatedAt: null,
    curatedBy: null,
    supportingDocumentCount: 1,
    evidenceCount: 1,
    supportingDocumentIds: ["doc-1"],
  };
}

const entities = [
  makeEntity("ent_aaaaaaaaaaaaaaaaaaaaaaaa", "Mill 1"),
  makeEntity("ent_bbbbbbbbbbbbbbbbbbbbbbbb", "Bearing 1"),
  makeEntity("ent_cccccccccccccccccccccccc", "Pump 3"),
];

function renderList(overrides: Partial<Parameters<typeof EntityList>[0]> = {}) {
  const onSelect = vi.fn();
  const onPageChange = vi.fn();

  render(
    <EntityList
      entities={entities}
      selectedId={entities[0].canonicalId}
      total={entities.length}
      offset={0}
      limit={24}
      isLoading={false}
      onSelect={onSelect}
      onPageChange={onPageChange}
      {...overrides}
    />,
  );

  return { onSelect, onPageChange };
}

describe("EntityList keyboard navigation", () => {
  afterEach(cleanup);

  it("moves selection down and up with the arrow keys", () => {
    const { onSelect } = renderList();

    fireEvent.keyDown(screen.getByRole("button", { name: /Mill 1/ }), {
      key: "ArrowDown",
    });
    expect(onSelect).toHaveBeenCalledWith(entities[1].canonicalId, {
      replace: true,
    });

    fireEvent.keyDown(screen.getByRole("button", { name: /Bearing 1/ }), {
      key: "ArrowUp",
    });
    expect(onSelect).toHaveBeenLastCalledWith(entities[0].canonicalId, {
      replace: true,
    });
  });

  it("jumps to the first and last entity with Home and End", () => {
    const { onSelect } = renderList();

    fireEvent.keyDown(screen.getByRole("button", { name: /Mill 1/ }), {
      key: "End",
    });
    expect(onSelect).toHaveBeenLastCalledWith(entities[2].canonicalId, {
      replace: true,
    });

    fireEvent.keyDown(screen.getByRole("button", { name: /Pump 3/ }), {
      key: "Home",
    });
    expect(onSelect).toHaveBeenLastCalledWith(entities[0].canonicalId, {
      replace: true,
    });
  });

  it("does not move past either end of the list", () => {
    const { onSelect } = renderList();

    fireEvent.keyDown(screen.getByRole("button", { name: /Mill 1/ }), {
      key: "ArrowUp",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: /Pump 3/ }), {
      key: "ArrowDown",
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("pushes a history entry for an explicit click, unlike arrow browsing", () => {
    const { onSelect } = renderList();

    fireEvent.click(screen.getByRole("button", { name: /Pump 3/ }));
    expect(onSelect).toHaveBeenCalledWith(entities[2].canonicalId);
  });
});

describe("EntityList loading and empty states", () => {
  afterEach(cleanup);

  it("shows the empty state only once loading has settled", () => {
    renderList({ entities: [], total: 0, isLoading: true });
    expect(screen.queryByText("No entities found")).not.toBeInTheDocument();

    cleanup();

    renderList({ entities: [], total: 0, isLoading: false });
    expect(screen.getByText("No entities found")).toBeInTheDocument();
  });

  it("keeps the previous page visible while the next one loads", () => {
    renderList({ isLoading: true });
    expect(screen.getByRole("button", { name: /Mill 1/ })).toBeInTheDocument();
  });
});
