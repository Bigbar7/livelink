import { describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/agents/creation-chat/route';

const { defaultAiClientMock, chatCreation } = vi.hoisted(() => {
  const chatCreation = vi.fn(async () => ({
    role: 'assistant' as const,
    content: '听起来你在做 AI 社交产品。可以再说说你最想被别人记住的一个能力吗？',
    readiness: 'medium' as const,
    filledSlots: ['identity', 'wants'],
    missingSlots: ['currentFocus', 'projects', 'skills', 'offers'],
    nextAction: 'ask_more' as const,
    nextBestQuestion: '你最想被别人记住的一个能力是什么？',
    suggestedReplies: ['我擅长', '我主要负责', '暂时跳过'],
    draftProfile: {
      identity: 'AI 社交产品创造者',
      currentFocus: '正在做 AI 社交名片',
      wants: '工程化伙伴'
    }
  }));

  return {
    chatCreation,
    defaultAiClientMock: {
      chatCreation
    }
  };
});

vi.mock('@/services/ai/default-ai-client', () => ({
  defaultAiClient: defaultAiClientMock
}));

describe('POST /api/agents/creation-chat', () => {
  it('returns 400 when the first creation message is missing', async () => {
    const response = await POST(
      new Request('http://localhost/api/agents/creation-chat', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Jun' })
      })
    );

    expect(response.status).toBe(400);
  });

  it('asks the real AI client to reply before the first agent exists', async () => {
    const response = await POST(
      new Request('http://localhost/api/agents/creation-chat', {
        method: 'POST',
        body: JSON.stringify({
          displayName: 'Jun',
          message: '我在做 AI 社交名片，想找工程化伙伴。',
          conversation: [{ role: 'assistant', content: '你现在主要在做什么？' }]
        })
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.content).toContain('AI 社交产品');
    expect(body.data.readiness).toBe('medium');
    expect(body.data.filledSlots).toEqual(['identity', 'wants', 'currentFocus']);
    expect(body.data.missingSlots).toEqual(['projects', 'skills', 'offers']);
    expect(body.data.nextAction).toBe('ask_more');
    expect(body.data.nextBestQuestion).toContain('能力');
    expect(body.data.suggestedReplies).toContain('我擅长');
    expect(body.data.draftProfile).toMatchObject({
      identity: 'AI 社交产品创造者',
      currentFocus: '正在做 AI 社交名片',
      wants: '工程化伙伴'
    });
    expect(chatCreation).toHaveBeenCalledWith({
      user: { displayName: 'Jun' },
      message: '我在做 AI 社交名片，想找工程化伙伴。',
      conversation: [{ role: 'assistant', content: '你现在主要在做什么？' }]
    });
  });
});
