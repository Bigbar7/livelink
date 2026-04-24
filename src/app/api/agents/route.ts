import { badRequest, ok, serverError } from '@/lib/http';
import { createAgentSchema } from '@/lib/validation';
import { createAgent } from '@/services/agent-service';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest('Malformed JSON');
  }

  const parsed = createAgentSchema.safeParse(body);

  if (!parsed.success) {
    return badRequest('Invalid agent input', parsed.error.flatten());
  }

  try {
    return ok(await createAgent(parsed.data));
  } catch {
    return serverError();
  }
}
