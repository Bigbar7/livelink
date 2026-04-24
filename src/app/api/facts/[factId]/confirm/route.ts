import { notFound, ok, serverError } from '@/lib/http';
import { confirmFact } from '@/services/knowledge-service';

type RouteContext = {
  params: Promise<{ factId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { factId } = await context.params;

  try {
    return ok(await confirmFact(factId));
  } catch (error) {
    if (error instanceof Error && error.message.includes('No ProfileFact found')) {
      return notFound('Fact not found');
    }

    return serverError();
  }
}
