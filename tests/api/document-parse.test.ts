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
});
