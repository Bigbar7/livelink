import { badRequest, ok } from '@/lib/http';
import { searchProfiles } from '@/services/search-service';

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q');
  if (!query) return badRequest('Missing q');

  return ok(await searchProfiles(query));
}
