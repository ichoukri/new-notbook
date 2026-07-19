import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import LoadingPage from "@/pages/loading";
import { env } from "@/config/env";

const GlobalLayout = lazy(() => import("@/pages/layout"));
const PrivateLayout = lazy(() => import("@/pages/private/layout"));

/** Public pages */
const NotFoundPage = lazy(() => import("@/pages/public/not-found"));
const ForbiddenPage = lazy(() => import("@/pages/public/403"));
const InternalServerErrorPage = lazy(() => import("@/pages/public/500"));
const ServiceUnavailablePage = lazy(() => import("@/pages/public/503"));
const DevPage = lazy(() => import("@/pages/public/dev"));

/** Private pages */
const DashboardPage = lazy(() => import("@/pages/private/dashboard"));
const DatasetsPage = lazy(() => import("@/pages/private/datasets"));
const DatasetDetailPage = lazy(() => import("@/pages/private/datasets/detail"));
const KnowledgeGroupsPage = lazy(
  () => import("@/pages/private/knowledge-groups"),
);
const DocumentsPage = lazy(() => import("@/pages/private/documents"));
const DocumentDetailPage = lazy(() => import("@/pages/private/documents/detail"));
const NewIngestionPage = lazy(() => import("@/pages/private/ingestions/new"));
const IngestionStatusPage = lazy(() => import("@/pages/private/ingestions/auto"));
const ChunksPage = lazy(() => import("@/pages/private/chunks"));
const KnowledgeGraphPage = lazy(() => import("@/pages/private/graph"));
const KnowledgeChatPage = lazy(() => import("@/pages/private/chat"));
const RetrievalPage = lazy(() => import("@/pages/private/retrieval"));
const ActivityPage = lazy(() => import("@/pages/private/activity"));
const SettingsPage = lazy(() => import("@/pages/private/settings"));

export default function Router() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          <Route element={<GlobalLayout />}>
            <Route element={<PrivateLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/datasets" element={<DatasetsPage />} />
              <Route path="/datasets/:id" element={<DatasetDetailPage />} />
              <Route path="/knowledge-groups" element={<KnowledgeGroupsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/ingestions/new" element={<NewIngestionPage />} />
              <Route path="/ingestions/status" element={<IngestionStatusPage />} />
              <Route path="/ingestions/auto" element={<IngestionStatusPage />} />
              <Route path="/chunks" element={<ChunksPage />} />
              <Route path="/graph" element={<KnowledgeGraphPage />} />
              <Route path="/chat" element={<KnowledgeChatPage />} />
              <Route path="/retrieval" element={<RetrievalPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            {/* Public + misc */}
            <Route path="403" element={<ForbiddenPage />} />
            <Route path="500" element={<InternalServerErrorPage />} />
            <Route path="503" element={<ServiceUnavailablePage />} />
            {env.VITE_NODE_ENV === "development" && (
              <Route path="dev" element={<DevPage />} />
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
