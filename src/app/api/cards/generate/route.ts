import { badRequest, ok, serverError } from '@/lib/http';
import { generateCardFromWiki } from '@/services/card-service';
import { mockAiClient } from '@/services/ai/mock-ai-client';

export async function POST(request: Request) {
  const { wikiId } = await request.json();
  if (!wikiId) return badRequest('Missing wikiId');

  try {
    return ok(await generateCardFromWiki(wikiId, mockAiClient));
  } catch {
    return serverError();
  }
}
