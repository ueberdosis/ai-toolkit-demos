import type { JSONContent } from "@tiptap/core";
import { formatCount } from "./format";
import {
  buildPdfDocument,
  itemsToLines,
  type PdfConversionStats,
  type PdfPage,
} from "./pdf-layout";

// Keeps the worker busy without holding many pages in flight.
const PAGES_PER_BATCH = 8;

/**
 * Reads the text layer of a PDF with pdf.js, which parses in a web worker, and
 * rebuilds it as headings and paragraphs. Images, tables, and layout are lost.
 */
export async function convertPdf(
  file: File,
  reportProgress: (message: string) => void,
): Promise<{ content: JSONContent; stats: PdfConversionStats }> {
  // Loaded on first use; this entry also starts the pdf.js worker.
  const pdfjs = await import("pdfjs-dist/webpack.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });

  try {
    const pdf = await loadingTask.promise;

    const readPage = async (pageNumber: number): Promise<PdfPage> => {
      const page = await pdf.getPage(pageNumber);
      const [, bottom, , top] = page.view;
      const { items } = await page.getTextContent();
      page.cleanup();
      const textItems = items.flatMap((item) => ("str" in item ? [item] : []));
      return { height: top - bottom, lines: itemsToLines(textItems, top) };
    };

    const pages: PdfPage[] = [];
    for (let first = 1; first <= pdf.numPages; first += PAGES_PER_BATCH) {
      const last = Math.min(first + PAGES_PER_BATCH - 1, pdf.numPages);
      const pageNumbers = Array.from(
        { length: last - first + 1 },
        (_, index) => first + index,
      );
      pages.push(...(await Promise.all(pageNumbers.map(readPage))));
      reportProgress(
        `read ${formatCount(last)} of ${formatCount(pdf.numPages)} pages`,
      );
    }

    const result = buildPdfDocument(pages);
    if (result.stats.characters === 0) {
      throw new Error(
        "This PDF has no text layer, it may be scanned. Importing it would need OCR.",
      );
    }
    return result;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") {
      throw new Error("This PDF is password protected");
    }
    throw error;
  } finally {
    await loadingTask.destroy();
  }
}
