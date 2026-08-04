import { Braces, Database, Info } from "lucide-react";
import { CopyButton } from "@/components/app/copy-button";
import {
  type TDataset,
  formatDatasetDateTime,
  formatLabel,
} from "@/core/datasets";

export function DatasetMetadataPanel({ dataset }: { dataset: TDataset }) {
  const metadataEntries = Object.entries(dataset.metadata ?? {});

  return (
    <aside className="space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Info className="size-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Overview</h2>
        </div>
        <div className="space-y-3 text-sm">
          <MetadataRow label="Dataset ID" value={dataset.id} copyable />
          <MetadataRow label="Status" value={formatLabel(dataset.status)} />
          <MetadataRow label="Created by" value={dataset.createdBy} copyable />
          <MetadataRow label="Tenant ID" value={dataset.tenantId} copyable />
          <MetadataRow
            label="Created at"
            value={formatDatasetDateTime(dataset.createdAt)}
          />
          <MetadataRow
            label="Updated at"
            value={formatDatasetDateTime(dataset.updatedAt)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Custom metadata
            </h2>
          </div>
          {metadataEntries.length > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 tabular-nums">
              {metadataEntries.length}
            </span>
          )}
        </div>

        {metadataEntries.length > 0 ? (
          <div className="space-y-3 text-sm">
            {metadataEntries.map(([key, value]) => (
              <MetadataRow
                key={key}
                label={key}
                value={
                  typeof value === "string"
                    ? value
                    : JSON.stringify(value, null, 2)
                }
                copyable
                mono={typeof value !== "string"}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
            <Braces className="mx-auto mb-2 size-5 text-gray-300" />
            <p className="text-xs text-gray-500">
              No custom metadata set. Use{" "}
              <span className="font-semibold text-gray-700">Edit</span> to add
              key/value pairs.
            </p>
          </div>
        )}
      </section>
    </aside>
  );
}

function MetadataRow({
  label,
  value,
  copyable = false,
  mono = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="group border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>
        {copyable && <CopyButton value={value} label={`${label} copied`} />}
      </div>
      {mono ? (
        <pre className="mt-1 overflow-x-auto rounded-lg bg-gray-50 px-3 py-2 font-mono text-[11px] leading-5 text-gray-700">
          {value}
        </pre>
      ) : (
        <p className="mt-1 break-all text-sm text-gray-700">{value}</p>
      )}
    </div>
  );
}
