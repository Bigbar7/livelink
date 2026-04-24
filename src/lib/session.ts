import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'livelink_user_id';

export async function getSessionUserId() {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

export function createSessionCookie(userId: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: userId,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365
    }
  };
}
