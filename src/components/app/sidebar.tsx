import { NavLink, useLocation, useNavigate } from "react-router";
import { cn } from "@/lib/utils";
import { backendApi } from "@/core/api";
import { getUserDisplayName, getUserInitials } from "@/core/auth";
import { useGlobalStore } from "@/core/global-store/index";
import brandIcon from "@/assets/big-icon.svg";
import {
  LayoutDashboard,
  Database,
  FileText,
  Zap,
  Search,
  Network,
  Box,
  Activity,
  Settings,
  Plus,
  LogOut,
  HelpCircle,
  MessageSquareText,
  FolderTree,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/" },
      { label: "Datasets", icon: Database, path: "/datasets" },
      { label: "Knowledge Groups", icon: FolderTree, path: "/knowledge-groups" },
      { label: "Documents", icon: FileText, path: "/documents" },
      { label: "Ingestions", icon: Zap, path: "/ingestions/new" },
    ],
  },
  {
    label: "Explore",
    items: [
      { label: "Knowledge Chat", icon: MessageSquareText, path: "/chat" },
      { label: "Retrieval Test", icon: Search, path: "/retrieval" },
      { label: "Knowledge Graph", icon: Network, path: "/graph" },
      { label: "Chunk Explorer", icon: Box, path: "/chunks" },
      { label: "Activity", icon: Activity, path: "/activity" },
    ],
  },
  {
    label: "Configure",
    items: [
      { label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useGlobalStore((state) => state.user);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path.split("?")[0]);
  };

  const handleSignOut = () => {
    backendApi.signOut();
  };

  return (
    <aside className="flex flex-col h-full bg-white">
      {/* Brand */}
      <div className="border-b border-gray-100 px-4 py-4">
        <img
          src={brandIcon}
          alt="Data Platform"
          className="h-8 w-auto max-w-full object-contain"
        />
      </div>

      {/* New Ingestion CTA */}
      <div className="px-3 pt-3">
        <button
          onClick={() => navigate("/ingestions/new")}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="size-3.5" />
          New Ingestion
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path);
                return (
                  <NavLink
                    key={item.label + item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all relative",
                      active
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-full" />
                    )}
                    <item.icon
                      className={cn(
                        "size-4 flex-shrink-0",
                        active ? "text-indigo-600" : "text-gray-400"
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-1">
        <button className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors">
          <HelpCircle className="size-3.5" />
          Help & Docs
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSignOut();
          }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-gray-50 transition-colors group text-left"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-sm">
            {getUserInitials(user)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate leading-tight">
              {getUserDisplayName(user)}
            </p>
            <p className="text-[10px] text-gray-500 truncate">
              {user?.email ?? "No email available"}
            </p>
          </div>
          <LogOut className="size-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </aside>
  );
}
