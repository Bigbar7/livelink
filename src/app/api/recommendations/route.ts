import { badRequest, ok } from '@/lib/http';
import { defaultAiClient } from '@/services/ai/default-ai-client';
import { recommendProfiles } from '@/services/recommendation-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const interests = url.searchParams.getAll('interest');

  if (!userId) return badRequest('Missing userId');
  return ok(await recommendProfiles(userId, interests, defaultAiClient));
}
