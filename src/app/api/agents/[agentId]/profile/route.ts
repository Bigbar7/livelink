import { badRequest, notFound, ok, serverError } from '@/lib/http';
import { contactHandleSchema, displayNameSchema } from '@/lib/validation';
import { updateAgentProfile } from '@/services/agent-service';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

const stringListSchema = z.array(z.string().trim().min(1).max(120)).max(24);

const profileAnalysisSchema = z.object({
  recentUpdates: stringListSchema,
  careerHighlights: stringListSchema,
  domainSignals: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        evidence: z.string().trim().max(200).optional()
      })
    )
    .max(12),
  persona: z.object({
    title: z.string().trim().max(80).optional(),
    description: z.string().trim().max(240).optional(),
    confidence: z.number().min(0).max(1).optional()
  }),
  needs: stringListSchema
});

const updateProfileSchema = z.object({
  userId: z.string().min(1),
  profileId: z.string().min(1),
  displayName: displayNameSchema,
  contact: contactHandleSchema,
  headline: z.string().trim().min(1).max(160),
  bio: z.string().trim().min(1).max(1200),
  tags: stringListSchema,
  offers: stringListSchema,
  wants: stringListSchema,
  analysis: profileAnalysisSchema
});

export async function PATCH(request: Request, context: RouteContext) {
  const { agentId } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest('Malformed JSON');
  }

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Invalid profile input', parsed.error.flatten());
  }

  try {
    return ok(await updateAgentProfile({ ...parsed.data, agentId }));
  } catch (error) {
    if (error instanceof Error && (error.message === 'Agent not found for user' || error.message === 'Profile not found for user')) {
      return notFound('Agent profile not found');
    }

    return serverError(error instanceof Error ? error.message : 'Agent profile update failed');
  }
}
