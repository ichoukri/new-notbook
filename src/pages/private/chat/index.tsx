import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Bot,
  CircleHelp,
  Database,
  ExternalLink,
  FileText,
  FolderTree,
  Highlighter,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import Topbar from "@/components/app/topbar";
import { SourceLocationSummary } from "@/components/app/source-location-summary";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { backendApi } from "@/core/api";
import { getApiErrorMessage } from "@/core/api/error";
import {
  type TBackendDataset,
  type TDataset,
  mapBackendDataset,
} from "@/core/datasets";
import {
  type TBackendKnowledgeGroupTreeNode,
  type TKnowledgeGroupTreeNode,
  mapBackendKnowledgeGroupTree,
} from "@/core/knowledge-groups";
import {
  type TBackendKnowledgeChatResponse,
  type TGroundedCitation,
  type TKnowledgeChatRequest,
  type TKnowledgeChatResponse,
  mapBackendKnowledgeChatResponse,
} from "@/core/retrieval";
import { cn } from "@/lib/utils";
import { CitationSourceDialog } from "./citation-source-dialog";
import {
  buildKnowledgeChatHistory,
  getCitationFolder,
} from "./chat-utils";
import {
  buildKnowledgeScopePayload,
  flattenKnowledgeScopes,
} from "./knowledge-scope-utils";

type TChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: TKnowledgeChatResponse;
};

const STARTER_QUESTIONS = [
  "Quelle est la procédure de graissage du moteur 6210-ML-2175 ?",
  "What preventive maintenance is required for the grinding equipment?",
  "Which components and procedures are related to 6210-ZM-2180?",
];

