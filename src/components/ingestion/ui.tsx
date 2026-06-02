import { type ReactNode } from "react";
import { motion } from "framer-motion";
import Topbar from "@/components/app/topbar";
import { ModeBadge } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Loader2, type LucideIcon } from "lucide-react";

/**
 * Shared visual kit for the ingestion pages (auto + guided). Centralises the
 * page chrome, document hero, pipeline stepper, metric tiles, section panels
 * and the sticky action bar so both modes share one cohesive, responsive,
 * motion-aware look.
 */

// ── Motion ──────────────────────────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

/** Vertical fade/slide-in for a stack of children, lightly staggered. */
export function MotionStack({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────

export function IngestionShell({
  title,
  children,
  center = false,
}: {
  title: string;
  children: ReactNode;
  center?: boolean;
}) {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Topbar title={title} breadcrumbs={[{ label: "Ingestions" }]} />
      <main className="flex-1 overflow-auto bg-gradient-to-b from-gray-50/80 via-gray-50/30 to-white">
        {center ? (
          <div className="min-h-full flex items-center justify-center px-4 py-10">
            {children}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Status pill (animated dot) ──────────────────────────────────────────────

type Tone = "indigo" | "violet" | "emerald" | "amber" | "blue" | "red" | "gray";

const TONE: Record<Tone, { dot: string; chip: string }> = {
  indigo: { dot: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700 ring-indigo-100" },
  violet: { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700 ring-violet-100" },
  emerald: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
  amber: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-100" },
  blue: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 ring-blue-100" },
  red: { dot: "bg-red-500", chip: "bg-red-50 text-red-700 ring-red-100" },
  gray: { dot: "bg-gray-400", chip: "bg-gray-100 text-gray-600 ring-gray-200" },
};

export function StatusPill({
  label,
  tone = "gray",
  pulse = false,
  icon: Icon,
}: {
  label: string;
  tone?: Tone;
  pulse?: boolean;
  icon?: LucideIcon;
}) {
  const t = TONE[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
        t.chip,
      )}
    >
      {Icon ? (
        <Icon className="size-3.5" />
      ) : (
        <span className="relative flex size-2">
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                t.dot,
              )}
            />
          )}
          <span className={cn("relative inline-flex size-2 rounded-full", t.dot)} />
        </span>
      )}
      {label}
    </span>
  );
}

// ── Document hero ─────────────────────────────────────────────────────────

export function Hero({
  icon: Icon,
  title,
  meta,
  mode,
  status,
  description,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  meta?: ReactNode;
  mode?: "auto" | "guided";
  status?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      {/* Accent wash */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-indigo-50 via-violet-50/40 to-transparent" />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm shadow-indigo-200">
            <Icon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                {title}
              </h2>
              {mode && <ModeBadge mode={mode} />}
            </div>
            {meta && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                {meta}
              </div>
            )}
            {description && (
              <p className="mt-3 max-w-2xl text-sm text-gray-600">{description}</p>
            )}
          </div>
          {status && <div className="shrink-0">{status}</div>}
        </div>
        {actions && (
          <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>
        )}
      </div>
    </motion.div>
  );
}

// ── Pipeline stepper ─────────────────────────────────────────────────────

export type StepState = "pending" | "active" | "complete" | "error";
export type Step = { key: string; label: string; status: StepState };

export function PipelineStepper({ steps }: { steps: Step[] }) {
  const total = steps.length;
  // Progress fill spans from the first node centre to the frontier (the active
  // node, or the last completed one).
  const activeIndex = steps.findIndex((s) => s.status === "active");
  const errorIndex = steps.findIndex((s) => s.status === "error");
  const completeCount = steps.filter((s) => s.status === "complete").length;
  const frontier =
    errorIndex >= 0 ? errorIndex : activeIndex >= 0 ? activeIndex : completeCount;
  const fillPct =
    total <= 1 ? 0 : Math.min(100, (frontier / (total - 1)) * 100);

  return (
    <motion.div
      {...fadeUp}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:px-6 sm:py-5"
    >
      <div className="overflow-x-auto">
        <div className="relative flex min-w-[640px] items-start">
          {/* Track */}
          <div className="absolute left-0 right-0 top-4 mx-[5%] h-0.5 rounded-full bg-gray-100" />
          <motion.div
            className="absolute left-0 top-4 ml-[5%] h-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            style={{ maxWidth: "90%" }}
            initial={{ width: 0 }}
            animate={{ width: `${fillPct * 0.9}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
          {steps.map((step) => (
            <div
              key={step.key}
              className="relative z-10 flex flex-1 flex-col items-center gap-1.5"
            >
              <StepNode status={step.status} />
              <span
                className={cn(
                  "whitespace-nowrap text-center text-[11px] font-medium",
                  step.status === "active" && "text-indigo-700",
                  step.status === "complete" && "text-emerald-600",
                  step.status === "error" && "text-red-600",
                  step.status === "pending" && "text-gray-400",
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function StepNode({ status }: { status: StepState }) {
  return (
    <span
      className={cn(
        "grid size-8 place-items-center rounded-full ring-4 transition-colors",
        status === "complete" && "bg-emerald-500 text-white ring-emerald-100",
        status === "active" && "bg-indigo-600 text-white ring-indigo-100",
        status === "error" && "bg-red-500 text-white ring-red-100",
        status === "pending" && "bg-white text-gray-300 ring-gray-100 border border-gray-200",
      )}
    >
      {status === "complete" ? (
        <Check className="size-4" />
      ) : status === "active" ? (
        <Loader2 className="size-4 animate-spin" />
      ) : status === "error" ? (
        <AlertCircle className="size-4" />
      ) : (
        <span className="size-1.5 rounded-full bg-current" />
      )}
    </span>
  );
}

// ── Metric tile ─────────────────────────────────────────────────────────

const TILE_ACCENT: Record<Tone, string> = {
  indigo: "border-t-indigo-400",
  violet: "border-t-violet-400",
  emerald: "border-t-emerald-400",
  amber: "border-t-amber-400",
  blue: "border-t-blue-400",
  red: "border-t-red-400",
  gray: "border-t-gray-300",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "indigo",
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  active?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        "rounded-2xl border border-t-2 border-gray-100 bg-white p-4 shadow-sm transition-all",
        TILE_ACCENT[tone],
        active && "ring-2 ring-indigo-100",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn("grid size-8 place-items-center rounded-lg", t.chip)}
        >
          <Icon className="size-4" />
        </span>
        {active && <StatusPill label="Active" tone="indigo" pulse />}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-600">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

// ── Section panel ────────────────────────────────────────────────────────

export function Panel({
  icon: Icon,
  title,
  subtitle,
  actions,
  children,
  bodyClassName,
  className,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-gray-50 px-5 py-3.5">
        {Icon && <Icon className="size-4 shrink-0 text-violet-600" />}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="truncate text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      <div className={bodyClassName ?? "p-5"}>{children}</div>
    </div>
  );
}

// ── Sticky action bar ──────────────────────────────────────────────────────

export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-1 border-t border-gray-100 bg-white/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-2">
        {children}
      </div>
    </div>
  );
}

// ── Centered card (terminal states) ─────────────────────────────────────────

export function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <motion.div
      {...fadeUp}
      className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm"
    >
      {children}
    </motion.div>
  );
}

export function StatusIcon({
  icon: Icon,
  tone,
}: {
  icon: LucideIcon;
  tone: Tone;
}) {
  const t = TONE[tone];
  return (
    <div
      className={cn(
        "mx-auto mb-5 grid size-16 place-items-center rounded-full ring-1 ring-inset",
        t.chip,
      )}
    >
      <Icon className="size-8" />
    </div>
  );
}
