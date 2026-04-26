import { badRequest, notFound, ok, serverError } from '@/lib/http';
import { defaultAiClient } from '@/services/ai/default-ai-client';
import { chatAgentEvolution } from '@/services/agent-generation-service';
import { z } from 'zod';

export const runtime = 'nodejs';

const evolutionConversationMessageSchema = z.object({
  role: z.enum(['assistant', 'user']),
  content: z.string().min(1).transform((content) => content.slice(0, 4000))
});

const evolutionChatSchema = z.object({
  userId: z.string().min(1),
  agentId: z.string().min(1),
  message: z.string().min(1).max(4000),
  conversation: z
    .array(evolutionConversationMessageSchema)
    .max(30)
    .optional()
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest('Malformed JSON');
  }

  const parsed = evolutionChatSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid evolution chat input', parsed.error.flatten());
  }

  try {
    return ok(await chatAgentEvolution(parsed.data, defaultAiClient));
  } catch (error) {
    if (error instanceof Error && error.message === 'Agent not found for user') {
      return notFound('Agent not found');
    }

    return serverError(error instanceof Error ? error.message : 'Evolution chat failed');
  }
}
