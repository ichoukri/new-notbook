import { useMemo } from "react";
import DOMPurify from "dompurify";

/**
 * Renders a chunk table that the backend stored as an HTML fragment
 * (unstructured's ``text_as_html``). The HTML originates from uploaded
 * documents, so it is sanitised with DOMPurify and restricted to
 * table-related tags before being injected.
 */
const ALLOWED_TAGS = [
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "span",
  "p",
];

export function TableHtml({ html }: { html: string }) {
  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR: ["colspan", "rowspan"],
      }),
    [html],
  );

  return (
    <div
      className="chunk-table overflow-x-auto rounded-lg border border-gray-200"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
