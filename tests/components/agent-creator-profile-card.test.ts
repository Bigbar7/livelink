import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const tagsRule = styleSource.match(/\.prompt-list,\n\.tags \{[\s\S]*?\n\}/)?.[0] ?? '';

describe('AgentCreator profile card template', () => {
  it('renders the digital clone page with identity, updates, link style, highlights, domains, and goals', () => {
    expect(componentSource).toContain('profile-identity');
    expect(componentSource).toContain('我的数字分身');
    expect(componentSource).toContain('近况流');
    expect(componentSource).toContain('link风格');
    expect(componentSource).toContain('履历亮点');
    expect(componentSource).toContain('领域画像');
    expect(componentSource).toContain('我能提供');
    expect(componentSource).toContain('我正在寻找');
    expect(componentSource).not.toContain('人格兽');
    expect(componentSource).not.toContain('最近需求');
    expect(componentSource).not.toContain('破冰问题');
  });

  it('styles the redesigned profile page as a compact single-column layout', () => {
    expect(styleSource).toContain('.profile-identity');
    expect(styleSource).toContain('.profile-contact-inline');
    expect(styleSource).toContain('.profile-section');
    expect(styleSource).toContain('.domain-grid');
    expect(styleSource).toContain('.profile-sticky-cta');
    expect(styleSource).toContain('.link-style-card');
  });

  it('shows contact beside the nickname without a copy action', () => {
    expect(componentSource).toContain('profile-name-line');
    expect(componentSource).toContain('profile-contact-inline');
    expect(componentSource).not.toContain('>复制</button>');
    expect(componentSource).not.toContain('联系分身');
    expect(componentSource).not.toContain('SummaryRow title="联系方式"');
    expect(componentSource).not.toContain('navigator.clipboard?.writeText(contactHandle)');
    expect(componentSource).not.toContain('这是你的数字分身');
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

  it('adds a structured edit page with separate nickname and contact fields', () => {
    expect(componentSource).toContain("FlowStep = 'home' | 'input' | 'generating' | 'card' | 'edit'");
    expect(componentSource).toContain('edit-profile-screen');
    expect(componentSource).toContain('编辑数字分身');
    expect(componentSource).toContain('基础');
    expect(componentSource).toContain('画像');
    expect(componentSource).toContain('目标');
    expect(componentSource).toContain('editNickname');
    expect(componentSource).toContain('editContact');
    expect(componentSource).toContain('/api/agents/${generated.agent.id}/profile');
    expect(componentSource).toContain('取消');
    expect(componentSource).not.toContain('预览');
    expect(componentSource).toContain('保存');
  });

  it('edits tags as sortable removable chips instead of a single line input', () => {
    expect(componentSource).toContain('editTags');
    expect(componentSource).toContain('editTagDraft');
    expect(componentSource).toContain('addEditTag');
    expect(componentSource).toContain('removeEditTag');
    expect(componentSource).toContain('draggedEditTagIndex');
    expect(componentSource).toContain('reorderEditTags');
    expect(componentSource).toContain('edit-tag-editor');
    expect(componentSource).toContain('aria-label={`删除标签 ${tag}`}');
    expect(componentSource).toContain('draggable');
    expect(componentSource).toContain('onDragStart');
    expect(componentSource).toContain('onDragOver');
    expect(componentSource).toContain('onDrop');
    expect(componentSource).not.toContain('const moveEditTag');
    expect(componentSource).not.toContain('aria-label={`上移标签 ${tag}`}');
    expect(componentSource).not.toContain('aria-label={`下移标签 ${tag}`}');
    expect(componentSource).not.toContain('value={editTagsText}');
    expect(styleSource).toContain('.edit-tag-editor');
    expect(styleSource).toContain('.edit-tag-chip');
    expect(styleSource).toContain('.edit-tag-chip.is-dragging');
    expect(styleSource).toContain('.edit-tag-add');
  });

  it('keeps reset available from the edit page and preserves nickname and contact', () => {
    expect(componentSource).toContain('resetPersonalInfo');
    expect(componentSource).toContain('/personal-info');
    expect(componentSource).toContain('清空资料');
    expect(componentSource).toContain('保留昵称和联系方式');
    expect(componentSource).toContain('取消');
    expect(componentSource).toContain('确认清空');
    expect(componentSource).not.toContain('window.confirm');
  });

  it('uses one top-level reset confirmation flow for both card and edit page reset actions', () => {
    expect(componentSource.match(/showResetConfirm &&/g)).toHaveLength(1);
    expect(componentSource).toContain('const openResetConfirm = () => {');
    expect(componentSource).toContain('onClick={openResetConfirm}');
    expect(componentSource).toContain('id="reset-confirm-title"');
    expect(componentSource).not.toContain('id="edit-reset-confirm-title"');
  });

  it('opens a focused poster share page without the public-link card', () => {
    expect(componentSource).toContain('publicProfileUrl');
    expect(componentSource).toContain("`/u/${profile.slug}`");
    expect(componentSource).toContain("setStep('share')");
    expect(componentSource).not.toContain('让别人直接链接到你');
    expect(componentSource).not.toContain('share-link-card');
    expect(componentSource).not.toContain('复制公开链接');
    expect(componentSource).not.toContain('打开公开页');
    expect(styleSource).not.toContain('.share-link-card');
    expect(styleSource).not.toContain('.share-action-row');
  });

  it('renders a real QR poster that can be saved as an image', () => {
    expect(componentSource).toContain("import { createQrMatrix, type QrMatrix } from '@/lib/qr';");
    expect(componentSource).toContain('saveSharePoster');
    expect(componentSource).toContain('drawQrMatrix');
    expect(componentSource).toContain('canvas.toBlob');
    expect(componentSource).toContain('download = `livelink-${profile.slug}.png`');
    expect(componentSource).toContain('海报已生成，可以保存或转发。');
    expect(componentSource).toContain('poster-qr');
    expect(componentSource).toContain('SCAN TO CONNECT');
    expect(componentSource).toContain('扫码认识我');
    expect(componentSource).toContain('进入分身页，可一键复制联系方式');
    expect(componentSource).toContain('poster-contact-line');
    expect(componentSource).toContain('联系方式：{contactHandle}');
    expect(componentSource).not.toContain('扫码查看我的分身');
    expect(componentSource).not.toContain('<span>{publicProfileUrl}</span>');
    expect(componentSource).not.toContain('drawWrappedText(context, publicProfileUrl');
    expect(componentSource).not.toContain('<div className="qr-box">SCAN</div>');
    expect(styleSource).toContain('.poster-body');
    expect(styleSource).toContain('.poster-qr');
    expect(styleSource).toContain('.poster-footer');
  });
});
