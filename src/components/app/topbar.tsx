import { useNavigate } from "react-router";
import { Search, Bell, ChevronRight, Plus, Command } from "lucide-react";

interface TopbarProps {
  title: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: React.ReactNode;
}

export default function Topbar({ title, breadcrumbs = [], actions }: TopbarProps) {
  const navigate = useNavigate();

  return (
    <header className="h-14 flex items-center gap-4 px-6 border-b border-gray-100 bg-white flex-shrink-0 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <button
              onClick={() => crumb.path && navigate(crumb.path)}
              className={
                crumb.path
                  ? "text-sm text-gray-400 hover:text-gray-700 transition-colors"
                  : "text-sm text-gray-400 cursor-default"
              }
            >
              {crumb.label}
            </button>
            {i < breadcrumbs.length - 1 && (
              <ChevronRight className="size-3.5 text-gray-300" />
            )}
          </span>
        ))}
        {breadcrumbs.length > 0 && (
          <ChevronRight className="size-3.5 text-gray-300" />
        )}
        <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Global search */}
        <button className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-sm text-gray-400 w-56 transition-colors group">
          <Search className="size-3.5 text-gray-400 flex-shrink-0" />
          <span className="flex-1 text-left text-xs">Search everything…</span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <kbd className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono leading-none">⌘</kbd>
            <kbd className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded font-mono leading-none">K</kbd>
          </div>
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full ring-2 ring-white" />
        </button>

        {actions}

        {/* New Ingestion */}
        <button
          onClick={() => navigate("/ingestions/new")}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus className="size-3.5" />
          New Ingestion
        </button>
      </div>
    </header>
  );
}
