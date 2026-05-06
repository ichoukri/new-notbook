import { useEffect } from "react";
import { Outlet } from "react-router";
import Sidebar from "@/components/app/sidebar";
import { backendApi } from "@/core/api";
import { useGlobalStore } from "@/core/global-store/index";
import LoadingPage from "@/pages/loading";

export default function PrivateLayout() {
  const user = useGlobalStore((state) => state.user);
  const setUser = useGlobalStore((state) => state.setUser);

  useEffect(() => {
    if (user !== undefined) return;

    backendApi
      .fetchMe()
      .then((u) => setUser(u))
      .catch(() => {
        setUser(null);
      });
  }, [user, setUser]);

  if (user === undefined) {
    return <LoadingPage />;
  }

  if (!user) {
    return <LoadingPage />;
  }

  return (
    <div className="h-screen bg-[#e8e9ee] flex overflow-hidden p-2 gap-2">
      {/* Sidebar panel */}
      <div className="w-60 flex-shrink-0 bg-white rounded-2xl overflow-hidden flex flex-col ring-1 ring-black/[0.05]">
        <Sidebar />
      </div>

      {/* Main content panel */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl overflow-hidden ring-1 ring-black/[0.05]">
        <Outlet />
      </div>
    </div>
  );
}
