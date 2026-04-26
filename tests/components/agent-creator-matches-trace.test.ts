import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('AgentCreator matches A-to-A trace', () => {
  it('shows an optional A-to-A process on the Top Matches screen', () => {
    expect(componentSource).toContain('A-to-A 搜索过程 · 模拟过程');
    expect(componentSource).toContain('不是实时真实 Agent 对话记录');
    expect(componentSource).toContain('matches-trace');
    expect(componentSource).toContain('用户可选查看');
  });

  it('styles the matches trace as a visible expandable module', () => {
    expect(styleSource).toContain('.matches-trace');
    expect(styleSource).toContain('.agent-trace');
  });

  it('shows when a connection has been recorded before external sending', () => {
    expect(componentSource).toContain('recordedConnectionIds');
    expect(componentSource).toContain('connectionFeedback');
    expect(componentSource).toContain('已记录连接，文案已复制');
    expect(componentSource).toContain('已经记录连接请求');
    expect(componentSource).toContain('disabled={isSelectedConnectionRecorded}');
  });

  it('styles recorded connection feedback as part of the icebreaker flow', () => {
    expect(styleSource).toContain('.connection-feedback');
    expect(styleSource).toContain('.connection-status-pill');
  });

  it('mixes frontend-only internet candidates into the recommendation list without changing the API shape', () => {
    expect(componentSource).toContain('const internetCandidateSeeds: CandidateView[] = [');
    expect(componentSource).toContain("id: 'web-");
    expect(componentSource).toContain('buildInternetCandidates(profileNeeds, activeFindQuery)');
    expect(componentSource).toContain('setRecommendations([...candidates, ...webCandidates]);');
  });

  it('uses concrete mock internet candidates with public-information style summaries', () => {
    expect(componentSource).toContain("name: '林澈'");
    expect(componentSource).toContain("name: '周以宁'");
    expect(componentSource).toContain("name: '陈牧远'");
    expect(componentSource).toContain("name: '许知微'");
    expect(componentSource).toContain('模拟公开信息');
    expect(componentSource).toContain('开源社区');
  });

  it('marks internet candidates as invitational instead of enrolled agents', () => {
    expect(componentSource).toContain("candidate.id.startsWith('web-')");
    expect(componentSource).toContain('未入驻 Livelink，可邀请 TA 生成 Agent');
    expect(componentSource).toContain('可邀请');
    expect(componentSource).toContain('复制邀请文案');
    expect(componentSource).toContain('推荐来自互联网公开信息');
  });

  it('styles internet candidate cards and invitation notices', () => {
    expect(styleSource).toContain('.candidate-card.web-candidate-card');
    expect(styleSource).toContain('.candidate-web-notice');
    expect(styleSource).toContain('.candidate-card strong.invite-status-pill');
  });
});
