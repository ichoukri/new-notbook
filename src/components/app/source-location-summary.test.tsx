import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SourceLocationSummary } from "./source-location-summary";

afterEach(cleanup);

describe("SourceLocationSummary", () => {
  it("keeps the canonical path compact and reveals alternate locations", () => {
    render(
      <SourceLocationSummary
        paths={[
          "1-Grinding 1/Manuals/Grinding.pdf",
          "1-Grinding 1/Archive/Grinding.pdf",
          "1-Grinding 1/Legacy/Grinding.pdf",
        ]}
      />,
    );

    expect(screen.getByText("Canonical")).toBeInTheDocument();
    expect(
      screen.getByText("1-Grinding 1/Manuals/Grinding.pdf"),
    ).toBeInTheDocument();

    const summary = screen.getByText("+2 alternate source locations");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    fireEvent.click(summary);
    expect(details).toHaveAttribute("open");
    expect(
      screen.getByText("1-Grinding 1/Archive/Grinding.pdf"),
    ).toBeInTheDocument();
  });

  it("renders nothing when no folder provenance is available", () => {
    const { container } = render(<SourceLocationSummary paths={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
