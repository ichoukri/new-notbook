import { BookOpen, Network, Sparkles, Zap } from "lucide-react";

export const EXAMPLE_QUERIES = [
  "How does authentication work?",
  "What are the rate limits?",
  "How do I install the SDK?",
  "Architecture overview",
];

export const SEARCH_MODES = [
  {
    id: "semantic",
    label: "Semantic",
    icon: Sparkles,
    desc: "Summary-weighted retrieval preview",
  },
  { id: "hybrid", label: "Hybrid", icon: Zap, desc: "Summary + raw text combined" },
  { id: "keyword", label: "Keyword", icon: BookOpen, desc: "Exact keyword matching" },
  {
    id: "graph_mix",
    label: "Graph Mix",
    icon: Network,
    desc: "Hybrid retrieval expanded through approved entities and evidence",
  },
] as const;

export const CONTENT_TYPE_OPTIONS = [
  "all",
  "text",
  "table",
  "ocr",
  "image",
  "mixed",
  "transcript",
] as const;

export type RetrievalSearchModeId = (typeof SEARCH_MODES)[number]["id"];
