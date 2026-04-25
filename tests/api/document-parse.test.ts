import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/documents/parse/route';

function makeFile(content: string, name: string, type: string) {
  return new File([content], name, { type });
}

describe('POST /api/documents/parse', () => {
  it('extracts text from uploaded text files', async () => {
    const formData = new FormData();
    formData.set('file', makeFile('我是测试简历文本', 'resume.txt', 'text/plain'));

    const response = await POST(new Request('http://localhost/api/documents/parse', { method: 'POST', body: formData }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      data: {
        fileName: 'resume.txt',
        fileType: 'text/plain',
        text: '我是测试简历文本'
      }
    });
  });

  it('rejects unsupported document types', async () => {
    const formData = new FormData();
    formData.set('file', makeFile('bad', 'resume.png', 'image/png'));

    const response = await POST(new Request('http://localhost/api/documents/parse', { method: 'POST', body: formData }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.message).toBe('Unsupported document type');
  });

  it('includes PDF and Word parser support', async () => {
    const { parseDocumentFile } = await import('@/services/document-parser-service');
    const parserSource = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../src/services/document-parser-service.ts', import.meta.url), 'utf8')
    );

    expect(parseDocumentFile).toBeTypeOf('function');
    expect(parserSource).toContain('pdf-parse');
    expect(parserSource).toContain('mammoth');
  });

  it('loads the PDF parser through Node require to avoid Next route ESM bundling failures', async () => {
    const parserSource = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../src/services/document-parser-service.ts', import.meta.url), 'utf8')
    );
    const nextConfigSource = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../next.config.mjs', import.meta.url), 'utf8')
    );

    expect(parserSource).toContain('createRequire');
    expect(parserSource).toContain("require('pdf-parse')");
    expect(parserSource).toContain('process.cwd()');
    expect(parserSource).toContain('pdf.worker.mjs');
    expect(parserSource).toContain('setWorker');
    expect(parserSource).not.toContain("import { PDFParse } from 'pdf-parse'");
    expect(nextConfigSource).toContain("'@napi-rs/canvas'");
  });

  it('installs canvas DOM globals before parsing PDF files on the server', async () => {
    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 72 720 Td (Hello PDF) Tj ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000311 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
405
%%EOF`;
    const canvasGlobals = globalThis as Partial<Record<'DOMMatrix' | 'DOMPoint' | 'DOMRect' | 'ImageData' | 'Path2D', unknown>>;
    delete canvasGlobals.DOMMatrix;
    delete canvasGlobals.DOMPoint;
    delete canvasGlobals.DOMRect;
    delete canvasGlobals.ImageData;
    delete canvasGlobals.Path2D;

    const { parseDocumentFile } = await import('@/services/document-parser-service');
    const result = await parseDocumentFile(makeFile(pdf, 'hello.pdf', 'application/pdf'));

    expect(result.text).toContain('Hello PDF');
    expect(canvasGlobals.DOMMatrix).toBeTypeOf('function');
    expect(canvasGlobals.DOMPoint).toBeTypeOf('function');
    expect(canvasGlobals.DOMRect).toBeTypeOf('function');
    expect(canvasGlobals.ImageData).toBeTypeOf('function');
    expect(canvasGlobals.Path2D).toBeTypeOf('function');
  });
});
