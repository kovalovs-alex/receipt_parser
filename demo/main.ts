import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";
import { MaximaParser } from "../src/parsers/maxima";
import { RimiParser } from "../src/parsers/rimi";
import type { Receipt } from "../src/types";

// ── PDF.js worker ────────────────────────────────────────────────────────────
// Vite turns `new URL(…, import.meta.url)` into a hashed asset path at build time.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

// ── Parsers ──────────────────────────────────────────────────────────────────
const parsers = [new MaximaParser(), new RimiParser()];

// ── PDF text extraction ──────────────────────────────────────────────────────
/**
 * Extract text from a text-based PDF, replicating the line-grouping strategy
 * used by pdf-parse (group items by Y coordinate, newline between rows).
 */
async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    let lastY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y: number = (item as { transform: number[] }).transform[5];
      if (lastY !== null && y !== lastY) {
        fullText += "\n";
      }
      fullText += item.str;
      lastY = y;
    }
    fullText += "\n";
  }

  return fullText;
}

/**
 * Render the first page of a PDF to a canvas element.
 * Used as the source image for Tesseract OCR.
 */
async function renderPdfPageToCanvas(buffer: ArrayBuffer): Promise<HTMLCanvasElement> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);

  // Scale 2× for better OCR accuracy
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas 2D context");

  await page.render({ canvasContext: ctx as Parameters<typeof page.render>[0]["canvasContext"], viewport }).promise;
  return canvas;
}

/**
 * Run Tesseract OCR on the first page of a PDF.
 * Language data is fetched from the Tesseract.js CDN on first use.
 */
async function ocrPdf(
  buffer: ArrayBuffer,
  onProgress: (msg: string) => void
): Promise<string> {
  onProgress("Rendering PDF page for OCR…");
  const canvas = await renderPdfPageToCanvas(buffer);

  onProgress("Loading OCR engine (may take a moment on first run)…");
  const worker = await createWorker("lav", 1, {
    logger: (m) => {
      if (m.status === "recognizing text") {
        onProgress(`OCR progress: ${Math.round((m.progress ?? 0) * 100)}%`);
      }
    },
  });

  onProgress("Running OCR…");
  const { data } = await worker.recognize(canvas);
  await worker.terminate();
  return data.text;
}

// ── Receipt parsing ──────────────────────────────────────────────────────────
type ParseOutcome =
  | { ok: true; receipt: Receipt }
  | { ok: false; error: string };

function parseReceiptText(text: string): ParseOutcome {
  for (const parser of parsers) {
    if (parser.matches(text)) {
      try {
        return { ok: true, receipt: parser.parse(text) };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
  }
  return {
    ok: false,
    error:
      "Unable to detect store. Make sure the receipt is from Maxima or Rimi.",
  };
}

// ── Formatting helpers ───────────────────────────────────────────────────────
function eur(value: number): string {
  return value.toFixed(2) + " €";
}

function formatReceipt(receipt: Receipt): string {
  const date = receipt.date
    ? receipt.date.toLocaleDateString("lv-LV", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const rows = receipt.items
    .map((item) => {
      const discount =
        item.discount != null && item.discount !== 0
          ? `<span class="badge-discount">−${eur(Math.abs(item.discount))}</span>`
          : "";
      return `
        <tr>
          <td>${escapeHtml(item.name)}${discount}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${eur(item.unitPrice)}</td>
          <td class="num">${eur(item.totalPrice)}</td>
        </tr>`;
    })
    .join("");

  return `
    <div class="receipt-header">
      <h2>${receipt.store}</h2>
      ${receipt.address ? `<p>📍 ${escapeHtml(receipt.address)}</p>` : ""}
      <p>📅 ${date}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Unit price</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="3">Total</td>
          <td class="num">${eur(receipt.total)}</td>
        </tr>
      </tbody>
    </table>
    <button class="raw-toggle" id="raw-toggle">Show raw text</button>
    <pre id="raw-text" style="display:none">${escapeHtml(receipt.rawText)}</pre>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── UI wiring ────────────────────────────────────────────────────────────────
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const parseButton = document.getElementById("parse-button") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const outputEl = document.getElementById("output") as HTMLDivElement;

function setStatus(msg: string): void {
  statusEl.textContent = msg;
}

function showError(msg: string): void {
  outputEl.innerHTML = `<p class="error">${escapeHtml(msg)}</p>`;
}

parseButton.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    setStatus("Please select a PDF file first.");
    return;
  }

  parseButton.disabled = true;
  outputEl.innerHTML = "";
  setStatus("Reading file…");

  try {
    const buffer = await file.arrayBuffer();

    // -- try text extraction first ------------------------------------------
    setStatus("Extracting text from PDF…");
    let text = await extractTextFromPdf(buffer);

    // -- fall back to OCR if too little text was found ----------------------
    if (text.trim().length <= 20) {
      text = await ocrPdf(buffer, setStatus);
    }

    // -- parse ---------------------------------------------------------------
    setStatus("Parsing receipt…");
    const result = parseReceiptText(text);

    if (!result.ok) {
      showError(result.error);
      setStatus("Could not parse receipt.");
    } else {
      outputEl.innerHTML = formatReceipt(result.receipt);
      setStatus("Done.");

      // raw text toggle
      document.getElementById("raw-toggle")?.addEventListener("click", (e) => {
        const pre = document.getElementById("raw-text");
        const btn = e.currentTarget as HTMLButtonElement;
        if (pre) {
          const visible = pre.style.display !== "none";
          pre.style.display = visible ? "none" : "block";
          btn.textContent = visible ? "Show raw text" : "Hide raw text";
        }
      });
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err));
    setStatus("An error occurred.");
  } finally {
    parseButton.disabled = false;
  }
});
