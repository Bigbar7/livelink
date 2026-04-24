import { badRequest, ok, serverError } from '@/lib/http';
import { publishCard } from '@/services/card-service';

export async function POST(request: Request) {
  const { cardId } = await request.json();
  if (!cardId) return badRequest('Missing cardId');

  try {
    return ok(await publishCard(cardId));
  } catch {
    return serverError();
  }
}
