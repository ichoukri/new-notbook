import { Braces, Database, Fingerprint, FolderTree, Settings2 } from "lucide-react";
import { formatFileSize } from "@/core/datasets";
import {
  getDocumentDatasetId,
  getDocumentMode,
  getDocumentUploadedAtLabel,
} from "@/core/documents";
import type { TIngestionDocument } from "@/core/ingestions";
import { CopyButton } from "@/components/app/copy-button";
import { DocumentSourceLocations } from "./document-source-locations";

type DocumentMetrics = {
  embeddingModel?: string | null;
  summaryModel?: string | null;
  vectorStore?: string | null;
};

export function DocumentMetadataTab({
  document,
  pageCount,
  chunkCount,
  metrics,
}: {
  document: TIngestionDocument;
  pageCount: number | null;
  chunkCount: number;
  metrics: DocumentMetrics | null;
}) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <MetadataSection
        icon={Fingerprint}
        title="Identity"
        description="Stable identifiers and source file attributes."
        fields={[
          { key: "document_id", value: document.id, copy: true },
          { key: "dataset_id", value: getDocumentDatasetId(document) ?? "—", copy: true },
          { key: "filename", value: document.filename, copy: true },
          { key: "content_hash", value: document.hash, copy: true },
          { key: "file_type", value: document.fileType.toUpperCase() },
          { key: "file_size", value: formatFileSize(document.fileSize) },
        ]}
      />

      <MetadataSection
        icon={Settings2}
        title="Ingestion"
        description="Current pipeline state and output measurements."
        fields={[
          { key: "status", value: document.processingStatus },
          { key: "ingestion_mode", value: getDocumentMode(document) },
          { key: "pages", value: pageCount?.toString() ?? "—" },
          { key: "chunks", value: chunkCount.toString() },
          { key: "task_id", value: document.taskId ?? "—", copy: true },
          { key: "uploaded_at", value: getDocumentUploadedAtLabel(document) },
        ]}
      />

      <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
        <SectionHeading
          icon={FolderTree}
          title="Source provenance"
          description="Where the original file came from and where it is stored."
        />
        <div className="divide-y divide-gray-100 px-5">
          <div className="group py-4">
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              source_locations
            </p>
            <DocumentSourceLocations paths={document.sourceRelativePaths} />
          </div>
          <MetadataField field={{ key: "source_url", value: document.sourceUrl ?? "—", copy: true }} />
          <MetadataField field={{ key: "user_id", value: document.userId ?? "—", copy: true }} />
          <MetadataField field={{ key: "tenant_id", value: document.tenantId ?? "—", copy: true }} />
        </div>
      </section>

      <MetadataSection
        icon={Database}
        title="Runtime"
        description="Models and storage services reported by the pipeline."
        fields={[
          { key: "embedding_model", value: metrics?.embeddingModel ?? "—" },
          { key: "summary_model", value: metrics?.summaryModel ?? "—" },
          { key: "vector_store", value: metrics?.vectorStore ?? "—" },
        ]}
      />

      {(document.docMetadata || document.accessPolicy) && (
        <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)] lg:col-span-2">
          <SectionHeading
            icon={Braces}
            title="Document JSON"
            description="User metadata and access policy exactly as stored."
          />
          <div className="grid gap-px bg-gray-200 lg:grid-cols-2">
            <JsonBlock label="doc_metadata" value={document.docMetadata} />
            <JsonBlock label="access_policy" value={document.accessPolicy} />
          </div>
        </section>
      )}
    </div>
  );
}

type MetadataFieldValue = { key: string; value: string; copy?: boolean };

function MetadataSection({
  icon,
  title,
  description,
  fields,
}: {
  icon: typeof Fingerprint;
  title: string;
  description: string;
  fields: MetadataFieldValue[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_30px_-24px_rgba(15,23,42,0.45)]">
      <SectionHeading icon={icon} title={title} description={description} />
      <div className="divide-y divide-gray-100 px-5">
        {fields.map((field) => <MetadataField key={field.key} field={field} />)}
      </div>
    </section>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Fingerprint;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="size-4" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-gray-950">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function MetadataField({ field }: { field: MetadataFieldValue }) {
  return (
    <div className="group grid gap-1.5 py-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-600">
        {field.key}
      </span>
      <span className="min-w-0 break-all text-[13px] text-gray-700">{field.value}</span>
      {field.copy && <CopyButton value={field.value} label={`${field.key} copied`} />}
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 bg-slate-950 p-5">
      <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-300">
        {label}
      </p>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-slate-300">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}
