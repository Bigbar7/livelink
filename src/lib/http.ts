import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status: 400 });
}

export function notFound(message: string) {
  return NextResponse.json({ ok: false, error: { message } }, { status: 404 });
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ ok: false, error: { message } }, { status: 500 });
}
