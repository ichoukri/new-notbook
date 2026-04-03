import { useState } from "react";
import { Navigate } from "react-router";
import { LoginForm } from "./components/login";
import { SignupForm } from "./components/sign-up";
import { hasStoredAuth } from "@/core/auth";
import { Sparkles, Layers, Search, Zap, Shield, Star } from "lucide-react";

type View = "login" | "signup";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant ingestion",
    desc: "Upload any document and have it chunked, embedded, and indexed in seconds.",
  },
  {
    icon: Search,
    title: "Semantic retrieval",
    desc: "Query your knowledge base with natural language and get ranked, relevant results.",
  },
  {
    icon: Layers,
    title: "Full pipeline control",
    desc: "Auto Mode for speed, Guided Mode for precision — you choose.",
  },
];

const TESTIMONIALS = [
  {
    quote: "VectorFlow cut our RAG pipeline setup from days to hours. The retrieval quality is exceptional.",
    name: "Priya Mehta",
    role: "ML Engineer at Stripe",
    initials: "PM",
  },
];

export default function AuthPage() {
  const [view, setView] = useState<View>("login");

  if (hasStoredAuth()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* Left: Branding panel */}
      <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-white/5" />
          {/* Dot grid */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative flex flex-col h-full px-12 py-10">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-auto">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="size-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">VectorFlow</span>
          </div>

          {/* Hero content */}
          <div className="flex-1 flex flex-col justify-center py-12">
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 bg-white/10 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Now in v2.4 — Hybrid retrieval
              </span>
            </div>
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              The AI document<br />
              knowledge platform
            </h1>
            <p className="text-indigo-200 text-lg leading-relaxed max-w-sm">
              Ingest, chunk, embed, and retrieve any document at scale. Purpose-built for RAG and LLM pipelines.
            </p>

            {/* Features */}
            <div className="mt-10 space-y-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/10">
                    <f.icon className="size-4 text-indigo-200" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{f.title}</p>
                    <p className="text-indigo-300 text-xs leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10">
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-3.5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-white/90 text-sm leading-relaxed mb-4">
              "{TESTIMONIALS[0].quote}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-300 to-violet-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {TESTIMONIALS[0].initials}
              </div>
              <div>
                <p className="text-white text-xs font-semibold">{TESTIMONIALS[0].name}</p>
                <p className="text-indigo-300 text-xs">{TESTIMONIALS[0].role}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-indigo-400 text-xs mt-6">
            © 2025 VectorFlow Inc. · Privacy · Terms
          </p>
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="flex-1 flex flex-col">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 px-6 py-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">VectorFlow</span>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {view === "login" && (
              <LoginForm onSwitchToSignUp={() => setView("signup")} />
            )}
            {view === "signup" && (
              <SignupForm onSwitchToLogin={() => setView("login")} />
            )}
          </div>
        </div>

        {/* Security badge footer */}
        <div className="flex items-center justify-center gap-1.5 px-6 py-4 border-t border-gray-50 bg-gray-50/50">
          <Shield className="size-3.5 text-gray-400" />
          <p className="text-xs text-gray-400">
            Secured with TLS 1.3 · SOC2 Type II certified · GDPR compliant
          </p>
        </div>
      </div>
    </div>
  );
}
