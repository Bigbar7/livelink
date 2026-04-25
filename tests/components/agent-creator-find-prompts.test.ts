import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentSource = readFileSync(join(process.cwd(), 'src/components/agent-creator.tsx'), 'utf8');

describe('AgentCreator find prompt template', () => {
  it('uses an empty query with a placeholder template instead of preset prompts', () => {
    expect(componentSource).toContain("const [findQuery, setFindQuery] = useState('');");
    expect(componentSource).toContain('const findPromptTemplate =');
    expect(componentSource).toContain('placeholder={findPromptTemplate}');
    expect(componentSource).not.toContain('const findPromptSuggestions =');
    expect(componentSource).not.toContain('setFindQuery(prompt.query)');
    expect(componentSource).not.toContain('{findPromptSuggestions.map((prompt) => (');
  });
});
