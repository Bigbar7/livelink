import { badRequest, ok, serverError } from '@/lib/http';
import { defaultAiClient } from '@/services/ai/default-ai-client';
import { generateAgentProfile } from '@/services/agent-generation-service';
import { z } from 'zod';

const generateAgentProfileSchema = z.object({
  displayName: z.string().min(1).max(40),
  role: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  text: z.string().max(20000).optional(),
  fileName: z.string().max(200).optional(),
  fileText: z.string().max(20000).optional(),
  links: z
    .array(
      z.object({
        url: z.string().url(),
        note: z.string().max(2000).optional()
      })
    )
    .max(10)
    .optional()
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest('Malformed JSON');
  }

  const parsed = generateAgentProfileSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid generation input', parsed.error.flatten());
  }

  try {
    return ok(await generateAgentProfile(parsed.data, defaultAiClient));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Agent generation failed');
  }
}
