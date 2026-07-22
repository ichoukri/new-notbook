import * as pdfjs from "pdfjs-dist";
// Vite resolves this to a hashed asset URL and bundles the worker; ``?url`` is
// what keeps it out of the main chunk and lets the CSP-safe worker load.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// pdf.js refuses to parse without a worker configured. Set it once at import.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export { pdfjs };
export type PdfDocument = Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>;
export type PdfPage = Awaited<ReturnType<PdfDocument["getPage"]>>;