function messageId(role: TChatMessage["role"]): string {
  return `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function KnowledgeSourceList({
  response,
  onOpenDocument,
  onViewSource,
}: {
  response: TKnowledgeChatResponse;
  onOpenDocument: (documentId: string) => void;
  onViewSource: (citation: TGroundedCitation) => void;
}) {
  if (response.abstained || response.citations.length === 0) return null;

  return (
    <section className="mt-5 border-t border-indigo-100 pt-4" aria-label="Sources">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="size-4 text-emerald-600" />
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-600">
          Sources
        </h3>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          {response.citations.length} cited
        </span>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {response.citations.map((citation) => (
          <article
            key={`${citation.number}-${citation.chunkId}`}
            className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
                {citation.number}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {citation.documentFilename}
                </p>
                <p className="mt-1 text-[11px] font-medium text-gray-500">
                  Folder: {getCitationFolder(
                    citation.sourceRelativePaths,
                    citation.documentFilename,
                  )}
                </p>
                <SourceLocationSummary
                  paths={citation.sourceRelativePaths}
                  className="mt-2"
                />
              </div>
            </div>

            <p className="mt-3 line-clamp-3 text-xs leading-5 text-gray-600">
              {citation.excerpt}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-gray-500">
              <span>
                Page {citation.pageNumber ?? "—"} · Evidence {citation.number}
              </span>
              <div className="flex items-center gap-3">
                {citation.regions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onViewSource(citation)}
                    className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700"
                    title="Open the PDF with this evidence highlighted"
                  >
                    <Highlighter className="size-3" />
                    View source
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenDocument(citation.documentId)}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <FileText className="size-3" />
                  Open file
                  <ExternalLink className="size-3" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChatMessage({
  message,
  onOpenDocument,
  onViewSource,
}: {
  message: TChatMessage;
  onOpenDocument: (documentId: string) => void;
  onViewSource: (citation: TGroundedCitation) => void;
}) {
  const isAssistant = message.role === "assistant";
  const abstained = Boolean(message.response?.abstained);
  const needsClarification = Boolean(message.response?.needsClarification);

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isAssistant ? "justify-start" : "justify-end",
      )}
    >
      {isAssistant && (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Bot className="size-4" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-4 py-3 shadow-sm lg:max-w-[78%]",
          isAssistant
            ? needsClarification
              ? "border border-blue-200 bg-blue-50"
              : abstained
              ? "border border-amber-200 bg-amber-50"
              : "border border-gray-200 bg-white"
            : "bg-indigo-600 text-white",
        )}
      >
        {isAssistant && (
          <div className="mb-2 flex items-center gap-2">
            {needsClarification ? (
              <CircleHelp className="size-3.5 text-blue-600" />
            ) : abstained ? (
              <AlertTriangle className="size-3.5 text-amber-600" />
            ) : (
              <Sparkles className="size-3.5 text-indigo-600" />
            )}
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.12em]",
                needsClarification
                  ? "text-blue-700"
                  : abstained
                    ? "text-amber-700"
                    : "text-indigo-600",
              )}
            >
              {needsClarification
                ? "Clarification needed"
                : abstained
                  ? "Verified abstention"
                  : "Maintenance knowledge agent"}
            </span>
          </div>
        )}

        <div
          className={cn(
            "prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-6",
            isAssistant ? "text-gray-800" : "text-white",
          )}
        >
          {isAssistant ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          ) : (
            message.content
          )}
        </div>

        {message.response && (
          <KnowledgeSourceList
            response={message.response}
            onOpenDocument={onOpenDocument}
            onViewSource={onViewSource}
          />
        )}
      </div>

      {!isAssistant && (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm">
          <User className="size-4" />
        </div>
      )}
    </div>
  );
}

export default function KnowledgeChatPage() {
  const navigate = useNavigate();
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [datasets, setDatasets] = useState<TDataset[]>([]);
  const [knowledgeGroups, setKnowledgeGroups] = useState<
    TKnowledgeGroupTreeNode[]
  >([]);
  const [scopeValue, setScopeValue] = useState("");
  const [messages, setMessages] = useState<TChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingKnowledge, setLoadingKnowledge] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sourceCitation, setSourceCitation] =
    useState<TGroundedCitation | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadKnowledge = async () => {
      setLoadingKnowledge(true);
      try {
        const [datasetResponse, groupResponse] = await Promise.all([
          backendApi.findMany<TBackendDataset>("/datasets/", {
            include_documents: "false",
            limit: "100",
            sort_by: "updated_at",
            sort_order: "desc",
          }),
          backendApi.findMany<TBackendKnowledgeGroupTreeNode>(
            "/knowledge-groups/tree",
          ),
        ]);
        if (cancelled) return;
        const mappedDatasets = datasetResponse.map(mapBackendDataset);
        const mappedGroups = groupResponse.map(mapBackendKnowledgeGroupTree);
        const scopes = flattenKnowledgeScopes(mappedGroups, mappedDatasets);
        const grindingGroup = scopes.find(
          (scope) =>
            scope.type === "group" &&
            scope.name.toLocaleLowerCase().includes("grinding"),
        );
        const grindingDataset = scopes.find(
          (scope) =>
            scope.type === "dataset" &&
            scope.name.toLocaleLowerCase().includes("grinding"),
        );
        setDatasets(mappedDatasets);
        setKnowledgeGroups(mappedGroups);
        setScopeValue(
          (current) =>
            current || grindingGroup?.value || grindingDataset?.value || scopes[0]?.value || "",
        );
      } catch (requestError) {
        if (!cancelled) {
          setError(
            getApiErrorMessage(requestError, "Could not load knowledge bases."),
          );
        }
      } finally {
        if (!cancelled) setLoadingKnowledge(false);
      }
    };

    void loadKnowledge();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const knowledgeScopes = useMemo(
    () => flattenKnowledgeScopes(knowledgeGroups, datasets),
    [datasets, knowledgeGroups],
  );

  const selectedScope = useMemo(
    () => knowledgeScopes.find((scope) => scope.value === scopeValue) ?? null,
    [knowledgeScopes, scopeValue],
  );

  const resetConversation = () => {
    setMessages([]);
    setInput("");
    setError("");
  };

  const changeKnowledgeScope = (value: string) => {
    setScopeValue(value);
    resetConversation();
  };

  const sendMessage = async (suggested?: string) => {
    const message = (suggested ?? input).trim();
    if (!message || !selectedScope || sending) return;

    const history = buildKnowledgeChatHistory(messages);
    const userMessage: TChatMessage = {
      id: messageId("user"),
      role: "user",
      content: message,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setSending(true);

    try {
      const payload: TKnowledgeChatRequest = {
        message,
        ...buildKnowledgeScopePayload(selectedScope),
        history,
        top_k: 10,
      };
      const backendResponse = await backendApi.create<
        TBackendKnowledgeChatResponse,
        TKnowledgeChatRequest
      >("/retrieval/chat", payload);
      const response = mapBackendKnowledgeChatResponse(backendResponse);
      setMessages((current) => [
        ...current,
        {
          id: messageId("assistant"),
          role: "assistant",
          content: response.answer,
          response,
        },
      ]);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "The knowledge agent could not answer this question.",
        ),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50/70">
      <Topbar title="Knowledge Chat" />

      <header className="border-b border-gray-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
              <MessageSquareText className="size-5" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">
                Tizert Maintenance Agent
              </h1>
              <p className="text-xs text-gray-500">
                Answers are restricted to reviewed knowledge and cited sources.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={scopeValue}
              onValueChange={changeKnowledgeScope}
              disabled={loadingKnowledge || knowledgeScopes.length === 0}
            >
              <SelectTrigger className="h-9 w-72 rounded-xl border-gray-200 bg-white text-xs">
                {selectedScope?.type === "group" ? (
                  <FolderTree className="size-3.5" />
                ) : (
                  <Database className="size-3.5" />
                )}
                <SelectValue
                  placeholder={loadingKnowledge ? "Loading knowledge..." : "Select knowledge scope"}
                />
              </SelectTrigger>
              <SelectContent>
                {knowledgeScopes.map((scope) => (
                  <SelectItem key={scope.value} value={scope.value}>
                    <span
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${scope.depth * 14}px` }}
                    >
                      {scope.type === "group" ? (
                        <FolderTree className="size-3.5 text-indigo-500" />
                      ) : (
                        <Database className="size-3.5 text-gray-400" />
                      )}
                      <span>{scope.name}</span>
                      {scope.type === "group" && (
                        <span className="text-[10px] text-gray-400">
                          {scope.datasetCount} datasets
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={resetConversation}
              disabled={messages.length === 0 && !input}
            >
              <RotateCcw className="size-3.5" />
              New chat
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-6xl space-y-5">
          {messages.length === 0 && (
            <section className="mx-auto max-w-3xl py-10 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <Bot className="size-7" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-gray-900">
                Ask the selected maintenance knowledge base
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
                Ask about equipment, operating procedures, maintenance, safety,
                components, or relationships. Every supported answer links to its
                exact source file and folder.
              </p>
              <div className="mt-7 grid gap-3 text-left md:grid-cols-3">
                {STARTER_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void sendMessage(question)}
                    disabled={!selectedScope || sending}
                    className="rounded-2xl border border-gray-200 bg-white p-4 text-sm leading-5 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="mb-3 size-4 text-indigo-500" />
                    {question}
                  </button>
                ))}
              </div>
              {selectedScope && (
                <p className="mt-5 text-xs text-gray-400">
                  Current knowledge: {selectedScope.name}
                  {selectedScope.type === "group"
                    ? ` · ${selectedScope.datasetCount} descendant datasets`
                    : " · single dataset"}
                </p>
              )}
            </section>
          )}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onOpenDocument={(documentId) => navigate(`/documents/${documentId}`)}
              onViewSource={setSourceCitation}
            />
          ))}

          {sending && (
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Bot className="size-4" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                <LoaderCircle className="size-4 animate-spin text-indigo-600" />
                Searching reviewed chunks and graph evidence...
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div ref={scrollAnchorRef} />
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white px-4 py-4">
        <form
          className="mx-auto max-w-4xl"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-gray-200/60 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={
                selectedScope
                  ? "Ask a question about the selected knowledge base..."
                  : "Select a knowledge base before asking a question"
              }
              disabled={!selectedScope || sending}
              rows={2}
              className="max-h-40 min-h-14 resize-none border-0 px-3 py-2 shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1">
              <p className="text-[11px] text-gray-400">
                Shift+Enter for a new line · Unsupported answers are refused
              </p>
              <Button
                type="submit"
                size="sm"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                disabled={!input.trim() || !selectedScope || sending}
              >
                {sending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send
              </Button>
            </div>
          </div>
        </form>
      </footer>

      <CitationSourceDialog
        citation={sourceCitation}
        onOpenChange={(open) => {
          if (!open) setSourceCitation(null);
        }}
      />
    </div>
  );
}
