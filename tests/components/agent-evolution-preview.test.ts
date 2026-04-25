import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pagePath = join(process.cwd(), 'src/app/evolution-preview/page.tsx');
const stylePath = join(process.cwd(), 'src/app/evolution-preview/evolution-preview.css');

describe('Agent evolution preview page', () => {
  it('defines a standalone route that separates first generation from evolution by user state', () => {
    expect(existsSync(pagePath)).toBe(true);
    const source = readFileSync(pagePath, 'utf8');

    expect(source).toContain('创建分身');
    expect(source).toContain('进化分身');
    expect(source).toContain('系统识别到你已有分身');
    expect(source).toContain('没有分身时');
    expect(source).toContain('已有分身时');
    expect(source).not.toContain('Tab');
  });

  it('keeps creation inputs and makes AI conversation primary for evolution', () => {
    const source = readFileSync(pagePath, 'utf8');

    expect(source).toContain('直接粘贴文本');
    expect(source).toContain('上传附件');
    expect(source).toContain('上传链接');
    expect(source).toContain('和 AI 聊几句');
    expect(source).toContain('AI 对话是主入口');
    expect(source).toContain('保存并优化');
    expect(source).toContain('生成我的分身');
  });

  it('ships dedicated preview styles', () => {
    expect(existsSync(stylePath)).toBe(true);
    const style = readFileSync(stylePath, 'utf8');

    expect(style).toContain('.evolution-preview-shell');
    expect(style).toContain('.creation-board');
    expect(style).toContain('.evolution-chat');
    expect(style).toContain('.state-switch-rail');
  });
});
