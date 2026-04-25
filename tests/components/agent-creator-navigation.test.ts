import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');

describe('AgentCreator navigation copy', () => {
  it('uses product navigation labels instead of generation copy after setup', () => {
    expect(componentSource).toContain('<span>进化</span>');
    expect(componentSource).toContain('<span>我的Agent</span>');
    expect(componentSource).toContain('title="我的Agent"');
    expect(componentSource).toContain('aria-label="展开资料操作"');
    expect(componentSource).toContain('<span>发现</span>');
    expect(componentSource).not.toContain('<span>生成</span>');
    expect(componentSource).not.toContain('<span>分身</span>');
    expect(componentSource).not.toContain('<Header title="分身页" action="⋯" />');
    expect(componentSource).not.toContain('<span>我的分身</span>');
    expect(componentSource).not.toContain('<span>名片</span>');
    expect(componentSource).not.toContain('<span>找人</span>');
  });

  it('does not prefill the nickname before first generation', () => {
    expect(componentSource).toContain("useState('')");
    expect(componentSource).not.toContain("useState('Jun')");
  });

  it('requires a trimmed nickname before entering the creation flow', () => {
    expect(componentSource).toContain("const trimmedNickname = nickname.trim();");
    expect(componentSource).toContain("setNicknameError('先填写昵称，再生成你的 Agent。');");
    expect(componentSource).toContain("setNickname(trimmedNickname);");
    expect(componentSource).toContain('disabled={!nickname.trim() || !contact.trim()}');
    expect(componentSource).toContain('{nicknameError && <p className="field-error">{nicknameError}</p>}');
  });

  it('requires a contact handle before entering and submitting the creation flow', () => {
    expect(componentSource).toContain("const trimmedContact = contact.trim();");
    expect(componentSource).toContain("setContactError('请填写微信号或手机号，用于后续连接。');");
    expect(componentSource).toContain("setContact(trimmedContact);");
    expect(componentSource).toContain('disabled={!nickname.trim() || !contact.trim()}');
    expect(componentSource).toContain('contact: trimmedContact');
  });

  it('keeps the home CTA focused and reveals resident agents as discovery', () => {
    expect(componentSource).toContain('scroll-cue');
    expect(componentSource).not.toContain('下面有人');
    expect(componentSource).toContain('已经入住的人');
    expect(componentSource).toContain('launch-transition');
    expect(componentSource).toContain('setTimeout(() => setStep');
  });

  it('shows resident profiles as people with avatars, nicknames, and tags', () => {
    expect(componentSource).toContain('aria-label="查看已入住 Agent"');
    expect(componentSource).toContain('className="resident-avatar"');
    expect(componentSource).toContain('className="resident-name"');
    expect(componentSource).toContain('className="resident-tags"');
    expect(componentSource).toContain('parseJsonList(profile.tagsJson)');
  });
});
