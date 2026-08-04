import { CopyButton } from "@/components/app/copy-button";

export function DocumentSourceLocations({ paths }: { paths: string[] }) {
  if (paths.length === 0) {
    return (
      <span className="text-sm text-gray-400" aria-label="Source locations">
        No source folder path recorded
      </span>
    );
  }

  return (
    <div className="min-w-0 flex-1 space-y-2" aria-label="Source locations">
      {paths.map((path, index) => (
        <div
          key={path}
          className="group/location flex min-w-0 items-center gap-2"
        >
          <span className="shrink-0 rounded-md border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
            {index === 0 ? "Canonical" : `Alternate ${index}`}
          </span>
          <span className="min-w-0 flex-1 break-all text-sm text-gray-700">
            {path}
          </span>
          <CopyButton
            value={path}
            label={`${index === 0 ? "Canonical" : "Alternate"} source location copied`}
          />
        </div>
      ))}
    </div>
  );
}
