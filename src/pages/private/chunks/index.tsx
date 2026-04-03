import { useState } from "react";
import Topbar from "@/components/app/topbar";
import { CHUNKS } from "@/data/mock";
import { ContentTypeBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Edit3, RefreshCw, Trash2, Network, Tag, FileText, Hash,
  Code2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Chunk = typeof CHUNKS[0];

export default function ChunkExplorerPage() {
  const [selectedChunk, setSelectedChunk] = useState(CHUNKS[0]);
  const [activeTab, setActiveTab] = useState<"raw" | "embed" | "metadata">("raw");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = CHUNKS.filter((c) => {
    const matchSearch = c.sectionTitle.toLowerCase().includes(search.toLowerCase()) ||
      c.preview.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || c.contentType === typeFilter;
    return matchSearch && matchType;
  });

  const selectedIdx = filtered.findIndex((c) => c.id === selectedChunk.id);

  const navTo = (dir: -1 | 1) => {
    const next = filtered[selectedIdx + dir];
    if (next) setSelectedChunk(next);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50/40">
      <Topbar title="Chunk Explorer" />

      <div className="flex flex-1 overflow-hidden p-5 gap-4">
        {/* Left: filter + list */}
        <div className="w-96 flex-shrink-0 flex flex-col gap-3">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
              <input
                placeholder="Search chunks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-indigo-300 transition-all placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {["all", "text", "table", "ocr", "image", "mixed"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "text-[10px] font-semibold uppercase px-2 py-1 rounded-lg transition-all",
                    typeFilter === t
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {t === "all" ? "All" : t}
                </button>
              ))}
              <Select defaultValue="all-embed">
                <SelectTrigger className="h-6 text-[10px] w-24 border-gray-200 ml-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-embed">All modes</SelectItem>
                  <SelectItem value="raw">Raw</SelectItem>
                  <SelectItem value="normalized">Normalized</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chunk list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-semibold text-gray-700">{filtered.length} chunks</span>
              <span className="text-xs text-gray-400">api-reference-v2.4.pdf</span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filtered.map((chunk) => {
                const isSelected = selectedChunk.id === chunk.id;
                return (
                  <div
                    key={chunk.id}
                    onClick={() => setSelectedChunk(chunk)}
                    className={cn(
                      "px-4 py-3 cursor-pointer transition-all relative",
                      isSelected
                        ? "bg-indigo-50/70"
                        : "hover:bg-gray-50"
                    )}
                  >
                    {isSelected && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-10 bg-indigo-500 rounded-full" />
                    )}
                    <div className="flex items-start gap-2.5">
                      <span className={cn(
                        "text-[10px] font-bold tabular-nums mt-0.5 w-5 text-center flex-shrink-0",
                        isSelected ? "text-indigo-500" : "text-gray-300"
                      )}>
                        {chunk.index}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <ContentTypeBadge type={chunk.contentType} />
                          <span className="text-[10px] text-gray-400">p.{chunk.sourcePage}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">{chunk.tokenCount}tok</span>
                        </div>
                        <p className={cn(
                          "text-xs font-semibold mb-0.5 truncate",
                          isSelected ? "text-indigo-700" : "text-gray-700"
                        )}>
                          {chunk.sectionTitle}
                        </p>
                        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{chunk.preview}</p>
                        {chunk.score !== undefined && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <div className="flex-1 h-0.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-400 rounded-full"
                                style={{ width: `${chunk.score * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-indigo-500">{chunk.score.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: detail panel */}
        {selectedChunk && (
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <ContentTypeBadge type={selectedChunk.contentType} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{selectedChunk.sectionTitle}</p>
                  <p className="text-xs text-gray-500">
                    Chunk #{selectedChunk.index} · Page {selectedChunk.sourcePage} · {selectedChunk.tokenCount} tokens
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Nav arrows */}
                <button
                  onClick={() => navTo(-1)}
                  disabled={selectedIdx <= 0}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="size-4 text-gray-500" />
                </button>
                <span className="text-xs text-gray-400 tabular-nums">{selectedIdx + 1}/{filtered.length}</span>
                <button
                  onClick={() => navTo(1)}
                  disabled={selectedIdx >= filtered.length - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="size-4 text-gray-500" />
                </button>
                <div className="w-px h-5 bg-gray-100 mx-1" />
                {[
                  { icon: Edit3, label: "Edit chunk" },
                  { icon: RefreshCw, label: "Re-embed" },
                  { icon: Network, label: "Inspect neighbors" },
                  { icon: Trash2, label: "Delete chunk", danger: true },
                ].map((action) => (
                  <button
                    key={action.label}
                    title={action.label}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      "danger" in action && action.danger
                        ? "hover:bg-red-50 text-gray-400 hover:text-red-600"
                        : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    )}
                  >
                    <action.icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-50 flex-shrink-0 px-2">
              {([
                { id: "raw", label: "Raw Text", icon: FileText },
                { id: "embed", label: "Embed Text", icon: Code2 },
                { id: "metadata", label: "Metadata", icon: Hash },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all",
                    activeTab === tab.id
                      ? "text-indigo-600 border-indigo-500"
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  )}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                Embed mode:
                <span className="text-indigo-600 font-semibold capitalize">{selectedChunk.embeddingMode}</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "raw" && (
                <div className="h-full">
                  <div className="text-sm text-gray-700 bg-gray-50 rounded-2xl p-5 leading-relaxed border border-gray-100 min-h-32">
                    {selectedChunk.preview}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                    <FileText className="size-3.5" />
                    api-reference-v2.4.pdf · Page {selectedChunk.sourcePage}
                  </div>
                </div>
              )}

              {activeTab === "embed" && (
                <div className="h-full">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Embed Representation</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium capitalize">
                      {selectedChunk.embeddingMode}
                    </span>
                  </div>
                  <div className="text-sm text-indigo-800 bg-indigo-50/70 rounded-2xl p-5 leading-relaxed border border-indigo-100 min-h-32">
                    {selectedChunk.embedText}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    This is the text encoded into a vector. It may differ from raw chunk content.
                  </p>
                </div>
              )}

              {activeTab === "metadata" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    {[
                      { k: "chunk_id", v: selectedChunk.id },
                      { k: "document_id", v: selectedChunk.documentId },
                      { k: "chunk_index", v: String(selectedChunk.index) },
                      { k: "content_type", v: selectedChunk.contentType },
                      { k: "source_page", v: String(selectedChunk.sourcePage) },
                      { k: "section_title", v: selectedChunk.sectionTitle },
                      { k: "token_count", v: String(selectedChunk.tokenCount) },
                      { k: "embedding_mode", v: selectedChunk.embeddingMode },
                      { k: "language", v: selectedChunk.language },
                      { k: "tags", v: selectedChunk.tags.join(", ") },
                    ].map((f, i) => (
                      <div key={f.k} className={cn(
                        "flex items-center gap-4 px-4 py-2.5 text-xs",
                        i % 2 === 0 ? "bg-gray-50/60" : "bg-white"
                      )}>
                        <span className="font-mono text-indigo-600 w-36 flex-shrink-0">{f.k}</span>
                        <span className="text-gray-700 truncate">{f.v}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedChunk.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <Tag className="size-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tags bar */}
            <div className="px-5 py-3 border-t border-gray-50 flex items-center gap-2 flex-wrap flex-shrink-0 bg-gray-50/30">
              <Tag className="size-3.5 text-gray-400" />
              {selectedChunk.tags.map((tag) => (
                <span key={tag} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
