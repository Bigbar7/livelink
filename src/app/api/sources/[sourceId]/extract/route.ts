import { notFound, ok, serverError } from '@/lib/http';
import { mockAiClient } from '@/services/ai/mock-ai-client';
import { extractKnowledgeFromSource } from '@/services/knowledge-service';

type RouteContext = {
  params: Promise<{ sourceId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { sourceId } = await context.params;

  try {
    return ok(await extractKnowledgeFromSource(sourceId, mockAiClient));
  } catch (error) {
    if (error instanceof Error && error.message.includes('No SourceDocument found')) {
      return notFound('Source not found');
    }

    return serverError();
  }
}
