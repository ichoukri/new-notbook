import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { parsePartitionElements } from "./partition-elements";
import { PartitionReview } from "./partition-review";

// The review screen renders images through the asset URL builder; jsdom has no
// network, and these tests are about selection wiring rather than rendering.
vi.mock("@/core/api", () => ({
  buildChunkAssetUrl: (path: string) => `https://assets.test${path}`,
}));

function imageElement(index: number, page: number, groupId: string | null) {
  return {
    index,
    type: "Image",
    page,
    char_count: 0,
    preview: "",
    has_image: true,
    has_table: false,
    table_html: null,
    image_path: `/assets/${index}.png`,
    duplicate_group_id: groupId,
  };
}

/** Three copies of one logo plus a standalone figure that must stay untouched. */
function output(removed: number[] = []) {
  return {
    elements: [
      imageElement(0, 1, "dup-1"),
      imageElement(1, 2, "dup-1"),
      imageElement(2, 3, null),
      imageElement(3, 4, "dup-1"),
    ],
    removed_indices: removed,
  };
}

function renderReview(
  overrides: Partial<Parameters<typeof PartitionReview>[0]> = {},
) {
  const onSaveRemovals = vi.fn();
  render(
    <PartitionReview
      output={output()}
      onSaveRemovals={onSaveRemovals}
      isSaving={false}
      disabled={false}
      {...overrides}
    />,
  );
  return { onSaveRemovals };
}

describe("partition element parsing", () => {
  it("reads duplicate_group_id and defaults it to null when absent", () => {
    const [withGroup, withoutGroup] = parsePartitionElements([
      imageElement(0, 1, "dup-1"),
      { ...imageElement(1, 2, null), duplicate_group_id: undefined },
    ]);

    expect(withGroup.duplicate_group_id).toBe("dup-1");
    expect(withoutGroup.duplicate_group_id).toBeNull();
  });
});

describe("duplicate image selection", () => {
  it("labels a duplicate set with its size and leaves singletons unlabelled", () => {
    renderReview();

    // Three grouped copies, so three badges — the lone figure gets none.
    expect(screen.getAllByText("3 identical")).toHaveLength(3);
  });

  it("selects every copy across the document from one click", () => {
    renderReview();

    fireEvent.click(screen.getAllByRole("button", { name: /Select all 3/ })[0]);

    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("removes exactly the grouped copies, sparing the standalone image", () => {
    const { onSaveRemovals } = renderReview();

    fireEvent.click(screen.getAllByRole("button", { name: /Select all 3/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Remove 3/ }));

    expect(onSaveRemovals).toHaveBeenCalledWith([0, 1, 3]);
  });

  it("counts only the copies still present once some are removed", () => {
    render(
      <PartitionReview
        output={output([0])}
        onSaveRemovals={vi.fn()}
        isSaving={false}
        disabled={false}
      />,
    );

    // The badge still describes the set (3 identical), but the action offers
    // only the two that removing would actually change.
    fireEvent.click(screen.getAllByRole("button", { name: /Select all 3/ })[0]);
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("offers no selection action while the stage is saving", () => {
    renderReview({ isSaving: true });

    expect(
      screen.getAllByRole("button", { name: /Select all 3/ })[0],
    ).toBeDisabled();
  });
});

describe("filtering to one duplicate set", () => {
  const badges = () => screen.getAllByRole("button", { name: "3 identical" });

  it("narrows the list to that set so a bulk removal can be checked first", () => {
    renderReview();
    expect(screen.getByText("#2")).toBeInTheDocument();

    fireEvent.click(badges()[0]);

    // The standalone figure (#2) drops out; only the three copies remain.
    expect(screen.getByText("3 of 4")).toBeInTheDocument();
    expect(screen.queryByText("#2")).not.toBeInTheDocument();
  });

  it("keeps other duplicate sets out of view", () => {
    render(
      <PartitionReview
        output={{
          elements: [
            imageElement(0, 1, "dup-1"),
            imageElement(1, 2, "dup-1"),
            imageElement(2, 3, "dup-2"),
            imageElement(3, 4, "dup-2"),
          ],
          removed_indices: [],
        }}
        onSaveRemovals={vi.fn()}
        isSaving={false}
        disabled={false}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "2 identical" })[0]);

    // Both sets are sized 2, so identity is checked via the element ids.
    expect(screen.getByText("#0")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("#2")).not.toBeInTheDocument();
  });

  it("clicking the active badge again restores the full list", () => {
    renderReview();

    fireEvent.click(badges()[0]);
    expect(screen.getByText("3 of 4")).toBeInTheDocument();

    fireEvent.click(badges()[0]);
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("surfaces the active set as a dismissable chip in the filter bar", () => {
    renderReview();
    fireEvent.click(badges()[0]);

    fireEvent.click(
      screen.getByRole("button", { name: /3 identical images/ }),
    );

    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("is cleared by the filter bar's Clear alongside the built-in filters", () => {
    renderReview();
    fireEvent.click(badges()[0]);

    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));

    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("composes with the page filter rather than overriding it", () => {
    renderReview();
    fireEvent.click(badges()[0]);

    fireEvent.change(screen.getByLabelText("Filter by page"), {
      target: { value: "2" },
    });

    // Page 2 holds one of the three copies.
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("still selects copies hidden by the active filter", () => {
    const { onSaveRemovals } = renderReview();

    fireEvent.click(badges()[0]);
    fireEvent.change(screen.getByLabelText("Filter by page"), {
      target: { value: "2" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Select all 3 in document/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Remove 3/ }));

    expect(onSaveRemovals).toHaveBeenCalledWith([0, 1, 3]);
  });
});
