import { badRequest, notFound, ok, serverError } from '@/lib/http';
import { resetAgentPersonalInfo } from '@/services/agent-service';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

const resetPersonalInfoSchema = z.object({
  userId: z.string().min(1)
});

export async function DELETE(request: Request, context: RouteContext) {
  const { agentId } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest('Malformed JSON');
  }

  const parsed = resetPersonalInfoSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid reset input', parsed.error.flatten());
  }

  try {
    return ok(await resetAgentPersonalInfo({ userId: parsed.data.userId, agentId }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Agent not found for user') {
      return notFound('Agent not found');
    }

    return serverError(error instanceof Error ? error.message : 'Agent personal info reset failed');
  }
}
