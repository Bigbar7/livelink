import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pagePath = join(process.cwd(), 'src/app/u/[slug]/page.tsx');
const contactCopyPath = join(process.cwd(), 'src/components/public-contact-copy.tsx');

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
    expect(pageSource).toContain('PublicContactCopy');
    expect(pageSource).toContain('contactHandle={contactHandle}');
    expect(pageSource).not.toContain('prisma.');
  });

  it('lets scanned visitors copy the published contact handle from the public page', () => {
    expect(existsSync(contactCopyPath)).toBe(true);

    const componentSource = readFileSync(contactCopyPath, 'utf8');

    expect(componentSource).toContain("'use client'");
    expect(componentSource).toContain('navigator.clipboard?.writeText');
    expect(componentSource).toContain('navigator.clipboard.writeText(contactHandle)');
    expect(componentSource).toContain("document.execCommand('copy')");
    expect(componentSource).toContain('复制联系方式');
    expect(componentSource).toContain('已复制，可去微信、电话或私信里联系我。');
    expect(componentSource).toContain('复制失败，请长按联系方式复制。');
  });
});
