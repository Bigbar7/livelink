import { ok } from '@/lib/http';
import { getSessionUserId } from '@/lib/session';
import { getCurrentUserSession } from '@/services/agent-service';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return ok(null);

  return ok(await getCurrentUserSession(userId));
}
