import { badRequest, ok, serverError } from '@/lib/http';
import { addSourceSchema } from '@/lib/validation';
import { addSourceDocument, listAgentSources } from '@/services/source-service';

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { agentId } = await context.params;

  try {
    return ok(await listAgentSources(agentId));
  } catch {
    return serverError();
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { agentId } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest('Malformed JSON');
  }

  const parsed = addSourceSchema.safeParse({ ...(typeof body === 'object' && body ? body : {}), agentId });

  if (!parsed.success) {
    return badRequest('Invalid source input', parsed.error.flatten());
  }

  try {
    return ok(
      await addSourceDocument({
        userId: parsed.data.userId,
        agentId,
        sourceKind: parsed.data.sourceKind,
        sourceType: parsed.data.sourceType,
        url: parsed.data.url,
        title: parsed.data.title,
        rawText: parsed.data.rawText,
        userNote: parsed.data.userNote
      })
    );
  } catch {
    return serverError();
  }
}
