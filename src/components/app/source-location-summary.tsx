import { cn } from "@/lib/utils";

export function SourceLocationSummary({
  paths,
  className,
}: {
  paths: string[];
  className?: string;
}) {
  const canonical = paths[0];
  if (!canonical) return null;

  const alternates = paths.slice(1);

  return (
    <div
      aria-label="Source locations"
      className={cn("min-w-0 text-[11px] text-gray-500", className)}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500">
          Canonical
        </span>
        <span className="truncate" title={canonical}>
          {canonical}
        </span>
      </div>
      {alternates.length > 0 && (
        <details
          className="mt-1"
          onClick={(event) => event.stopPropagation()}
        >
          <summary className="w-fit cursor-pointer list-none font-medium text-indigo-600 hover:text-indigo-700">
            +{alternates.length} alternate source {alternates.length === 1 ? "location" : "locations"}
          </summary>
          <ul className="mt-1 space-y-1 border-l border-gray-200 pl-2">
            {alternates.map((path) => (
              <li key={path} className="break-all" title={path}>
                {path}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
