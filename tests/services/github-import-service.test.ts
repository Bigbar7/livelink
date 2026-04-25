import { describe, expect, it, vi } from 'vitest';
import { importGithubProfileLink } from '@/services/github-import-service';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'content-type': 'application/json' }
  });
}

describe('github-import-service', () => {
  it('imports a GitHub profile, up to six repositories, and README summaries', async () => {
    const repos = Array.from({ length: 7 }, (_, index) => ({
      name: `repo-${index + 1}`,
      description: `Repository ${index + 1}`,
      html_url: `https://github.com/octocat/repo-${index + 1}`,
      language: index % 2 === 0 ? 'TypeScript' : 'Python',
      stargazers_count: 10 - index,
      forks_count: index,
      topics: [`topic-${index + 1}`]
    }));
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const href = url.toString();
      if (href === 'https://api.github.com/users/octocat') {
        return jsonResponse({
          login: 'octocat',
          name: 'The Octocat',
          bio: 'GitHub mascot and sample builder',
          company: '@github',
          blog: 'https://github.blog',
          location: 'San Francisco',
          html_url: 'https://github.com/octocat',
          followers: 9000,
          public_repos: 8
        });
      }
      if (href === 'https://api.github.com/users/octocat/repos?sort=updated&per_page=6') {
        return jsonResponse(repos);
      }
      if (href.includes('/readme')) {
        const repoName = href.split('/').at(-2);
        return jsonResponse({
          encoding: 'base64',
          content: Buffer.from(`# ${repoName}\n\nUseful project context.`).toString('base64')
        });
      }
      throw new Error(`unexpected URL ${href}`);
    }) as unknown as typeof fetch;

    const result = await importGithubProfileLink('https://github.com/octocat', { fetch: fetchImpl });

    expect(result.fetchStatus).toBe('fetched');
    expect(result.sourceType).toBe('github');
    expect(result.title).toBe('GitHub: The Octocat (@octocat)');
    expect(result.rawText).toContain('简介：GitHub mascot and sample builder');
    expect(result.rawText).toContain('仓库：repo-1');
    expect(result.rawText).toContain('README 摘要：# repo-1');
    expect(result.rawText).toContain('仓库：repo-6');
    expect(result.rawText).not.toContain('仓库：repo-7');
    expect(fetchImpl).toHaveBeenCalledTimes(8);
  });

  it('returns a manual fallback when GitHub parsing fails', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'Not Found' }, { status: 404 })) as unknown as typeof fetch;

    const result = await importGithubProfileLink('https://github.com/missing-user', { fetch: fetchImpl });

    expect(result.fetchStatus).toBe('failed');
    expect(result.rawText).toBeUndefined();
    expect(result.title).toBe('https://github.com/missing-user');
    expect(result.userNote).toContain('GitHub 链接解析失败');
    expect(result.errorReason).toContain('GitHub API returned 404');
  });
});
