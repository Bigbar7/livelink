import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/agents/[agentId]/sources/route';
import { manualGrowthInput } from '../fixtures/manual-input';

const context = {
  params: Promise.resolve({ agentId: 'agent-1' })
};

describe('POST /api/agents/:agentId/sources', () => {
  it('returns 400 for malformed JSON', async () => {
    const request = new Request('http://localhost/api/agents/agent-1/sources', {
      method: 'POST',
      body: '{bad-json'
    });

    const response = await POST(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      error: { message: 'Malformed JSON' }
    });
  });

  it('returns 400 when userId is missing', async () => {
    const request = new Request('http://localhost/api/agents/agent-1/sources', {
      method: 'POST',
      body: JSON.stringify(manualGrowthInput)
    });

    const response = await POST(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toBe('Invalid source input');
  });

  it('returns 400 when link source has no url', async () => {
    const request = new Request('http://localhost/api/agents/agent-1/sources', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'user-1',
        sourceKind: 'link',
        sourceType: 'github',
        userNote: 'GitHub profile'
      })
    });

    const response = await POST(request, context);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toBe('Invalid source input');
    expect(body.error.details.fieldErrors.url).toContain('Link sources require url');
  });
});
