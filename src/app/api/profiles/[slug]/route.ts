import { notFound, ok } from '@/lib/http';
import { getPublicProfile } from '@/services/card-service';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const profile = await getPublicProfile(slug);

  if (!profile) return notFound('Profile not found');
  return ok(profile);
}
