import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import LoadingPage from "@/pages/loading";
import { env } from "@/config/env";

const GlobalLayout = lazy(() => import("@/pages/layout"));
const PrivateLayout = lazy(() => import("@/pages/private/layout"));

/** Public pages */
const LoginPage = lazy(() => import("@/pages/public/auth"));
const NotFoundPage = lazy(() => import("@/pages/public/not-found"));
const ForbiddenPage = lazy(() => import("@/pages/public/403"));
const InternalServerErrorPage = lazy(() => import("@/pages/public/500"));
const ServiceUnavailablePage = lazy(() => import("@/pages/public/503"));
const DevPage = lazy(() => import("@/pages/public/dev"));

/** Private pages */
const DashboardPage = lazy(() => import("@/pages/private/dashboard"));
const DatasetsPage = lazy(() => import("@/pages/private/datasets"));
const DatasetDetailPage = lazy(() => import("@/pages/private/datasets/detail"));
const DocumentsPage = lazy(() => import("@/pages/private/documents"));
const DocumentDetailPage = lazy(() => import("@/pages/private/documents/detail"));
const NewIngestionPage = lazy(() => import("@/pages/private/ingestions/new"));
const AutoModePage = lazy(() => import("@/pages/private/ingestions/auto"));
const GuidedModePage = lazy(() => import("@/pages/private/ingestions/guided"));
const ChunksPage = lazy(() => import("@/pages/private/chunks"));
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
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/ingestions/new" element={<NewIngestionPage />} />
              <Route path="/ingestions/auto" element={<AutoModePage />} />
              <Route path="/ingestions/guided" element={<GuidedModePage />} />
              <Route path="/chunks" element={<ChunksPage />} />
              <Route path="/retrieval" element={<RetrievalPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            {/* Public + misc */}
            <Route path="auth" element={<LoginPage />} />
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
