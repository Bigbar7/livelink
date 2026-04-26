import { badRequest, ok, serverError } from '@/lib/http';
import { defaultAiClient } from '@/services/ai/default-ai-client';
import { chatAgentCreation } from '@/services/agent-generation-service';
import { z } from 'zod';

export const runtime = 'nodejs';

const creationChatSchema = z.object({
  displayName: z.string().min(1).max(80),
  message: z.string().min(1).max(4000),
  conversation: z
    .array(
      z.object({
        role: z.enum(['assistant', 'user']),
        content: z.string().min(1).max(4000)
      })
    )
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

  const parsed = creationChatSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid creation chat input', parsed.error.flatten());
  }

  try {
    return ok(await chatAgentCreation(parsed.data, defaultAiClient));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Creation chat failed');
  }
}
