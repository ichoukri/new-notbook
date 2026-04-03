import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import Sidebar from "@/components/app/sidebar";
import { getStoredUser } from "@/core/auth";
import { useGlobalStore } from "@/core/global-store/index";
import LoadingPage from "@/pages/loading";

export default function PrivateLayout() {
  const location = useLocation();
  const user = useGlobalStore((state) => state.user);
  const setUser = useGlobalStore((state) => state.setUser);

  useEffect(() => {
    if (user === undefined) {
      setUser(getStoredUser());
    }
  }, [setUser, user]);

  if (user === undefined) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
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
