import { badRequest, ok, serverError } from '@/lib/http';
import { generateCardFromWiki } from '@/services/card-service';
import { defaultAiClient } from '@/services/ai/default-ai-client';

export async function POST(request: Request) {
  const { wikiId } = await request.json();
  if (!wikiId) return badRequest('Missing wikiId');

  try {
    return ok(await generateCardFromWiki(wikiId, defaultAiClient));
  } catch {
    return serverError();
  }
}
