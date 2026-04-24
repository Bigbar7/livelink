import { badRequest, ok, serverError } from '@/lib/http';
import { defaultAiClient } from '@/services/ai/default-ai-client';
import { generateWiki } from '@/services/wiki-service';

export async function POST(request: Request) {
  const { agentId } = await request.json();
  if (!agentId) return badRequest('Missing agentId');

  try {
    return ok(await generateWiki(agentId, defaultAiClient));
  } catch {
    return serverError();
  }
}
