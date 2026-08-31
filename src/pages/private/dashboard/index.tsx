import { useMemo } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { useDatasets, useDocuments } from "@/core/api/hooks";
import { AlertTriangle } from "lucide-react";
import {
  DashboardQuickStats,
  DashboardSummaryCards,
  RecentIngestions,
} from "./dashboard-sections";
import {
  IngestionCta,
  SystemStatusPanel,
  TopDatasetsPanel,
} from "./dashboard-sidebar-sections";
import { getDashboardMetrics, getTopDatasets } from "./dashboard-utils";

const DASHBOARD_DOCUMENT_PARAMS: Record<string, string> = {
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

const DASHBOARD_DATASET_PARAMS: Record<string, string> = {
  include_documents: "false",
  limit: "100",
  sort_by: "updated_at",
  sort_order: "desc",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const datasetResource = useDatasets(DASHBOARD_DATASET_PARAMS);
  const documentResource = useDocuments(DASHBOARD_DOCUMENT_PARAMS);

  const datasets = datasetResource.items;
  const documents = documentResource.items;
  const isLoading = datasetResource.isLoading || documentResource.isLoading;
  const isRefreshing =
    datasetResource.isValidating || documentResource.isValidating;

  const datasetsById = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset.name])),
    [datasets],
  );

  const metrics = useMemo(
    () =>
      getDashboardMetrics({
        datasets,
        documents,
        datasetTotal: datasetResource.total,
        documentTotal: documentResource.total,
      }),
    [datasetResource.total, datasets, documentResource.total, documents],
  );
  const recentDocuments = documents.slice(0, 6);
  const topDatasets = useMemo(() => getTopDatasets(datasets), [datasets]);

  const refreshDashboard = () => {
    void Promise.all([datasetResource.refresh(), documentResource.refresh()]);
  };

  return (
    <div className="flex flex-1 flex-col overflow-auto bg-gray-50/40">
      <Topbar title="Dashboard" />

      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1400px] space-y-6 px-8 py-7">
          {(datasetResource.error || documentResource.error) && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="size-4 flex-shrink-0" />
              <span>{datasetResource.error || documentResource.error}</span>
            </div>
          )}

          <DashboardSummaryCards
            metrics={metrics}
            sampledDocumentCount={documents.length}
            topDatasetCount={topDatasets.length}
            isLoading={isLoading}
          />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <DashboardQuickStats
                metrics={metrics}
                onNavigate={(path) => navigate(path)}
              />

              <RecentIngestions
                documents={recentDocuments}
                datasetsById={datasetsById}
                isLoading={isLoading}
                onOpenDocument={(documentId) =>
                  navigate(`/documents/${documentId}`)
                }
                onViewAll={() => navigate("/activity")}
                onUpload={() => navigate("/ingestions/new")}
              />
            </div>

            <div className="space-y-4">
              <SystemStatusPanel
                metrics={metrics}
                datasetError={datasetResource.error}
                documentError={documentResource.error}
                sampledDocumentCount={documents.length}
                isRefreshing={isRefreshing}
                onRefresh={refreshDashboard}
              />

              <TopDatasetsPanel
                datasets={topDatasets}
                isLoading={isLoading}
                onOpenDataset={(datasetId) => navigate(`/datasets/${datasetId}`)}
                onViewAll={() => navigate("/datasets")}
              />

              <IngestionCta onUpload={() => navigate("/ingestions/new")} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
