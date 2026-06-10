import { describe, expect, it } from "vitest";
import type { TDataset } from "@/core/datasets";
import {
  filterDatasets,
  getDatasetStatusCounts,
  getTotalDatasetDocuments,
} from "./dataset-page-utils";

const datasets: TDataset[] = [
  {
    id: "dataset-1",
    name: "Policies",
    description: "Employee handbook",
    tenantId: "tenant-1",
    createdBy: "user-1",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    tags: ["hr"],
    metadata: {},
    documentCount: 3,
    documents: [],
  },
  {
    id: "dataset-2",
    name: "Archive",
    description: "Legacy data",
    tenantId: "tenant-1",
    createdBy: "user-1",
    status: "archived",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    tags: ["legacy"],
    metadata: {},
    documentCount: 2,
    documents: [],
  },
];

describe("dataset page helpers", () => {
  it("filters by status and searchable text", () => {
    expect(filterDatasets(datasets, { query: "hr", statusFilter: "all" })).toHaveLength(1);
    expect(
      filterDatasets(datasets, { query: "", statusFilter: "archived" }),
    ).toEqual([datasets[1]]);
  });

  it("summarizes dataset counts", () => {
    expect(getDatasetStatusCounts(datasets)).toEqual({
      all: 2,
      active: 1,
      archived: 1,
    });
    expect(getTotalDatasetDocuments(datasets)).toBe(5);
  });
});
