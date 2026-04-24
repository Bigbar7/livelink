import { badRequest, notFound, ok, serverError } from '@/lib/http';
import { getMyAgentState } from '@/services/agent-service';

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('userId');

  if (!userId) {
    return badRequest('Missing userId');
  }

  try {
    return ok(await getMyAgentState(userId));
  } catch (error) {
    if (error instanceof Error && error.message === 'Agent not found') {
      return notFound('Agent not found');
    }

    return serverError();
  }
}
