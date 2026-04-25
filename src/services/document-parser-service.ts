import mammoth from 'mammoth';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

type PdfParseModule = typeof import('pdf-parse');
type CanvasGlobalName = 'DOMMatrix' | 'DOMPoint' | 'DOMRect' | 'ImageData' | 'Path2D';
type CanvasModule = Partial<Record<CanvasGlobalName, unknown>>;

const require = createRequire(import.meta.url);

const maxDocumentBytes = 8 * 1024 * 1024;

export type ParsedDocument = {
  fileName: string;
  fileType: string;
  text: string;
};

type DocumentFileInput = {
  name: string;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

function extensionOf(fileName: string) {
  return fileName.toLowerCase().split('.').pop() ?? '';
}

function normalizeText(text: string) {
  return text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function isPdf(fileName: string, fileType: string) {
  return fileType === 'application/pdf' || extensionOf(fileName) === 'pdf';
}

function isDocx(fileName: string, fileType: string) {
  return (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || extensionOf(fileName) === 'docx'
  );
}

function isText(fileName: string, fileType: string) {
  return fileType.startsWith('text/') || ['txt', 'md'].includes(extensionOf(fileName));
}

export function isSupportedDocument(fileName: string, fileType: string) {
  return isPdf(fileName, fileType) || isDocx(fileName, fileType) || isText(fileName, fileType);
}

function installPdfCanvasGlobals() {
  const canvas = require('@napi-rs/canvas') as CanvasModule;
  const canvasGlobals = globalThis as typeof globalThis & Partial<Record<CanvasGlobalName, unknown>>;
  const installGlobal = (name: CanvasGlobalName, value: unknown) => {
    if (typeof canvasGlobals[name] === 'undefined' && typeof value !== 'undefined') {
      Object.defineProperty(canvasGlobals, name, { value, configurable: true, writable: true });
    }
  };

  installGlobal('DOMMatrix', canvas.DOMMatrix);
  installGlobal('DOMPoint', canvas.DOMPoint);
  installGlobal('DOMRect', canvas.DOMRect);
  installGlobal('ImageData', canvas.ImageData);
  installGlobal('Path2D', canvas.Path2D);
}

function loadPdfParser() {
  installPdfCanvasGlobals();
  const pdfParse = require('pdf-parse') as PdfParseModule;
  const workerPath = join(process.cwd(), 'node_modules/pdf-parse/dist/pdf-parse/cjs/pdf.worker.mjs');
  pdfParse.PDFParse.setWorker(pathToFileURL(workerPath).toString());
  return pdfParse.PDFParse;
}

async function parsePdf(buffer: Buffer) {
  const PDFParse = loadPdfParser();
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function parseDocumentFile(file: DocumentFileInput): Promise<ParsedDocument> {
  const fileName = file.name;
  const fileType = file.type || 'application/octet-stream';

  if (!isSupportedDocument(fileName, fileType)) {
    throw new Error('Unsupported document type');
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > maxDocumentBytes) {
    throw new Error('Document is too large');
  }

  const buffer = Buffer.from(arrayBuffer);
  let text = '';

  if (isPdf(fileName, fileType)) {
    text = await parsePdf(buffer);
  } else if (isDocx(fileName, fileType)) {
    text = await parseDocx(buffer);
  } else {
    text = buffer.toString('utf8');
  }

  return {
    fileName,
    fileType,
    text: normalizeText(text)
  };
}
