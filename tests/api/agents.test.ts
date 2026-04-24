import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/agents/route';

describe('POST /api/agents', () => {
  it('returns 400 for malformed JSON', async () => {
    const request = new Request('http://localhost/api/agents', {
      method: 'POST',
      body: '{bad-json'
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: { message: 'Malformed JSON' }
    });
  });
});
