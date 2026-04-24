import { ok } from '@/lib/http';
import { listPublishedProfiles } from '@/services/card-service';

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? 20);
  return ok(await listPublishedProfiles(Number.isFinite(limit) ? limit : 20));
}
