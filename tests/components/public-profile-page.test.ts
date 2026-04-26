import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pagePath = join(process.cwd(), 'src/app/u/[slug]/page.tsx');

describe('public profile page', () => {
  it('renders a shared digital clone page from the existing profile slug', () => {
    expect(existsSync(pagePath)).toBe(true);

    const pageSource = readFileSync(pagePath, 'utf8');

    expect(pageSource).toContain('getPublicProfile');
    expect(pageSource).toContain('params: Promise<{ slug: string }>');
    expect(pageSource).toContain('notFound()');
    expect(pageSource).toContain('也生成我的分身');
    expect(pageSource).toContain('联系我');
    expect(pageSource).toContain('parseContactHandle');
    expect(pageSource).not.toContain('prisma.');
  });
});
