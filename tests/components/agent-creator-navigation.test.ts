import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('AgentCreator navigation copy', () => {
  it('uses product navigation labels instead of generation copy after setup', () => {
    expect(componentSource).toContain('<span>进化</span>');
    expect(componentSource).toContain('<span>分身</span>');
    expect(componentSource).toContain('title="我的数字分身"');
    expect(componentSource).toContain('aria-label="展开资料操作"');
    expect(componentSource).toContain('<span>发现</span>');
    expect(componentSource).not.toContain('<span>生成</span>');
    expect(componentSource).not.toContain('<Header title="分身页" action="⋯" />');
    expect(componentSource).not.toContain('<span>我的分身</span>');
    expect(componentSource).not.toContain('<span>数字分身</span>');
    expect(componentSource).not.toContain('<span>我的Agent</span>');
    expect(componentSource).not.toContain('<span>名片</span>');
    expect(componentSource).not.toContain('<span>找人</span>');
  });

  it('does not prefill the nickname before first generation', () => {
    expect(componentSource).toContain("useState('')");
    expect(componentSource).not.toContain("useState('Jun')");
  });

  it('does not show restore-agent copy during the first boot screen', () => {
    expect(componentSource).not.toContain('正在恢复');
    expect(componentSource).not.toContain('如果你之前生成过 Agent，我们会自动带你回到名片页。');
  });

  it('positions the first boot copy in a centered standalone layout', () => {
    expect(componentSource).toContain('boot-screen');
    expect(componentSource).toContain('boot-content');
    expect(styleSource).toContain('.boot-screen');
    expect(styleSource).toContain('.boot-content');
    expect(styleSource).toContain('justify-content: center;');
    expect(styleSource).toContain('text-align: center;');
    expect(styleSource).toContain('.boot-content mark');
    expect(styleSource).toContain('margin-top: 8px;');
  });

  it('requires a trimmed nickname before entering the creation flow', () => {
    expect(componentSource).toContain("const trimmedNickname = nickname.trim();");
    expect(componentSource).toContain("setNicknameError('先填写昵称，再生成你的数字分身。');");
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

  it('lets users return from a recommended candidate detail to the current recommendation list', () => {
    expect(componentSource).toContain('aria-label="返回推荐列表"');
    expect(componentSource).toContain("setStep('matches')");
  });

  it('returns discovery navigation to existing recommendation results after an icebreaker', () => {
    expect(componentSource).toContain('const openDiscovery = () => {');
    expect(componentSource).toContain('recommendations.length > 0');
    expect(componentSource).toContain('profileNeeds.length > 0');
    expect(componentSource).toContain('void findPeople(profileNeedsQuery);');
    expect(componentSource).toContain("<BottomNav currentStep={step} onNavigate={setStep} onFindNavigate={openDiscovery} />");
    expect(componentSource).toContain("onClick={onFindNavigate}");
  });

  it('keeps a restart search entry on the recommendation results page', () => {
    expect(componentSource).toContain('const restartDiscovery = () => {');
    expect(componentSource).toContain("setFindQuery(profileNeeds.join('\\n'));");
    expect(componentSource).toContain('aria-label="重新搜索"');
    expect(componentSource).toContain('onClick={restartDiscovery}');
  });

  it('lets users move to the next recommended candidate from the detail page', () => {
    expect(componentSource).toContain('aria-label="查看下一个推荐"');
    expect(componentSource).toContain('showNextCandidate');
    expect(componentSource).toContain('nextCandidate');
    expect(componentSource).toContain("nextCandidate ? '下一个' : '回列表'");
  });

  it('supports swiping left on a recommended candidate detail to view the next one', () => {
    expect(componentSource).toContain('onTouchStart={handleCandidateTouchStart}');
    expect(componentSource).toContain('onTouchEnd={handleCandidateTouchEnd}');
    expect(componentSource).toContain('touchStartRef');
    expect(componentSource).toContain('deltaX < -60');
  });

  it('shows candidate name beside avatar and exposes a copyable contact handle', () => {
    expect(componentSource).toContain('candidate-identity-row');
    expect(componentSource).toContain('candidate-contact-strip');
    expect(componentSource).toContain('copyCandidateContact');
    expect(componentSource).toContain('aria-label="复制候选人联系方式"');
    expect(componentSource).toContain('candidate.contactHandle');
  });

  it('shows a demo-stage manual contact notice on candidate details', () => {
    expect(componentSource).toContain('candidate-demo-notice');
    expect(componentSource).toContain('现在是demo阶段，暂未实现agent自动化，请手动联系TA');
    expect(styleSource).toContain('.candidate-demo-notice');
  });
});
