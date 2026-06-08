import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders chunk text/summary content as Markdown so GFM tables, lists and
 * inline formatting display properly instead of as raw text. Tables are the
 * main reason this exists — Docling emits them as pipe tables inside
 * ``text_content``.
 *
 * Styling is intentionally compact to fit inside the chunk detail rows.
 */
function MarkdownContentImpl({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-gray-700 break-words",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Render GFM tables as real, scrollable tables.
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-gray-200 px-3 py-1.5 text-left font-semibold text-gray-600">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-gray-200 px-3 py-1.5 align-top text-gray-700">
              {children}
            </td>
          ),
          p: ({ children }) => (
            <p className="my-1.5 whitespace-pre-wrap first:mt-0 last:mb-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mt-3 mb-1.5 text-base font-bold text-gray-900 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-1.5 text-sm font-bold text-gray-900 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 mb-1 text-sm font-semibold text-gray-800 first:mt-0">
              {children}
            </h3>
          ),
          code: ({ className: codeClass, children }) => {
            const isBlock = /language-/.test(codeClass ?? "");
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-md bg-gray-100 p-2 font-mono text-xs text-gray-800">
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-2">{children}</pre>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 underline hover:text-indigo-700"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-gray-200 pl-3 text-gray-600 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-gray-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownContent = memo(MarkdownContentImpl);
