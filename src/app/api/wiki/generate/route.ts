import { badRequest, ok, serverError } from '@/lib/http';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { generateWiki } from '@/services/wiki-service';

export async function POST(request: Request) {
  const { agentId } = await request.json();
  if (!agentId) return badRequest('Missing agentId');

  try {
    return ok(await generateWiki(agentId, mockAiClient));
  } catch {
    return serverError();
  }
}
