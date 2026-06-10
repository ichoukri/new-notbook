import { Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TDataset } from "@/core/datasets";
import { STATUS_FILTERS } from "./document-list-constants";

type DocumentsFiltersBarProps = {
  datasets: TDataset[];
  search: string;
  datasetFilter: string;
  statusFilter: string;
  modeFilter: string;
  onSearchChange: (value: string) => void;
  onDatasetFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onModeFilterChange: (value: string) => void;
  onUpload: () => void;
};

export function DocumentsFiltersBar({
  datasets,
  search,
  datasetFilter,
  statusFilter,
  modeFilter,
  onSearchChange,
  onDatasetFilterChange,
  onStatusFilterChange,
  onModeFilterChange,
  onUpload,
}: DocumentsFiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-48 max-w-xs flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Search documents..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-9 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50"
        />
      </div>

      <Select value={datasetFilter} onValueChange={onDatasetFilterChange}>
        <SelectTrigger className="h-9 w-52 rounded-xl border-gray-200 text-xs">
          <SelectValue placeholder="All Datasets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Datasets</SelectItem>
          {datasets.map((dataset) => (
            <SelectItem key={dataset.id} value={dataset.id}>
              {dataset.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="h-9 w-40 rounded-xl border-gray-200 text-xs">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_FILTERS.map((statusOption) => (
            <SelectItem key={statusOption.value} value={statusOption.value}>
              {statusOption.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={modeFilter} onValueChange={onModeFilterChange}>
        <SelectTrigger className="h-9 w-32 rounded-xl border-gray-200 text-xs">
          <SelectValue placeholder="Mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Modes</SelectItem>
          <SelectItem value="auto">Auto</SelectItem>
          <SelectItem value="guided">Guided</SelectItem>
        </SelectContent>
      </Select>

      <Button size="sm" className="ml-auto h-9 gap-2" onClick={onUpload}>
        <Upload className="size-4" />
        Upload File
      </Button>
    </div>
  );
}
