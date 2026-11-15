import type { PDFDocumentProxy } from "pdfjs-dist";

export type { PDFDocumentProxy };

// PDF.js is imported here, on demand, and only the resume viewer calls this, so no other
// page downloads it (DD-44). Its worker is bundled with the app, never loaded from a CDN.
export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerPort ??= new Worker(
    new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
    { type: "module" },
  );
  // Pages are only drawn: no forms, links or the file's own scripts.
  return pdfjs.getDocument({ data }).promise;
}
