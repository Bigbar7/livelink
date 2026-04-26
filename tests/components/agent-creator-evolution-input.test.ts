import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');
const styleSource = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('AgentCreator evolution input', () => {
  it('keeps first-time creation as multi-source input with optional AI chat', () => {
    expect(componentSource).toContain("const [pasteText, setPasteText] = useState('')");
    expect(componentSource).toContain("type InputMode = 'text' | 'file' | 'link' | 'chat'");
    expect(componentSource).toContain('创建分身 · 多资料入口');
    expect(componentSource).toContain('粘贴文本');
    expect(componentSource).toContain('上传附件');
    expect(componentSource).toContain('上传链接');
    expect(componentSource).toContain('AI 对话');
    expect(componentSource).toContain('生成我的分身');

    expect(componentSource).not.toContain('const sampleText');
    expect(componentSource).not.toContain('voice-panel');
    expect(componentSource).not.toContain('useState(\'https://github.com/jun/livelink');
  });

  it('does not fake assistant replies during first-time creation chat', () => {
    expect(componentSource).not.toContain('收到，我会把这段信息纳入首次分身生成资料。你可以继续补充，或直接生成。');
    expect(componentSource).toContain('isCreationChatting');
    expect(componentSource).toContain('/api/agents/creation-chat');
  });

  it('shows creation chat gaps and suggested replies from AI state', () => {
    expect(componentSource).toContain('creationChatState');
    expect(componentSource).toContain('资料完整度');
    expect(componentSource).toContain('missingSlots');
    expect(componentSource).toContain('suggestedReplies');
    expect(componentSource).toContain('资料已足够，生成第一版');
  });

  it('uses the approved mobile creation layout with source cards and a collapsible live draft', () => {
    expect(componentSource).toContain('creation-source-flow');
    expect(componentSource).toContain('creation-source-card ai');
    expect(componentSource).toContain('和 AI 聊聊');
    expect(componentSource).not.toContain('开始创建');
    expect(componentSource).not.toContain('creationPrimaryActionText');
    expect(componentSource).toContain('creation-chat-screen');
    expect(componentSource).toContain('<Header title="AI 创建中" action={creationChatCompleteness} />');
    expect(componentSource).toContain('creation-chat-content');
    expect(componentSource).toContain('creation-live-draft');
    expect(componentSource).toContain('实时分身草稿');
    expect(componentSource).toContain('creationDraftRows');
    expect(componentSource).toContain('draftProfile');
    expect(componentSource).not.toContain('<span>完整度</span>');
    expect(componentSource).not.toContain('<span>已覆盖</span>');
    expect(componentSource).toContain('setShowCreationDraft');
    expect(componentSource).toContain('aria-expanded={showCreationDraft}');
    expect(componentSource).not.toContain('className="mode-tabs"');

    expect(styleSource).toContain('.creation-source-flow');
    expect(styleSource).toContain('.creation-source-card.ai');
    expect(styleSource).toContain('.creation-chat-content {\n  padding-top: 6px;\n  display: flex;\n  flex-direction: column;');
    expect(styleSource).toContain('.creation-chat-content .creation-chat-workspace {\n  flex: 1 1 auto;\n  min-height: 0;');
    expect(styleSource).toContain('.creation-chat-content .creation-thread');
    expect(styleSource).toContain('.creation-live-draft-toggle');
  });

  it('uses AI conversation as the main entry after a profile exists', () => {
    expect(componentSource).toContain('进化分身 · AI 对话主入口');
    expect(componentSource).toContain('系统识别到你已有分身');
    expect(componentSource).toContain('evolution-screen');
    expect(componentSource).toContain('evolution-chat-fullscreen');
    expect(componentSource).toContain('evolution-composer-dock');
    expect(componentSource).toContain('/api/agents/evolution-chat');
    expect(componentSource).toContain('/api/agents/evolve');
    expect(componentSource).toContain('保存并优化');
    expect(componentSource).not.toContain('提交并生成 Agent');
  });

  it('allows uploading an attachment while evolving an existing profile', () => {
    expect(componentSource).toContain('evolutionFileName');
    expect(componentSource).toContain('evolutionFileText');
    expect(componentSource).toContain('handleEvolutionFile');
    expect(componentSource).toContain('evolution-file-upload');
    expect(componentSource).toContain('上传附件');
    expect(componentSource).toContain('evolution-attachment');
    expect(componentSource).toContain('evolutionText');
    expect(componentSource).toContain('text: evolutionText');
  });

  it('places the evolution attachment action beside the input without quick prompt boxes', () => {
    expect(componentSource).toContain('evolution-composer-row');
    expect(componentSource).toContain('evolution-inline-attachment');
    expect(componentSource).toContain('chat-composer evolution-chat-composer');
    expect(componentSource).toContain('aria-label="上传附件"');
    expect(componentSource).toContain('<span aria-hidden="true">+</span>');
    expect(componentSource).not.toContain('evolutionQuickPrompts.map');
  });

  it('does not fake assistant replies during evolution chat', () => {
    expect(componentSource).not.toContain('我会把这次变化整理进你的定位、能力、项目或需求里。确认后点击保存并优化。');
    expect(componentSource).toContain('isEvolutionChatting');
    expect(componentSource).toContain('chatEvolution');
  });

  it('keeps the evolution chat scrolled to the latest message', () => {
    expect(componentSource).toContain('evolutionThreadEndRef');
    expect(componentSource).toContain('scrollIntoView({ behavior:');
    expect(componentSource).toContain('data-evolution-thread-end');
  });

  it('reserves scrollable space below the latest evolution message for the docked composer', () => {
    expect(styleSource).toContain('--evolution-composer-clearance');
    expect(styleSource).toContain('[data-evolution-thread-end]');
    expect(styleSource).toContain('flex: 0 0 var(--evolution-composer-clearance)');
  });

  it('styles the evolution attachment uploader as a compact composer control', () => {
    expect(styleSource).toContain('.evolution-attachment');
    expect(styleSource).toContain('.evolution-attachment input');
    expect(styleSource).toContain('.evolution-attachment-preview');
    expect(styleSource).toContain('.evolution-composer-row');
    expect(styleSource).toContain('.evolution-inline-attachment');
    expect(styleSource).toContain('.evolution-chat-composer');
    expect(styleSource).toContain('grid-template-columns: auto minmax(0, 1fr) auto');
    expect(styleSource).toContain('width: 34px');
    expect(styleSource).toContain('border-radius: 999px');
  });
});
