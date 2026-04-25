import { badRequest, ok, serverError } from '@/lib/http';
import { defaultAiClient } from '@/services/ai/default-ai-client';
import { evolveAgentProfile } from '@/services/agent-generation-service';
import { z } from 'zod';

export const runtime = 'nodejs';

const evolveAgentProfileSchema = z.object({
  userId: z.string().min(1),
  agentId: z.string().min(1),
  text: z.string().max(20000).optional(),
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

  const parsed = evolveAgentProfileSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid evolution input', parsed.error.flatten());
  }

  try {
    const data = await evolveAgentProfile(parsed.data, defaultAiClient);
    return ok(data);
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Agent evolution failed');
  }
}
