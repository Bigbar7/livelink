import { badRequest, ok, serverError } from '@/lib/http';
import { createConnectionRequest, listConnections } from '@/services/connection-service';

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('userId');
  if (!userId) return badRequest('Missing userId');

  return ok(await listConnections(userId));
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.fromUserId || !body.toUserId || !body.source) {
    return badRequest('Missing fromUserId, toUserId, or source');
  }

  try {
    return ok(await createConnectionRequest(body));
  } catch (error) {
    return serverError(error instanceof Error ? error.message : 'Connection failed');
  }
}
