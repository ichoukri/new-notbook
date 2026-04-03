import { useState } from "react";
import { useNavigate } from "react-router";
import Topbar from "@/components/app/topbar";
import { CHUNKS } from "@/data/mock";
import { ContentTypeBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  CheckCircle2, Circle, ChevronRight, FileText, Layers, ArrowLeft,
  ArrowRight, Save, Edit3, Scissors, Trash2, Merge, CheckCheck, Cpu,
  Shield, Tag, Users, Globe, Lock
} from "lucide-react";

const STEPS = [
  "Upload",
  "Extracted Content",
  "Cleaned Content",
  "Chunk Review",
  "Embed Representation",
  "Metadata & Permissions",
  "Indexing",
  "Complete",
];

function GuidedStepper({ current }: { current: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center gap-0">
      {STEPS.map((step, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                isDone ? "bg-emerald-500 text-white" :
                isActive ? "bg-indigo-600 text-white ring-4 ring-indigo-100" :
                "bg-gray-100 text-gray-400"
              }`}>
                {isDone ? <CheckCircle2 className="size-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1 text-center whitespace-nowrap leading-tight max-w-[64px] truncate ${
                isActive ? "text-indigo-700 font-semibold" :
                isDone ? "text-emerald-600 font-medium" :
                "text-gray-400"
              }`}>{step}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mt-[-14px] rounded-full ${i < current ? "bg-emerald-400" : "bg-gray-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActionBar({
  onBack, onSave, onContinue, continueLabel = "Approve & Continue", canBack = true
}: {
  onBack?: () => void;
  onSave?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  canBack?: boolean;
}) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-100 shadow-lg px-6 py-4 flex items-center justify-between">
      <Button variant="outline" size="sm" onClick={onBack} disabled={!canBack}>
        <ArrowLeft className="size-4 mr-1.5" />Back
      </Button>
      <div className="flex gap-2">
        {onSave && (
          <Button variant="outline" size="sm" onClick={onSave}>
            <Save className="size-4 mr-1.5" />Save Draft
          </Button>
        )}
        <Button size="sm" onClick={onContinue}>
          {continueLabel}
          <ArrowRight className="size-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

export default function GuidedModePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const renderStep = () => {
    switch (step) {
      case 0: return <UploadStep onContinue={next} />;
      case 1: return <ExtractedStep onBack={prev} onContinue={next} />;
      case 2: return <CleanedStep onBack={prev} onContinue={next} />;
      case 3: return <ChunkReviewStep onBack={prev} onContinue={next} />;
      case 4: return <EmbedStep onBack={prev} onContinue={next} />;
      case 5: return <MetadataStep onBack={prev} onContinue={next} />;
      case 6: return <IndexingStep onBack={prev} onContinue={next} />;
      case 7: return <CompleteStep onNavigate={navigate} />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title="Guided Ingestion" breadcrumbs={[{ label: "Ingestions" }]} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto w-full px-8 py-7 space-y-5">
        <GuidedStepper current={step} />
        {renderStep()}
              </div>
      </main>
    </div>
  );
}

function UploadStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Upload your file</h2>
        <p className="text-sm text-gray-500 mb-6">Select the file to ingest and the dataset it belongs to.</p>
        <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-10 text-center bg-indigo-50/30">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="size-6 text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">api-reference-v2.4.pdf</p>
          <p className="text-xs text-gray-400">4.2 MB · PDF · 187 pages</p>
          <p className="mt-3 text-xs text-indigo-600 font-medium">Ready to process</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-500">Dataset</Label>
            <Select defaultValue="ds-001">
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ds-001">Product Documentation v2</SelectItem>
                <SelectItem value="ds-002">Legal Contracts 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl border border-violet-100 mt-5">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="size-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-800">Guided Mode</p>
              <p className="text-xs text-violet-600">Step-by-step review</p>
            </div>
          </div>
        </div>
      </div>
      <ActionBar onContinue={onContinue} canBack={false} continueLabel="Upload & Start" />
    </div>
  );
}

function ExtractedStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Review Extracted Content</h2>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">187 pages</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">3 tables</span>
            <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded">12 images</span>
            <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded">4 OCR pages</span>
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className="col-span-2 border-r border-gray-50">
            <Tabs defaultValue="text" className="h-full">
              <TabsList className="border-b border-gray-50 rounded-none w-full justify-start p-0 h-auto bg-transparent">
                {["text", "tables", "images", "transcript"].map((t) => (
                  <TabsTrigger key={t} value={t} className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 py-3 px-5 text-xs font-medium">
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="text" className="p-5 m-0">
                <div className="text-sm text-gray-700 leading-relaxed h-64 overflow-y-auto space-y-3">
                  <p><strong>1. Authentication Overview</strong></p>
                  <p>The API uses Bearer token authentication. All requests must include a valid JWT in the Authorization header with the format 'Bearer &lt;token&gt;'. Tokens expire after 3600 seconds and must be refreshed using the /auth/refresh endpoint.</p>
                  <p><strong>2. Rate Limiting</strong></p>
                  <p>Each endpoint has independent rate limits. The default limit is 100 requests per minute per API key. Exceeded requests receive a 429 Too Many Requests response with a Retry-After header.</p>
                  <p><strong>3. Request Format</strong></p>
                  <p>All requests must use JSON format with Content-Type: application/json. The base URL for all API endpoints is https://api.acme.com/v2/...</p>
                </div>
              </TabsContent>
              <TabsContent value="tables" className="p-5 m-0">
                <div className="h-64 flex items-center justify-center text-sm text-gray-500">
                  3 tables detected — click to inspect each
                </div>
              </TabsContent>
              <TabsContent value="images" className="p-5 m-0">
                <div className="h-64 flex items-center justify-center text-sm text-gray-500">
                  12 images detected · 4 with OCR applied
                </div>
              </TabsContent>
              <TabsContent value="transcript" className="p-5 m-0">
                <div className="h-64 flex items-center justify-center text-sm text-gray-400">
                  No transcript content detected
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="p-5">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Extraction Options</h3>
            <div className="space-y-4">
              {[
                { label: "Run OCR on scanned pages", desc: "4 pages detected", checked: true },
                { label: "Include images", desc: "12 detected", checked: true },
                { label: "Extract tables", desc: "3 detected", checked: true },
                { label: "Ignore decorative elements", desc: "Headers, footers", checked: false },
              ].map((o) => (
                <div key={o.label} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-700">{o.label}</p>
                    <p className="text-xs text-gray-400">{o.desc}</p>
                  </div>
                  <Switch defaultChecked={o.checked} className="flex-shrink-0 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ActionBar onBack={onBack} onSave={() => {}} onContinue={onContinue} />
    </div>
  );
}

function CleanedStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Review Cleaned Content</h2>
          <div className="flex gap-2 text-xs">
            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">7 operations applied</span>
            <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">2 warnings</span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Original Extracted</p>
            <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-4 h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono">
{`The  API  uses  Bearer  token  authentication.
All  requests  must  include a  valid  JWT  in the
Authorization  header  with  the format  'Bearer 
<token>'.  Tokens  expire  after  3600  seconds  and 
must  be  refreshed  using the  /auth/refresh  endpoint.

[PAGE BREAK]

   Rate   Limiting   
   
Each endpoint has  independent  rate limits . The default limit is 
100  requests  per  minute  per  API  key .`}</div>
          </div>
          <div className="p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cleaned Content</p>
            <div className="text-xs text-gray-700 bg-gray-50 rounded-xl p-4 h-72 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono">
{`The API uses Bearer token authentication.
All requests must include a valid JWT in the
Authorization header with the format 'Bearer <token>'.
Tokens expire after 3600 seconds and must be
refreshed using the /auth/refresh endpoint.

Rate Limiting

Each endpoint has independent rate limits. The default
limit is 100 requests per minute per API key.`}</div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cleaning Operations Applied</p>
          <div className="flex flex-wrap gap-2">
            {["Whitespace normalization", "Unicode fixes", "Page break removal", "Encoding cleanup", "Repeated char collapse", "Header/footer strip", "Hyphen fixes"].map((op) => (
              <span key={op} className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">{op}</span>
            ))}
          </div>
          <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700"><strong>Warning:</strong> Page 14 OCR content has low confidence (62%). Review recommended before proceeding.</p>
          </div>
        </div>
      </div>
      <ActionBar onBack={onBack} onSave={() => {}} onContinue={onContinue} />
    </div>
  );
}

function ChunkReviewStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const [selectedChunk, setSelectedChunk] = useState(CHUNKS[0]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">Review & Edit Chunks</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Chunk size</span>
              <Select defaultValue="512">
                <SelectTrigger className="h-7 text-xs w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="256">256</SelectItem>
                  <SelectItem value="512">512</SelectItem>
                  <SelectItem value="1024">1024</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Overlap</span>
              <Select defaultValue="64">
                <SelectTrigger className="h-7 text-xs w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="64">64</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" className="text-xs h-7">
              <ChevronRight className="size-3 mr-1" />Regenerate
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 divide-x divide-gray-100" style={{ minHeight: 420 }}>
          {/* Chunk list */}
          <div className="col-span-2 overflow-y-auto max-h-[420px]">
            {CHUNKS.map((chunk) => (
              <div
                key={chunk.id}
                onClick={() => setSelectedChunk(chunk)}
                className={`flex items-start gap-3 px-4 py-3.5 border-b border-gray-50 cursor-pointer transition-colors ${
                  selectedChunk.id === chunk.id ? "bg-indigo-50/50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <ContentTypeBadge type={chunk.contentType} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-600">#{chunk.index}</span>
                    <span className="text-xs text-gray-400">p.{chunk.sourcePage}</span>
                    <span className="text-xs text-gray-400">{chunk.tokenCount} tok</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{chunk.preview}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chunk detail panel */}
          <div className="col-span-3 p-5">
            {selectedChunk && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ContentTypeBadge type={selectedChunk.contentType} />
                    <span className="text-xs text-gray-500">Chunk #{selectedChunk.index} · Page {selectedChunk.sourcePage}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { icon: Edit3, label: "Edit" },
                      { icon: Scissors, label: "Split" },
                      { icon: Merge, label: "Merge" },
                      { icon: Trash2, label: "Delete" },
                    ].map((a) => (
                      <button key={a.label} title={a.label} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                        <a.icon className="size-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs font-medium text-gray-700 mb-1">{selectedChunk.sectionTitle}</p>
                <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3.5 h-48 overflow-y-auto leading-relaxed mb-3">
                  {selectedChunk.preview}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedChunk.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <ActionBar onBack={onBack} onSave={() => {}} onContinue={onContinue} continueLabel="Approve Chunks" />
    </div>
  );
}

function EmbedStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const [strategy, setStrategy] = useState("normalized");

  const strategies = [
    { id: "raw", label: "Raw", desc: "Use cleaned extracted text as-is. Best for dense prose." },
    { id: "normalized", label: "Normalized", desc: "Apply light normalization before embedding. Recommended for most cases." },
    { id: "summary", label: "Summary", desc: "Use a concise AI-generated summary. Best for long or noisy chunks." },
    { id: "hybrid", label: "Hybrid", desc: "Combine raw and normalized. Best for mixed content types." },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Choose Embed Representation</h2>
            <p className="text-xs text-gray-500">Decide what text will be used to generate embeddings for each chunk.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Model</span>
            <Select defaultValue="3-large">
              <SelectTrigger className="h-8 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3-large">text-embedding-3-large</SelectItem>
                <SelectItem value="3-small">text-embedding-3-small</SelectItem>
                <SelectItem value="ada-002">text-embedding-ada-002</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {strategies.map((s) => (
            <div
              key={s.id}
              onClick={() => setStrategy(s.id)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                strategy === s.id
                  ? "border-indigo-500 bg-indigo-50/50"
                  : "border-gray-200 hover:border-indigo-200"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 mb-1.5">{s.label}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Preview comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Raw Chunk Text</p>
            <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-4 h-36 overflow-y-auto leading-relaxed font-mono">
              The API uses Bearer token authentication. All requests must include a valid JWT in the Authorization header with the format 'Bearer &lt;token&gt;'...
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Embed Text Preview ({strategy})</p>
            <div className="text-xs text-indigo-700 bg-indigo-50 rounded-xl p-4 h-36 overflow-y-auto leading-relaxed font-mono">
              Authentication Overview: The API uses Bearer token authentication. Requests require a valid JWT in the Authorization header with format 'Bearer &lt;token&gt;'. Token lifetime is 3600s with refresh support...
            </div>
          </div>
        </div>

        {/* Token/cost estimate */}
        <div className="mt-4 flex items-center gap-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
          <Cpu className="size-4 text-gray-400" />
          <span><strong className="text-gray-700">231 chunks</strong> × avg 380 tokens = <strong className="text-gray-700">~87,780 tokens</strong></span>
          <span>·</span>
          <span>Estimated cost: <strong className="text-gray-700">$0.02</strong></span>
        </div>
      </div>
      <ActionBar onBack={onBack} onSave={() => {}} onContinue={onContinue} />
    </div>
  );
}

function MetadataStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  const fields = [
    { key: "tenant_id", value: "acme-corp", editable: false },
    { key: "dataset_id", value: "ds-001", editable: false },
    { key: "document_id", value: "doc-001", editable: false },
    { key: "filename", value: "api-reference-v2.4.pdf", editable: true },
    { key: "content_type", value: "PDF", editable: false },
    { key: "language", value: "en", editable: true },
    { key: "visibility", value: "team", editable: true },
    { key: "uploaded_by_user_id", value: "alex.kim@acme.com", editable: false },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Review Metadata & Permissions</h2>
          <p className="text-xs text-gray-500">Metadata is stored with every chunk and enables retrieval filtering, citations, and access control.</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Document metadata */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Document Metadata</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {fields.map((f, i) => (
                <div key={f.key} className={`flex items-center gap-3 px-4 py-2.5 ${i % 2 === 0 ? "bg-gray-50/50" : "bg-white"}`}>
                  <span className="text-xs font-mono text-indigo-600 w-36 flex-shrink-0">{f.key}</span>
                  <span className="text-xs text-gray-700 flex-1">{f.value}</span>
                  {f.editable && <Edit3 className="size-3 text-gray-300 hover:text-gray-500 cursor-pointer" />}
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Permissions</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Visibility</span>
                  </div>
                  <Select defaultValue="team">
                    <SelectTrigger className="h-7 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public"><Globe className="size-3 mr-1" />Public</SelectItem>
                      <SelectItem value="team"><Users className="size-3 mr-1" />Team</SelectItem>
                      <SelectItem value="private"><Lock className="size-3 mr-1" />Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="size-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Allowed Groups</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["engineering", "data-team", "ml-team"].map((g) => (
                      <span key={g} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{g}</span>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="size-4 text-gray-400" />
                    <span className="text-sm text-gray-700">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["docs", "api", "sdk"].map((t) => (
                      <span key={t} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Tag className="size-2.5" />{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chunk-level metadata preview */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Per-Chunk Metadata Preview</p>
              <div className="bg-gray-50 rounded-xl p-3 text-xs font-mono text-gray-600 space-y-0.5">
                <div><span className="text-indigo-500">chunk_id:</span> chk-001</div>
                <div><span className="text-indigo-500">chunk_index:</span> 1</div>
                <div><span className="text-indigo-500">content_type:</span> text</div>
                <div><span className="text-indigo-500">page:</span> 3</div>
                <div><span className="text-indigo-500">section_title:</span> Authentication Overview</div>
                <div><span className="text-indigo-500">language:</span> en</div>
                <div><span className="text-indigo-500">token_count:</span> 312</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ActionBar onBack={onBack} onSave={() => {}} onContinue={onContinue} />
    </div>
  );
}

function IndexingStep({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-5">Embedding & Indexing</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Chunks Embedded", value: "156 / 231" },
            { label: "Vectors Indexed", value: "156" },
            { label: "Estimated Remaining", value: "~45s" },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5 text-xs text-gray-500">
            <span>Progress</span>
            <span>67%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: "67%" }} />
          </div>
        </div>

        <div className="bg-gray-950 rounded-xl p-4 font-mono text-xs h-40 overflow-y-auto space-y-1.5">
          {[
            { t: "14:35:22", c: "text-emerald-400", m: "[INFO] Embedding batch 1/8 started (chunks 1-30)" },
            { t: "14:35:24", c: "text-emerald-400", m: "[INFO] Batch 1 complete (30 vectors, 2.1s)" },
            { t: "14:35:24", c: "text-emerald-400", m: "[INFO] Embedding batch 2/8 started (chunks 31-60)" },
            { t: "14:35:26", c: "text-emerald-400", m: "[INFO] Batch 2 complete (30 vectors, 1.9s)" },
            { t: "14:35:27", c: "text-emerald-400", m: "[INFO] Indexing to Pinecone: 60 vectors" },
          ].map((l, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-gray-500 flex-shrink-0">{l.t}</span>
              <span className={`${l.c} flex-shrink-0`}>{l.m.split("]")[0]}]</span>
              <span className="text-gray-300">{l.m.split("] ")[1]}</span>
            </div>
          ))}
        </div>
      </div>
      <ActionBar onBack={onBack} onContinue={onContinue} continueLabel="Mark Complete" />
    </div>
  );
}

function CompleteStep({ onNavigate }: { onNavigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
        <CheckCheck className="size-8 text-emerald-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Guided Ingestion Complete</h2>
      <p className="text-sm text-gray-500 mb-6">Your document has been reviewed, approved, and fully indexed.</p>
      <div className="grid grid-cols-2 gap-3 mb-6 text-left">
        {[
          { label: "File", value: "api-reference-v2.4.pdf" },
          { label: "Mode", value: "Guided" },
          { label: "Chunks", value: "231" },
          { label: "Embedding Strategy", value: "Normalized" },
          { label: "Content Types", value: "Text, Table, OCR" },
          { label: "Vector Store", value: "Pinecone" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        <Button size="sm" onClick={() => onNavigate("/documents/doc-001")}>Open Document</Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("/chunks")}>View Chunks</Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("/retrieval")}>Test Retrieval</Button>
        <Button size="sm" variant="outline" onClick={() => onNavigate("/ingestions/new")}>Upload Another</Button>
      </div>
    </div>
  );
}
