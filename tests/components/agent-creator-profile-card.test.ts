import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const tagsRule = styleSource.match(/\.prompt-list,\n\.tags \{[\s\S]*?\n\}/)?.[0] ?? '';

describe('AgentCreator profile card template', () => {
  it('renders the agent page with identity, updates, highlights, domains, persona, and needs sections', () => {
    expect(componentSource).toContain('profile-identity');
    expect(componentSource).toContain('近况流');
    expect(componentSource).toContain('履历亮点');
    expect(componentSource).toContain('领域画像');
    expect(componentSource).toContain('人格兽');
    expect(componentSource).toContain('最近需求');
  });

  it('styles the redesigned profile sections as distinct cards', () => {
    expect(styleSource).toContain('.profile-identity');
    expect(styleSource).toContain('.profile-actions');
    expect(styleSource).toContain('.profile-section');
    expect(styleSource).toContain('.domain-grid');
    expect(styleSource).toContain('.persona-beast');
    expect(styleSource).toContain('.need-card');
  });

  it('shows contact as a lightweight action instead of a profile field', () => {
    expect(componentSource).toContain('profile-actions');
    expect(componentSource).toContain('profile-handle');
    expect(componentSource).toContain('联系分身');
    expect(componentSource).not.toContain('SummaryRow title="联系方式"');
    expect(componentSource).not.toContain('<b>联系方式</b>');
    expect(componentSource).toContain('这是你的数字分身');
  });

  it('allows profile tags to scroll horizontally instead of clipping overflow', () => {
    expect(tagsRule).toContain('overflow-x: auto');
    expect(tagsRule).toContain('-webkit-overflow-scrolling: touch');
    expect(tagsRule).toContain('scrollbar-width: none');
  });

  it('does not invent fallback domains, scores, or persona names when profile data is sparse', () => {
    expect(componentSource).not.toContain("tags[0] || '夜行策展猫'");
    expect(componentSource).not.toContain("慢热但敏锐，适合从高质量问题进入深聊。");
    expect(componentSource).not.toContain('34 - index * 6');
    expect(componentSource).not.toContain('价值社交</b><span>34%</span>');
    expect(componentSource).toContain('资料还不够，继续补充后再生成');
  });

  it('uses dedicated analysis fields before falling back to card arrays', () => {
    expect(componentSource).toContain('parseProfileAnalysis(profile?.analysisJson)');
    expect(componentSource).toContain('analysis.recentUpdates');
    expect(componentSource).toContain('analysis.careerHighlights');
    expect(componentSource).toContain('analysis.domainSignals');
    expect(componentSource).toContain('analysis.persona');
    expect(componentSource).toContain('analysis.needs');
  });

  it('expands the profile top-right action into a reset menu that preserves nickname and contact', () => {
    expect(componentSource).toContain('showProfileMenu');
    expect(componentSource).toContain('resetPersonalInfo');
    expect(componentSource).toContain('/personal-info');
    expect(componentSource).toContain('清空资料');
    expect(componentSource).toContain('保留昵称和联系方式');
  });
});
