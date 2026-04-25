type GithubUser = {
  login: string;
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  blog?: string | null;
  location?: string | null;
  html_url: string;
  followers?: number;
  public_repos?: number;
};

type GithubRepo = {
  name: string;
  description?: string | null;
  html_url: string;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  topics?: string[];
};

type GithubReadme = {
  content?: string;
  encoding?: string;
};

export type LinkImportResult = {
  sourceType: 'github';
  url: string;
  title: string;
  description?: string;
  rawText?: string;
  cleanedText?: string;
  fetchStatus: 'fetched' | 'failed';
  userNote?: string;
  errorReason?: string;
};

export type GithubImportOptions = {
  fetch?: typeof fetch;
  token?: string;
  repositoryLimit?: number;
};

const DEFAULT_REPOSITORY_LIMIT = 6;
const README_TEXT_LIMIT = 1200;
const RAW_TEXT_LIMIT = 16000;

function parseGithubUsername(url: string) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    throw new Error('URL is not a GitHub profile');
  }

  const username = parsed.pathname.split('/').filter(Boolean)[0]?.replace(/^@/, '');
  if (!username || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    throw new Error('GitHub username is invalid');
  }

  return username;
}

function githubHeaders(token?: string) {
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'livelink-github-importer',
    'x-github-api-version': '2022-11-28'
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchGithubJson<T>(fetchImpl: typeof fetch, url: string, token?: string): Promise<T>;
async function fetchGithubJson<T>(fetchImpl: typeof fetch, url: string, token: string | undefined, optional: true): Promise<T | undefined>;
async function fetchGithubJson<T>(fetchImpl: typeof fetch, url: string, token?: string, optional = false): Promise<T | undefined> {
  const response = await fetchImpl(url, { headers: githubHeaders(token) });
  if (optional && response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status} for ${url}`);
  }

  return (await response.json()) as T;
}

function decodeReadme(readme?: GithubReadme) {
  if (!readme?.content || readme.encoding !== 'base64') return undefined;
  return Buffer.from(readme.content.replace(/\s/g, ''), 'base64').toString('utf8').trim().slice(0, README_TEXT_LIMIT);
}

function compact(value?: string | null) {
  return value?.trim() || undefined;
}

function formatGithubMaterial(user: GithubUser, repos: Array<GithubRepo & { readmeText?: string }>) {
  const displayName = compact(user.name) ?? user.login;
  const lines = [
    `GitHub 用户：${displayName} (@${user.login})`,
    `主页：${user.html_url}`,
    compact(user.bio) ? `简介：${compact(user.bio)}` : '',
    compact(user.company) ? `组织/公司：${compact(user.company)}` : '',
    compact(user.blog) ? `网站：${compact(user.blog)}` : '',
    compact(user.location) ? `地点：${compact(user.location)}` : '',
    typeof user.followers === 'number' ? `关注者：${user.followers}` : '',
    typeof user.public_repos === 'number' ? `公开仓库数：${user.public_repos}` : '',
    '',
    '代表仓库：'
  ].filter(Boolean);

  for (const repo of repos) {
    lines.push(
      [
        `仓库：${repo.name}`,
        compact(repo.description) ? `描述：${compact(repo.description)}` : '',
        compact(repo.language) ? `主要语言：${compact(repo.language)}` : '',
        typeof repo.stargazers_count === 'number' ? `Stars：${repo.stargazers_count}` : '',
        typeof repo.forks_count === 'number' ? `Forks：${repo.forks_count}` : '',
        repo.topics?.length ? `Topics：${repo.topics.join(', ')}` : '',
        `链接：${repo.html_url}`,
        repo.readmeText ? `README 摘要：${repo.readmeText}` : ''
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  return lines.join('\n\n').slice(0, RAW_TEXT_LIMIT);
}

export async function importGithubProfileLink(url: string, options: GithubImportOptions = {}): Promise<LinkImportResult> {
  try {
    const username = parseGithubUsername(url);
    const fetchImpl = options.fetch ?? fetch;
    const token = options.token ?? process.env.GITHUB_TOKEN;
    const repositoryLimit = options.repositoryLimit ?? DEFAULT_REPOSITORY_LIMIT;
    const user = await fetchGithubJson<GithubUser>(fetchImpl, `https://api.github.com/users/${username}`, token);
    const repos = (
      await fetchGithubJson<GithubRepo[]>(
        fetchImpl,
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=${repositoryLimit}`,
        token
      )
    ).slice(0, repositoryLimit);
    const reposWithReadmes = await Promise.all(
      repos.map(async (repo) => {
        const readme = await fetchGithubJson<GithubReadme>(
          fetchImpl,
          `https://api.github.com/repos/${username}/${repo.name}/readme`,
          token,
          true
        );
        return { ...repo, readmeText: decodeReadme(readme) };
      })
    );
    const rawText = formatGithubMaterial(user, reposWithReadmes);
    const displayName = compact(user.name) ?? user.login;

    return {
      sourceType: 'github',
      url,
      title: `GitHub: ${displayName} (@${user.login})`,
      description: compact(user.bio),
      rawText,
      cleanedText: rawText,
      fetchStatus: 'fetched'
    };
  } catch (error) {
    const errorReason = error instanceof Error ? error.message : 'GitHub parsing failed';
    return {
      sourceType: 'github',
      url,
      title: url,
      fetchStatus: 'failed',
      userNote: `GitHub 链接解析失败：${errorReason}。请用户补充这个链接中最能代表自己的项目、技能或经历。`,
      errorReason
    };
  }
}
