import type { TDataset } from "@/core/datasets";
import type { DatasetStatusFilter } from "./dataset-page-types";

export type DatasetStatusCounts = Record<DatasetStatusFilter, number>;

export function filterDatasets(
  datasets: TDataset[],
  options: {
    query: string;
    statusFilter: DatasetStatusFilter;
  },
): TDataset[] {
  const query = options.query.trim().toLowerCase();

  return datasets.filter((dataset) => {
    const matchesStatus =
      options.statusFilter === "all" ||
      dataset.status === options.statusFilter;

    if (!matchesStatus) {
      return false;
    }

    if (!query) {
      return true;
    }

    return (
      dataset.name.toLowerCase().includes(query) ||
      dataset.description.toLowerCase().includes(query) ||
      dataset.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });
}

export function getDatasetStatusCounts(
  datasets: TDataset[],
): DatasetStatusCounts {
  return {
    all: datasets.length,
    active: datasets.filter((dataset) => dataset.status === "active").length,
    archived: datasets.filter((dataset) => dataset.status === "archived")
      .length,
  };
}

export function getTotalDatasetDocuments(datasets: TDataset[]): number {
  return datasets.reduce((sum, dataset) => sum + dataset.documentCount, 0);
}
